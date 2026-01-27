// ui/Animations/EffectAnimations.js - Particle and effect animations
// Handles animations that render visual effects (not pieces themselves)
// (Attack, Fireball, Tidalwave, Sap)

/**
 * Particle - Individual particle for effect animations
 */
class Particle {
    /**
     * @param {number} x - Starting X (pixel)
     * @param {number} y - Starting Y (pixel)
     * @param {number} targetX - Ending X (pixel)
     * @param {number} targetY - Ending Y (pixel)
     * @param {string} color - Particle color
     * @param {number} duration - Particle lifetime (ms)
     * @param {number} delay - Launch delay (ms)
     */
    constructor(x, y, targetX, targetY, color, duration, delay = 0) {
        this.x = x;
        this.y = y;
        this.startX = x;
        this.startY = y;
        this.targetX = targetX;
        this.targetY = targetY;
        this.color = color;
        this.duration = duration;
        this.delay = delay;
        
        this.elapsed = -delay; // Start negative if delayed
        this.alpha = 1.0;
        this.size = 4 + Math.random() * 2; // 4-6px
    }
    
    /**
     * Update particle state
     * @param {number} deltaTime - Time since last update (ms)
     */
    update(deltaTime) {
        this.elapsed += deltaTime;
        
        if (this.elapsed < 0) return; // Not started yet
        
        const progress = Math.min(this.elapsed / this.duration, 1.0);
        
        // Lerp position
        this.x = this.startX + (this.targetX - this.startX) * progress;
        this.y = this.startY + (this.targetY - this.startY) * progress;
        
        // Fade out near end
        if (progress > 0.7) {
            this.alpha = 1.0 - (progress - 0.7) / 0.3;
        }
    }
    
    /**
     * Render particle to canvas
     * @param {CanvasRenderingContext2D} ctx
     */
    render(ctx) {
        if (this.elapsed < 0) return; // Not visible yet
        
        ctx.save();
        ctx.globalAlpha = this.alpha;
        ctx.fillStyle = this.color;
        ctx.beginPath();
        ctx.arc(this.x, this.y, this.size, 0, Math.PI * 2);
        ctx.fill();
        ctx.restore();
    }
    
    /**
     * Check if particle is complete
     * @returns {boolean}
     */
    isComplete() {
        return this.elapsed >= this.duration;
    }
}

/**
 * BaseEffectAnimation - Parent class for effect animations
 */
class BaseEffectAnimation {
    constructor(data, context) {
        this.data = data;
        this.canvas = context.canvas;
        this.ctx = context.ctx;
        this.boardRenderer = context.boardRenderer;
        this.pieceRenderer = context.pieceRenderer;
        this.animationManager = context.animationManager;
        
        this.elapsed = 0;
        this.progress = 0;
        this.complete = false;
        this.duration = data.duration || 400;
    }
    
    start() {
        // Override in subclass
    }
    
    update(deltaTime) {
        this.elapsed += deltaTime;
        this.progress = Math.min(this.elapsed / this.duration, 1.0);
        
        if (this.progress >= 1.0) {
            this.complete = true;
        }
    }
    
    render() {
        // Override in subclass
    }
    
    isComplete() {
        return this.complete;
    }
    
    cleanup() {
        // Override if needed
    }
    
    gridToPixel(gridX, gridY) {
        const { originX, originY } = this.boardRenderer.getOrigin();
        const scale = this.boardRenderer.scale;
        
        return {
            x: originX + gridX * scale,
            y: originY - gridY * scale
        };
    }
    
    parseCoord(coordStr) {
        const [x, y] = coordStr.split(',').map(Number);
        return { x, y };
    }
}

/**
 * AttackAnimation - 360° slash arc around attacking piece
 * 
 * Data format:
 * {
 *   type: 'ATTACK',
 *   attackerCoord: '3,4',
 *   eliminated: [{ coord: '4,4', type: 'pearlCircle' }, ...]
 * }
 */
export class AttackAnimation extends BaseEffectAnimation {
    constructor(data, context) {
        super(data, context);
        this.duration = data.duration || 300;
    }
    
    start() {
        // Parse attacker position
        this.attackerGrid = this.parseCoord(this.data.attackerCoord);
        this.attackerPixel = this.gridToPixel(this.attackerGrid.x, this.attackerGrid.y);
        
        // Arc specs
        const scale = this.boardRenderer.scale / 25; // Normalize
        this.arcRadius = 15 * scale * 1.5; // 1.5x piece size
        this.arcThickness = 4 * scale;
        this.arcColor = '#ff4444';
        
        // Swept angle (0 to 360 degrees)
        this.currentAngle = 0;
    }
    
    update(deltaTime) {
        super.update(deltaTime);
        
        if (this.complete) return;
        
        // Sweep from 0 to 360 degrees
        this.currentAngle = this.progress * Math.PI * 2;
    }
    
    render() {
        this.ctx.save();
        
        // Create gradient for arc (fades at edges)
        const gradient = this.ctx.createRadialGradient(
            this.attackerPixel.x, this.attackerPixel.y, this.arcRadius - this.arcThickness,
            this.attackerPixel.x, this.attackerPixel.y, this.arcRadius
        );
        gradient.addColorStop(0, 'rgba(255, 68, 68, 0.8)');
        gradient.addColorStop(1, 'rgba(255, 68, 68, 0.3)');
        
        this.ctx.strokeStyle = gradient;
        this.ctx.lineWidth = this.arcThickness;
        this.ctx.lineCap = 'round';
        
        // Draw arc from 0 to currentAngle
        this.ctx.beginPath();
        this.ctx.arc(
            this.attackerPixel.x, 
            this.attackerPixel.y, 
            this.arcRadius, 
            0, 
            this.currentAngle
        );
        this.ctx.stroke();
        
        this.ctx.restore();
    }
}

/**
 * FireballAnimation - Straight line particles from ruby to target
 * 
 * Data format:
 * {
 *   type: 'FIREBALL',
 *   from: '5,5',           // Foremost ruby
 *   to: '8,8',             // Target
 *   amplified: false,
 *   eliminated: [{ coord: '8,8', type: 'portalCircle' }]
 * }
 */
export class FireballAnimation extends BaseEffectAnimation {
    constructor(data, context) {
        super(data, context);
        this.duration = data.duration || 400;
    }
    
    start() {
        this.fromGrid = this.parseCoord(this.data.from);
        this.toGrid = this.parseCoord(this.data.to);
        
        this.fromPixel = this.gridToPixel(this.fromGrid.x, this.fromGrid.y);
        this.toPixel = this.gridToPixel(this.toGrid.x, this.toGrid.y);
        
        // Create particles (5-8 particles)
        const particleCount = 5 + Math.floor(Math.random() * 4);
        this.particles = [];
        
        const baseColor = this.data.amplified ? '#ff0000' : '#ff6600';
        
        for (let i = 0; i < particleCount; i++) {
            // Stagger launch by 20ms each
            const delay = i * 20;
            
            // Random color variation
            const colorVariation = Math.random() > 0.5 ? '#ff0000' : '#ff6600';
            
            const particle = new Particle(
                this.fromPixel.x,
                this.fromPixel.y,
                this.toPixel.x,
                this.toPixel.y,
                colorVariation,
                this.duration - delay,
                delay
            );
            
            this.particles.push(particle);
        }
    }
    
    update(deltaTime) {
        super.update(deltaTime);
        
        // Update all particles
        this.particles.forEach(p => p.update(deltaTime));
    }
    
    render() {
        this.particles.forEach(p => p.render(this.ctx));
    }
}

/**
 * TidalwaveAnimation - Simple wave sweep effect
 * 
 * Data format:
 * {
 *   type: 'TIDALWAVE',
 *   from: '0,6',
 *   direction: { x: 1, y: 0 },
 *   amplified: true,
 *   coverageArea: { ... }
 * }
 */
export class TidalwaveAnimation extends BaseEffectAnimation {
    constructor(data, context) {
        super(data, context);
        this.duration = data.duration || 500;
    }
    
    start() {
        const area = this.data.coverageArea;
        const scale = this.boardRenderer.scale;
        
        if (!area) {
            console.warn('[TidalwaveAnimation] No coverage area provided');
            this.complete = true;
            return;
        }
        
        // Calculate wave boundaries
        if (area.isDiagonal) {
            this.isDiagonal = true;
            this.centerPixel = this.gridToPixel(area.centerX, area.centerY);
            this.rotation = area.rotation;
            this.waveWidth = area.width * scale;
            this.waveLength = area.height * scale;
        } else {
            this.isDiagonal = false;
            
            // Get pixel coordinates for area bounds
            this.minPixel = this.gridToPixel(area.minX, area.minY);
            this.maxPixel = this.gridToPixel(area.maxX, area.maxY);
            
            // Determine wave direction
            const dir = this.data.direction || { x: 1, y: 0 };
            this.isHorizontal = Math.abs(dir.x) > Math.abs(dir.y);
            
            // Calculate start and end positions based on direction
            if (this.isHorizontal) {
                if (dir.x > 0) {
                    // Wave moves left to right
                    this.waveStart = this.minPixel.x;
                    this.waveEnd = this.maxPixel.x;
                } else {
                    // Wave moves right to left
                    this.waveStart = this.maxPixel.x;
                    this.waveEnd = this.minPixel.x;
                }
                this.perpStart = this.minPixel.y;
                this.perpEnd = this.maxPixel.y;
            } else {
                if (dir.y > 0) {
                    // Wave moves down to up (canvas Y is inverted)
                    this.waveStart = this.maxPixel.y;
                    this.waveEnd = this.minPixel.y;
                } else {
                    // Wave moves up to down
                    this.waveStart = this.minPixel.y;
                    this.waveEnd = this.maxPixel.y;
                }
                this.perpStart = this.minPixel.x;
                this.perpEnd = this.maxPixel.x;
            }
        }
        
        this.waveThickness = 12 * (scale / 25);
    }
    
    update(deltaTime) {
        super.update(deltaTime);
    }
    
    render() {
        this.ctx.save();
        
        // Wave styling
        this.ctx.strokeStyle = '#4fc3f7';
        this.ctx.lineWidth = this.waveThickness;
        this.ctx.lineCap = 'round';
        this.ctx.shadowColor = '#4fc3f7';
        this.ctx.shadowBlur = 20;
        this.ctx.globalAlpha = 0.8;
        
        if (this.isDiagonal) {
            // Diagonal wave
            this.ctx.translate(this.centerPixel.x, this.centerPixel.y);
            this.ctx.rotate(this.rotation);
            
            const startPos = -this.waveLength / 2;
            const currentPos = startPos + (this.waveLength * this.progress);
            
            this.ctx.beginPath();
            this.ctx.moveTo(currentPos, -this.waveWidth / 2);
            this.ctx.lineTo(currentPos, this.waveWidth / 2);
            this.ctx.stroke();
            
        } else {
            // Axis-aligned wave
            const currentPos = this.waveStart + (this.waveEnd - this.waveStart) * this.progress;
            
            this.ctx.beginPath();
            
            if (this.isHorizontal) {
                // Vertical line moving horizontally
                this.ctx.moveTo(currentPos, this.perpStart);
                this.ctx.lineTo(currentPos, this.perpEnd);
            } else {
                // Horizontal line moving vertically
                this.ctx.moveTo(this.perpStart, currentPos);
                this.ctx.lineTo(this.perpEnd, currentPos);
            }
            
            this.ctx.stroke();
        }
        
        this.ctx.restore();
    }
}

/**
 * SapAnimation - Particles converge from all pieces to center of sap line
 * 
 * Data format:
 * {
 *   type: 'SAP',
 *   amber1: '0,0',
 *   amber2: '5,0',
 *   eliminated: [
 *     { coord: '2,0', type: 'rubyCircle' },
 *     { coord: '3,0', type: 'pearlSquare' }
 *   ]
 * }
 */
export class SapAnimation extends BaseEffectAnimation {
    constructor(data, context) {
        super(data, context);
        this.duration = data.duration || 500;
    }
    
    start() {
        // Parse amber positions
        this.amber1Grid = this.parseCoord(this.data.amber1);
        this.amber2Grid = this.parseCoord(this.data.amber2);
        
        this.amber1Pixel = this.gridToPixel(this.amber1Grid.x, this.amber1Grid.y);
        this.amber2Pixel = this.gridToPixel(this.amber2Grid.x, this.amber2Grid.y);
        
        // Calculate center point (where particles converge)
        this.centerPixel = {
            x: (this.amber1Pixel.x + this.amber2Pixel.x) / 2,
            y: (this.amber1Pixel.y + this.amber2Pixel.y) / 2
        };
        
        this.particles = [];
        
        // Particles from amber1
        this.createParticlesFrom(this.amber1Pixel, 4);
        
        // Particles from amber2
        this.createParticlesFrom(this.amber2Pixel, 4);
        
        // Particles from each eliminated piece
        this.data.eliminated.forEach(target => {
            const targetGrid = this.parseCoord(target.coord);
            const targetPixel = this.gridToPixel(targetGrid.x, targetGrid.y);
            this.createParticlesFrom(targetPixel, 3);
        });
    }
    
    createParticlesFrom(originPixel, count) {
        for (let i = 0; i < count; i++) {
            const delay = i * 15; // Slight stagger
            
            const particle = new Particle(
                originPixel.x,
                originPixel.y,
                this.centerPixel.x,
                this.centerPixel.y,
                '#f3bf3f', // Amber gold
                this.duration - delay,
                delay
            );
            
            particle.size = 4 + Math.random() * 2; // 4-6px
            this.particles.push(particle);
        }
    }
    
    update(deltaTime) {
        super.update(deltaTime);
        this.particles.forEach(p => p.update(deltaTime));
    }
    
    render() {
        this.particles.forEach(p => p.render(this.ctx));
        
        // Draw center glow when particles arrive (progress > 0.7)
        if (this.progress > 0.7) {
            const glowAlpha = (this.progress - 0.7) / 0.3;
            
            this.ctx.save();
            this.ctx.globalAlpha = glowAlpha * 0.6;
            
            const gradient = this.ctx.createRadialGradient(
                this.centerPixel.x, this.centerPixel.y, 0,
                this.centerPixel.x, this.centerPixel.y, 20
            );
            gradient.addColorStop(0, '#f3bf3f');
            gradient.addColorStop(1, 'rgba(243, 191, 63, 0)');
            
            this.ctx.fillStyle = gradient;
            this.ctx.beginPath();
            this.ctx.arc(this.centerPixel.x, this.centerPixel.y, 20, 0, Math.PI * 2);
            this.ctx.fill();
            
            this.ctx.restore();
        }
    }
}