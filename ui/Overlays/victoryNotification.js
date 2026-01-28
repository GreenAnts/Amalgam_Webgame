// UI/Overlays/victoryNotification.js - Victory/Defeat modal system
export class VictoryNotification {
    constructor(matchHistoryTracker) {
        this.matchHistoryTracker = matchHistoryTracker;
        
        // DOM elements
        this.overlay = document.getElementById('victoryOverlay');
        this.card = document.getElementById('victoryCard');
        this.title = document.getElementById('victoryTitle');
        this.message = document.getElementById('victoryMessage');
        this.icon = document.getElementById('victoryIcon');
        this.resetBtn = document.getElementById('victoryResetBtn');
        this.closeBtn = document.getElementById('victoryCloseBtn');
        this.copyBtn = document.getElementById('victoryCopyBtn');
        
        // State
        this.gameEnded = false;
        
        // Callbacks (set by orchestrator)
        this.onReset = null;
        this.onClose = null;
        
        this.bindEvents();
    }
    
    bindEvents() {
        this.resetBtn.addEventListener('click', () => {
            this.hide();
            if (this.onReset) this.onReset();
        });
        
        this.closeBtn.addEventListener('click', () => {
            this.hide();
            this.gameEnded = true;
            if (this.onClose) this.onClose();
        });
        
        this.copyBtn.addEventListener('click', async () => {
            await this.copyMatchHistory();
        });
    }
    
    /**
     * Show victory/defeat modal
     * @param {Object} winResult - { winner: string, method: string }
     * @param {string} humanPlayerName - Name of human player (e.g., "Player 1")
     */
    show(winResult, humanPlayerName = 'Player 1') {
        if (!winResult) return;
        
        const isVictory = winResult.winner === humanPlayerName;
        
        // Apply theme classes
        this.card.classList.remove('is-victory', 'is-defeat');
        this.card.classList.add(isVictory ? 'is-victory' : 'is-defeat');
        
        // Set content
        if (isVictory) {
            this.title.textContent = "Victory";
            this.icon.innerHTML = `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor"><path d="M2 4l3 12h14l3-12-6 7-4-7-4 7-6-7zm3 16h14"/></svg>`;
        } else {
            this.title.textContent = "Defeat";
            this.icon.innerHTML = `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor"><path d="M18 12L6 12M6 12L12 6M6 12L12 18"/></svg>`;
        }
        
        this.message.innerHTML = `
            ${winResult.winner} wins<br>
            via ${winResult.method}
        `;
        
        // Show modal
        this.overlay.classList.add('active');
    }
    
    hide() {
        this.overlay.classList.remove('active');
    }
    
    async copyMatchHistory() {
        const text = this.matchHistoryTracker.getRawHistory().join('\n');
        
        try {
            await navigator.clipboard.writeText(text);
            
            // Visual feedback
            this.copyBtn.style.transform = 'scale(0.9)';
            setTimeout(() => this.copyBtn.style.transform = '', 120);
            
            // Play sound if available
            if (typeof playNotificationSound === 'function') {
                playNotificationSound();
            }
        } catch (err) {
            console.error('Clipboard copy failed', err);
        }
    }
    
    isGameEnded() {
        return this.gameEnded;
    }
    
    resetGameEndedState() {
        this.gameEnded = false;
    }
}