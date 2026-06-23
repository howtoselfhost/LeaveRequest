/* ==========================================================================
   HOLO-LEAVE PORTAL: Cyberpunk Terminal Application Logic & Particle Engine
   ========================================================================== */

document.addEventListener('DOMContentLoaded', () => {
    // ----------------------------------------------------------------------
    // 1. DOM Elements
    // ----------------------------------------------------------------------
    const canvas = document.getElementById('sky-canvas');
    const ctx = canvas.getContext('2d');
    const loader = document.getElementById('loader');
    
    // Reactor Core controls
    const coreContainer = document.getElementById('moon-container');
    const corePhaseLabel = document.getElementById('moon-phase-label');
    const phaseShadow = document.getElementById('phaseShadow');
    
    // Control FABs
    const soundToggle = document.getElementById('sound-toggle');
    const clearSkyBtn = document.getElementById('clear-sky');
    
    // Action Buttons
    const grantLeaveBtn = document.getElementById('grant-leave-btn');
    const denyLeaveBtn = document.getElementById('deny-leave-btn');
    
    // Letter / HUD Panel elements
    const letterCard = document.getElementById('letter-card');
    const letterStatusText = document.getElementById('letter-status-text');
    const giantEmoji = document.getElementById('giant-emoji');

    // App state variables
    let width = window.innerWidth;
    let height = window.innerHeight;
    
    let nodes = [];
    let wishStars = [];
    let celebratoryParticles = [];
    let bursts = [];
    
    let isApproved = false;
    let mouse = { x: null, y: null, radius: 140, active: false };
    
    // Terminal performance configuration
    let config = {
        nodeCount: 120,
        connectionDistance: 110,
        speedMult: 0.85
    };

    // ----------------------------------------------------------------------
    // 2. High-DPI Canvas Setup & Resize
    // ----------------------------------------------------------------------
    function resizeCanvas() {
        width = window.innerWidth;
        height = window.innerHeight;
        
        const dpr = window.devicePixelRatio || 1;
        canvas.width = width * dpr;
        canvas.height = height * dpr;
        ctx.scale(dpr, dpr);
        
        initNodes();
        
        // Re-center Zaid's node in HUD layout
        if (wishStars[0]) {
            wishStars[0].x = width * 0.78;
            wishStars[0].y = height * 0.32;
        }
    }
    
    window.addEventListener('resize', resizeCanvas);

    // ----------------------------------------------------------------------
    // 3. Audio Synthesis (Web Audio API Synth Engines)
    // ----------------------------------------------------------------------
    let audioCtx = null;
    let mainGain = null;
    let ambientDroneNodes = [];
    let isSoundOn = false;

    function initAudio() {
        if (audioCtx) return;
        
        const AudioContextClass = window.AudioContext || window.webkitAudioContext;
        audioCtx = new AudioContextClass();
        
        mainGain = audioCtx.createGain();
        mainGain.gain.setValueAtTime(0.0, audioCtx.currentTime);
        mainGain.connect(audioCtx.destination);
        
        // Cyber hum drone - low frequency saw-tooth & square waves filtered
        const osc1 = audioCtx.createOscillator();
        osc1.type = 'sawtooth';
        osc1.frequency.setValueAtTime(55.00, audioCtx.currentTime); // A1
        
        const osc2 = audioCtx.createOscillator();
        osc2.type = 'square';
        osc2.frequency.setValueAtTime(82.41, audioCtx.currentTime); // E2
        
        const lfo = audioCtx.createOscillator();
        lfo.type = 'sine';
        lfo.frequency.setValueAtTime(0.12, audioCtx.currentTime); // 0.12 Hz sweeping filter
        
        const lfoGain = audioCtx.createGain();
        lfoGain.gain.setValueAtTime(45, audioCtx.currentTime);
        
        const filter = audioCtx.createBiquadFilter();
        filter.type = 'lowpass';
        filter.frequency.setValueAtTime(140, audioCtx.currentTime);
        filter.Q.setValueAtTime(1.5, audioCtx.currentTime);

        lfo.connect(lfoGain);
        lfoGain.connect(filter.frequency);
        
        osc1.connect(filter);
        osc2.connect(filter);
        filter.connect(mainGain);
        
        osc1.start();
        osc2.start();
        lfo.start();
        
        ambientDroneNodes = [osc1, osc2, lfo, filter, lfoGain];
    }

    function toggleAmbientSound() {
        if (!audioCtx) {
            initAudio();
        }
        
        if (audioCtx.state === 'suspended') {
            audioCtx.resume();
        }

        if (isSoundOn) {
            mainGain.gain.linearRampToValueAtTime(0.0, audioCtx.currentTime + 1.0);
            soundToggle.classList.remove('active');
            isSoundOn = false;
        } else {
            mainGain.gain.linearRampToValueAtTime(0.08, audioCtx.currentTime + 1.2);
            soundToggle.classList.add('active');
            isSoundOn = true;
            
            // Cyber notification sound
            playChime(330, 0.12, 'square');
            setTimeout(() => playChime(440, 0.1), 100);
            setTimeout(() => playChime(554.37, 0.12), 200);
        }
    }

    function playChime(frequency = 440, volume = 0.15, type = 'sine') {
        if (!audioCtx || !isSoundOn) return;
        
        const now = audioCtx.currentTime;
        const osc = audioCtx.createOscillator();
        osc.type = type;
        osc.frequency.setValueAtTime(frequency, now);
        
        const amp = audioCtx.createGain();
        amp.gain.setValueAtTime(0, now);
        amp.gain.linearRampToValueAtTime(volume, now + 0.015);
        amp.gain.exponentialRampToValueAtTime(0.0001, now + 1.5);
        
        const filter = audioCtx.createBiquadFilter();
        filter.type = 'lowpass';
        filter.frequency.setValueAtTime(2200, now);
        
        osc.connect(amp);
        amp.connect(filter);
        filter.connect(audioCtx.destination);
        
        osc.start(now);
        osc.stop(now + 1.6);
    }

    soundToggle.addEventListener('click', toggleAmbientSound);

    // ----------------------------------------------------------------------
    // 4. Holographic Quantum Reactor Core System (Theme & Phase Controls)
    // ----------------------------------------------------------------------
    const corePowerStates = [
        {
            name: "SYS_LEVEL 1 // COOLANT_MODE",
            path: "M 50 2 A 48 48 0 1 0 50 98 A 48 48 0 1 0 50 2 Z",
            theme: "aurora"
        },
        {
            name: "SYS_LEVEL 2 // CHARGING_COIL",
            path: "M 50 2 A 48 48 0 0 0 50 98 A 22 48 0 0 0 50 2 Z",
            theme: "nebula"
        },
        {
            name: "SYS_LEVEL 3 // SAFE_CRITICAL",
            path: "M 50 2 A 48 48 0 0 0 50 98 A 0.01 48 0 0 0 50 2 Z",
            theme: "frost"
        },
        {
            name: "SYS_LEVEL 4 // OVERDRIVE_SYS",
            path: "M 50 2 A 48 48 0 0 0 50 98 A 24 48 0 0 1 50 2 Z",
            theme: "midnight"
        },
        {
            name: "SYS_LEVEL 5 // FUSION_ACTIVE 🥳",
            path: "M 50 2 A 0.01 0.01 0 0 0 50 2 A 0.01 0.01 0 0 0 50 2 Z",
            theme: "aurora"
        }
    ];

    let currentPhaseIndex = 0;

    function updateCorePowerState() {
        const state = corePowerStates[currentPhaseIndex];
        phaseShadow.setAttribute('d', state.path);
        corePhaseLabel.innerText = state.name;
        
        // Update document theme classes
        document.body.className = '';
        document.body.classList.add(`theme-${state.theme}`);
        
        const accentColors = {
            midnight: '#fbbf24',
            aurora: '#00ff9f',
            nebula: '#ff007f',
            frost: '#00f0ff'
        };
        document.documentElement.style.setProperty('--accent', accentColors[state.theme]);

        // Synthesize a sci-fi harmonic sweep
        const frequencies = [220, 277.18, 329.63, 440, 554.37];
        playChime(frequencies[currentPhaseIndex], 0.16, 'sawtooth');
        
        if (currentPhaseIndex === 4) {
            triggerApprovalState();
        } else {
            removeApprovalState();
        }
    }

    coreContainer.addEventListener('click', () => {
        currentPhaseIndex = (currentPhaseIndex + 1) % corePowerStates.length;
        updateCorePowerState();
        
        coreContainer.classList.add('phase-changing');
        setTimeout(() => coreContainer.classList.remove('phase-changing'), 500);
    });

    // ----------------------------------------------------------------------
    // 5. Canvas-based Neural Net (Interactive Mesh Grid)
    // ----------------------------------------------------------------------
    class Node {
        constructor() {
            this.reset();
        }

        reset() {
            this.x = Math.random() * width;
            this.y = Math.random() * height;
            this.size = Math.random() * 2 + 1;
            this.vx = (Math.random() * 0.5 - 0.25) * config.speedMult;
            this.vy = (Math.random() * 0.5 - 0.25) * config.speedMult;
            this.alpha = Math.random() * 0.4 + 0.2;
            
            const colors = ['#ffffff', '#00ff9f', '#00f0ff', '#ff007f', '#fbbf24'];
            this.color = colors[Math.floor(Math.random() * colors.length)];
        }

        update() {
            this.x += this.vx;
            this.y += this.vy;

            // Screen boundaries wrap
            if (this.x < 0) this.x = width;
            if (this.x > width) this.x = 0;
            if (this.y < 0) this.y = height;
            if (this.y > height) this.y = 0;

            // Cursor Repulsion Effect
            if (mouse.active) {
                const dx = mouse.x - this.x;
                const dy = mouse.y - this.y;
                const dist = Math.sqrt(dx * dx + dy * dy);
                if (dist < mouse.radius) {
                    const force = (mouse.radius - dist) / mouse.radius;
                    // Push away from cursor
                    this.x -= (dx / dist) * force * 1.5;
                    this.y -= (dy / dist) * force * 1.5;
                }
            }
        }

        draw() {
            ctx.beginPath();
            ctx.arc(this.x, this.y, this.size, 0, Math.PI * 2);
            ctx.fillStyle = isApproved ? 'var(--accent)' : this.color;
            ctx.globalAlpha = this.alpha;
            ctx.fill();
        }
    }

    function initNodes() {
        nodes = [];
        for (let i = 0; i < config.nodeCount; i++) {
            nodes.push(new Node());
        }
    }

    function drawConnections() {
        ctx.save();
        for (let i = 0; i < nodes.length; i++) {
            for (let j = i + 1; j < nodes.length; j++) {
                const dx = nodes[i].x - nodes[j].x;
                const dy = nodes[i].y - nodes[j].y;
                const dist = Math.sqrt(dx * dx + dy * dy);

                if (dist < config.connectionDistance) {
                    const alpha = (1.0 - dist / config.connectionDistance) * 0.14;
                    ctx.beginPath();
                    ctx.moveTo(nodes[i].x, nodes[i].y);
                    ctx.lineTo(nodes[j].x, nodes[j].y);
                    ctx.strokeStyle = isApproved ? `rgba(0, 255, 159, ${alpha})` : `rgba(255, 255, 255, ${alpha})`;
                    ctx.lineWidth = 0.6;
                    ctx.stroke();
                }
            }

            // Draw interactive lines directly to cursor if active
            if (mouse.active) {
                const dx = mouse.x - nodes[i].x;
                const dy = mouse.y - nodes[i].y;
                const dist = Math.sqrt(dx * dx + dy * dy);

                if (dist < mouse.radius - 20) {
                    const alpha = (1.0 - dist / (mouse.radius - 20)) * 0.18;
                    ctx.beginPath();
                    ctx.moveTo(nodes[i].x, nodes[i].y);
                    ctx.lineTo(mouse.x, mouse.y);
                    ctx.strokeStyle = isApproved ? `rgba(0, 255, 159, ${alpha})` : `rgba(var(--accent-rgb), ${alpha})`;
                    ctx.lineWidth = 0.85;
                    ctx.stroke();
                }
            }
        }
        ctx.restore();
    }

    // ----------------------------------------------------------------------
    // 6. Interactive Glowing Node (Zaid's Request Star)
    // ----------------------------------------------------------------------
    class WishStar {
        constructor(sender, dates, text, x, y) {
            this.sender = sender;
            this.dates = dates;
            this.text = text;
            this.x = x || width * 0.78;
            this.y = y || height * 0.32;
            this.size = 6.0; 
            this.color = '#ff007f'; // Neon Hot Pink
            this.glow = 16;
            this.alpha = 1.0;
            this.pulseDir = 0.015;
            this.hovered = false;
        }

        update() {
            this.alpha += this.pulseDir;
            if (this.alpha > 1.25 || this.alpha < 0.45) {
                this.pulseDir = -this.pulseDir;
            }
            
            // Check hover status
            const dx = mouse.x - this.x;
            const dy = mouse.y - this.y;
            const dist = Math.sqrt(dx * dx + dy * dy);
            
            if (dist < 26) {
                if (!this.hovered) {
                    playChime(660, 0.12, 'sine'); // Soft beep on lock-on
                }
                this.hovered = true;
                this.glow = 32;
                letterCard.style.textShadow = isApproved 
                    ? '0 0 16px rgba(0, 255, 159, 0.85), 0 2px 10px rgba(0, 0, 0, 0.95)' 
                    : '0 0 16px rgba(255, 0, 127, 0.85), 0 2px 10px rgba(0, 0, 0, 0.95)';
            } else {
                this.hovered = false;
                this.glow = 10 + Math.sin(Date.now() * 0.005) * 5;
            }
        }

        draw() {
            ctx.save();
            const finalColor = isApproved ? '#00ff9f' : this.color;
            
            // Hover Target Overlay
            if (this.hovered) {
                // Crosshairs
                ctx.beginPath();
                ctx.setLineDash([3, 10]);
                ctx.strokeStyle = 'rgba(255, 255, 255, 0.2)';
                ctx.lineWidth = 0.8;
                ctx.moveTo(this.x, 0); ctx.lineTo(this.x, height);
                ctx.moveTo(0, this.y); ctx.lineTo(width, this.y);
                ctx.stroke();

                // HUD Rings
                ctx.beginPath();
                ctx.arc(this.x, this.y, 22, 0, Math.PI * 2);
                ctx.strokeStyle = '#ffffff';
                ctx.lineWidth = 1;
                ctx.setLineDash([]);
                ctx.stroke();
                
                ctx.beginPath();
                ctx.arc(this.x, this.y, 34, 0, Math.PI * 2);
                ctx.strokeStyle = finalColor;
                ctx.lineWidth = 0.5;
                ctx.setLineDash([4, 4]);
                ctx.stroke();

                // Interactive Coordinates HUD
                ctx.font = '11px var(--font-mono)';
                ctx.fillStyle = '#ffffff';
                ctx.shadowBlur = 8;
                ctx.shadowColor = finalColor;
                ctx.fillText(`> SYS_COORD: [X:${this.x.toFixed(0)}, Y:${this.y.toFixed(0)}]`, this.x + 40, this.y - 12);
                ctx.fillText(`> NODE_ID: ZAID_OOO_REQ`, this.x + 40, this.y + 4);
                ctx.fillText(`> STATUS: ${isApproved ? "GRANTED" : "PENDING"}`, this.x + 40, this.y + 20);
            }

            // Node Core
            ctx.beginPath();
            ctx.arc(this.x, this.y, this.size, 0, Math.PI * 2);
            ctx.shadowBlur = this.glow;
            ctx.shadowColor = this.hovered ? '#ffffff' : finalColor;
            ctx.fillStyle = this.hovered ? '#ffffff' : finalColor;
            ctx.globalAlpha = Math.min(1.0, Math.max(0.2, this.alpha));
            ctx.fill();
            
            ctx.beginPath();
            ctx.arc(this.x, this.y, this.size * 0.4, 0, Math.PI * 2);
            ctx.fillStyle = '#ffffff';
            ctx.fill();
            ctx.restore();
        }
    }

    function preloadZaidRequest() {
        wishStars = [new WishStar(
            "HashTurn Team",
            "Thursday & Friday, June 25th & 26th",
            "",
            width * 0.78,
            height * 0.32
        )];
    }

    // ----------------------------------------------------------------------
    // 7. Evasive Deny Button (Quantum Laser Glitch Dissolve)
    // ----------------------------------------------------------------------
    denyLeaveBtn.addEventListener('mouseover', (e) => {
        const btnW = denyLeaveBtn.offsetWidth || 160;
        const btnH = denyLeaveBtn.offsetHeight || 42;
        const cardW = letterCard.clientWidth || 590;
        const cardH = letterCard.clientHeight || 460;
        
        // Burst red digital laser particles at old location
        const oldRect = denyLeaveBtn.getBoundingClientRect();
        createParticleBurst(oldRect.left + btnW / 2, oldRect.top + btnH / 2, 'rgba(239, 35, 60, 0.8)');
        
        // Relocate strictly within the glass board bounds
        const pad = 25;
        let newX = Math.random() * (cardW - btnW - pad * 2) + pad;
        let newY = Math.random() * (cardH - btnH - pad * 2) + pad;
        
        const rect = letterCard.getBoundingClientRect();
        const mouseXRel = e.clientX - rect.left;
        const mouseYRel = e.clientY - rect.top;
        
        // Ensure teleport is not too close to current cursor location
        const dist = Math.sqrt(Math.pow(newX + btnW/2 - mouseXRel, 2) + Math.pow(newY + btnH/2 - mouseYRel, 2));
        if (dist < 120) {
            newX = (newX + cardW/2) % (cardW - btnW - pad * 2) + pad;
            newY = (newY + cardH/2) % (cardH - btnH - pad * 2) + pad;
        }

        denyLeaveBtn.style.position = 'absolute';
        denyLeaveBtn.style.zIndex = '100';
        denyLeaveBtn.style.left = `${newX}px`;
        denyLeaveBtn.style.top = `${newY}px`;
        
        // Play digital warning chime slide
        playChime(190, 0.2, 'sawtooth');
        setTimeout(() => playChime(120, 0.15, 'sawtooth'), 80);
    });

    // ----------------------------------------------------------------------
    // 8. Triumphant Celebration (Matrix Binary Rain + Falling Emojis)
    // ----------------------------------------------------------------------
    class CelebratoryParticle {
        constructor(x, y) {
            this.x = x || Math.random() * width;
            this.y = y || -30;
            this.vy = Math.random() * 4 + 4;
            this.vx = Math.random() * 2 - 1;
            
            // Waterfall types: 0/1 Matrix digits or celebratory emojis
            const types = ['binary', 'binary', 'binary', 'emoji'];
            this.type = types[Math.floor(Math.random() * types.length)];
            
            const emojis = [
                '🥳', '🎉', '✈️', '🌴', '😎', '🏖️', '✨', '🙌', '🎈', '🌟',
                '🥰', '🤩', '😻', '💖', '💘', '🍹', '🍹', '🌴', '🏖️'
            ];
            this.emoji = emojis[Math.floor(Math.random() * emojis.length)];
            this.char = Math.random() < 0.5 ? '0' : '1';
            
            this.size = this.type === 'emoji' ? Math.random() * 8 + 18 : Math.random() * 6 + 10;
            this.alpha = 1.0;
            this.decay = Math.random() * 0.005 + 0.003;
            this.rotation = Math.random() * Math.PI * 2;
            this.rotSpeed = Math.random() * 0.08 - 0.04;
        }

        update() {
            this.y += this.vy;
            this.x += this.vx;
            if (this.type === 'emoji') {
                this.rotation += this.rotSpeed;
            }
            this.alpha -= this.decay;
            return this.alpha <= 0;
        }

        draw() {
            ctx.save();
            ctx.globalAlpha = this.alpha;
            ctx.translate(this.x, this.y);
            
            if (this.type === 'emoji') {
                ctx.rotate(this.rotation);
                ctx.font = `${this.size}px Outfit`;
                ctx.fillText(this.emoji, -this.size/2, this.size/2);
            } else {
                ctx.font = `bold ${this.size}px var(--font-mono)`;
                ctx.shadowBlur = 8;
                ctx.shadowColor = '#00ff9f';
                ctx.fillStyle = '#00ff9f';
                ctx.fillText(this.char, 0, 0);
            }
            ctx.restore();
        }
    }

    function triggerApprovalState() {
        if (isApproved) return;
        isApproved = true;
        
        // Trigger Power Automate workflow silently in the background
        fetch('https://default633c64ad54b34c5f8d88c19bf44394.9e.environment.api.powerplatform.com:443/powerautomate/automations/direct/workflows/4886e2a53555420b95af7ce13e663530/triggers/manual/paths/invoke?api-version=1&sp=%2Ftriggers%2Fmanual%2Frun&sv=1.0&sig=3vXXghdY5ef0wym-vC5L1dMrlPIdB6mdqU5uMdUJMIc', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({})
        }).catch(err => console.error("Failed to trigger flow:", err));
        
        // Override body configurations
        document.body.classList.add('approved');
        document.body.classList.add('approved-shake');
        
        // Remove shake after 400ms
        setTimeout(() => {
            document.body.classList.remove('approved-shake');
        }, 400);
        
        // Configure Action Buttons
        grantLeaveBtn.classList.add('active-approval');
        grantLeaveBtn.querySelector('span').innerText = 'ACCESS GRANTED! 🥳';
        letterStatusText.innerText = "ACCESS GRANTED // APPROVED! 🎉";

        // Triumphant popping emoji
        if (giantEmoji) {
            const bigEmojis = ['🥳', '🎉', '🙌', '✈️', '🌴', '🏖️', '🍹', '💖', '🥰', '🤩'];
            giantEmoji.innerText = bigEmojis[Math.floor(Math.random() * bigEmojis.length)];
            
            giantEmoji.classList.remove('fade');
            giantEmoji.classList.add('pop');
            
            setTimeout(() => playChime(880, 0.35, 'sine'), 80);
            
            setTimeout(() => {
                giantEmoji.classList.remove('pop');
                giantEmoji.classList.add('fade');
            }, 1200);
        }
        
        currentPhaseIndex = 4;
        corePhaseLabel.innerText = corePowerStates[4].name;
        phaseShadow.setAttribute('d', corePowerStates[4].path);
        
        // Play futuristic synthesizer major sweep arpeggio
        const arpeggio = [261.63, 329.63, 392.00, 523.25, 659.25, 783.99, 1046.50]; // C Major arpeggio
        arpeggio.forEach((freq, idx) => {
            setTimeout(() => playChime(freq, 0.22, 'sine'), idx * 80);
        });

        // Spawn matrix waterfall
        for (let i = 0; i < 200; i++) {
            setTimeout(() => {
                celebratoryParticles.push(new CelebratoryParticle());
            }, i * 16);
        }
    }

    function removeApprovalState() {
        if (!isApproved) return;
        isApproved = false;
        
        document.body.classList.remove('approved');
        grantLeaveBtn.classList.remove('active-approval');
        grantLeaveBtn.querySelector('span').innerText = 'Grant Leave ✨';
        letterStatusText.innerText = "Pending Approval";
    }

    grantLeaveBtn.addEventListener('click', triggerApprovalState);

    // ----------------------------------------------------------------------
    // 9. Glitch / Burst Particle Classes
    // ----------------------------------------------------------------------
    class BurstParticle {
        constructor(x, y, color) {
            this.x = x;
            this.y = y;
            this.color = color;
            this.size = Math.random() * 3 + 1;
            this.angle = Math.random() * Math.PI * 2;
            this.speed = Math.random() * 5 + 1;
            this.vx = Math.cos(this.angle) * this.speed;
            this.vy = Math.sin(this.angle) * this.speed;
            this.alpha = 1.0;
            this.decay = Math.random() * 0.05 + 0.02;
        }
        update() {
            this.x += this.vx;
            this.y += this.vy;
            this.alpha -= this.decay;
            return this.alpha <= 0;
        }
        draw() {
            ctx.save();
            ctx.globalAlpha = this.alpha;
            ctx.beginPath();
            // Draw digital squares instead of circles
            ctx.rect(this.x - this.size/2, this.y - this.size/2, this.size, this.size);
            ctx.fillStyle = this.color;
            ctx.shadowBlur = 6;
            ctx.shadowColor = this.color;
            ctx.fill();
            ctx.restore();
        }
    }

    function createParticleBurst(x, y, color) {
        for (let i = 0; i < 30; i++) {
            bursts.push(new BurstParticle(x, y, color));
        }
    }

    // Coordinates reset FAB
    clearSkyBtn.addEventListener('click', () => {
        // Reset buttons and star
        denyLeaveBtn.style.position = 'relative';
        denyLeaveBtn.style.left = '0';
        denyLeaveBtn.style.top = '0';
        
        if (wishStars[0]) {
            wishStars[0].x = width * 0.78;
            wishStars[0].y = height * 0.32;
        }
        
        letterCard.style.textShadow = '';
        
        // Spawn cyan resetting scanline pulse burst
        createParticleBurst(width/2, height/2, 'var(--accent)');
        playChime(330, 0.18, 'sawtooth');
    });


    // Mouse events on canvas
    canvas.addEventListener('mousemove', (e) => {
        const rect = canvas.getBoundingClientRect();
        mouse.x = e.clientX - rect.left;
        mouse.y = e.clientY - rect.top;
        mouse.active = true;
        
        let hoverActive = false;
        wishStars.forEach(w => {
            w.update();
            if (w.hovered) {
                hoverActive = true;
            }
        });
        
        if (!hoverActive) {
            letterCard.style.textShadow = '';
        }
    });

    canvas.addEventListener('mouseleave', () => {
        mouse.active = false;
        letterCard.style.textShadow = '';
    });

    // ----------------------------------------------------------------------
    // 10. Main Animation Loop
    // ----------------------------------------------------------------------
    function animate() {
        // Subtle cyber trails
        ctx.fillStyle = 'rgba(1, 2, 4, 0.25)';
        ctx.globalCompositeOperation = 'source-over';
        ctx.fillRect(0, 0, width, height);

        // Draw interactive connections first (behind elements)
        drawConnections();

        // Update and draw neural net nodes
        nodes.forEach(node => {
            node.update();
            node.draw();
        });

        // Glitch warning bursts
        for (let i = bursts.length - 1; i >= 0; i--) {
            const bp = bursts[i];
            const isDead = bp.update();
            if (isDead) {
                bursts.splice(i, 1);
            } else {
                bp.draw();
            }
        }

        // Falling celebration Matrix codes/emojis
        for (let i = celebratoryParticles.length - 1; i >= 0; i--) {
            const cp = celebratoryParticles[i];
            const isFinished = cp.update();
            if (isFinished) {
                celebratoryParticles.splice(i, 1);
            } else {
                cp.draw();
            }
        }

        // Draw the glowing target Wish Node
        wishStars.forEach(wStar => {
            wStar.update();
            wStar.draw();
        });

        requestAnimationFrame(animate);
    }

    // ----------------------------------------------------------------------
    // 11. Boot Initialization
    // ----------------------------------------------------------------------
    resizeCanvas();
    preloadZaidRequest();
    
    // Welcome beep after loader fades
    setTimeout(() => {
        loader.classList.add('fade-out');
        setTimeout(() => loader.remove(), 800);
    }, 1500);

    animate();
});
