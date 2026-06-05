const loadingScreen = document.getElementById('loading-screen');
const loadingProgress = document.querySelector('.loader-progress span');
const loadingPercent = document.querySelector('.loader-percent');
const loadingSubtitle = document.querySelector('.loader-subtitle');
const heroSection = document.getElementById('home');
const navbar = document.querySelector('.navbar');
const heroContent = document.querySelector('.hero-content');
const storyHeadline = document.getElementById('story-headline');
const storySteps = document.querySelectorAll('.story-step');

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

    const showMessage = (message, type = 'success') => {
        if (!formMessage) return;
        formMessage.innerHTML = message;
        formMessage.classList.remove('success', 'error');
        formMessage.classList.add(type);
        formMessage.style.display = 'block';
        formMessage.scrollIntoView({ behavior: 'smooth', block: 'center' });
    };

    if (contactForm) {
        contactForm.addEventListener('submit', function(event) {
            event.preventDefault();
            
            const nameField = contactForm.querySelector('[name="from_name"]');
            const duplicateName = contactForm.querySelector('[name="name"]');
            if (nameField && duplicateName) {
                duplicateName.value = nameField.value;
            }
            
            // Initialize EmailJS with your public key
            emailjs.init('CW1_M1d7Y_UVzjm7G');
            
            // Send email
            emailjs.sendForm('service_2seef04', 'template_v90dnbw', this)
                .then(function() {
                    showMessage('Thank you! Your booking request has been sent. If you do not receive confirmation by email, please also message us on <a href="https://www.facebook.com/profile.php?id=100063675776144" target="_blank" rel="noopener noreferrer">Facebook</a> or call us on <a href="viber://chat?number=09276863314">Viber</a>.');
                    contactForm.reset();
                }, function(error) {
                    showMessage('Unable to send booking request. Please try again or contact us directly via <a href="https://www.facebook.com/profile.php?id=100063675776144" target="_blank" rel="noopener noreferrer">Facebook</a> or <a href="viber://chat?number=09276863314">Viber</a>.', 'error');
                    console.error('EmailJS error:', error);
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
