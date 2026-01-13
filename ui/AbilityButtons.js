// ui/AbilityButtons.js - Tea House Aesthetic (Washed Ink & Zen Maru Gothic)
export class AbilityButtons {
    constructor(canvas, ctx) {
        this.canvas = canvas;
        this.ctx = ctx;
        
        // Tea House Palette colors integrated from BoardRenderer and SetupUI
        this.teaPalette = {
            ink: '#7a6d60',
            inkFaint: 'rgba(122, 109, 96, 0.3)',
            paper: '#fdfaf5',
            border: '#d6c6b2'
        };

        // Button configuration
        this.buttons = {
            portalSwap: {
                name: 'Portal Swap',
                color: '#87CEEB', // Pearl-like sky blue
                symbol: '🌀',
                state: 'disabled', 
                isCenter: true 
            },
            rubyFireball: {
                name: 'Ruby Fireball',
                color: '#e4395f', // Matches SetupUI Ruby
                symbol: '🔥',
                state: 'disabled',
                angle: 0
            },
            pearlTidalwave: {
                name: 'Pearl Tidal Wave',
                color: '#eae0c8', // Matches SetupUI Pearl
                symbol: '🌊',
                state: 'disabled',
                angle: 1
            },
            amberSap: {
                name: 'Amber Sap',
                color: '#f3bf3f', // Matches SetupUI Amber
                symbol: '🫟',
                state: 'disabled',
                angle: 2
            },
            jadeLaunch: {
                name: 'Jade Launch',
                color: '#a8e685', // Matches SetupUI Jade
                symbol: '🪽',
                state: 'disabled',
                angle: 3
            }
        };
        
        this.baseButtonRadius = 20;
        this.arcRadius = 120;
        this.centerRadius = 50; 
        this.padding = 20;
        this.animationTime = 0;
        
        this.endTurnButton = {
            visible: false,
            x: 80, 
            y: null, 
            width: 100,
            height: 40,
            color: '#a09682', // Stain3 color from BoardRenderer
            hoverColor: '#7a6d60' // Ink color
        };
        this.endTurnHovered = false;
    }

    // Get button position on canvas (Logic unchanged)
    getButtonPosition(buttonKey) {
        const button = this.buttons[buttonKey];
        const baseSize = 800; 
        const scale = Math.min(this.canvas.width, this.canvas.height) / baseSize;
        const scaledRadius = this.baseButtonRadius * scale;
        const scaledArcRadius = this.arcRadius * scale;
        const scaledCenterRadius = this.centerRadius * scale;
        const scaledPadding = this.padding * scale;
        
        const cornerX = this.canvas.width - scaledPadding;
        const cornerY = this.canvas.height - scaledPadding;
        
        if (button.isCenter) {
            const x = cornerX - scaledCenterRadius / Math.sqrt(2);
            const y = cornerY - scaledCenterRadius / Math.sqrt(2);
            return { x, y, radius: scaledRadius };
        }
        
        const angleStep = (Math.PI / 2) / 4;
        const angle = (button.angle + 0.5) * angleStep;
        
        const x = cornerX - Math.cos(angle) * scaledArcRadius;
        const y = cornerY - Math.sin(angle) * scaledArcRadius;
        
        return { x, y, radius: scaledRadius };
    }

    getClickedButton(mouseX, mouseY) {
        // 1. Check End Turn first
        if (this.isEndTurnClicked(mouseX, mouseY)) return 'endTurn';
        
        // 2. Check Ability Buttons
        for (const key in this.buttons) {
            const pos = this.getButtonPosition(key); // This returns {x, y, radius}
            
            const dx = mouseX - pos.x;
            const dy = mouseY - pos.y;
            const distance = Math.sqrt(dx * dx + dy * dy);
            
            // CRITICAL FIX: Use pos.radius (the scaled radius) 
            // instead of this.buttonRadius (the static value 25)
            if (distance <= pos.radius) {
                return key;
            }
        }
        return null;
    }

    setButtonState(buttonKey, state) {
        if (this.buttons[buttonKey]) this.buttons[buttonKey].state = state;
    }

    getButtonState(buttonKey) {
        return this.buttons[buttonKey] ? this.buttons[buttonKey].state : 'disabled';
    }

    render() {
        this.animationTime += 0.05;
        for (const key in this.buttons) this.renderButton(key);
        this.renderEndTurnButton();
    }

    renderButton(buttonKey) {
        const baseSize = 800; 
        const scale = Math.min(this.canvas.width, this.canvas.height) / baseSize;
        const currentRadius = this.baseButtonRadius * scale;

        const button = this.buttons[buttonKey];
        const posData = this.getButtonPosition(buttonKey);
        const pos = { x: posData.x, y: posData.y };
        const state = button.state;
        
        this.ctx.save();
        
        let opacity = 1.0;
        let shadowBlur = 0;
        let pulseScale = 1.0;
        
        if (state === 'disabled') {
            opacity = 0.5;
            this.ctx.fillStyle = '#d6c6b2'; // Soft stain color
        } else if (state === 'available') {
            opacity = 1.0;
            this.ctx.fillStyle = button.color;
            pulseScale = 1.0 + Math.sin(this.animationTime) * 0.03;
        } else if (state === 'active') {
            opacity = 1.0;
            this.ctx.fillStyle = button.color;
            shadowBlur = 10;
            pulseScale = 1.0 + Math.sin(this.animationTime * 2) * 0.06;
        }
        
        this.ctx.globalAlpha = opacity;
        
        // Active Glow matches SetupUI's ink-bleed feel
        if (state === 'active') {
            this.ctx.shadowColor = 'rgba(60, 50, 40, 0.2)';
            this.ctx.shadowBlur = shadowBlur;
        }
        
        // Draw Button Body
        this.ctx.beginPath();
        this.ctx.arc(pos.x, pos.y, currentRadius * pulseScale, 0, Math.PI * 2);
        this.ctx.fill();
        
        // Tea House Border - subtle ink stroke
        this.ctx.strokeStyle = state === 'active' ? this.teaPalette.ink : this.teaPalette.border;
        this.ctx.lineWidth = state === 'active' ? 2.5 : 1.5;
        this.ctx.stroke();
        
        // Draw Symbol
        this.ctx.globalAlpha = state === 'disabled' ? 0.3 : 1.0;
        this.ctx.font = `${currentRadius}px Arial`;
        this.ctx.textAlign = 'center';
        this.ctx.textBaseline = 'middle';
        this.ctx.fillText(button.symbol, pos.x, pos.y);
        
        this.ctx.restore();
    }

    resetAll() {
        for (const key in this.buttons) this.buttons[key].state = 'disabled';
        this.endTurnButton.visible = false;
    }

    setEndTurnVisible(visible) {
        this.endTurnButton.visible = visible;
    }

    isEndTurnClicked(mouseX, mouseY) {
        if (!this.endTurnButton.visible) return false;
        const btnY = this.canvas.height - 80;
        return mouseX >= this.endTurnButton.x &&
               mouseX <= this.endTurnButton.x + this.endTurnButton.width &&
               mouseY >= btnY &&
               mouseY <= btnY + this.endTurnButton.height;
    }

    updateEndTurnHover(mouseX, mouseY) {
        this.endTurnHovered = this.isEndTurnClicked(mouseX, mouseY);
    }

    renderEndTurnButton() {
        if (!this.endTurnButton.visible) return;
        
        const btnY = this.canvas.height - 80;
        this.ctx.save();
        
        // Rounded soft rect
        this.ctx.fillStyle = this.endTurnHovered ? this.endTurnButton.hoverColor : this.endTurnButton.color;
        this.ctx.shadowColor = 'rgba(0,0,0,0.05)';
        this.ctx.shadowBlur = 5;
        
        // Mimicking the roundRect from SetupUI style
        const r = 12;
        const x = this.endTurnButton.x;
        const y = btnY;
        const w = this.endTurnButton.width;
        const h = this.endTurnButton.height;
        
        this.ctx.beginPath();
        this.ctx.moveTo(x + r, y);
        this.ctx.lineTo(x + w - r, y);
        this.ctx.quadraticCurveTo(x + w, y, x + w, y + r);
        this.ctx.lineTo(x + w, y + h - r);
        this.ctx.quadraticCurveTo(x + w, y + h, x + w - r, y + h);
        this.ctx.lineTo(x + r, y + h);
        this.ctx.quadraticCurveTo(x, y + h, x, y + h - r);
        this.ctx.lineTo(x, y + r);
        this.ctx.quadraticCurveTo(x, y, x + r, y);
        this.ctx.closePath();
        this.ctx.fill();
        
        // Text styling using "Zen Maru Gothic" to match Index.html and SetupUI
        this.ctx.fillStyle = '#fdfaf5';
        this.ctx.font = '700 12px "Zen Maru Gothic", sans-serif';
        this.ctx.letterSpacing = "1px";
        this.ctx.textAlign = 'center';
        this.ctx.textBaseline = 'middle';
        this.ctx.fillText(
            'END TURN',
            this.endTurnButton.x + this.endTurnButton.width / 2,
            btnY + this.endTurnButton.height / 2 + 1 // slight offset for visual centering
        );
        
        this.ctx.restore();
    }
}
