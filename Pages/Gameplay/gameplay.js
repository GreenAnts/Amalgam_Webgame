/* --- Audio System --- */
const audioCtx = new (window.AudioContext || window.webkitAudioContext)();
const soundToggle = document.getElementById('soundToggle');

function playTileSound() {
    if (!soundToggle || !soundToggle.checked) return;
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

function playNotificationSound() {
    if (!soundToggle || !soundToggle.checked) return;
    if (audioCtx.state === 'suspended') audioCtx.resume();
    const osc = audioCtx.createOscillator();
    const gain = audioCtx.createGain();
    osc.frequency.setValueAtTime(523.25, audioCtx.currentTime);
    gain.gain.setValueAtTime(0.02, audioCtx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.001, audioCtx.currentTime + 0.1);
    osc.connect(gain); gain.connect(audioCtx.destination);
    osc.start(); osc.stop(audioCtx.currentTime + 0.1);
}

document.querySelectorAll('button, select').forEach(el => {
    el.addEventListener('click', () => {
        if (!el.dataset.soundPlayed) {
            playTileSound();
            el.dataset.soundPlayed = "true";
            setTimeout(() => el.dataset.soundPlayed = "", 100);
        }
    });
});

/* --- Canvas Resizing (Stutter Prevention) --- */
const canvas = document.getElementById('gameCanvas');
const canvasContainer = document.getElementById('canvasContainer');

function resizeCanvas() {
    if (!canvasContainer || !canvas) return;
    
    const rect = canvasContainer.getBoundingClientRect();
    const size = Math.min(rect.width, rect.height) - 40; // Padding
    
    // Only update if difference > 5px to prevent loop/jitters
    if (Math.abs(canvas.width - size) > 5) {
        canvas.width = size;
        canvas.height = size;
        // Explicit pixel size prevents layout thrashing
        canvas.style.width = size + "px";
        canvas.style.height = size + "px";
    }
}

// Debounce to prevent constant recalculation during window drag
let resizeTimer;
window.addEventListener('resize', () => {
    clearTimeout(resizeTimer);
    resizeTimer = setTimeout(resizeCanvas, 100);
});
// Initial load
setTimeout(resizeCanvas, 100);

/* --- Settings Drawer (Left Side) --- */
const settingsDrawer = document.getElementById('settingsDrawer');
const settingsOverlay = document.getElementById('settingsOverlay');
const openSettingsBtn = document.getElementById('openSettingsBtn');
const closeSettingsBtn = document.getElementById('closeSettingsBtn');

function toggleSettings(open) {
    if (open) {
        settingsDrawer.classList.add('open');
        settingsOverlay.classList.add('active');
    } else {
        settingsDrawer.classList.remove('open');
        settingsOverlay.classList.remove('active');
    }
}

if(openSettingsBtn) openSettingsBtn.addEventListener('click', () => toggleSettings(true));
if(closeSettingsBtn) closeSettingsBtn.addEventListener('click', () => toggleSettings(false));
if(settingsOverlay) settingsOverlay.addEventListener('click', () => toggleSettings(false));

/* --- AI Strategy --- */
const aiDropdown = document.getElementById('aiDifficultyDropdown');
if (aiDropdown) {
    aiDropdown.addEventListener('change', (e) => {
        // Broadcast for Main.js
        const event = new CustomEvent('ai-strategy-changed', {
            detail: { strategy: e.target.value }
        });
        window.dispatchEvent(event);
        
        if (!window.GameSettings) window.GameSettings = {};
        window.GameSettings.aiStrategy = e.target.value;
        playTileSound();
    });
}

/* --- Theme Controls --- */
const themeToggleBtn = document.getElementById('gameThemeToggle');
const darkSwitch = document.getElementById('darkModeSwitch');
const themeSelect = document.getElementById('themeSelect');

function toggleDarkMode() {
    if (typeof ThemeManager !== 'undefined') {
        ThemeManager.toggleColorMode();
        updateThemeUI();
    }
}

if (themeToggleBtn) themeToggleBtn.addEventListener('click', toggleDarkMode);
if (darkSwitch) darkSwitch.addEventListener('change', toggleDarkMode);

if (themeSelect) {
    themeSelect.addEventListener('change', (e) => {
        const theme = e.target.value;
        const currentMode = document.documentElement.getAttribute('data-theme').includes('-dark') ? 'dark' : 'light';
        if (typeof ThemeManager !== 'undefined') {
            ThemeManager.setTheme(theme, currentMode);
        }
    });
}

function updateThemeUI() {
    const isDark = document.documentElement.getAttribute('data-theme').includes('-dark');
    if (themeToggleBtn) {
        const icon = themeToggleBtn.querySelector('i');
        icon.className = isDark ? 'fas fa-moon' : 'fas fa-sun';
    }
    if (darkSwitch) darkSwitch.checked = isDark;
}

/* --- Auto-Scroll Logic --- */
const matchHistory = document.getElementById('matchHistory');
const chatLog = document.getElementById('chatLog');

class SmartScroller {
    constructor(element) {
        this.element = element;
        this.isPinned = true; // Default to sticky
        this.init();
    }

    init() {
        if (!this.element) return;

        // 1. Track User Intent
        this.element.addEventListener('scroll', () => {
            const { scrollTop, scrollHeight, clientHeight } = this.element;
            // Tolerance of 10px allows for sub-pixel rendering differences
            const isAtBottom = scrollHeight - scrollTop - clientHeight <= 10;
            
            // Only unpin if the user intentionally scrolls up (and isn't at bottom)
            // We check this to prevent the auto-scroll itself from unpinning
            if (!isAtBottom) {
                this.isPinned = false;
            } else {
                this.isPinned = true;
            }
        });

        // 2. Observer for new content
        const observer = new MutationObserver(() => {
            if (this.isPinned) {
                this.scrollToBottom();
            }
        });

        observer.observe(this.element, { childList: true, subtree: true });
    }

    scrollToBottom() {
        requestAnimationFrame(() => {
            this.element.scrollTo({
                top: this.element.scrollHeight,
                behavior: 'smooth' // This makes the transition fluid instead of a snap
            });
        });
    }
}

// Initialize Scrollers
const historyScroller = new SmartScroller(matchHistory);
const chatScroller = new SmartScroller(chatLog);

/* --- Tabs --- */
historyTab.onclick = () => {
    historyTab.classList.add('active');
    chatTab.classList.remove('active');
    historyControls.style.display = 'flex';
    
    chatLog.style.display = 'none';
    chatInput.style.display = 'none';
    
    matchHistory.style.display = 'block';
    // FORCE UPDATE: Restore scroll position if it was pinned
    if (historyScroller.isPinned) historyScroller.scrollToBottom();
};

chatTab.onclick = () => {
    chatTab.classList.add('active');
    historyTab.classList.remove('active');
    historyControls.style.display = 'none';
    
    matchHistory.style.display = 'none';
    
    chatLog.style.display = 'block';
    chatInput.style.display = 'flex';
    
    // FORCE UPDATE: Restore scroll position if it was pinned
    if (chatScroller.isPinned) chatScroller.scrollToBottom();
};

/* --- Chat Send --- */
const sendChat = document.getElementById('sendChat');
const chatMessageInput = document.getElementById('chatMessage');

chatMessageInput.addEventListener('keydown', (e) => {
    if (e.key === 'Enter') sendChat.click();
});

sendChat.onclick = () => {
    const msg = chatMessageInput.value.trim();
    if (!msg) return;
    
    const div = document.createElement('div');
    div.className = 'log-turn';
    div.innerHTML = `<strong style="color:var(--primary-color)">You:</strong> ${msg}`;
    chatLog.appendChild(div);
    chatMessageInput.value = '';
    playNotificationSound();
};

/* --- Global Interfaces for Main.js --- */
window.rawHistory = [];
let showEnglish = false;

window.renderMatchHistory = function() {
    matchHistory.innerHTML = '';
    window.rawHistory.forEach(line => {
        const div = document.createElement('div');
        div.className = 'log-turn';
        if (showEnglish) {
            div.textContent = line.replace(/([A-Z][a-z]?)/g, ' $1 ').trim();
        } else {
            div.innerHTML = stylizeRawNotation(line);
        }
        matchHistory.appendChild(div);
    });
};

/* Turn Indicators (Edge Bars) */
const topBar = document.getElementById('topTurnBar');
const bottomBar = document.getElementById('bottomTurnBar');
const sRow = document.getElementById('squarePlayerRow');
const cRow = document.getElementById('circlePlayerRow');

window.updateTurnIndicator = function(currentPlayer) {
    // Reset all
    sRow.classList.remove('active');
    cRow.classList.remove('active');
    topBar.classList.remove('active');
    bottomBar.classList.remove('active');

    if (currentPlayer === 'Player 1' || currentPlayer.includes('Square')) {
        // Square = Bottom = Green
        sRow.classList.add('active');
        // bottomBar.classList.add('active');
    } else {
        // Circle = Top = Red
        cRow.classList.add('active');
        // topBar.classList.add('active');
    }
};

document.getElementById('toggleNotation').onclick = function() {
    showEnglish = !showEnglish;
    this.classList.toggle('active');
    window.renderMatchHistory();
};

document.getElementById('copyHistory').onclick = async function() {
    try {
        await navigator.clipboard.writeText(window.rawHistory.join('\n'));
        const i = this.querySelector('i');
        i.className = 'fas fa-check';
        setTimeout(() => i.className = 'fas fa-copy', 1000);
    } catch(e) {}
};

function stylizeRawNotation(line) {
    const tokens = line.match(/(\d+[SC]:)|(#?[FWLS])|(\+)|((?:rG|pG|aG|jG)|A|V|P)|(\(-?\d+,-?\d+\))|([~@!])/g) || [];
    let html = '';
    tokens.forEach(t => {
        if (/^\d+[SC]:$/.test(t)) html += `<span class="n-meta">${t}</span> `;
        else if (/^(rG|pG|aG|jG|A|V|P)$/.test(t)) html += `<span class="n-${t}">${t}</span>`;
        else if (/^#[FWLS]$/.test(t)) html += `<span class="n-${t.charAt(1)}">${t}</span>`;
        else if (/^\(/.test(t)) html += `<span class="n-coord">${t}</span>`;
        else html += `<span class="n-sym">${t}</span>`;
    });
    return html;
}

// Restart Modal
const restartModal = document.getElementById('restartConfirmOverlay');
document.getElementById('restartGameBtn').onclick = () => restartModal.classList.add('active');
document.getElementById('cancelRestart').onclick = () => restartModal.classList.remove('active');
document.getElementById('confirmRestart').onclick = () => {
    restartModal.classList.remove('active');
};

document.getElementById('victoryCloseBtn').onclick = () => {
    document.getElementById('victoryOverlay').classList.remove('active');
}

// Initialize
document.addEventListener('DOMContentLoaded', () => {
    resizeCanvas();
    updateThemeUI();
});