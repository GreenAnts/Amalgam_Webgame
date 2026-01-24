const canvas = document.getElementById('bg-canvas');
const ctx = canvas.getContext('2d');
const uiLayer = document.getElementById('ui-layer');
const introStage = document.getElementById('intro-stage');
const flashOverlay = document.getElementById('flash-overlay');

let width, height, particles = [];
let mouse = { x: -1000, y: -1000, tx: -1000, ty: -1000 };
let mouseDown = false;

let introGravity = { active: false, strength: 0 };
let explosionForce = { active: false, strength: 0 };
let shockwave = { active: false, x: 0, y: 0, r: 0 };
const COLORS = ['#E63960', '#82be60', '#FFFFFF', '#F6C13F'];

function initParticles() {
	width = canvas.width = window.innerWidth;
	height = canvas.height = window.innerHeight;
	particles = [];
	for (let i = 0; i < 500; i++) {
		particles.push({
			x: Math.random() * width,
			y: Math.random() * height,
			ox: Math.random() * width,
			oy: Math.random() * height,
			vx: 0, vy: 0,
			c: COLORS[Math.floor(Math.random() * COLORS.length)],
			s: Math.random() * 2 + 1
		});
	}
}

function render() {
	ctx.clearRect(0, 0, width, height);

	mouse.x += (mouse.tx - mouse.x) * 0.1;
	mouse.y += (mouse.ty - mouse.y) * 0.1;

	const cx = width * 0.5;
	const cy = height * 0.5;

	if (uiLayer.style.opacity === '1') {
		const card = document.querySelector('.title-card-base');
		if (card) {
			let nx = (mouse.x - width * 0.5) / (width * 0.5);
			let ny = (mouse.y - height * 0.5) / (height * 0.5);
			card.style.transform = `rotateX(${ny * -8}deg) rotateY(${nx * 8}deg)`;
		}
	}

	particles.forEach(p => {
		let dx = mouse.x - p.x;
		let dy = mouse.y - p.y;
		let dist = Math.sqrt(dx * dx + dy * dy) + 0.001;

		if (dist < 180) {
			let f = (180 - dist) / 180;
			if (mouseDown) {
				p.vx += (dx - dy * 0.6) * f * 0.05;
				p.vy += (dy + dx * 0.6) * f * 0.05;
			} else {
				p.vx -= dx * f * 0.05;
				p.vy -= dy * f * 0.05;
			}
		}

		if (introGravity.active) {
			let gdx = cx - p.x;
			let gdy = cy - p.y;
			let gdist = Math.sqrt(gdx * gdx + gdy * gdy) + 0.001;
            // Modified logic to allow for stronger "Implosion" effect
			let pull = introGravity.strength * (1 - Math.min(gdist / 800, 1));
			p.vx += gdx * pull;
			p.vy += gdy * pull;
		}

        if (explosionForce.active) {
            let edx = p.x - cx;
            let edy = p.y - cy;
            let edist = Math.sqrt(edx * edx + edy * edy) + 1;
            let blast = (explosionForce.strength * 500) / edist;
            p.vx += (edx / edist) * blast;
            p.vy += (edy / edist) * blast;
        }

		if (!introGravity.active) {
            p.vx += (p.ox - p.x) * 0.02;
            p.vy += (p.oy - p.y) * 0.02;
        }

		p.vx *= 0.9;
		p.vy *= 0.9;
		p.x += p.vx;
		p.y += p.vy;

		ctx.globalAlpha = 0.2 + p.s * 0.05;
		ctx.fillStyle = p.c;
		ctx.beginPath();
		ctx.arc(p.x, p.y, p.s, 0, Math.PI * 2);
		ctx.fill();
	});

    if (explosionForce.active) {
        explosionForce.strength *= 0.85;
        if (explosionForce.strength < 0.1) explosionForce.active = false;
    }

	if (shockwave.active) {
		shockwave.r += 25;
		if (shockwave.r > width * 1.5) shockwave.active = false;
	}

	requestAnimationFrame(render);
}

function startOverture() {
	const sigils = {
		ruby: document.querySelector('.s-ruby'),
		jade: document.querySelector('.s-jade'),
		pearl: document.querySelector('.s-pearl'),
		amber: document.querySelector('.s-amber'),
		p1: document.querySelector('.p1'),
		p2: document.querySelector('.p2'),
		void: document.querySelector('.intro-void'),
        voidSigil: document.querySelector('.s-void-sigil')
	};

	if (sigils.p1) sigils.p1.style.opacity = '0';
	if (sigils.p2) sigils.p2.style.opacity = '0';

	let start = null;
	const duration = 4000;
	introGravity.active = true;

	function animateIntro(time) {
		if (!start) start = time;
		let p = (time - start) / duration;

		if (p < 1) {
			let rot = p * Math.PI * 5;
			let radius = Math.pow(1 - p, 1.5) * 500;
			introGravity.strength = 0.004 + p * 0.01;

			const orbit = (el, angle, r, tx, ty) => {
				if (!el) return;
				let x = Math.cos(angle) * r + tx * p;
				let y = Math.sin(angle) * r + ty * p;
				el.style.transform = `translate(${x}px, ${y}px) scale(${2.3 - p * 0.9})`;
				el.style.opacity = p < 0.8 ? p * 1.5 : 1 - (p - 0.8) * 5;
			};

			orbit(sigils.ruby, rot, radius, -25, -25);
			orbit(sigils.jade, rot + Math.PI / 2, radius, 25, -25);
			orbit(sigils.pearl, rot + Math.PI, radius, 25, 25);
			orbit(sigils.amber, rot + 3 * Math.PI / 2, radius, -25, 25);

			let pRot = rot * 0.5;
			let portalOpacity = p < 0.7 ? p * 1.4 : 1 - (p - 0.7) * 3.3;

			if (sigils.p1) {
				sigils.p1.style.transform =
					`translate(${Math.cos(pRot) * 300}px, ${Math.sin(pRot) * 450}px) scale(1.8)`;
				sigils.p1.style.opacity = portalOpacity;
			}

			if (sigils.p2) {
				sigils.p2.style.transform =
					`translate(${Math.cos(pRot + Math.PI) * 300}px, ${Math.sin(pRot + Math.PI) * 450}px) scale(1.8)`;
				sigils.p2.style.opacity = portalOpacity;
			}

			if (sigils.void) {
				// FIX: Opacity capped at 1.0 for more solidity
				sigils.void.style.opacity = p < 0.8 ? p * 1.0 : 1.0 - (p - 0.8) * 5.0;
                // FIX: Added translate(-50%, -50%) to maintain exact centering during scale
				sigils.void.style.transform = `translate(-50%, -50%) scale(${0.1 + p * 1.0})`;
			}

            if (sigils.voidSigil) {
                let vOp = p < 0.8 ? p * 0.8 : 0.8 - (p - 0.8) * 4.0; 
                sigils.voidSigil.style.opacity = vOp;
                sigils.voidSigil.style.transform = `scale(${0.1 + p * 1.2}) rotate(${p * 90}deg)`;
            }

			requestAnimationFrame(animateIntro);
		} else {
			introGravity.active = false;
            
            explosionForce.active = true;
            explosionForce.strength = 4.0;

			shockwave.active = true;
			shockwave.x = width * 0.5;
			shockwave.y = height * 0.5;
			shockwave.r = 0;

			if (flashOverlay) {
                // FIX: Flash Bang Logic
                // 1. Reset state
				flashOverlay.style.transition = 'none';
				flashOverlay.style.opacity = '1';
                // Use translate to keep centered, start small
				flashOverlay.style.transform = 'translate(-50%, -50%) scale(0.1)'; 
				
                // 2. Force browser repaint
                void flashOverlay.offsetWidth;
                
                // 3. Explosive transition
                // Opacity: 0.3s (very fast fade)
                // Transform: 0.2s (extremely fast expansion)
				flashOverlay.style.transition = 'opacity 0.3s ease-out, transform 0.2s cubic-bezier(0.1, 1, 0.2, 1)';
				flashOverlay.style.opacity = '0';
				flashOverlay.style.transform = 'translate(-50%, -50%) scale(4.0)'; // Huge expansion
			}

			introStage.style.opacity = '0';
			setTimeout(() => {
				introStage.style.display = 'none';
				uiLayer.style.opacity = '1';
			}, 100);
		}
	}

	requestAnimationFrame(animateIntro);
}

function setPointer(direction) {
	const ring = document.querySelector('.compass-ring');
	const piece = document.querySelector('.amalgam-piece');
	if (!ring || !piece) return;

	if (direction === 'left') {
		ring.classList.add('pointing-left');
		ring.classList.remove('pointing-right');
		piece.style.transform = 'scale(1.05) rotate(-5deg)';
	} else {
		ring.classList.add('pointing-right');
		ring.classList.remove('pointing-left');
		piece.style.transform = 'scale(1.05) rotate(5deg)';
	}
}

function clearPointer() {
	const ring = document.querySelector('.compass-ring');
	const piece = document.querySelector('.amalgam-piece');
    // FIX: Only clear if not in exiting state to avoid overriding animation
    if (uiLayer.classList.contains('exiting')) return;

	if (ring) ring.classList.remove('pointing-left', 'pointing-right');
	if (piece) piece.style.transform = 'scale(1) rotate(0deg)';
}

window.addEventListener('mousemove', e => {
	mouse.tx = e.clientX;
	mouse.ty = e.clientY;
});

window.addEventListener('mousedown', e => { if (e.button === 0) mouseDown = true; });
window.addEventListener('mouseup', e => { if (e.button === 0) mouseDown = false; });
window.addEventListener('resize', initParticles);

/* =========================================
   NEW BUTTON LOGIC
   ========================================= */

// 1. LOGIN LOGIC
const loginBtn = document.getElementById('login-btn');
const loginOverlay = document.getElementById('login-modal-overlay');
const closeLoginBtn = document.getElementById('close-login-btn');

loginBtn.addEventListener('click', () => {
    loginOverlay.classList.add('active');
});

[closeLoginBtn, loginOverlay].forEach(el => {
    el.addEventListener('click', (e) => {
        // Close if clicking button or clicking outside the card
        if (e.target === loginOverlay || e.target === closeLoginBtn) {
            loginOverlay.classList.remove('active');
        }
    });
});

// 2. GUEST LOGIC (CINEMATIC EXIT)
const guestBtn = document.getElementById('guest-btn');
const curtain = document.getElementById('transition-curtain');

guestBtn.addEventListener('click', () => {
    // A. Add exiting class to UI (triggers CSS fade/scale/spin)
    uiLayer.classList.add('exiting');
    
    // B. Reactivate Intro Gravity for an "Implosion" effect
    introGravity.active = true;
    introGravity.strength = 0.05; 
    
    // C. Fade in the "Game Background" curtain
    setTimeout(() => {
        curtain.classList.add('active');
    }, 400);

    // D. Redirect
    setTimeout(() => {
        window.location.href = '/Pages/Gameplay/gameplay.html';
    }, 1600);
});

/* =========================================
   NEW: HISTORY RESTORATION FIX (BFCache)
   ========================================= */
window.addEventListener('pageshow', (event) => {
    // If the page is persisted (loaded from back/forward cache)
    // OR if the UI is currently stuck in the "exiting" state
    if (event.persisted || uiLayer.classList.contains('exiting')) {
        
        // 1. Reset UI Appearance
        uiLayer.classList.remove('exiting');
        curtain.classList.remove('active');
        
        // 2. Force Opacity back to 1 (just in case inline styles stuck)
        uiLayer.style.opacity = '1';

        // 3. Reset Physics Engine
        introGravity.active = false;
        introGravity.strength = 0;
        
        // 4. Reset Button State (in case it stuck in active state)
        clearPointer();
        
        // 5. Ensure Animation Loop is running (sometimes stops in BFCache)
        // We cancel the previous frame to avoid double-looping
        // Note: 'requestAnimationFrame' usually handles this automatically, 
        // but this is a safety measure.
        // Since your 'render' loop calls itself recursively, 
        // we just need to ensure physics are reset.
    }
});

initParticles();
render();
setTimeout(startOverture, 500);