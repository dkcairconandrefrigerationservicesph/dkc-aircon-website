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

function isCleaningPriceQuestion(text) {
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
    const pricingRelated = isCleaningPriceQuestion(text);

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

function getLocalReply(message) {
    const text = normalizePricingText(message);
    const compactText = text.replace(/[!?.,]/g, '');

    const pricingReply = getLocalPricingReply(message);
    if (pricingReply) return pricingReply;

    if (['hi', 'hello', 'hey', 'good morning', 'good afternoon', 'good evening'].includes(compactText)) {
        return "Hi! I'm KODA. How can I help you today?";
    }

    if (compactText.includes('contact number') || compactText.includes('phone number') || compactText.includes('number') || compactText.includes('tawag')) {
        return 'You can contact DKC at 0927-686-3314 or landline (02) 8716-7334.';
    }

    if (compactText.includes('location') || compactText.includes('address') || compactText.includes('saan') || compactText.includes('located')) {
        return 'DKC is located at Unit B, 1st Floor Malbarr Building, Brgy. Putatan, Muntinlupa City, Philippines, 1772.';
    }

    if (compactText.includes('services') || compactText.includes('service offered') || compactText.includes('ano services')) {
        return 'DKC offers aircon cleaning/PMS, repair, installation, freon charging, commercial HVAC, and refrigeration services. What service do you need help with?';
    }

    if (compactText.includes('book now') || compactText.includes('booking') || compactText.includes('schedule') || compactText.includes('appointment')) {
        return 'Sure. To book, please contact DKC at 0927-686-3314 and share your aircon type, HP capacity, location, and preferred schedule.';
    }

    if (compactText === '1+1' || compactText === '1 + 1') {
        return '1 + 1 = 2. For aircon concerns, I can help with cleaning prices, troubleshooting, or booking details too.';
    }

    if (compactText.includes('joke')) {
        return 'Quick one: Why did the aircon relax? Because it needed to chill. Need help with cleaning, repair, or booking?';
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

        const localReply = getLocalReply(message);
        if (localReply) {
            console.log('ROUTE: LOCAL');
            kodaSessions.set(sessionId, [
                ...conversation,
                { role: 'assistant', content: localReply }
            ].slice(-20));
            res.status(200).json({ reply: localReply });
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
