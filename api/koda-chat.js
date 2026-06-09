const fs = require('fs');
const path = require('path');
const { GoogleGenAI } = require('@google/genai');

function loadLocalEnvFiles() {
    const envFiles = ['.env.local', '.env'];
    const loadedFiles = [];

    envFiles.forEach(fileName => {
        const filePath = path.join(process.cwd(), fileName);
        if (!fs.existsSync(filePath)) return;

        const fileContents = fs.readFileSync(filePath, 'utf8');
        fileContents.split(/\r?\n/).forEach(line => {
            const trimmedLine = line.trim();
            if (!trimmedLine || trimmedLine.startsWith('#')) return;

            const separatorIndex = trimmedLine.indexOf('=');
            if (separatorIndex === -1) return;

            const key = trimmedLine.slice(0, separatorIndex).trim();
            let value = trimmedLine.slice(separatorIndex + 1).trim();

            if (
                (value.startsWith('"') && value.endsWith('"')) ||
                (value.startsWith("'") && value.endsWith("'"))
            ) {
                value = value.slice(1, -1);
            }

            if (key && process.env[key] === undefined) {
                process.env[key] = value;
            }
        });

        loadedFiles.push(fileName);
    });

    if (loadedFiles.length) {
        console.log('Local env files loaded:', loadedFiles.join(', '));
    }
}

loadLocalEnvFiles();

const GEMINI_MODELS = [
    'gemini-2.0-flash-lite',
    'gemini-2.0-flash',
    'gemini-2.5-flash'
];
console.log('GEMINI_API_KEY loaded:', !!process.env.GEMINI_API_KEY);
console.log('GEMINI_MODEL:', GEMINI_MODELS[0]);
console.log('GEMINI_MODEL_FALLBACKS:', GEMINI_MODELS.join(', '));

const kodaSessions = new Map();
const kodaLeadSessions = new Map();
const geminiRetryDelays = [1000, 2000];
const aiTrafficMessage = 'Medyo busy lang si KODA ngayon. For urgent concerns, please call DKC at 0927-686-3314.';

const kodaSystemPrompt = `
You are KODA, DKC's HVAC Knowledge & Operations Digital Assistant.

You are a real conversational AI assistant for DKC Airconditioning and Refrigeration Services. Help naturally in Tagalog, Taglish, or English depending on the user's language. Be warm, practical, concise, and human. Sound like a helpful service coordinator, not a robotic FAQ.

DKC company information:
- Company: DKC Airconditioning and Refrigeration Services
- Phone: 0927-686-3314
- Landline: (02) 8716-7334
- Email: dkcservices0912@gmail.com
- Address: Unit B, 1st Floor Malbarr Building, Brgy. Putatan, Muntinlupa City, Philippines, 1772
- Facebook: DKC Aircon and Refrigeration Services
- TikTok: @dkcairconofficial
- Instagram: @dkcairconservices.ph
- Tagline: We Provide Good Service

You can answer questions about:
- DKC services
- Aircon cleaning / PMS
- Aircon repair
- Aircon installation
- Freon charging
- Commercial HVAC
- Refrigeration
- Maintenance tips
- Energy saving tips
- Basic aircon troubleshooting
- Difference between inverter and non-inverter
- Common aircon issues like weak cooling, leaking, noise, bad smell, ice buildup, high electricity bill, and error codes

Cleaning/PMS pricing:
- Window Type 1HP: ₱600
- Window Type 1.5HP-2HP: ₱800
- Split Type 1HP-1.5HP: ₱1,300
- Split Type 2HP-2.5HP: ₱1,800

Pricing rules:
- If user asks for a listed cleaning/PMS price, answer directly.
- Never invent prices.
- If a service, aircon type, or HP capacity is not listed, say that it is not listed in the standard cleaning price guide and recommend contacting DKC directly for a quotation.
- For repair, installation, freon charging, commercial HVAC, refrigeration, cassette type, floor mounted, ceiling suspended, VRF/VRV, or chiller pricing, do not invent a price. Recommend contacting DKC.
- If the user asks "Magkano cleaning?" or similar without type/HP, ask for the aircon type and HP capacity.
- If the user asks "Magkano cleaning ng split 1.5hp?", answer that Split Type 1HP-1.5HP standard cleaning is ₱1,300.

Repair and troubleshooting rules:
- Give possible causes only, not final diagnosis.
- Never claim DKC has inspected the unit.
- Never guarantee the exact problem.
- Never give dangerous electrical repair instructions.
- If safety risk is involved, recommend contacting a technician.
- For urgent concerns, advise calling 0927-686-3314.

Conversation style:
- Match the user's language.
- If user speaks Tagalog or Taglish, reply in natural Taglish with friendly, everyday wording.
- If user speaks English, reply in English.
- Keep answers short but useful, usually 1-4 sentences unless the user asks for detail.
- Ask one natural follow-up question when it helps, especially for troubleshooting, booking, aircon type, HP capacity, or location.
- Avoid saying "As KODA" or repeatedly naming yourself.
- Do not repeat your opening intro unless the user asks who you are.
- If user says only "Hi", answer briefly like: "Hi! I'm KODA. How can I help you today?"
- If user asks casual or off-topic questions, answer lightly and briefly, then guide back to DKC, aircon, refrigeration, or HVAC help.
- Example: If user says "hindi lumalamig aircon ko", reply like: "Possible causes niyan are dirty filter, dirty coil, low refrigerant, or capacitor issue. Window type ba or split type yung unit mo?"
`.trim();

function normalizeMessages(messages) {
    if (!Array.isArray(messages)) return [];
    return messages
        .filter(message => message && ['user', 'assistant'].includes(message.role) && typeof message.content === 'string')
        .map(message => ({
            role: message.role,
            content: message.content.slice(0, 2000)
        }))
        .slice(-16);
}

function normalizeSessionId(sessionId) {
    return typeof sessionId === 'string' && sessionId.trim()
        ? sessionId.trim().slice(0, 120)
        : 'default';
}

function toGeminiContent(message) {
    return {
        role: message.role === 'assistant' ? 'model' : 'user',
        parts: [{ text: message.content }]
    };
}

function extractGeminiText(response) {
    if (typeof response?.text === 'string') return response.text.trim();
    if (typeof response?.text === 'function') return response.text().trim();

    const parts = response?.candidates?.[0]?.content?.parts || [];
    return parts
        .map(part => part?.text || '')
        .join('')
        .trim();
}

function normalizePricingText(message) {
    return message
        .toLowerCase()
        .replace(/[–—]/g, '-')
        .replace(/\s+/g, ' ')
        .trim();
}

function includesAny(text, keywords) {
    return keywords.some(keyword => text.includes(keyword));
}

function isPricingQuestion(text) {
    return text.includes('magkano') ||
        text.includes('price') ||
        text.includes('presyo') ||
        text.includes('magkano cleaning') ||
        text.includes('presyo cleaning') ||
        text.includes('cleaning price') ||
        text.includes('cleaning') ||
        text.includes('linis') ||
        text.includes('pms') ||
        text.includes('split type') ||
        text.includes('window type') ||
        text.includes('hp');
}

function hasHp(text, values) {
    return values.some(value => {
        const escapedValue = value.replace('.', '\\.');
        return new RegExp(`(^|\\D)${escapedValue}\\s*(hp|horsepower)?(\\D|$)`).test(text);
    });
}

function getLocalPricingReply(message) {
    const text = normalizePricingText(message);
    const mentionsWindow = text.includes('window');
    const mentionsSplit = text.includes('split');
    const mentionsKnownTypeAndHp = (mentionsWindow || mentionsSplit) && hasHp(text, ['1', '1.5', '2', '2.5']);
    const pricingRelated = isPricingQuestion(text);

    if (!pricingRelated && !mentionsKnownTypeAndHp) {
        return null;
    }

    if (mentionsSplit && text.includes('1.5')) {
        return 'For Split Type 1HP–1.5HP, standard cleaning is ₱1,300.';
    }

    if (mentionsSplit && text.includes('2.5')) {
        return 'For Split Type 2HP–2.5HP, standard cleaning is ₱1,800.';
    }

    if (mentionsWindow && text.includes('1.5')) {
        return 'For Window Type 1.5HP–2HP, standard cleaning is ₱800.';
    }

    if (mentionsWindow && hasHp(text, ['1']) && !hasHp(text, ['1.5', '2'])) {
        return 'For Window Type 1HP, standard cleaning is ₱600.';
    }

    if (mentionsWindow && hasHp(text, ['1.5', '2'])) {
        return 'For Window Type 1.5HP–2HP, standard cleaning is ₱800.';
    }

    if (mentionsSplit && hasHp(text, ['1', '1.5'])) {
        return 'For Split Type 1HP–1.5HP, standard cleaning is ₱1,300.';
    }

    if (mentionsSplit && hasHp(text, ['2', '2.5'])) {
        return 'For Split Type 2HP–2.5HP, standard cleaning is ₱1,800.';
    }

    return 'May I know your aircon type and HP capacity? Window type or split type?';
}

function getSoftSellLine(text) {
    const lines = [
        'Need assistance? DKC is ready to help.',
        'Want a technician to inspect the unit? We can schedule a visit.',
        'Preventive maintenance helps avoid costly repairs.',
        'Regular cleaning improves cooling performance and lowers power consumption.',
        'DKC also offers installation, repair, and refrigeration services.'
    ];
    const index = Math.abs(text.length) % lines.length;
    return lines[index];
}

function withSoftSell(reply, text) {
    return `${reply}\n\n${getSoftSellLine(text)}`;
}

function leadCaptureReply() {
    return [
        'Sure, I can help collect the details for DKC.',
        '',
        'Name:',
        'Contact Number:',
        'Location:',
        'Aircon Type:',
        'HP Capacity:',
        'Concern:'
    ].join('\n');
}

function extractLeadData(message) {
    const fields = {};
    const patterns = {
        name: /name\s*:\s*([^\n]+)/i,
        contactNumber: /(contact number|contact|mobile|phone)\s*:\s*([^\n]+)/i,
        location: /location\s*:\s*([^\n]+)/i,
        airconType: /(aircon type|type)\s*:\s*([^\n]+)/i,
        hpCapacity: /(hp capacity|hp)\s*:\s*([^\n]+)/i,
        concern: /concern\s*:\s*([^\n]+)/i
    };

    Object.entries(patterns).forEach(([field, pattern]) => {
        const match = message.match(pattern);
        if (!match) return;
        fields[field] = match[match.length - 1].trim();
    });

    return fields;
}

function getLocalRoute(message, history, sessionId) {
    const text = normalizePricingText(message);
    const compactText = text.replace(/[!?.,]/g, '');
    const exchangeCount = Array.isArray(history)
        ? history.filter(item => item && item.role === 'user').length
        : 0;

    if (includesAny(text, ['amoy sunog', 'may usok', 'nag spark', 'electrical smell'])) {
        return {
            route: 'ROUTE: LOCAL_EMERGENCY',
            reply: 'Safety Reminder:\nTurn off the unit immediately and disconnect power if possible.\n\nPlease contact DKC immediately:\n0927-686-3314'
        };
    }

    if (includesAny(text, ['book', 'book now', 'booking', 'schedule', 'appointment'])) {
        return {
            route: 'ROUTE: LOCAL_BOOKING',
            reply: leadCaptureReply()
        };
    }

    if (includesAny(text, ['magpapakabit', 'need cleaning', 'need repair', 'quotation', 'quote'])) {
        kodaLeadSessions.set(sessionId, {
            ...(kodaLeadSessions.get(sessionId) || {}),
            intent: text,
            updatedAt: new Date().toISOString()
        });
        return {
            route: 'ROUTE: LOCAL_LEAD_CAPTURE',
            reply: leadCaptureReply()
        };
    }

    const leadData = extractLeadData(message);
    if (Object.keys(leadData).length) {
        kodaLeadSessions.set(sessionId, {
            ...(kodaLeadSessions.get(sessionId) || {}),
            ...leadData,
            updatedAt: new Date().toISOString()
        });
        return {
            route: 'ROUTE: LOCAL_LEAD_CAPTURE',
            reply: 'Got it. I saved those details for this chat. DKC can use them to help with your inquiry or schedule.'
        };
    }

    if (includesAny(text, ['how often cleaning', 'how often pms', 'how often maintenance', 'gaano kadalas cleaning', 'gaano kadalas pms'])) {
        return {
            route: 'ROUTE: LOCAL_FAQ',
            reply: 'Residential: every 3-6 months.\nCommercial: every 1-3 months.\nRegular PMS helps keep cooling strong and can reduce costly repairs.'
        };
    }

    if (includesAny(text, ['anong hp', 'what hp', 'room size'])) {
        return {
            route: 'ROUTE: LOCAL_FAQ',
            reply: [
                'Simple room-size guide:',
                '',
                'Up to 12 sqm: 0.75HP - 1HP',
                '12-18 sqm: 1HP - 1.5HP',
                '18-25 sqm: 1.5HP - 2HP',
                '25-35 sqm: 2HP - 2.5HP'
            ].join('\n')
        };
    }

    if (includesAny(text, ['mataas bill', 'mataas kuryente', 'electric bill', 'consumption'])) {
        return {
            route: 'ROUTE: LOCAL_FAQ',
            reply: [
                'Common causes of high power consumption:',
                '- Dirty filters',
                '- Dirty evaporator coil',
                '- Low refrigerant',
                '- Incorrect thermostat settings',
                '- Oversized usage hours',
                '',
                'PMS is recommended to improve cooling performance and efficiency.'
            ].join('\n')
        };
    }

    const pricingReply = getLocalPricingReply(message);
    if (pricingReply) {
        return {
            route: 'ROUTE: LOCAL_PRICING',
            reply: withSoftSell(pricingReply, text)
        };
    }

    if (['hi', 'hello', 'hey', 'good morning', 'good afternoon', 'good evening', 'kumusta', 'kamusta', 'yo', 'sup'].includes(compactText)) {
        return {
            route: 'ROUTE: LOCAL_GREETING',
            reply: "Hi! I'm KODA, DKC's HVAC Knowledge & Operations Assistant. How can I help you today?"
        };
    }

    if (includesAny(text, ['sino ka', 'who are you', 'ano ka', 'what can you do', 'kaya mo ba'])) {
        return {
            route: 'ROUTE: LOCAL_SERVICE',
            reply: "I'm KODA, DKC's HVAC Knowledge & Operations Assistant. I can help with pricing, booking, maintenance tips, troubleshooting, installation information, and DKC services."
        };
    }

    if (includesAny(text, ['why dkc', 'bakit dkc', 'why choose dkc', 'trusted ba kayo', 'bakit kayo pipiliin'])) {
        return {
            route: 'ROUTE: LOCAL_SALES',
            reply: [
                'Why Choose DKC?',
                '',
                '- Experienced Technicians',
                '- Residential & Commercial Projects',
                '- Fast Response Time',
                '- Quality Workmanship',
                '- Honest Assessment',
                '- Affordable Pricing',
                '- Preventive Maintenance Programs',
                '- Installation, Repair, Cleaning & Refrigeration Services',
                '- Muntinlupa-based Service Team',
                '',
                '"We Provide Good Service."'
            ].join('\n')
        };
    }

    if (includesAny(text, ['trusted ba', 'may experience ba kayo'])) {
        return {
            route: 'ROUTE: LOCAL_SALES',
            reply: [
                'DKC handles residential and commercial airconditioning and refrigeration projects.',
                '',
                'Our team provides:',
                '- Installation',
                '- Preventive Maintenance',
                '- Repair',
                '- Refrigeration Services'
            ].join('\n')
        };
    }

    if (includesAny(text, ['tell me about dkc', 'about dkc', 'company profile', 'sino kayo', 'ano ang dkc'])) {
        return {
            route: 'ROUTE: LOCAL_SERVICE',
            reply: [
                'DKC Airconditioning and Refrigeration Services',
                '',
                'Services:',
                '- Supply',
                '- Installation',
                '- Cleaning/PMS',
                '- Repair',
                '- Freon Charging',
                '- Refrigeration Services',
                '- Commercial HVAC',
                '',
                'Location:',
                'Unit B, 1st Floor Malbarr Building,',
                'Brgy. Putatan, Muntinlupa City',
                '',
                'Contact:',
                '0927-686-3314'
            ].join('\n')
        };
    }

    if (includesAny(text, ['service', 'services', 'ano serbisyo', 'offerings'])) {
        return {
            route: 'ROUTE: LOCAL_SERVICE',
            reply: withSoftSell([
                'DKC services include:',
                '- Supply',
                '- Installation',
                '- Cleaning/PMS',
                '- Repair',
                '- Freon Charging',
                '- Refrigeration Services',
                '- Commercial HVAC'
            ].join('\n'), text)
        };
    }

    if (includesAny(text, ['installation', 'install', 'pakabit', 'magpakabit'])) {
        return {
            route: 'ROUTE: LOCAL_UPSELL',
            reply: [
                'For installation inquiries, please share:',
                '- Aircon type',
                '- HP capacity',
                '- Location',
                '',
                'DKC can also provide supply + installation packages.'
            ].join('\n')
        };
    }

    if (includesAny(text, ['repair', 'sira', 'ayaw lumamig', 'tumutulo', 'maingay', 'error code'])) {
        return {
            route: 'ROUTE: LOCAL_UPSELL',
            reply: [
                'To help with repair concerns, please share:',
                '- Aircon type',
                '- HP capacity',
                '- What issue you noticed',
                '- When it started',
                '',
                'We also recommend preventive maintenance after repairs.'
            ].join('\n')
        };
    }

    if (includesAny(text, ['contact', 'contact number', 'phone', 'call', 'landline', 'mobile', 'number', 'tawag'])) {
        return {
            route: 'ROUTE: LOCAL_SERVICE',
            reply: 'You can contact DKC here:\n0927-686-3314\n(02) 8716-7334'
        };
    }

    if (includesAny(text, ['facebook', 'fb', 'tiktok', 'instagram'])) {
        return {
            route: 'ROUTE: LOCAL_SERVICE',
            reply: [
                'Facebook:',
                'DKC Aircon and Refrigeration Services',
                '',
                'TikTok:',
                '@dkcairconofficial',
                '',
                'Instagram:',
                '@dkcairconservices.ph'
            ].join('\n')
        };
    }

    if (includesAny(text, ['location', 'address', 'saan kayo', 'located'])) {
        return {
            route: 'ROUTE: LOCAL_SERVICE',
            reply: 'DKC is located at Unit B, 1st Floor Malbarr Building, Brgy. Putatan, Muntinlupa City, Philippines, 1772.'
        };
    }

    if (includesAny(text, ['thank you', 'thanks', 'salamat'])) {
        return {
            route: 'ROUTE: LOCAL_GREETING',
            reply: 'You\'re welcome! Glad to help. Let me know if you need assistance with your aircon.'
        };
    }

    if (includesAny(text, ['pogi ba ako', 'maganda ba ako', 'cute ba ako'])) {
        return {
            route: 'ROUTE: LOCAL_JOKE',
            reply: 'Syempre. Pero mas pogi kapag malamig ang aircon.'
        };
    }

    if (compactText === '1+1' || compactText === '1 + 1') {
        return {
            route: 'ROUTE: LOCAL_JOKE',
            reply: '1 + 1 = 2. For aircon concerns, I can help with cleaning prices, troubleshooting, or booking details too.'
        };
    }

    if (includesAny(text, ['joke', 'tell me a joke', 'funny'])) {
        return {
            route: 'ROUTE: LOCAL_JOKE',
            reply: 'Bakit malamig ang aircon? Kasi ayaw niyang mainitan sa trabaho.'
        };
    }

    if (includesAny(text, ['mainit panahon', 'ang init', 'init ngayon', 'mainit'])) {
        return {
            route: 'ROUTE: LOCAL_FAQ',
            reply: 'Stay hydrated, and make sure your aircon filters are clean for better cooling. Parang sign na rin yan para magpa-PMS ng aircon.'
        };
    }

    if (includesAny(text, ['kamusta', 'anong ginagawa mo', 'busy ka ba'])) {
        return {
            route: 'ROUTE: LOCAL_GREETING',
            reply: 'Always ready to help with DKC services. What aircon concern can I help you with?'
        };
    }

    if (includesAny(text, ['how often maintenance', 'maintenance'])) {
        return {
            route: 'ROUTE: LOCAL_FAQ',
            reply: 'Residential: every 3-6 months.\nCommercial: every 1-3 months.\nRegular PMS helps keep cooling strong and can reduce costly repairs.'
        };
    }

    if (includesAny(text, ['open kayo', 'office hours'])) {
        return {
            route: 'ROUTE: LOCAL_SERVICE',
            reply: 'For scheduling and inquiries, please contact 0927-686-3314, or visit Unit B, 1st Floor Malbarr Building, Brgy. Putatan, Muntinlupa City.'
        };
    }

    if (exchangeCount >= 3 && includesAny(text, ['help', 'pwede', 'ok', 'sige', 'interested'])) {
        return {
            route: 'ROUTE: LOCAL_SALES',
            reply: 'Would you like me to help schedule a DKC technician visit?'
        };
    }

    return null;
}

function wait(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
}

function getErrorStatus(error) {
    return error?.status || error?.code || error?.response?.status || error?.error?.code;
}

function isRetryableGeminiError(error) {
    const status = getErrorStatus(error);
    const message = [
        error?.message,
        error?.statusText,
        error?.error?.message,
        error?.error?.status,
        error?.response?.statusText
    ]
        .filter(Boolean)
        .join(' ')
        .toUpperCase();

    return status === 429 ||
        status === 503 ||
        status === '429' ||
        status === '503' ||
        status === 'UNAVAILABLE' ||
        status === 'RESOURCE_EXHAUSTED' ||
        message.includes('429') ||
        message.includes('503') ||
        message.includes('UNAVAILABLE') ||
        message.includes('RESOURCE_EXHAUSTED') ||
        message.includes('OVERLOADED') ||
        message.includes('OVERLOAD') ||
        message.includes('HIGH TRAFFIC') ||
        message.includes('HIGH DEMAND');
}

async function generateGeminiContentWithRetry(ai, request) {
    let lastError;

    for (let attempt = 0; attempt < GEMINI_MODELS.length; attempt += 1) {
        const model = GEMINI_MODELS[attempt];
        try {
            return await ai.models.generateContent({
                ...request,
                model
            });
        } catch (error) {
            lastError = error;
            if (!isRetryableGeminiError(error) || attempt === GEMINI_MODELS.length - 1) {
                throw error;
            }

            console.log(`Retrying Gemini request (${attempt + 1}/3)...`);
            await wait(geminiRetryDelays[attempt]);
        }
    }

    throw lastError;
}

module.exports = async function handler(req, res) {
    if (req.method === 'OPTIONS') {
        res.status(204).end();
        return;
    }

    if (req.method !== 'POST') {
        res.status(405).json({ error: 'Method not allowed.' });
        return;
    }

    try {
        const body = typeof req.body === 'string' ? JSON.parse(req.body || '{}') : (req.body || {});
        const message = typeof body.message === 'string' ? body.message.trim() : '';
        const history = normalizeMessages(body.history);
        const sessionId = normalizeSessionId(body.sessionId);
        const sessionHistory = kodaSessions.get(sessionId) || [];

        if (!message) {
            res.status(400).json({ error: 'A user message is required.' });
            return;
        }

        const conversation = [
            ...sessionHistory,
            ...history,
            { role: 'user', content: message.slice(0, 2000) }
        ].slice(-18);

        const localRoute = getLocalRoute(message, history, sessionId);
        if (localRoute) {
            console.log(localRoute.route);
            kodaSessions.set(sessionId, [
                ...conversation,
                { role: 'assistant', content: localRoute.reply }
            ].slice(-20));
            res.status(200).json({ reply: localRoute.reply });
            return;
        }

        console.log('ROUTE: GEMINI');

        if (!process.env.GEMINI_API_KEY) {
            res.status(500).json({
                error: 'GEMINI_API_KEY is not configured'
            });
            return;
        }

        const ai = new GoogleGenAI({
            apiKey: process.env.GEMINI_API_KEY
        });

        let response;
        try {
            response = await generateGeminiContentWithRetry(ai, {
                contents: conversation.map(toGeminiContent),
                config: {
                    systemInstruction: kodaSystemPrompt,
                    temperature: 0.65,
                    maxOutputTokens: 520
                }
            });
        } catch (error) {
            if (!isRetryableGeminiError(error)) {
                throw error;
            }

            console.error('Gemini high traffic after retries:', error);
            kodaSessions.set(sessionId, [
                ...conversation,
                { role: 'assistant', content: aiTrafficMessage }
            ].slice(-20));
            res.status(200).json({ reply: aiTrafficMessage });
            return;
        }

        const reply = extractGeminiText(response);
        if (!reply) {
            res.status(502).json({ error: 'Gemini returned an empty response.' });
            return;
        }

        kodaSessions.set(sessionId, [
            ...conversation,
            { role: 'assistant', content: reply }
        ].slice(-20));

        res.status(200).json({ reply });
    } catch (error) {
        console.error('KODA Gemini endpoint error:', error);
        res.status(500).json({ error: 'KODA endpoint failed.' });
    }
};
