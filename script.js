const loadingScreen = document.getElementById('loading-screen');
const loadingProgress = document.querySelector('.loader-progress span');
const loadingPercent = document.querySelector('.loader-percent');
const loadingSubtitle = document.querySelector('.loader-subtitle');
const heroSection = document.getElementById('home');
const navbar = document.querySelector('.navbar');
const heroContent = document.querySelector('.hero-content');
const storyHeadline = document.getElementById('story-headline');
const storySteps = document.querySelectorAll('.story-step');

const kodaEasterConfig = {
    // Trigger phrases for the hidden KODA lyric overlay.
    triggerPhrases: [
        "why wasn't i enough?",
        'am i enough?',
        'too little too late',
        "heaven's gate",
        'i abdicate'
    ],
    // Path to the audio file used for the hidden Easter egg.
    mediaPath: '/sounds/laufeysoundbg.mp3',
    // Lyric sequence with durations (in seconds) - synchronized to vocals
    lyricSequence: [
        { text: "I swear to God, I almost drowned", duration: 4 },
        { text: "You asked me how I've been", duration: 5 },
        { text: "But how could I begin?", duration: 4 },
        { text: "To tell you I should've chased you", duration: 5 },
        { text: "I should be who you're engaged to", duration: 4 },
        { text: "Lost my fight with fate", duration: 5 },
        { text: "A tug-of-war of leave and stay", duration: 4 },
        { text: "I give in, I abdicate", duration: 4 },
        { text: "I lay my sword down anyway", duration: 5 },
        { text: "I'll see you at Heaven's gate", duration: 4 },
        { text: "'Cause it's too little, way too late", duration: 6 }
    ],
    endingQuote: 'Some things are only felt when they’re gone.\nComfort shouldn’t be one of them.',
    endingHeading: 'DKC Airconditioning and Refrigeration Services',
    endingSubheading: 'We Provide Good Service',
    endingButtonText: 'Book Now',
    endingButtonTarget: '#contact',
    lyricFadeDuration: 900,
    lyricHoldGap: 240,
    typingSpeed: 38,
    lyricPositions: [
        'position-center',
        'position-upper-left',
        'position-upper-right',
        'position-lower-left',
        'position-lower-right',
        'position-left',
        'position-right'
    ],
    memoryCards: [
        'WHY WASN\'T I ENOUGH?',
        'DON\'T LOOK BACK',
        'THE ROOM REMEMBERS',
        'TOO LATE',
        'SILENCE',
        'EMPTY HALLWAY',
        'HEAVEN WAITS',
        'I STILL HEAR IT',
        'NO ANSWER',
        'COLD LIGHT',
        'FADING',
        'STAY',
        'LEAVE',
        'AFTERIMAGE',
        'THE DOOR IS OPEN'
    ]
};

let kodaEasterState = {
    isActive: false,
    currentLyricIndex: -1,
    hasStartedEnding: false,
    endTimeoutId: null,
    blackoutTimeoutId: null,
    resetTimeoutId: null,
    effectTimeoutIds: []
};

let loadingValue = 0;
const loadInterval = setInterval(() => {
    loadingValue += Math.random() * 8 + 2; // Smoother increment
    if (loadingValue >= 100) {
        loadingValue = 100;
        clearInterval(loadInterval);
        
        // Update final text
        loadingSubtitle.textContent = 'Ready.';
        
        // Wait 400ms then hide loader
        setTimeout(() => {
            if (loadingScreen) {
                loadingScreen.classList.add('loader-hide');
                document.body.classList.remove('is-loading');
                setTimeout(() => {
                    loadingScreen.remove();
                    document.body.classList.add('page-ready');
                }, 800);
            }
        }, 400);
    }
    
    // Update progress bar
    if (loadingProgress) {
        loadingProgress.style.width = `${loadingValue}%`;
    }
    
    // Update percentage counter
    if (loadingPercent) {
        loadingPercent.textContent = `${Math.floor(loadingValue)}%`;
    }
    
    // Update subtitle text based on progress
    if (loadingValue <= 25) {
        loadingSubtitle.textContent = 'Initializing cooling system…';
    } else if (loadingValue <= 55) {
        loadingSubtitle.textContent = 'Preparing clean airflow…';
    } else if (loadingValue <= 85) {
        loadingSubtitle.textContent = 'Stabilizing temperature…';
    } else if (loadingValue < 100) {
        loadingSubtitle.textContent = 'Finalizing setup…';
    }
}, 80);

window.addEventListener('load', () => {
    document.body.classList.add('loaded');
    observeReveals();
    observeStorySteps();
    updateActiveLink();
    setupCompareSlider();
    setupMobileMenu();
    initSounds();
    initVideo();
    initContactForm();
    initTrustShuffle();
    initDkcAssistant();
    initKodaEasterEgg();
});

function initSounds() {
    const ambientAudio = new Audio('sounds/Ambient.mp3');
    ambientAudio.loop = true;
    ambientAudio.volume = 0.3;
    ambientAudio.play().catch(() => {}); // Autoplay may be blocked

    const clickAudio = new Audio('sounds/Click.mp3');
    const hoverAudio = new Audio('sounds/Hover.mp3');

    // Click sounds for buttons and links
    document.querySelectorAll('a, button, .btn').forEach(el => {
        el.addEventListener('click', () => {
            clickAudio.currentTime = 0;
            clickAudio.play().catch(() => {});
        });
    });

    // Hover sounds for interactive elements
    document.querySelectorAll('a, button, .btn, .service-card, .feature-card, .project-card, .trust-card').forEach(el => {
        el.addEventListener('mouseenter', () => {
            hoverAudio.currentTime = 0;
            hoverAudio.play().catch(() => {});
        });
    });
}

function setupCompareSlider() {
    const compareContainer = document.querySelector('.before-after');
    const afterWrap = document.querySelector('.ba-after-wrap');
    const divider = document.querySelector('.ba-divider');
    const handle = document.querySelector('.ba-handle');
    if (!compareContainer || !afterWrap || !divider || !handle) return;

    let isDragging = false;
    let animationFrame = null;
    let targetX = 0;

    const clamp = (value, min, max) => Math.min(Math.max(value, min), max);

    const updateHandle = (clientX) => {
        const rect = compareContainer.getBoundingClientRect();
        let x = clientX - rect.left;
        x = clamp(x, 0, rect.width);
        const percentage = x / rect.width * 100;
        targetX = percentage;
        if (animationFrame === null) {
            animationFrame = requestAnimationFrame(() => {
                afterWrap.style.width = `${targetX}%`;
                divider.style.left = `${targetX}%`;
                animationFrame = null;
            });
        }
    };

    const startDrag = (event) => {
        isDragging = true;
        compareContainer.setPointerCapture?.(event.pointerId);
        updateHandle(event.clientX);
    };

    const drag = (event) => {
        if (!isDragging) return;
        updateHandle(event.clientX);
    };

    const endDrag = (event) => {
        isDragging = false;
        compareContainer.releasePointerCapture?.(event.pointerId);
    };

    divider.addEventListener('pointerdown', startDrag);
    compareContainer.addEventListener('pointerdown', startDrag);
    compareContainer.addEventListener('pointermove', drag);
    compareContainer.addEventListener('pointerup', endDrag);
    compareContainer.addEventListener('pointercancel', endDrag);
    compareContainer.addEventListener('pointerleave', endDrag);

    afterWrap.style.width = '50%';
    divider.style.left = '50%';
}

function smoothScrollTo(targetId) {
    const target = document.querySelector(targetId);
    if (!target) return;
    const offset = 78;
    const topPosition = target.getBoundingClientRect().top + window.pageYOffset - offset;
    window.scrollTo({ top: topPosition, behavior: 'smooth' });
}

document.querySelectorAll('a[href^="#"]').forEach(link => {
    link.addEventListener('click', event => {
        event.preventDefault();
        const targetId = link.getAttribute('href');
        smoothScrollTo(targetId);
    });
});

function observeReveals() {
    const revealElements = document.querySelectorAll('.reveal');
    const observer = new IntersectionObserver((entries) => {
        entries.forEach(entry => {
            if (entry.isIntersecting) {
                entry.target.classList.add('visible');
                observer.unobserve(entry.target);
            }
        });
    }, { threshold: 0.2 });
    revealElements.forEach(el => observer.observe(el));
}

function observeStorySteps() {
    if (!storyHeadline) return;

    const animateHeadline = (text) => {
        storyHeadline.classList.remove('story-headline-animate');
        void storyHeadline.offsetWidth;
        storyHeadline.textContent = text;
        storyHeadline.classList.add('story-headline-animate');
    };

    const observer = new IntersectionObserver((entries) => {
        entries.forEach(entry => {
            if (entry.isIntersecting) {
                const headlineText = entry.target.dataset.headline;
                if (headlineText) {
                    animateHeadline(headlineText);
                }
            }
        });
    }, { threshold: 0.55 });
    storySteps.forEach(step => observer.observe(step));
}

function updateActiveLink() {
    const sections = document.querySelectorAll('main section[id]');
    const links = document.querySelectorAll('.nav-menu a, .mobile-menu a');

    const observer = new IntersectionObserver((entries) => {
        entries.forEach(entry => {
            const id = entry.target.id;
            const link = document.querySelector(`.nav-menu a[href="#${id}"], .mobile-menu a[href="#${id}"]`);
            if (link) {
                if (entry.isIntersecting) {
                    links.forEach(item => item.classList.remove('active'));
                    link.classList.add('active');
                }
            }
        });
    }, { threshold: 0.4 });

    sections.forEach(section => observer.observe(section));
}

function setupMobileMenu() {
    const navToggle = document.querySelector('.nav-toggle');
    const mobileMenu = document.querySelector('.mobile-menu');
    const mobileLinks = document.querySelectorAll('.mobile-menu a[href^="#"]');

    if (!navToggle || !mobileMenu) return;

    navToggle.addEventListener('click', () => {
        const isOpen = mobileMenu.classList.toggle('is-open');
        navToggle.classList.toggle('is-open', isOpen);
        navToggle.setAttribute('aria-expanded', String(isOpen));
        mobileMenu.setAttribute('aria-hidden', String(!isOpen));
    });

    mobileLinks.forEach(link => {
        link.addEventListener('click', () => {
            mobileMenu.classList.remove('is-open');
            navToggle.classList.remove('is-open');
            navToggle.setAttribute('aria-expanded', 'false');
            mobileMenu.setAttribute('aria-hidden', 'true');
        });
    });

    window.addEventListener('resize', () => {
        if (window.innerWidth > 1100 && mobileMenu.classList.contains('is-open')) {
            mobileMenu.classList.remove('is-open');
            navToggle.classList.remove('is-open');
            navToggle.setAttribute('aria-expanded', 'false');
            mobileMenu.setAttribute('aria-hidden', 'true');
        }
    });
}

window.addEventListener('scroll', () => {
    const scrollY = window.scrollY;
    if (navbar) {
        if (scrollY > 40) {
            navbar.classList.add('scrolled');
        } else {
            navbar.classList.remove('scrolled');
        }
    }
    const offset = scrollY * 0.18;
    if (heroSection) {
        heroSection.style.backgroundPosition = `center calc(50% + ${offset}px)`;
    }
});

const heroMist = document.querySelectorAll('.hero-mist span');
heroMist.forEach((bubble, index) => {
    const delay = index * 1200;
    bubble.style.animationDelay = `${delay}ms`;
});

function initVideo() {
    const heroVideo = document.querySelector('.hero-video');
    if (heroVideo) {
        heroVideo.play().catch(() => {
            // Autoplay blocked, user interaction needed
        });
    }
}

function initContactForm() {
    const contactForm = document.getElementById('contact-form');
    const formMessage = document.querySelector('.contact-form-message');
    const submitButton = contactForm?.querySelector('button[type="submit"]');
    const EMAILJS_PUBLIC_KEY = 'hkm69zLQUWubyiElH';
    const EMAILJS_SERVICE_ID = 'service_2seef04';
    const EMAILJS_TEMPLATE_ID = 'template_v90dnbw';
    const facebookUrl = 'https://www.facebook.com/profile.php?id=100063675776144';

    const showMessage = (message, type = 'success') => {
        if (!formMessage) return;
        formMessage.innerHTML = message;
        formMessage.classList.remove('success', 'error');
        formMessage.classList.add(type);
        formMessage.style.display = 'block';
        formMessage.scrollIntoView({ behavior: 'smooth', block: 'center' });
    };

    const getFormValue = (name) => {
        const field = contactForm?.querySelector(`[name="${name}"]`);
        return field ? field.value.trim() : '';
    };

    const getSelectedService = () => {
        const serviceField = contactForm?.querySelector('[name="service"]');
        return serviceField?.selectedOptions?.[0]?.textContent?.trim() || getFormValue('service') || 'Not specified';
    };

    const buildBookingPayload = (readValue = getFormValue, readService = getSelectedService) => {
        const customerMessage = readValue('message') || 'No message provided';
        return {
            from_name: readValue('from_name'),
            phone: readValue('phone'),
            email: readValue('email'),
            service: readService(),
            message: [
                `Location: ${readValue('location') || 'Not provided'}`,
                `Aircon Type: ${readValue('aircon_type') || 'Not provided'}`,
                `HP Capacity: ${readValue('hp_capacity') || 'Not provided'}`,
                `Concern/Message: ${customerMessage}`
            ].join('\n')
        };
    };

    window.dkcBuildBookingPayload = buildBookingPayload;

    const setSubmitState = (isSending) => {
        if (!submitButton) return;
        submitButton.disabled = isSending;
        submitButton.textContent = isSending ? 'Sending...' : 'Request Service';
    };

    const showFallbackMessage = () => {
        showMessage(
            `We could not send the booking form right now. Please message us directly on <a href="${facebookUrl}" target="_blank" rel="noopener noreferrer">Facebook</a> or call 0927-686-3314.`,
            'error'
        );
    };

    if (contactForm) {
        contactForm.addEventListener('submit', function(event) {
            event.preventDefault();
            
            const nameField = contactForm.querySelector('[name="from_name"]');
            const duplicateName = contactForm.querySelector('[name="name"]');
            if (nameField && duplicateName) {
                duplicateName.value = nameField.value;
            }

            console.log("EmailJS ready:", typeof emailjs !== "undefined");
            console.log("EmailJS public key configured:", Boolean(EMAILJS_PUBLIC_KEY));

            if (!window.emailjs) {
                showFallbackMessage();
                return;
            }

            setSubmitState(true);

            const templateParams = buildBookingPayload();
            console.log("Booking payload:", templateParams);

            emailjs.init({ publicKey: EMAILJS_PUBLIC_KEY });

            emailjs.send(EMAILJS_SERVICE_ID, EMAILJS_TEMPLATE_ID, templateParams, EMAILJS_PUBLIC_KEY)
                .then(function(response) {
                    console.log("Booking email sent successfully:", response);
                    showMessage('Your booking request has been sent successfully. DKC will contact you shortly.');
                    contactForm.reset();
                }, function(error) {
                    showFallbackMessage();
                    console.error("Booking email failed:", error);
                })
                .finally(function() {
                    setSubmitState(false);
                });
        });
    }
}

const trustCardEls = document.querySelectorAll('.trust-card');
const trustMediaImage = document.querySelector('.trust-media-image');
const trustMediaVideo = document.querySelector('.trust-media-video');

const trustItems = [
    {
        quote: 'DKC made our home aircon feel brand new again. Fast, clean, and exactly what we needed.',
        author: 'Homeowner – Muntinlupa'
    },
    {
        quote: 'Excellent service and honest pricing. Our office units stay colder and the schedule was reliable.',
        author: 'Office Client – Alabang'
    },
    {
        quote: 'Professional from start to finish. Clean workmanship and great communication throughout the job.',
        author: 'Residential Client'
    },
    {
        quote: 'Reliable same-day service with attention to detail. The techs were courteous and well-prepared.',
        author: 'Restaurant Manager'
    },
    {
        quote: 'They fixed our freezer quickly and the temperature has been stable ever since. Very trustworthy.',
        author: 'Warehouse Owner'
    },
    {
        quote: 'We’ve used DKC multiple times for maintenance. They always arrive on time and leave the area spotless.',
        author: 'Condo Resident'
    }
];

const trustMediaItems = [
    { type: 'image', src: 'images/imageshuf.jpg', alt: 'Trusted cooling service snapshot' },
    { type: 'image', src: 'images/imageshuf2.jpg', alt: 'Same-day aircon maintenance visuals' },
    { type: 'image', src: 'images/imageshuf3.jpg', alt: 'Refrigeration inspection with DKC' },
    { type: 'image', src: 'images/imageshuf4.jpg', alt: 'Professional aircon cleaning and service' },
    { type: 'image', src: 'images/imageshuf5.jpg', alt: 'DKC team working on a cooling system' },
    { type: 'video', src: 'videos/aircon.mp4', alt: 'Aircon service in action' }
];

let trustSlideStart = 0;
let trustMediaIndex = 0;

function refreshTrustCards() {
    if (!trustCardEls.length) return;
    trustCardEls.forEach((card, index) => {
        const item = trustItems[(trustSlideStart + index) % trustItems.length];
        const quoteEl = card.querySelector('p');
        const authorEl = card.querySelector('span');
        if (quoteEl) quoteEl.textContent = item.quote;
        if (authorEl) authorEl.textContent = item.author;
    });
}

function refreshTrustMedia() {
    if (!trustMediaImage || !trustMediaVideo) return;
    const media = trustMediaItems[trustMediaIndex % trustMediaItems.length];
    trustMediaImage.classList.remove('active');
    trustMediaVideo.classList.remove('active');

    if (media.type === 'video') {
        trustMediaVideo.src = media.src;
        trustMediaVideo.load();
        trustMediaVideo.play().catch(() => {});
        trustMediaVideo.classList.add('active');
    } else {
        trustMediaImage.src = media.src;
        trustMediaImage.alt = media.alt;
        trustMediaImage.classList.add('active');
    }
}

function rotateTrustSection() {
    trustSlideStart = (trustSlideStart + 1) % trustItems.length;
    trustMediaIndex = (trustMediaIndex + 1) % trustMediaItems.length;
    refreshTrustCards();
    refreshTrustMedia();
}

function initTrustShuffle() {
    refreshTrustCards();
    refreshTrustMedia();
    setInterval(() => {
        rotateTrustSection();
    }, 10000);
}

function isKodaEasterTrigger(message) {
    if (!message) return false;
    const normalized = message.trim().toLowerCase();
    return kodaEasterConfig.triggerPhrases.includes(normalized);
}

function resetKodaEasterState() {
    kodaEasterState.currentLyricIndex = -1;
    kodaEasterState.hasStartedEnding = false;
    clearTimeout(kodaEasterState.endTimeoutId);
    clearTimeout(kodaEasterState.blackoutTimeoutId);
    clearTimeout(kodaEasterState.resetTimeoutId);
    kodaEasterState.effectTimeoutIds.forEach(timeoutId => clearTimeout(timeoutId));
    kodaEasterState.effectTimeoutIds = [];
}

function initKodaEasterEgg() {
    const overlay = document.getElementById('koda-easter-overlay');
    const lyricStack = document.getElementById('koda-easter-lyric-stack');
    const cardLayer = document.querySelector('.koda-easter-card-layer');
    const endingEl = document.getElementById('koda-easter-ending');
    const endingQuote = document.getElementById('koda-easter-ending-quote');
    const endingHeading = document.getElementById('koda-easter-ending-heading');
    const endingSubheading = document.getElementById('koda-easter-ending-subheading');
    const endingCta = document.getElementById('koda-easter-ending-cta');
    const closeButton = document.querySelector('.koda-easter-close');
    const audio = document.getElementById('koda-easter-audio');

    if (!overlay || !lyricStack || !cardLayer || !endingEl || !endingQuote || !endingHeading || !endingSubheading || !endingCta || !closeButton || !audio) {
        return;
    }

    endingQuote.textContent = kodaEasterConfig.endingQuote;
    endingHeading.textContent = kodaEasterConfig.endingHeading;
    endingSubheading.textContent = kodaEasterConfig.endingSubheading;
    endingCta.textContent = kodaEasterConfig.endingButtonText;
    endingCta.setAttribute('href', kodaEasterConfig.endingButtonTarget);
    audio.src = kodaEasterConfig.mediaPath;
    audio.preload = 'auto';
    audio.loop = false;
    audio.volume = 0.9;

    const getRandomItem = (array) => array[Math.floor(Math.random() * array.length)];

    const clearLyricStack = () => {
        lyricStack.innerHTML = '';
        kodaEasterState.currentLyricIndex = -1;
    };

    const clearFlashCards = () => {
        cardLayer.innerHTML = '';
    };

    const createFlashCard = () => {
        const card = document.createElement('div');
        card.className = 'koda-easter-flash-card';
        card.innerHTML = '<span></span>';
        cardLayer.appendChild(card);
        return card;
    };

    const getLyricIntensityClass = (index) => {
        if (index >= 9) return 'intensity-finale';
        if (index >= 6) return 'intensity-peak';
        if (index >= 3) return 'intensity-grow';
        return 'intensity-quiet';
    };

    const buildLyricLine = (text, positionClass, isChorus = false, index = 0, shouldFlash = false) => {
        const line = document.createElement('div');
        const invertedPeakLines = new Set([3, 6, 8, 10]);
        const schemeClass = (index % 2 === 1 || invertedPeakLines.has(index)) ? 'inverted' : 'normal';
        const intensityClass = getLyricIntensityClass(index);
        line.className = `koda-easter-lyric-card koda-easter-lyric-line ${positionClass} ${schemeClass} ${intensityClass}${isChorus ? ' chorus' : ''}${shouldFlash ? ' flash' : ''}`;
        line.dataset.fullText = text;
        line.textContent = '';

        const offsetPattern = [
            [0, 0],
            [-10, -8],
            [12, 10],
            [-18, 16],
            [18, -14],
            [-8, 22],
            [10, -22],
            [-22, 8],
            [22, -6],
            [-12, -18],
            [0, 0]
        ];
        const [offsetX, offsetY] = offsetPattern[index % offsetPattern.length];
        line.style.setProperty('--offset-x', `${offsetX}px`);
        line.style.setProperty('--offset-y', `${offsetY}px`);
        line.style.zIndex = `${100 + index}`;
        return line;
    };

    const applyKaraokeEffect = (element, durationSeconds = 4, index = 0) => {
        const text = element.dataset.fullText || '';
        const characters = Array.from(text);
        const revealSeconds = Math.max(1.6, durationSeconds * 0.88);
        const charCount = Math.max(1, characters.length);
        const fragment = document.createDocumentFragment();

        element.classList.add('karaoke');
        element.style.setProperty('--karaoke-duration', `${revealSeconds}s`);
        element.style.setProperty('--karaoke-count', charCount);
        element.innerHTML = '';

        characters.forEach((character, charIndex) => {
            const span = document.createElement('span');
            span.className = character === ' ' ? 'karaoke-char karaoke-space' : 'karaoke-char';
            span.textContent = character === ' ' ? '\u00a0' : character;
            span.style.setProperty('--char-index', charIndex);
            span.style.animationDelay = `${(revealSeconds * charIndex) / charCount}s`;
            span.style.animationDuration = `${index >= 6 ? 0.42 : 0.34}s`;
            fragment.appendChild(span);
        });

        element.appendChild(fragment);
    };

    const applyTypingEffect = (element, overrideText) => {
        const text = overrideText ?? element.dataset.fullText ?? '';
        const length = Math.max(0, text.length);
        const speed = Math.max(20, kodaEasterConfig.typingSpeed - Math.min(18, Math.floor(length / 2)));
        let index = 0;

        element.classList.add('typing');
        if (element._typingInterval) {
            clearInterval(element._typingInterval);
        }

        element._typingInterval = setInterval(() => {
            if (index >= length) {
                clearInterval(element._typingInterval);
                element._typingInterval = null;
                element.classList.remove('typing');
                element.classList.add('typed');
                if (typeof element._typingComplete === 'function') {
                    element._typingComplete();
                    element._typingComplete = null;
                }
                return;
            }
            element.textContent += text[index++];
        }, speed);
    };

    const getPositionClass = () => 'position-stack';

    const showFlashCard = (index) => {
        const memoryCards = kodaEasterConfig.memoryCards;
        const cards = cardLayer.querySelectorAll('.koda-easter-flash-card');
        if (!cards.length) return;

        const card = cards[index % cards.length];
        const memory = getRandomItem(memoryCards);
        const size = 180 + Math.round(Math.random() * 180);
        const top = 4 + Math.round(Math.random() * 82);
        const left = 3 + Math.round(Math.random() * 86);
        const rotation = -6 + Math.round(Math.random() * 12);
        const hues = ['255,255,255', '180,211,255', '255,60,76', '210,235,255'];
        const tint = getRandomItem(hues);

        card.style.width = `${size}px`;
        card.style.height = `${size * 0.75}px`;
        card.style.top = `${top}%`;
        card.style.left = `${left}%`;
        card.style.setProperty('--rotate', `${rotation}deg`);
        card.style.background = `linear-gradient(135deg, rgba(${tint}, 0.18), rgba(0, 0, 0, 0.04))`;
        card.querySelector('span').textContent = memory;
        card.classList.add('visible');

        const flashDuration = 100 + Math.round(Math.random() * 150);
        setTimeout(() => {
            card.classList.remove('visible');
        }, flashDuration);
    };

    const setOverlayMood = (index) => {
        overlay.classList.remove('phase-quiet', 'phase-grow', 'phase-peak', 'phase-finale');
        if (index >= 9) {
            overlay.classList.add('phase-finale');
        } else if (index >= 6) {
            overlay.classList.add('phase-peak');
        } else if (index >= 3) {
            overlay.classList.add('phase-grow');
        } else {
            overlay.classList.add('phase-quiet');
        }

        overlay.classList.toggle('beat-cut', index === 3 || index === 6 || index === 8 || index === 10);
    };

    const queueEffectTimeout = (callback, delay) => {
        const timeoutId = setTimeout(() => {
            kodaEasterState.effectTimeoutIds = kodaEasterState.effectTimeoutIds.filter(id => id !== timeoutId);
            callback();
        }, delay);
        kodaEasterState.effectTimeoutIds.push(timeoutId);
        return timeoutId;
    };

    const pulseOverlay = (duration = 260) => {
        overlay.classList.add('flash-burst');
        queueEffectTimeout(() => overlay.classList.remove('flash-burst'), duration);
    };

    const scheduleEffectBursts = (index, durationSeconds) => {
        kodaEasterState.effectTimeoutIds.forEach(timeoutId => clearTimeout(timeoutId));
        kodaEasterState.effectTimeoutIds = [];
        overlay.classList.remove('flash-burst', 'lyric-surge');

        const burstCount = index >= 9 ? 7 : index >= 6 ? 5 : index >= 3 ? 3 : 1;
        const availableMs = Math.max(1200, durationSeconds * 1000 - 420);

        for (let burstIndex = 0; burstIndex < burstCount; burstIndex += 1) {
            const progress = (burstIndex + 1) / (burstCount + 1);
            const delay = Math.round(260 + availableMs * progress);
            queueEffectTimeout(() => {
                if (!overlay.classList.contains('is-active')) return;
                showFlashCard(index + burstIndex);
                if (index >= 6 || burstIndex === burstCount - 1) {
                    pulseOverlay(index >= 9 ? 360 : 260);
                }
                if (index >= 8) {
                    overlay.classList.add('lyric-surge');
                    queueEffectTimeout(() => overlay.classList.remove('lyric-surge'), 520);
                }
            }, delay);
        }
    };

    const fadeOutOldLines = () => {
        // Previous cards stay visible as a layered emotional stack.
    };

    const showLyric = (index) => {
        if (kodaEasterState.currentLyricIndex === index) return;
        const lyric = kodaEasterConfig.lyricSequence[index]?.text || '';
        kodaEasterState.currentLyricIndex = index;
        setOverlayMood(index);

        if (!lyric) {
            const remainingDelay = 250 + kodaEasterConfig.lyricHoldGap;
            kodaEasterState.resetTimeoutId = setTimeout(() => {
                startEndingSequence();
            }, remainingDelay);
            return;
        }

        const positionClass = getPositionClass(index);
        const isChorus = index >= 7;
        const lyricDuration = kodaEasterConfig.lyricSequence[index]?.duration || 4;
        const invertedPeakLines = new Set([3, 6, 8, 10]);
        const shouldFlash = invertedPeakLines.has(index) || isChorus;
        const newLine = buildLyricLine(lyric, positionClass, isChorus, index, shouldFlash);
        lyricStack.appendChild(newLine);

        requestAnimationFrame(() => {
            const previousLines = lyricStack.querySelectorAll('.koda-easter-lyric-card.visible');
            previousLines.forEach(line => {
                line.classList.remove('visible');
                line.classList.add('past');
            });
            newLine.classList.add('visible');
            if (shouldFlash) {
                setTimeout(() => newLine.classList.remove('flash'), 420);
            }
        });

        applyKaraokeEffect(newLine, lyricDuration, index);
        scheduleEffectBursts(index, lyricDuration);

        // Enhanced emotional progression with memory cards
        if (isChorus) {
            overlay.classList.add('lyric-surge', 'flash-burst');
            setTimeout(() => overlay.classList.remove('flash-burst'), 240);
            setTimeout(() => overlay.classList.remove('lyric-surge'), 900);
        }

        // Memory card flashing throughout the song
        // More frequent during peak emotional moments
        if (index >= 3) { // Start after "To tell you I should've chased you"
            if (Math.random() < (index >= 7 ? 0.7 : 0.45)) {
                showFlashCard(index);
            }
        }
        
        // Guaranteed flashes at emotional peaks
        if (index === 3 || index === 6 || index === 8 || index === 10) {
            setTimeout(() => showFlashCard(index), 120);
        }
    };

    const startEndingSequence = () => {
        if (kodaEasterState.hasStartedEnding) return;
        kodaEasterState.hasStartedEnding = true;

        overlay.classList.add('blackout');
        lyricStack.classList.add('fade-out');
        kodaEasterState.blackoutTimeoutId = setTimeout(() => {
            endingEl.classList.add('visible');
            audio.pause();
            endingQuote.textContent = '';
            endingQuote.classList.remove('typed', 'typing');
            endingHeading.classList.remove('show');
            endingSubheading.classList.remove('show');
            endingCta.classList.remove('show');

            endingQuote._typingComplete = () => {
                endingHeading.classList.add('show');
                setTimeout(() => endingSubheading.classList.add('show'), 220);
                setTimeout(() => endingCta.classList.add('show'), 520);
            };
            applyTypingEffect(endingQuote, kodaEasterConfig.endingQuote);
        }, 750);
    };

    const updateOverlayProgress = () => {
        if (!audio || audio.readyState < 2) return;
        const currentTime = audio.currentTime;
        const sequence = kodaEasterConfig.lyricSequence;
        
        let accumulatedTime = 0;
        for (let index = 0; index < sequence.length; index += 1) {
            const lyricDurationSeconds = sequence[index].duration;
            if (currentTime >= accumulatedTime && currentTime < accumulatedTime + lyricDurationSeconds) {
                showLyric(index);
                break;
            }
            accumulatedTime += lyricDurationSeconds;
        }
    };

    const openOverlay = () => {
        resetKodaEasterState();
        clearLyricStack();
        clearFlashCards();

        overlay.classList.add('is-active');
        overlay.setAttribute('aria-hidden', 'false');
        document.body.classList.add('koda-easter-open');
        document.documentElement.classList.add('koda-easter-open');
        document.body.style.overflow = 'hidden';
        endingEl.classList.remove('visible');
        overlay.classList.remove('blackout', 'beat-cut', 'flash-burst', 'lyric-surge', 'phase-grow', 'phase-peak', 'phase-finale');
        overlay.classList.add('phase-quiet');
        overlay.style.pointerEvents = 'auto';

        lyricStack.classList.remove('fade-out');
        endingEl.classList.remove('visible');
        endingHeading.classList.remove('show');
        endingSubheading.classList.remove('show');
        endingCta.classList.remove('show');
        endingQuote.textContent = '';
        endingQuote.classList.remove('typing', 'typed');

        for (let i = 0; i < 4; i += 1) {
            createFlashCard();
        }

        audio.currentTime = 0;
        audio.play().catch(() => {});
        showLyric(0);
    };

    const closeOverlay = () => {
        overlay.classList.remove('is-active', 'phase-quiet', 'phase-grow', 'phase-peak', 'phase-finale', 'blackout', 'beat-cut', 'flash-burst', 'lyric-surge');
        overlay.setAttribute('aria-hidden', 'true');
        document.body.classList.remove('koda-easter-open');
        document.documentElement.classList.remove('koda-easter-open');
        document.body.style.overflow = '';
        clearLyricStack();
        clearFlashCards();
        endingEl.classList.remove('visible');
        overlay.style.pointerEvents = 'none';
        audio.pause();
        audio.currentTime = 0;
        resetKodaEasterState();
    };

    closeButton.addEventListener('click', closeOverlay);
    endingCta.addEventListener('click', (event) => {
        event.preventDefault();
        closeOverlay();
        const target = document.querySelector(kodaEasterConfig.endingButtonTarget);
        if (target) {
            target.scrollIntoView({ behavior: 'smooth', block: 'start' });
        }
    });

    audio.addEventListener('timeupdate', () => {
        if (!overlay.classList.contains('is-active')) return;
        updateOverlayProgress();
    });

    audio.addEventListener('ended', () => {
        startEndingSequence();
    });

    window.triggerKodaEaster = openOverlay;
}

function initDkcAssistant() {
    const assistant = document.querySelector('.ai-assistant');
    const toggle = document.querySelector('.ai-assistant-toggle');
    const close = document.querySelector('.ai-assistant-close');
    const messages = document.querySelector('.ai-messages');
    const form = document.querySelector('.ai-form');
    const input = document.getElementById('ai-question');
    const quickPrompts = document.querySelectorAll('[data-ai-prompt]');
    const storageKey = 'dkc-koda-chat-history-v5';
    const sessionKey = 'dkc-koda-session-id';
    const openingMessage = "Hi! I'm KODA, DKC's HVAC Knowledge & Operations Digital Assistant. You can ask me about aircon cleaning prices, common aircon problems, maintenance tips, installation, repair, freon charging, commercial HVAC, refrigeration, and DKC services.";
    const staticHostingMessage = 'KODA AI is available only on the live DKC website with its backend API. For now, please contact DKC at 0927-686-3314.';
    const apiErrorMessage = 'Sorry, KODA could not reach the AI service right now. Please try again in a moment, or contact DKC at 0927-686-3314.';
    let conversationHistory = loadKodaHistory(storageKey);
    let introShown = conversationHistory.length > 0;
    let isWaitingForReply = false;
    const sessionId = getKodaSessionId(sessionKey);
    const mobileKodaQuery = window.matchMedia('(max-width: 768px)');

    if (!assistant || !toggle || !messages || !form || !input) return;

    const setOpen = (isOpen) => {
        assistant.classList.toggle('is-open', isOpen);
        document.body.classList.toggle('koda-mobile-open', isOpen && mobileKodaQuery.matches);
        toggle.setAttribute('aria-expanded', String(isOpen));
        const panel = assistant.querySelector('.ai-assistant-panel');
        if (panel) panel.setAttribute('aria-hidden', String(!isOpen));
        if (isOpen) {
            showOpeningMessage();
            setTimeout(() => {
                input.focus();
                resizeKodaInput(input);
                scrollKodaToBottom(messages);
            }, 120);
        }
    };

    const syncKodaViewportState = () => {
        document.body.classList.toggle('koda-mobile-open', assistant.classList.contains('is-open') && mobileKodaQuery.matches);
    };

    const saveHistory = () => {
        const trimmedHistory = conversationHistory.slice(-20);
        conversationHistory = trimmedHistory;
        try {
            localStorage.setItem(storageKey, JSON.stringify(trimmedHistory));
        } catch (error) {
            console.warn('Unable to save KODA chat history:', error);
        }
    };

    const renderMessage = (text, role, shouldStore = true) => {
        const sender = role === 'user' ? 'user' : 'bot';
        const message = document.createElement('div');
        message.className = `ai-message ${sender}`;
        if (role === 'assistant') {
            const avatar = document.createElement('img');
            avatar.className = 'ai-message-avatar';
            avatar.src = 'images/KODAICON.png';
            avatar.alt = 'KODA';
            const bubble = document.createElement('div');
            bubble.className = 'ai-message-bubble';
            bubble.textContent = text;
            message.append(avatar, bubble);
        } else {
            const bubble = document.createElement('div');
            bubble.className = 'ai-message-bubble';
            bubble.textContent = text;
            message.appendChild(bubble);
        }
        messages.appendChild(message);
        scrollKodaToBottom(messages);
        if (shouldStore) {
            conversationHistory.push({
                role,
                content: text
            });
            saveHistory();
        }
        return message;
    };

    const showOpeningMessage = () => {
        if (introShown || conversationHistory.length) return;
        introShown = true;
        renderMessage(openingMessage, 'assistant');
    };

    const setWaitingState = (isWaiting) => {
        isWaitingForReply = isWaiting;
        input.disabled = isWaiting;
        const submitButton = form.querySelector('button[type="submit"]');
        if (submitButton) submitButton.disabled = isWaiting;
    };

    const askAssistant = async (question) => {
        const userMessage = question.trim();
        if (!userMessage || isWaitingForReply) return;
        showOpeningMessage();
        renderMessage(userMessage, 'user');
        assistant.classList.add('has-user-message');

        if (isKodaEasterTrigger(userMessage)) {
            window.triggerKodaEaster?.();
            return;
        }

        if (isStaticOnlyKodaHost()) {
            renderMessage(staticHostingMessage, 'assistant', false);
            return;
        }

        setWaitingState(true);
        const typingMessage = addTypingMessage(messages);

        try {
            const chatHistory = conversationHistory.slice(0, -1).slice(-16);
            const kodaSessionId = sessionId;
            const payload = {
                message: userMessage,
                history: chatHistory,
                sessionId: kodaSessionId
            };
            console.log("Calling KODA API:", "/api/koda-chat", payload);
            const response = await fetch('/api/koda-chat', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    message: userMessage,
                    history: chatHistory,
                    sessionId: kodaSessionId
                })
            });

            const data = await response.json();

            if (!response.ok) {
                throw new Error(data.error || 'KODA API request failed');
            }

            const answer = typeof data.reply === 'string' ? data.reply.trim() : '';
            if (!answer) throw new Error('KODA API returned an empty response.');
            typingMessage.remove();
            renderMessage(answer, 'assistant');
        } catch (error) {
            console.error("KODA API failed:", error);
            typingMessage.remove();
            renderMessage(apiErrorMessage, 'assistant', false);
        } finally {
            setWaitingState(false);
            input.focus();
            resizeKodaInput(input);
        }
    };

    conversationHistory.forEach(item => {
        if (!item || !item.content) return;
        renderMessage(item.content, item.role === 'user' ? 'user' : 'assistant', false);
    });
    if (conversationHistory.some(item => item.role === 'user')) {
        assistant.classList.add('has-user-message');
    }

    toggle.addEventListener('click', () => {
        const isOpen = !assistant.classList.contains('is-open');
        setOpen(isOpen);
    });

    close?.addEventListener('click', () => setOpen(false));

    mobileKodaQuery.addEventListener?.('change', syncKodaViewportState);
    window.addEventListener('resize', syncKodaViewportState, { passive: true });
    window.addEventListener('keydown', event => {
        if (event.key === 'Escape' && assistant.classList.contains('is-open')) {
            setOpen(false);
        }
    });

    form.addEventListener('submit', (event) => {
        event.preventDefault();
        const question = input.value;
        input.value = '';
        resizeKodaInput(input);
        askAssistant(question);
    });

    input.addEventListener('keydown', event => {
        if (event.key === 'Enter' && !event.shiftKey) {
            event.preventDefault();
            form.requestSubmit();
        }
    });

    input.addEventListener('input', () => resizeKodaInput(input));

    quickPrompts.forEach(button => {
        button.addEventListener('click', () => {
            setOpen(true);
            askAssistant(button.dataset.aiPrompt || button.textContent || '');
        });
    });

    resizeKodaInput(input);
}

function addTypingMessage(messages) {
    const message = document.createElement('div');
    message.className = 'ai-message bot ai-typing';
    message.setAttribute('aria-label', 'KODA is typing');
    message.innerHTML = '<img class="ai-message-avatar" src="images/KODAICON.png" alt="KODA"><div class="ai-message-bubble"><strong>KODA is typing...</strong><span></span><span></span><span></span></div>';
    messages.appendChild(message);
    scrollKodaToBottom(messages);
    return message;
}

function scrollKodaToBottom(messages) {
    requestAnimationFrame(() => {
        messages.scrollTop = messages.scrollHeight;
    });
}

function resizeKodaInput(input) {
    input.style.height = 'auto';
    const nextHeight = Math.min(input.scrollHeight, 120);
    input.style.height = `${nextHeight}px`;
    input.style.overflowY = input.scrollHeight > 120 ? 'auto' : 'hidden';
}

function isStaticOnlyKodaHost() {
    const hostname = window.location.hostname;
    return window.location.protocol === 'file:' || hostname.includes('github.io');
}

function getKodaSessionId(sessionKey) {
    try {
        let sessionId = sessionStorage.getItem(sessionKey);
        if (!sessionId) {
            sessionId = `koda-${Date.now()}-${Math.random().toString(16).slice(2)}`;
            sessionStorage.setItem(sessionKey, sessionId);
        }
        return sessionId;
    } catch (error) {
        return `koda-${Date.now()}-${Math.random().toString(16).slice(2)}`;
    }
}

function loadKodaHistory(storageKey) {
    try {
        const parsed = JSON.parse(localStorage.getItem(storageKey) || '[]');
        if (!Array.isArray(parsed)) return [];
        return parsed
            .filter(item => item && ['user', 'assistant'].includes(item.role) && typeof item.content === 'string')
            .slice(-20);
    } catch (error) {
        console.warn('Unable to load KODA chat history:', error);
        return [];
    }
}
