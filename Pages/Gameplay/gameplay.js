
/* SOUND SYNTHS */
const audioCtx = new (window.AudioContext || window.webkitAudioContext)();
const soundToggle = document.getElementById('soundToggle');

function playTileSound() {
    if (!soundToggle.checked) return;
    if (audioCtx.state === 'suspended') audioCtx.resume();
    const osc = audioCtx.createOscillator();
    const gain = audioCtx.createGain();
    osc.type = 'triangle';
    osc.frequency.setValueAtTime(140, audioCtx.currentTime);
    osc.frequency.exponentialRampToValueAtTime(30, audioCtx.currentTime + 0.1);
    gain.gain.setValueAtTime(0.04, audioCtx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.001, audioCtx.currentTime + 0.1);
    osc.connect(gain); gain.connect(audioCtx.destination);
    osc.start(); osc.stop(audioCtx.currentTime + 0.1);
}

function playFocusSound() {
    if (!soundToggle.checked) return;
    if (audioCtx.state === 'suspended') audioCtx.resume();
    const osc = audioCtx.createOscillator();
    const gain = audioCtx.createGain();
    osc.type = 'sine';
    osc.frequency.setValueAtTime(440, audioCtx.currentTime);
    gain.gain.setValueAtTime(0.02, audioCtx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.001, audioCtx.currentTime + 0.05);
    osc.connect(gain); gain.connect(audioCtx.destination);
    osc.start(); osc.stop(audioCtx.currentTime + 0.05);
}

function playNotificationSound() {
    if (!soundToggle.checked) return;
    if (audioCtx.state === 'suspended') audioCtx.resume();
    [523.25, 659.25].forEach((freq, i) => {
        const osc = audioCtx.createOscillator();
        const gain = audioCtx.createGain();
        osc.frequency.setValueAtTime(freq, audioCtx.currentTime + (i * 0.1));
        gain.gain.setValueAtTime(0.02, audioCtx.currentTime + (i * 0.1));
        gain.gain.exponentialRampToValueAtTime(0.001, audioCtx.currentTime + (i * 0.1) + 0.2);
        osc.connect(gain); gain.connect(audioCtx.destination);
        osc.start(audioCtx.currentTime + (i * 0.1));
        osc.stop(audioCtx.currentTime + (i * 0.1) + 0.2);
    });
}

// General Sound Setup
document.querySelectorAll('button, .theme-slider, select').forEach(el => {
    el.addEventListener('click', playTileSound);
});

const chatMessageInput = document.getElementById('chatMessage');
chatMessageInput.addEventListener('click', playFocusSound);

/* AMBIENT EMBERS */
const ambientContainer = document.getElementById('ambientContainer');
const particleToggle = document.getElementById('particleToggle');
function createParticle() {
    if (!particleToggle.checked) return;
    const p = document.createElement('div');
    p.className = 'particle';
    const size = Math.random() * 6 + 4 + 'px';
    p.style.width = size; p.style.height = size;
    p.style.left = Math.random() * 100 + 'vw';
    p.style.animationDuration = Math.random() * 8 + 7 + 's';
    ambientContainer.appendChild(p);
    setTimeout(() => p.remove(), 15000);
}
setInterval(createParticle, 1200);

/* THEME TOGGLE */
document.getElementById('toggleTheme').onclick = () => {
    document.body.classList.toggle('dark');
};

/* SETTINGS DRAWER */
const openSettingsBtn = document.getElementById('openSettings');
const closeSettingsBtn = document.getElementById('closeSettings');
const settingsModal = document.getElementById('settingsModal');

const sidePanel = document.querySelector('.side-panel');

sidePanel.addEventListener('transitionend', (e) => {
    if (e.propertyName === 'padding-left' || e.propertyName === 'left') {
        resizeCanvas();
    }
});


openSettingsBtn.onclick = () => {
    const isOpen = settingsModal.classList.toggle('open');
    document.body.classList.toggle('settings-open', isOpen);
};

closeSettingsBtn.onclick = () => {
    settingsModal.classList.remove('open');
    document.body.classList.remove('settings-open');
};

/* TABS */
const historyTab = document.getElementById('historyTab');
const chatTab = document.getElementById('chatTab');
const matchHistory = document.getElementById('matchHistory');
const chatLog = document.getElementById('chatLog');
const chatInput = document.getElementById('chatInput');
const historyControls = document.getElementById('historyControls');
const toggleNotationBtn = document.getElementById('toggleNotation');

function updateLogHeaderVisibility() {
    historyControls.style.display =
        historyTab.classList.contains('active') ? 'flex' : 'none';
}

function getTurnMeta(line) {
    if (!line || typeof line !== 'string') return null;

    const match = line.match(/^(\d+)([SC]):/);
    if (!match) return null;

    return {
        turn: Number(match[1]),
        side: match[2]
    };
}


historyTab.onclick = () => {
    historyTab.classList.add('active');
    chatTab.classList.remove('active');

    matchHistory.style.display = 'block';
    chatLog.style.display = 'none';
    chatInput.style.display = 'none';

    copyHistoryBtn.classList.remove('hidden-but-reserved');
    toggleNotationBtn.classList.remove('hidden-but-reserved');
};

chatTab.onclick = () => {
    chatTab.classList.add('active');
    historyTab.classList.remove('active');

    matchHistory.style.display = 'none';
    chatLog.style.display = 'block';
    chatInput.style.display = 'flex';

    copyHistoryBtn.classList.add('hidden-but-reserved');
    toggleNotationBtn.classList.add('hidden-but-reserved');
};


/* CHAT SEND */
const sendChat = document.getElementById('sendChat');
chatMessageInput.addEventListener('keydown', (e) => {
    if (e.key === 'Enter') {
        e.preventDefault();
        sendChat.click();
    }
});

sendChat.onclick = () => {
    const msg = chatMessageInput.value.trim();
    if (!msg) return;

    const div = document.createElement('div');
    // ... (Your existing nameSpan and msgSpan logic) ...
    const nameSpan = document.createElement('span');
    nameSpan.textContent = 'Alice: ';
    nameSpan.style.fontWeight = '700';

    const msgSpan = document.createElement('span');
    msgSpan.textContent = msg;

    div.appendChild(nameSpan);
    div.appendChild(msgSpan);

    // FIX: Use the explicit ID to ensure we are targeting the correct element
    const logContainer = document.getElementById('chatLog');
    logContainer.appendChild(div);
    
    chatMessageInput.value = '';
    
    // Trigger scroll
    requestAnimationFrame(() => {
        logContainer.scrollTop = logContainer.scrollHeight;
    });
    
    playNotificationSound();
};


/* RESTART CONFIRMATION – ANCHORED ABOVE CANVAS */
const restartBtn = document.getElementById('restartGameBtn');
const restartOverlay = document.getElementById('restartConfirmOverlay');
const callout = restartOverlay.querySelector('.confirm-callout');
const cancelRestart = document.getElementById('cancelRestart');
const confirmRestart = document.getElementById('confirmRestart');
const canvasContainer = document.querySelector('.canvas-container');

function positionRestartCallout() {
    const calloutRect = callout.getBoundingClientRect();
    const viewportHeight = window.innerHeight;

    const verticalCenter =
        (viewportHeight / 2) - (calloutRect.height / 2);

    callout.style.setProperty(
        '--callout-offset',
        `${Math.max(verticalCenter, 0)}px`
    );

    // Horizontal centering (unchanged)
    const canvasRect = canvasContainer.getBoundingClientRect();
    const calloutWidth = 360;

    callout.style.width = calloutWidth + 'px';
    callout.style.left =
        canvasRect.left +
        (canvasRect.width / 2) -
        (calloutWidth / 2) +
        'px';
}


restartBtn.onclick = () => {
    positionRestartCallout();
    restartOverlay.classList.add('active');
    callout.style.top = '-200px';

    requestAnimationFrame(() => {
    callout.style.top = getComputedStyle(callout)
        .getPropertyValue('--callout-offset');
    });
};

cancelRestart.onclick = () => {
    callout.style.top = '-200px';
    setTimeout(() => {
        restartOverlay.classList.remove('active');
    }, 300);
};

confirmRestart.onclick = () => {
    callout.style.top = '-200px';
    setTimeout(() => {
        restartOverlay.classList.remove('active');
    }, 300);

};

/* Reposition if window resizes while open */
window.addEventListener('resize', () => {
    if (restartOverlay.classList.contains('active')) {
        positionRestartCallout();
    }
});


/* CANVAS */
const canvas = document.getElementById('gameCanvas');
const ctx = canvas.getContext('2d');
function resizeCanvas() {
    const container = document.querySelector('.canvas-container');
    const rect = container.getBoundingClientRect();

    const size = Math.min(rect.width, rect.height);

    canvas.width = size;
    canvas.height = size;
}


window.addEventListener('resize', resizeCanvas);
resizeCanvas();

// Turn indicator update function - call this when player changes
window.updateTurnIndicator = function(currentPlayer) {
    const circleIndicator = document.getElementById('circleIndicator');
    const squareIndicator = document.getElementById('squareIndicator');
    
    if (currentPlayer === 'Player 1') {
        squareIndicator.classList.add('active');
        circleIndicator.classList.remove('active');
    } else {
        circleIndicator.classList.add('active');
        squareIndicator.classList.remove('active');
    }
};

/* Copy Match History to clipboard */
const copyHistoryBtn = document.getElementById('copyHistory');

copyHistoryBtn.onclick = async () => {
    const text = showEnglish
        ? rawHistory
            .map(line =>
                parseToSegments(line)
                    .map(s => s.text)
                    .join('')
                    .replace(/\s+/g, ' ')
                    .trim()
            )
            .join('\n')
        : rawHistory.join('\n');

    try {
        await navigator.clipboard.writeText(text);

        // Subtle success feedback
        copyHistoryBtn.style.transform = 'scale(0.9)';
        setTimeout(() => copyHistoryBtn.style.transform = '', 120);
        playNotificationSound();

    } catch (err) {
        console.error('Clipboard copy failed', err);
    }
};


/* NOTATION PARSER & TOGGLE LOGIC */
const PIECES = { 'A': 'Amalgam', 'V': 'Void', 'P': 'Portal', 'rG': 'Ruby Gem', 'pG': 'Pearl Gem', 'aG': 'Amber Gem', 'jG': 'Jade Gem' };
const ABILITIES = { 'F': 'Fireball', 'W': 'Wave', 'S': 'Sap', 'L': 'Launch' };

// Your match history data
let rawHistory = [];
// This will be populated by the game logic
window.rawHistory = rawHistory;
window.renderMatchHistory = renderMatchHistory; // Make it accessible from Main.js

let showEnglish = false;

function parseToSegments(input) {
    const metaMatch = input.match(/^(\d+)([SC]):/);
    if (!metaMatch) return [{ text: input, className: "" }];

    const [, turnStr, side] = metaMatch;
    const turn = parseInt(turnStr, 10);
    const raw = input.slice(metaMatch[0].length);

    // Regex captures coords, ability codes (#L), pieces, or symbols
    const tokens = raw.match(/(\(-?\d+,-?\d+\))|(#?[FWLS])|([a-zA-Z]{1,2})|([~!@+])/g) || [];

    const segments = [
        { text: `Turn ${turn} (${side === "S" ? "Square" : "Circle"}): `, className: "meta" }
    ];

    // --- SETUP PHASE (Turn 0) ---
    if (turn === 0) {
        let pieceCount = 0;
        
        for (let i = 0; i < tokens.length; i++) {
            const t = tokens[i];
            if (PIECES[t]) {
                if (pieceCount > 0) segments.push({ text: ", " });
                segments.push({ text: `${PIECES[t]} `, className: `piece-${t}` });
                pieceCount++;
            } else if (t.startsWith("(")) {
                segments.push({ text: `at ${t}`, className: "coord" });
            }
        }
        return segments;
    }

    // --- STANDARD TURNS ---
    let subject = null;
    let subjectCoord = null;
    let ability = null; 
    let abilityCoords = [];
    let pendingMove = false;
    let sentenceOpen = false;
    
    // Launch state: 0=None, 1=Active
    let launchStep = 0; 

    const endSentence = () => {
        if (!sentenceOpen) return;
        const last = segments[segments.length - 1];
        if (last && last.text.endsWith(" ")) {
            last.text = last.text.slice(0, -1);
        }
        segments.push({ text: ". " });
        sentenceOpen = false;
    };

    for (let i = 0; i < tokens.length; i++) {
        const t = tokens[i];

        // 1. ELIMINATION (Global Priority)
        if (t === "!") {
            const eliminated = [];
            let j = i + 1;

            while (j < tokens.length && PIECES[tokens[j]]) {
                const code = tokens[j];
                let coord = null;
                if (tokens[j + 1]?.startsWith("(")) {
                    coord = tokens[j + 1];
                    j++; 
                }
                eliminated.push({ code, coord });
                j++; 
            }
            
            if (eliminated.length > 0) {
                segments.push({ text: " which eliminated " });
                eliminated.forEach((e, idx) => {
                    segments.push({ text: `the ${PIECES[e.code]} `, className: `piece-${e.code}` });
                    if (e.coord) {
                        segments.push({ text: `at ${e.coord}`, className: "coord" });
                    }
                    if (idx < eliminated.length - 1) segments.push({ text: " and " });
                });
            }
            
            endSentence();
            ability = null;
            pendingMove = false;
            launchStep = 0;
            i = j - 1; 
            continue;
        }

        // 2. ABILITY START
        if (/^#[FWLS]$/.test(t)) {
            endSentence(); 
            ability = t.substring(1);
            abilityCoords = [];
            
            if (ability === "L") {
                segments.push({ text: `Used ${ABILITIES[ability]} to move ` });
                launchStep = 1; 
            } else {
                segments.push({ text: `Used ${ABILITIES[ability]} ` });
                launchStep = 0;
            }
            sentenceOpen = true;
            continue;
        }

        // 3. LAUNCH SEQUENCE HANDLING
        if (ability === "L" && launchStep > 0) {
            if (PIECES[t]) {
                // Launched Piece
                segments.push({ text: `the ${PIECES[t]} `, className: `piece-${t}` });
            } 
            else if (t.startsWith("(")) {
                // Check if the previous segment was "to " (meaning this is destination)
                const lastText = segments[segments.length-1]?.text || "";
                
                if (lastText.trim() === "to") {
                    segments.push({ text: `${t} `, className: "coord" });
                } else {
                    segments.push({ text: `from ${t} `, className: "coord" });
                }
            } 
            else if (t === "~") {
                // FIX: Changed "moves to " to just "to " to match sentence flow
                segments.push({ text: "to " });
            }
            continue;
        }

        // 4. STANDARD PIECE SELECTION
        if (PIECES[t]) {
            if (ability && ability !== "L") {
                endSentence();
                ability = null;
            }
            subject = t;
            segments.push({ text: `The ${PIECES[subject]} `, className: `piece-${subject}` });
            
            if (tokens[i + 1]?.startsWith("(")) {
                subjectCoord = tokens[++i];
                segments.push({ text: `at ${subjectCoord} `, className: "coord" });
            }
            sentenceOpen = true;
        }

        // 5. MOVEMENT (~)
        else if (t === "~") {
            segments.push({ text: "moves to " });
            pendingMove = true;
        }

        // 6. SWAP (@)
        else if (t === "@") {
            segments.push({ text: "swapped with " });
            const swapPiece = tokens[++i];
            if (PIECES[swapPiece]) {
                segments.push({ text: `the ${PIECES[swapPiece]} `, className: `piece-${swapPiece}` });
                if (tokens[i + 1]?.startsWith("(")) {
                    segments.push({ text: `at ${tokens[++i]} `, className: "coord" });
                }
            }
        }

        // 7. AMPLIFY (+)
        else if (t === "+") {
            segments.push({ text: "(amplified) " });
        }

        // 8. COORDINATES (General)
        else if (t.startsWith("(")) {
            if (pendingMove) {
                segments.push({ text: `${t} `, className: "coord" });
                pendingMove = false;
            } else if (ability && ability !== "L") {
                abilityCoords.push(t);
                segments.push({ text: `at ${t} `, className: "coord" });
            }
        }
    }
    
    endSentence(); 
    return segments;
}

function renderMatchHistory() {
    if (!Array.isArray(rawHistory)) {
        console.error("rawHistory is not an array", rawHistory);
        return;
    }

    const historyContainer = document.getElementById('matchHistory');
    
    historyContainer.innerHTML = '';
    rawHistory.forEach((line, index) => {
        const div = document.createElement('div');
        div.className = 'log-turn';

        const current = getTurnMeta(line);
        const next = getTurnMeta(rawHistory[index + 1]);

        // Major break AFTER a completed turn (1C → 2S)
        if (
            current &&
            next &&
            current.side === 'C' &&
            next.side === 'S' &&
            next.turn === current.turn + 1
        ) {
            div.classList.add('major-break');
        }

        if (showEnglish) {
            const segments = parseToSegments(line);
            div.innerHTML = segments
                .map(s => `<span class="${s.className ?? ''}">${s.text}</span>`)
                .join('');
        } else {
            div.innerHTML = stylizeRawNotation(line);
        }

        historyContainer.appendChild(div);
    });
    
    // Scroll to bottom after rendering
    requestAnimationFrame(() => {
        historyContainer.scrollTop = historyContainer.scrollHeight;
    });
}



const ABILITY_GEM_MAP = {
    F: 'rG', // Fireball → Ruby
    W: 'pG', // Wave     → Pearl
    L: 'jG', // Launch   → Jade
    S: 'aG'  // Sap      → Amber
};

function stylizeRawNotation(line) {
    const tokens = line.match(
        /(\d+[SC]:)|(#?[FWLS])|(\+)|((?:rG|pG|aG|jG)|A|V|P)|(\(-?\d+,-?\d+\))|([~@!])/g
    ) || [];

    let html = '';
    let currentPieceClass = null;
    let currentAbilityPieceClass = null;

    tokens.forEach(token => {

        /* TURN META */
        if (/^\d+[SC]:$/.test(token)) {
            currentPieceClass = null;
            currentAbilityPieceClass = null;
            html += `<span class="notation-meta">${token}</span>`;
            return;
        }

        /* ABILITY */
        if (/^#[FWLS]$/.test(token)) {
            const ability = token[1];
            const gem = ABILITY_GEM_MAP[ability];

            currentAbilityPieceClass = `notation-piece-${gem}`;
            currentPieceClass = null;

            html += `#<span class="${currentAbilityPieceClass}">${ability}</span>`;
            return;
        }

        /* AMPLIFIED */
        if (token === '+') {
            html += `<span class="notation-amplified">+</span>`;
            return;
        }

        /* PIECES */
        if (/^(rG|pG|aG|jG|A|V|P)$/.test(token)) {
            currentPieceClass = `notation-piece-${token}`;
            currentAbilityPieceClass = null;
            html += `<span class="${currentPieceClass}">${token}</span>`;
            return;
        }

        /* COORDINATES */
        if (/^\(-?\d+,-?\d+\)$/.test(token)) {
            const coordClass =
                currentAbilityPieceClass ??
                currentPieceClass ??
                'notation-coord';

            html += `<span class="notation-coord ${coordClass}">${token}</span>`;
            return;
        }

        /* SYMBOLS */
        if (token === '~') {
            html += `<span class="notation-move">~</span>`;
            return;
        }

        if (token === '@') {
            html += `<span class="notation-swap">@</span>`;
            return;
        }

        if (token === '!') {
            currentPieceClass = null;
            currentAbilityPieceClass = null;
            html += `<span class="notation-elim">!</span>`;
            return;
        }

        html += token;
    });

    return html;
}


document.getElementById('toggleNotation').onclick = function() {
    showEnglish = !showEnglish;
    this.classList.toggle('active');
    // Swap icon based on state
    document.getElementById('toggleIcon').innerHTML = showEnglish 
        ? '<path d="M4 6h16M4 12h16M4 18h7" />' // Text icon
        : '<path d="M16 18l6-6-6-6M8 6l-6 6 6 6" />'; // Code icon
    renderMatchHistory();
};

// Initial call to render
renderMatchHistory();
updateLogHeaderVisibility();

// Expose the render function for Main.js to call
window.renderMatchHistory = renderMatchHistory;

function smartScroll(container) {
    if (!container) return;
    
    // 1. Calculate the distance from the bottom BEFORE we try to scroll
    const threshold = 50;
    // We check if the user was ALREADY at the bottom before the new message arrived
    const wasAtBottom = container.scrollHeight - container.scrollTop - container.clientHeight <= threshold;
    
    if (wasAtBottom) {
        requestAnimationFrame(() => {
            // 2. Scroll to the NEW scrollHeight
            container.scrollTop = container.scrollHeight;
        });
    }
}
