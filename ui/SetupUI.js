// ui/SetupUI.js - Tea House Aesthetic (Ink Bleeds & Steam Vents)
export class SetupUI {
    constructor(canvas, ctx) {
        this.canvas = canvas;
        this.ctx = ctx;
        this.trayHeight = 195; 
        this.pieceSize = 42;
        this.spacing = 110;    
        this.hoveredType = null; 
        this.particles = []; 
    }

    render(setupManager) {
        if (!setupManager.isSetupPhase) return;
        
        const currentPlayer = setupManager.getCurrentPlayer();
        if (currentPlayer === 'circle') return;
        
        const time = Date.now() / 1000;
        const centerY = this.canvas.height / 2;
        const trayY = centerY - this.trayHeight / 2;
        const trayWidth = 520; 
        const trayX = (this.canvas.width - trayWidth) / 2;

        this.ctx.save();

        // --- CAST SHADOW LOGIC ---
        // Increase blur and offset to cast a shadow onto the board mat below
        this.ctx.shadowBlur = 50; 
        this.ctx.shadowOffsetY = 35; // The "height" above the board
        this.ctx.shadowOffsetX = 0;
        this.ctx.shadowColor = 'rgba(40, 30, 20, 0.25)'; // Earthy, semi-transparent ink shadow

        // Tray Background Gradient
        const trayGrad = this.ctx.createLinearGradient(trayX, trayY, trayX, trayY + this.trayHeight);
        trayGrad.addColorStop(0, '#fdfaf5'); 
        trayGrad.addColorStop(1, '#f3eadf'); 
        this.ctx.fillStyle = trayGrad;
        this.ctx.strokeStyle = '#d6c6b2';
        this.ctx.lineWidth = 3;

        // Draw the tray (This is the moment the shadow is cast)
        this.roundRect(this.ctx, trayX, trayY, trayWidth, this.trayHeight, 24, true, true);

        // --- INTERNAL UI (Reset shadow so it doesn't affect text/pieces) ---
        this.ctx.shadowBlur = 0;
        this.ctx.shadowOffsetY = 0;
        this.ctx.shadowColor = 'transparent';

        // Header
        this.ctx.fillStyle = '#7a6d60';
        this.ctx.font = '700 14px "Zen Maru Gothic", sans-serif';
        this.ctx.letterSpacing = "3px";
        this.ctx.textAlign = 'center';
        this.ctx.fillText("PREPARE YOUR PIECES", this.canvas.width / 2, trayY + 45);

        const counts = setupManager.getPieceCounts(currentPlayer);
        const positions = this.getTrayPiecePositions(trayX, trayWidth, trayY);
        
        this.updateParticles();

        for (const pos of positions) {
            const isHovered = this.hoveredType === pos.type;
            const isSelected = setupManager.selectedPieceType === pos.type;
            
            // Only 3% chance per frame to drip ink when selected
            if (isSelected && Math.random() > 0.97) {
                this.createSplotch(pos.x, pos.y, pos.type);
            }

            this.drawPieceSelector(
                pos.x, pos.y, pos.type, currentPlayer, 
                counts[pos.type], isSelected, isHovered, time
            );
        }
        
        this.ctx.restore();
    }

    createSplotch(x, y, type) {
        const colors = {
            ruby: '228, 57, 95', pearl: '234, 224, 200', 
            amber: '243, 191, 63', jade: '168, 230, 133'
        };
        // Much larger radius (up to 60px away from center)
        const angle = Math.random() * Math.PI * 2;
        const dist = 15 + Math.random() * 45; 
        
        this.particles.push({
            x: x + Math.cos(angle) * dist,
            y: y + Math.sin(angle) * dist,
            life: 1.0,
            maxSize: 10 + Math.random() * 15,
            color: colors[type]
        });
    }

    updateParticles() {
        for (let i = this.particles.length - 1; i >= 0; i--) {
            const p = this.particles[i];
            p.life -= 0.007; // Slow, natural bleed
            if (p.life <= 0) this.particles.splice(i, 1);
        }
    }

    drawPieceSelector(x, y, gemType, player, placedCount, isSelected, isHovered, time) {
        const teaColors = {
            ruby:  { outer: '#b72d4c', inner: '#e4395f', rgb: '228, 57, 95', ink: '#8f1f3a' },
            pearl: { outer: '#c4c2ad', inner: '#f7f4d8', rgb: '234, 224, 200', ink: '#8b8262' },
            amber: { outer: '#c19832', inner: '#f4bf3f', rgb: '243, 191, 63', ink: '#9a5f14' },
            jade:  { outer: '#86b76a', inner: '#a8e685', rgb: '168, 230, 133', ink: '#1f6f55' }
        };

        const isMaxed = placedCount >= 2;
        const color = teaColors[gemType];
        const scale = isHovered && !isMaxed ? 1.1 : 1.0;
        const pulse = Math.sin(time * 3) * 0.5 + 0.5;

        this.ctx.save();

        // Draw Active Particles (Splotches)
        this.particles.forEach(p => {
            if (p.color === color.rgb) {
                const currentSize = p.maxSize * (1.6 - p.life);
                const grad = this.ctx.createRadialGradient(p.x, p.y, 0, p.x, p.y, currentSize);
                grad.addColorStop(0, `rgba(${p.color}, ${p.life * 0.15})`);
                grad.addColorStop(1, 'transparent');
                this.ctx.fillStyle = grad;
                this.ctx.beginPath();
                this.ctx.arc(p.x, p.y, currentSize, 0, Math.PI * 2);
                this.ctx.fill();
            }
        });

        // PROMINENT PULSING HALO
        if (isSelected && !isMaxed) {
            // Inner Core Glow
            const coreGrad = this.ctx.createRadialGradient(x, y, 0, x, y, 45 + (pulse * 10));
            coreGrad.addColorStop(0, `rgba(${color.rgb}, ${0.2 + (pulse * 0.1)})`);
            coreGrad.addColorStop(1, 'transparent');
            
            this.ctx.fillStyle = coreGrad;
            this.ctx.beginPath();
            this.ctx.arc(x, y, 60, 0, Math.PI * 2);
            this.ctx.fill();

            // Subtle Ring Edge
            this.ctx.strokeStyle = `rgba(${color.rgb}, ${0.1 * pulse})`;
            this.ctx.lineWidth = 2;
            this.ctx.stroke();
        }

        // --- THE PIECE (NOW WITH DUAL RINGS) ---
        this.ctx.globalAlpha = isMaxed ? 0.3 : 1.0;
        this.ctx.shadowBlur = 6;
        this.ctx.shadowColor = isSelected ? `rgba(${color.rgb}, 0.3)` : 'rgba(0,0,0,0.1)';

        if (player === 'square') {
            this.drawCeramicSquare(x, y, (this.pieceSize / 2) * scale, color.outer, color.inner);
        } else {
            this.drawCeramicCircle(x, y, (this.pieceSize / 2) * scale, color.outer, color.inner);
        }

        this.ctx.shadowBlur = 0;
        this.ctx.globalAlpha = 1.0;
        
        // Count text
        this.ctx.fillStyle = isMaxed ? '#d6c6b2' : '#7a6d60';
        this.ctx.font = 'bold 13px "DM Mono", monospace';
        this.ctx.textAlign = 'center';
        this.ctx.fillText(`${placedCount}/2`, x, y + 55);

        this.ctx.restore();
    }

    renderPlacementRegions(setupManager, originX, originY, scale) {
        if (!setupManager.isSetupPhase || !setupManager.selectedPieceType) return;
        if (setupManager.getCurrentPlayer() !== 'square') return;
        
        this.ctx.save();
        const regions = [
            [{x: 0, y: -12}, {x: 5, y: -11}, {x: 0, y: -6}],
            [{x: 0, y: -12}, {x: -5, y: -11}, {x: 0, y: -6}],
            [{x: -5, y: -11}, {x: -8, y: -9}, {x: -6, y: -6}, {x: 0, y: -6}],
            [{x: 5, y: -11}, {x: 8, y: -9}, {x: 6, y: -6}, {x: 0, y: -6}]
        ];
        
        const time = Date.now() / 1000;
        const pulse = Math.sin(time * 2.5) * 0.5 + 0.5;

        regions.forEach((points, regionIndex) => {
            const center = this.getPolygonCenter(points);
            
            // 1. INSET CALCULATION
            const insetFactor = 0.1;
            const insetPoints = points.map(p => ({
                x: p.x + (center.x - p.x) * insetFactor,
                y: p.y + (center.y - p.y) * insetFactor
            }));

            // 2. INTERNAL COLOR WASH
            this.ctx.beginPath();
            this.ctx.moveTo(originX + insetPoints[0].x * scale, originY - insetPoints[0].y * scale);
            for (let i = 1; i < insetPoints.length; i++) {
                this.ctx.lineTo(originX + insetPoints[i].x * scale, originY - insetPoints[i].y * scale);
            }
            this.ctx.closePath();
            
            // Very soft "stain" fill
            this.ctx.fillStyle = `rgba(40, 150, 40, ${0.1 + pulse * .3})`;
            this.ctx.fill();

            // 3. VARIABLE INK BORDER (The "Hand-Painted" Alternative)
            // We draw the outline segment by segment with different alphas
            for (let i = 0; i < insetPoints.length; i++) {
                const start = insetPoints[i];
                const end = insetPoints[(i + 1) % insetPoints.length];
                
                this.ctx.beginPath();
                this.ctx.moveTo(originX + start.x * scale, originY - start.y * scale);
                this.ctx.lineTo(originX + end.x * scale, originY - end.y * scale);
                
                // Jitter the alpha based on time and segment index for a "shimmering ink" look
                const segmentAlpha = 0.1 + (Math.sin(time + i + regionIndex) * 0.05) + (pulse * 0.3);
                
                this.ctx.strokeStyle = `rgba(40, 150, 70, ${segmentAlpha})`;
                this.ctx.lineWidth = 2;
                this.ctx.lineCap = 'round';
                
                // Add a very slight glow to simulate the "bleeding" edge of ink
                this.ctx.shadowBlur = 2;
                this.ctx.shadowColor = `rgba(255, 255, 255, ${segmentAlpha * 0.5})`;
                
                this.ctx.stroke();
                this.ctx.shadowBlur = 0; // Reset for next elements
            }

            // 4. PRECISION SNAP POINTS (Droplets)
            points.forEach(p => {
                const px = originX + p.x * scale;
                const py = originY - p.y * scale;
                
                // Inner core
                this.ctx.beginPath();
                this.ctx.arc(px, py, 2, 0, Math.PI * 2);
                this.ctx.fillStyle = `rgba(255, 255, 255, ${0.4 + pulse * 0.4})`;
                this.ctx.fill();
            });
        });
        this.ctx.restore();
    }

    getPolygonCenter(points) {
        return {
            x: points.reduce((s, p) => s + p.x, 0) / points.length,
            y: points.reduce((s, p) => s + p.y, 0) / points.length
        };
    }

    drawCeramicSquare(x, y, size, outerColor, innerColor) {
        this.ctx.save();
        this.ctx.translate(x, y);
        
        // Use same scaling as PieceRenderer
        const scaledSize = size;
        const outerSize = scaledSize * 2.1;
        const halfOuter = outerSize / 2;
        const innerSize = scaledSize * 1.5;
        const halfInner = innerSize / 2;

        // Outer square (darker ring)
        this.ctx.fillStyle = outerColor;
        this.ctx.fillRect(-halfOuter, -halfOuter, outerSize, outerSize);

        // Inner square (lighter ring)
        this.ctx.fillStyle = innerColor;
        this.ctx.fillRect(-halfInner, -halfInner, innerSize, innerSize);

        this.ctx.restore();
    }

    drawCeramicCircle(x, y, radius, outerColor, innerColor) {
        this.ctx.save();
        
        // Outer circle (darker ring)
        this.ctx.beginPath();
        this.ctx.arc(x, y, radius * 1.2, 0, 2 * Math.PI);
        this.ctx.fillStyle = outerColor;
        this.ctx.fill();
        this.ctx.closePath();

        // Inner circle (lighter ring)
        this.ctx.beginPath();
        this.ctx.arc(x, y, radius, 0, 2 * Math.PI);
        this.ctx.fillStyle = innerColor;
        this.ctx.fill();
        this.ctx.closePath();
        
        this.ctx.restore();
    }

    getTrayPiecePositions(trayX, trayWidth, trayY) {
        const types = ['ruby', 'pearl', 'amber', 'jade'];
        const pieceY = trayY + 105; 
        const startX = trayX + (trayWidth / 2) - ((types.length - 1) * this.spacing / 2);
        return types.map((type, i) => ({ type, x: startX + i * this.spacing, y: pieceY }));
    }

    updateHoverState(mouseX, mouseY, setupManager) {
        this.hoveredType = this.isClickOnTray(mouseX, mouseY, setupManager);
    }

    isClickOnTray(mouseX, mouseY, setupManager) {
        if (!setupManager.isSetupPhase || setupManager.getCurrentPlayer() === 'circle') return null;
        const trayY = (this.canvas.height / 2) - (this.trayHeight / 2);
        const trayWidth = 520;
        const positions = this.getTrayPiecePositions((this.canvas.width - trayWidth)/2, trayWidth, trayY);
        for (const pos of positions) {
            const dist = Math.sqrt((mouseX - pos.x)**2 + (mouseY - pos.y)**2);
            if (dist <= 25) return pos.type;
        }
        return null;
    }

    roundRect(ctx, x, y, width, height, radius, fill, stroke) {
        ctx.beginPath();
        ctx.roundRect(x, y, width, height, radius);
        if (fill) ctx.fill();
        if (stroke) ctx.stroke();
    }
}
