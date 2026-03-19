// Update copyright year
document.getElementById('year').textContent = new Date().getFullYear();

// --- SCROLL ANIMATIONS ---
// Intersection Observer for fade-in animations
const observerOptions = {
    root: null,
    rootMargin: '0px',
    threshold: 0.15 // Trigger when 15% of the element is visible
};

const fadeObserver = new IntersectionObserver((entries, observer) => {
    entries.forEach(entry => {
        if (entry.isIntersecting) {
            entry.target.classList.add('visible');
            observer.unobserve(entry.target); // Run once
        }
    });
}, observerOptions);

// Select all elements with the 'cinematic-reveal' class and observe them
document.querySelectorAll('.cinematic-reveal').forEach((element, index) => {
    // Add staggered delay based on index if it's within a grid/flex container
    if(element.parentElement.classList.contains('dev-skills-grid') || 
       element.parentElement.classList.contains('contact-items')) {
        element.style.transitionDelay = `${(Array.from(element.parentElement.children).indexOf(element)) * 100}ms`;
    }
    fadeObserver.observe(element);
});

// --- NAVBAR LOGIC ---
const navbar = document.getElementById('navbar');

window.addEventListener('scroll', () => {
    if (window.scrollY > 50) {
        navbar.classList.add('scrolled');
    } else {
        navbar.classList.remove('scrolled');
    }
});

// --- MOBILE MENU ---
const mobileMenuBtn = document.querySelector('.mobile-menu-btn');
const closeBtn = document.querySelector('.close-btn');
const mobileMenu = document.querySelector('.mobile-menu');
const mobileLinks = document.querySelectorAll('.mobile-menu a');

function toggleMenu() {
    mobileMenu.classList.toggle('active');
    document.body.style.overflow = mobileMenu.classList.contains('active') ? 'hidden' : 'auto';
}

mobileMenuBtn.addEventListener('click', toggleMenu);
closeBtn.addEventListener('click', toggleMenu);

// Close menu when a link is clicked
mobileLinks.forEach(link => {
    link.addEventListener('click', () => {
        mobileMenu.classList.remove('active');
        document.body.style.overflow = 'auto';
    });
});

// --- AI PARTICLES & PARALLAX ---
const particlesContainer = document.getElementById('particles-container');
const bgMesh = document.getElementById('bgMesh');

// 1. Generate Floating Particles
const particleCount = 30;

for (let i = 0; i < particleCount; i++) {
    const particle = document.createElement('div');
    particle.classList.add('particle');
    
    // Randomize particle properties
    const size = Math.random() * 4 + 1; // 1px to 5px
    const startX = Math.random() * 100; // 0% to 100% width
    const startY = Math.random() * 100; // 0% to 100% height
    const duration = Math.random() * 10 + 10; // 10s to 20s
    const delay = Math.random() * 5; // 0s to 5s delay
    
    particle.style.width = `${size}px`;
    particle.style.height = `${size}px`;
    particle.style.left = `${startX}%`;
    particle.style.top = `${startY}%`;
    particle.style.animationDuration = `${duration}s`;
    particle.style.animationDelay = `${delay}s`;
    
    particlesContainer.appendChild(particle);
}

// 2. Mouse Parallax Effect
document.addEventListener('mousemove', (e) => {
    const mouseX = e.clientX;
    const mouseY = e.clientY;
    
    const windowWidth = window.innerWidth;
    const windowHeight = window.innerHeight;
    
    // Calculate distance from center (-1 to 1)
    const moveX = (mouseX - windowWidth / 2) / (windowWidth / 2);
    const moveY = (mouseY - windowHeight / 2) / (windowHeight / 2);
    
    // Move the background slightly based on mouse position
    const panX = moveX * -20; // Max 20px movement
    const panY = moveY * -20;
    
    if(bgMesh) {
        bgMesh.style.transform = `translate(${panX}px, ${panY}px) scale(1.05)`;
    }
});

// 3. 3D Tilt Effect for Glass Cards
const glassCards = document.querySelectorAll('.glass-card');

glassCards.forEach(card => {
    card.addEventListener('mousemove', (e) => {
        const rect = card.getBoundingClientRect();
        const x = e.clientX - rect.left; // x position within the element
        const y = e.clientY - rect.top;  // y position within the element
        
        const centerX = rect.width / 2;
        const centerY = rect.height / 2;
        
        const rotateX = ((y - centerY) / centerY) * -10; // Max rotation 10deg
        const rotateY = ((x - centerX) / centerX) * 10;
        
        card.style.transform = `perspective(1000px) rotateX(${rotateX}deg) rotateY(${rotateY}deg) scale3d(1.02, 1.02, 1.02)`;
    });
    
    card.addEventListener('mouseleave', () => {
        card.style.transform = `perspective(1000px) rotateX(0deg) rotateY(0deg) scale3d(1, 1, 1)`;
        card.style.transition = 'transform 0.5s ease';
    });
    
    card.addEventListener('mouseenter', () => {
        card.style.transition = 'transform 0.1s ease';
    });
});

// --- CUSTOM CURSOR ---
const cursor = document.querySelector('.custom-cursor');
const cursorFollower = document.querySelector('.custom-cursor-follower');

if (cursor && cursorFollower) {
    document.addEventListener('mousemove', (e) => {
        cursor.style.left = e.clientX + 'px';
        cursor.style.top = e.clientY + 'px';
        
        requestAnimationFrame(() => {
            cursorFollower.style.left = e.clientX + 'px';
            cursorFollower.style.top = e.clientY + 'px';
        });
    });

    const hoverElements = document.querySelectorAll('a, button, .interactive-btn, .glass-card');
    hoverElements.forEach(el => {
        el.addEventListener('mouseenter', () => {
            document.body.classList.add('cursor-hover');
        });
        el.addEventListener('mouseleave', () => {
            document.body.classList.remove('cursor-hover');
        });
    });
}

// --- WEB AUDIO API & INTERACTIVE SOUNDS ---
const AudioContext = window.AudioContext || window.webkitAudioContext;
let audioCtx;
let isMusicPlaying = false;
let ambientOscillators = [];
let masterGain;

const pentatonicScale = [261.63, 293.66, 329.63, 392.00, 440.00, 523.25, 587.33];

function initAudio() {
    if (!audioCtx) {
        audioCtx = new AudioContext();
        masterGain = audioCtx.createGain();
        masterGain.gain.value = 0.2;
        masterGain.connect(audioCtx.destination);
    }
}

function playMusicalNote(frequency, type = 'sine', duration = 0.6, vol = 0.15) {
    try {
        if (!audioCtx) initAudio();
        if (audioCtx.state === 'suspended') audioCtx.resume();
        
        const osc = audioCtx.createOscillator();
        const gainNode = audioCtx.createGain();
        
        osc.type = type;
        osc.frequency.setValueAtTime(frequency, audioCtx.currentTime);
        
        gainNode.gain.setValueAtTime(0, audioCtx.currentTime);
        gainNode.gain.linearRampToValueAtTime(vol, audioCtx.currentTime + 0.05);
        gainNode.gain.exponentialRampToValueAtTime(0.001, audioCtx.currentTime + duration);
        
        osc.connect(gainNode);
        gainNode.connect(audioCtx.destination);
        
        osc.start();
        osc.stop(audioCtx.currentTime + duration);
    } catch (e) { console.error("Audio play failed", e); }
}

function startAmbientMusic() {
    if (!audioCtx) initAudio();
    if (audioCtx.state === 'suspended') audioCtx.resume();
    if (isMusicPlaying) return;
    isMusicPlaying = true;
    
    const baseFreqs = [130.81, 196.00, 261.63]; 
    
    baseFreqs.forEach(freq => {
        const osc = audioCtx.createOscillator();
        const lfo = audioCtx.createOscillator();
        const lfoGain = audioCtx.createGain();
        const mainGain = audioCtx.createGain();
        
        osc.type = 'sine';
        osc.frequency.value = freq;
        
        lfo.type = 'sine';
        lfo.frequency.value = Math.random() * 0.05 + 0.02;
        
        lfo.connect(lfoGain);
        lfoGain.gain.value = 0.2;
        lfoGain.connect(mainGain.gain);
        
        mainGain.gain.value = 0.1;
        
        osc.connect(mainGain);
        mainGain.connect(masterGain);
        
        osc.start();
        lfo.start();
        
        ambientOscillators.push({osc, lfo, mainGain});
    });
}

function stopAmbientMusic() {
    if (!isMusicPlaying) return;
    ambientOscillators.forEach(nodes => {
        nodes.mainGain.gain.linearRampToValueAtTime(0, audioCtx.currentTime + 2);
        setTimeout(() => {
            try {
                nodes.osc.stop();
                nodes.lfo.stop();
                nodes.osc.disconnect();
                nodes.lfo.disconnect();
            } catch (e) {}
        }, 2000);
    });
    ambientOscillators = [];
    isMusicPlaying = false;
}

const musicToggleBtn = document.getElementById('music-toggle');
if (musicToggleBtn) {
    musicToggleBtn.addEventListener('click', () => {
        initAudio();
        if (isMusicPlaying) {
            stopAmbientMusic();
            musicToggleBtn.classList.remove('playing');
        } else {
            startAmbientMusic();
            musicToggleBtn.classList.add('playing');
        }
    });
}

const interactiveIcons = document.querySelectorAll('.dev-skill-card, .contact-item, .nav-links a, .social-icon, .btn');
interactiveIcons.forEach((el, index) => {
    el.addEventListener('click', () => {
        const note = pentatonicScale[index % pentatonicScale.length];
        playMusicalNote(note, 'triangle', 0.8, 0.2);
    });
    
    el.addEventListener('mouseenter', () => {
        playMusicalNote(pentatonicScale[(index + 2) % pentatonicScale.length], 'sine', 0.2, 0.05);
    });
});
