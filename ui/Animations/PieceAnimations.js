// ui/Animations/PieceAnimations.js - Piece transformation animations
// Handles animations that move/transform the game pieces themselves
// (Move, Swap, Launch)

/**
 * Easing Functions for smooth motion
 */
const Easing = {
    linear: t => t,
    easeInQuad: t => t * t,
    easeOutQuad: t => t * (2 - t),
    easeInOutQuad: t => t < 0.5 ? 2 * t * t : -1 + (4 - 2 * t) * t,
    easeOutCubic: t => (--t) * t * t + 1,
    easeInOutCubic: t => t < 0.5 ? 4 * t * t * t : (t - 1) * (2 * t - 2) * (2 * t - 2) + 1
};

/**
 * BaseAnimation - Parent class for all animations
 */
class BaseAnimation {
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
        
        // Default duration (can be overridden)
        this.duration = data.duration || 300;
    }
    
    /**
     * Initialize animation (called before first update)
     * Subclasses should override to setup state
     */
    start() {
        // Override in subclass
    }
    
    /**
     * Update animation state
     * @param {number} deltaTime - Time since last update (ms)
     */
    update(deltaTime) {
        this.elapsed += deltaTime;
        this.progress = Math.min(this.elapsed / this.duration, 1.0);
        
        if (this.progress >= 1.0) {
            this.complete = true;
        }
    }
    
    /**
     * Render animation to canvas
     */
    render() {
        // Override in subclass
    }
    
    /**
     * Check if animation is complete
     * @returns {boolean}
     */
    isComplete() {
        return this.complete;
    }
    
    /**
     * Cleanup resources
     */
    cleanup() {
        // Override in subclass if needed
    }
    
    /**
     * Convert grid coordinates to pixel coordinates
     * @param {number} gridX - Grid X coordinate
     * @param {number} gridY - Grid Y coordinate
     * @returns {Object} { x: pixelX, y: pixelY }
     */
    gridToPixel(gridX, gridY) {
        const { originX, originY } = this.boardRenderer.getOrigin();
        const scale = this.boardRenderer.scale;
        
        return {
            x: originX + gridX * scale,
            y: originY - gridY * scale  // Y is inverted
        };
    }
    
    /**
     * Parse coordinate string to grid coords
     * @param {string} coordStr - Coordinate string ("x,y")
     * @returns {Object} { x, y }
     */
    parseCoord(coordStr) {
        const [x, y] = coordStr.split(',').map(Number);
        return { x, y };
    }
}

/**
 * MoveAnimation - Slides a piece from one position to another
 * 
 * Data format:
 * {
 *   type: 'MOVE',
 *   from: '0,0',           // Starting coordinate
 *   to: '3,4',             // Ending coordinate
 *   pieceType: 'rubySquare', // Piece type (for rendering)
 *   duration: 300          // Optional duration override
 * }
 */
export class MoveAnimation extends BaseAnimation {
    constructor(data, context) {
        super(data, context);
        this.duration = data.duration || 300;
    }
    
    start() {
        // Parse coordinates
        this.fromGrid = this.parseCoord(this.data.from);
        this.toGrid = this.parseCoord(this.data.to);
        
        // Convert to pixels
        this.fromPixel = this.gridToPixel(this.fromGrid.x, this.fromGrid.y);
        this.toPixel = this.gridToPixel(this.toGrid.x, this.toGrid.y);
        
        // Current position (interpolated)
        this.currentPixel = { ...this.fromPixel };
        this.currentGrid = { ...this.fromGrid };
        
        // Hide piece at destination (it's already moved in gameState)
        this.animationManager.hidePiece(this.data.to);
        
        // Use piece data passed in animation data
        this.piece = this.data.piece;
        
        if (!this.piece) {
            console.warn('[MoveAnimation] No piece data provided:', this.data);
            this.complete = true;
        }
    }
    
    update(deltaTime) {
        super.update(deltaTime);
        
        if (this.complete) return;
        
        // Apply easing
        const easedProgress = Easing.easeInOutQuad(this.progress);
        
        // Interpolate position
        this.currentPixel.x = this.fromPixel.x + (this.toPixel.x - this.fromPixel.x) * easedProgress;
        this.currentPixel.y = this.fromPixel.y + (this.toPixel.y - this.fromPixel.y) * easedProgress;
        
        // Update grid position (for state tracking)
        this.currentGrid.x = this.fromGrid.x + (this.toGrid.x - this.fromGrid.x) * easedProgress;
        this.currentGrid.y = this.fromGrid.y + (this.toGrid.y - this.fromGrid.y) * easedProgress;
        
        // Update animated position in manager
        this.animationManager.setAnimatedPosition(this.data.to, this.currentGrid.x, this.currentGrid.y, this.piece);
    }
    
    render() {
        if (!this.piece) return;
        
        // Render piece at current animated position
        this.renderPieceAtPosition(this.currentGrid.x, this.currentGrid.y, this.piece);
    }
    
    cleanup() {
        // Show piece at final position
        this.animationManager.showPiece(this.data.to);
    }
      
    /**
     * Render piece at specific grid position
     * @private
     */
    renderPieceAtPosition(gridX, gridY, piece) {
        const pixelPos = this.gridToPixel(gridX, gridY);
        
        // Temporarily update pieceRenderer's origin if needed
        const { originX, originY } = this.boardRenderer.getOrigin();
        const scale = this.boardRenderer.scale;
        
        this.pieceRenderer.updateOrigin(originX, originY, scale);
        
        // Create temporary coordStr for rendering
        const tempCoordStr = `${gridX},${gridY}`;
        
        // Render piece (pieceRenderer expects integer coords, so we round)
        const roundedCoordStr = `${Math.round(gridX)},${Math.round(gridY)}`;
        
        // For smooth animation, we need to manually draw the piece
        // Since pieceRenderer uses coordStr parsing, we'll use direct drawing
        this.drawPieceManually(pixelPos.x, pixelPos.y, piece);
    }
    
    /**
     * Draw piece directly at pixel coordinates
     * @private
     */
    drawPieceManually(pixelX, pixelY, piece) {
        const scale = this.boardRenderer.scale / 25;
        const size = (piece.size || 9.5) * scale;
        
        this.ctx.save();
        
        const isCircle = piece.type.includes('Circle');
        const isSquare = piece.type.includes('Square');
        
        if (piece.type.includes('void')) {
            const outerColor = piece.outerColor || '#5B4E7A';
            const innerColor = piece.innerColor || '#8D7EA9';
            this.drawVoidPiece(pixelX, pixelY, size, isCircle, outerColor, innerColor);
        } else if (piece.type.includes('portal')) {
            const outerColor = piece.outerColor || '#87CEEB';
            const innerColor = piece.innerColor || '#ADD8E6';
            this.drawPortalPiece(pixelX, pixelY, size, isCircle, outerColor, innerColor);
        } else if (piece.type.includes('amalgam')) {
            this.drawAmalgamPiece(pixelX, pixelY, size, piece, isCircle);  // Pass full piece
        } else {
            this.drawGemPiece(pixelX, pixelY, size, piece, isCircle);  // Pass full piece
        }
        
        this.ctx.restore();
    }
    
    drawVoidPiece(x, y, size, isCircle, outerColor, innerColor) {
        
        if (isCircle) {
            // Outer circle
            this.ctx.beginPath();
            this.ctx.arc(x, y, size * 1.2, 0, Math.PI * 2);
            this.ctx.fillStyle = outerColor;
            this.ctx.fill();
            
            // Inner circle
            this.ctx.beginPath();
            this.ctx.arc(x, y, size, 0, Math.PI * 2);
            this.ctx.fillStyle = innerColor;
            this.ctx.fill();
        } else {
            // Square
            const outerSize = size * 2.1;
            const innerSize = size * 1.5;
            
            this.ctx.fillStyle = outerColor;
            this.ctx.fillRect(x - outerSize/2, y - outerSize/2, outerSize, outerSize);
            
            this.ctx.fillStyle = innerColor;
            this.ctx.fillRect(x - innerSize/2, y - innerSize/2, innerSize, innerSize);
        }
    }
    
    drawPortalPiece(x, y, size, isCircle, outerColor, innerColor) {
        // Portals are smaller than normal pieces
        const portalSize = size * 0.66;
        
        if (isCircle) {
            // Outer circle
            this.ctx.beginPath();
            this.ctx.arc(x, y, portalSize * 1.2, 0, Math.PI * 2);
            this.ctx.fillStyle = outerColor;
            this.ctx.fill();
            
            // Inner circle
            this.ctx.beginPath();
            this.ctx.arc(x, y, portalSize, 0, Math.PI * 2);
            this.ctx.fillStyle = innerColor;
            this.ctx.fill();
        } else {
            // Square portal
            const outerSize = portalSize * 2.1;
            const innerSize = portalSize * 1.5;
            
            this.ctx.fillStyle = outerColor;
            this.ctx.fillRect(x - outerSize/2, y - outerSize/2, outerSize, outerSize);
            
            this.ctx.fillStyle = innerColor;
            this.ctx.fillRect(x - innerSize/2, y - innerSize/2, innerSize, innerSize);
        }
    }
    
    drawAmalgamPiece(x, y, size, piece, isCircle) {
        // Use piece's actual colors and rotation
        const colors = piece.colors || ['#E63960', '#A9E886', '#F8F6DA', '#F6C13F'];
        const rotation = piece.rotation || 0;
        
        this.ctx.save();
        this.ctx.translate(x, y);
        this.ctx.rotate(rotation);
        
        if (isCircle) {
            // Quadrant circles
            const angles = [
                { start: -Math.PI/4, end: Math.PI/4, color: colors[2] },
                { start: Math.PI/4, end: 3*Math.PI/4, color: colors[0] },
                { start: 3*Math.PI/4, end: 5*Math.PI/4, color: colors[1] },
                { start: 5*Math.PI/4, end: 7*Math.PI/4, color: colors[3] }
            ];
            
            // Outer ring
            angles.forEach(quad => {
                this.ctx.beginPath();
                this.ctx.moveTo(0, 0);
                this.ctx.arc(0, 0, size * 1.2, quad.start, quad.end);
                this.ctx.lineTo(0, 0);
                this.ctx.fillStyle = this.darkenColor(quad.color, 20);
                this.ctx.fill();
            });
            
            // Inner circle
            angles.forEach(quad => {
                this.ctx.beginPath();
                this.ctx.moveTo(0, 0);
                this.ctx.arc(0, 0, size, quad.start, quad.end);
                this.ctx.lineTo(0, 0);
                this.ctx.fillStyle = quad.color;
                this.ctx.fill();
            });
        } else {
            // Square quadrants
            const outerSize = size * 2.1;
            const halfOuter = outerSize / 2;
            const innerSize = size * 1.5;
            const halfInner = innerSize / 2;
            
            // Outer rectangles (darkened)
            const outerRects = [
                { x: -halfOuter, y: 0, w: halfOuter, h: halfOuter, color: this.darkenColor(colors[0], 20) },
                { x: 0, y: 0, w: halfOuter, h: halfOuter, color: this.darkenColor(colors[2], 20) },
                { x: 0, y: -halfOuter, w: halfOuter, h: halfOuter, color: this.darkenColor(colors[3], 20) },
                { x: -halfOuter, y: -halfOuter, w: halfOuter, h: halfOuter, color: this.darkenColor(colors[1], 20) }
            ];
            
            outerRects.forEach(rect => {
                this.ctx.fillStyle = rect.color;
                this.ctx.fillRect(rect.x, rect.y, rect.w, rect.h);
            });
            
            // Inner rectangles
            const innerRects = [
                { x: -halfInner, y: 0, w: halfInner, h: halfInner, color: colors[0] },
                { x: 0, y: 0, w: halfInner, h: halfInner, color: colors[2] },
                { x: 0, y: -halfInner, w: halfInner, h: halfInner, color: colors[3] },
                { x: -halfInner, y: -halfInner, w: halfInner, h: halfInner, color: colors[1] }
            ];
            
            innerRects.forEach(rect => {
                this.ctx.fillStyle = rect.color;
                this.ctx.fillRect(rect.x, rect.y, rect.w, rect.h);
            });
        }
        
        this.ctx.restore();
    }
    
    // Helper method to darken colors (add if not present)
    darkenColor(hex, percent) {
        hex = hex.replace(/^#/, '');
        let r = parseInt(hex.substring(0, 2), 16);
        let g = parseInt(hex.substring(2, 4), 16);
        let b = parseInt(hex.substring(4, 6), 16);
        r = Math.floor(r * (100 - percent) / 100);
        g = Math.floor(g * (100 - percent) / 100);
        b = Math.floor(b * (100 - percent) / 100);
        r = r.toString(16).padStart(2, '0');
        g = g.toString(16).padStart(2, '0');
        b = b.toString(16).padStart(2, '0');
        return `#${r}${g}${b}`;
    }
    
    drawGemPiece(x, y, size, piece, isCircle) {
        // Use piece's actual colors if available, otherwise infer from type
        let outerColor = piece.outerColor;
        let innerColor = piece.innerColor;
        
        if (!outerColor || !innerColor) {
            const gemColors = {
                ruby: { outer: '#b72d4c', inner: '#e4395f' },
                pearl: { outer: '#c4c2ad', inner: '#f7f4d8' },
                amber: { outer: '#c19832', inner: '#f4bf3f' },
                jade: { outer: '#86b76a', inner: '#a8e685' }
            };
            
            let colors = gemColors.ruby; // Default
            for (const gem in gemColors) {
                if (piece.type.toLowerCase().includes(gem)) {
                    colors = gemColors[gem];
                    break;
                }
            }
            outerColor = colors.outer;
            innerColor = colors.inner;
        }
        
        if (isCircle) {
            this.ctx.beginPath();
            this.ctx.arc(x, y, size * 1.2, 0, Math.PI * 2);
            this.ctx.fillStyle = outerColor;  // ✅ USE VARIABLE
            this.ctx.fill();
            this.ctx.beginPath();
            this.ctx.arc(x, y, size, 0, Math.PI * 2);
            this.ctx.fillStyle = innerColor;  // ✅ USE VARIABLE
            this.ctx.fill();
        } else {
            const outerSize = size * 2.1;
            const innerSize = size * 1.5;
            this.ctx.fillStyle = outerColor;  // ✅ USE VARIABLE
            this.ctx.fillRect(x - outerSize/2, y - outerSize/2, outerSize, outerSize);
            this.ctx.fillStyle = innerColor;  // ✅ USE VARIABLE
            this.ctx.fillRect(x - innerSize/2, y - innerSize/2, innerSize, innerSize);
        }
    }
}

/**
 * SwapAnimation - Swaps two pieces with particle effects
 * 
 * Data format:
 * {
 *   type: 'SWAP',
 *   piece1: { coord: '0,0', type: 'portalSquare' },
 *   piece2: { coord: '3,4', type: 'rubySquare' },
 *   duration: 500
 * }
 */
export class SwapAnimation extends BaseAnimation {
    constructor(data, context) {
        super(data, context);
        this.duration = data.duration || 500;
    }
    
    start() {
        // Parse coordinates
        this.piece1Grid = this.parseCoord(this.data.piece1.coord);
        this.piece2Grid = this.parseCoord(this.data.piece2.coord);
        
        this.piece1Pixel = this.gridToPixel(this.piece1Grid.x, this.piece1Grid.y);
        this.piece2Pixel = this.gridToPixel(this.piece2Grid.x, this.piece2Grid.y);
        
        // Hide both pieces
        this.animationManager.hidePiece(this.data.piece1.coord);
        this.animationManager.hidePiece(this.data.piece2.coord);
        
        // Create orbit particles
        this.particles1 = this.createOrbitParticles(this.piece1Pixel, 4);
        this.particles2 = this.createOrbitParticles(this.piece2Pixel, 4);
        
        // Current positions
        this.current1Pixel = { ...this.piece1Pixel };
        this.current2Pixel = { ...this.piece2Pixel };
        
        this.alpha = 1.0;
        
        // Use full piece data
        this.piece1Obj = this.data.piece1.pieceData;
        this.piece2Obj = this.data.piece2.pieceData;
    }
    
    update(deltaTime) {
        super.update(deltaTime);
        
        if (this.complete) return;
        
        const p = this.progress;
        
        // Phase 1: Orbit particles (0-0.4)
        if (p <= 0.4) {
            const orbitProgress = p / 0.4;
            this.updateOrbitParticles(this.particles1, orbitProgress);
            this.updateOrbitParticles(this.particles2, orbitProgress);
        }
        
        // Phase 2: Flicker (0.4-0.5)
        else if (p <= 0.5) {
            const flickerProgress = (p - 0.4) / 0.1;
            this.alpha = 0.3 + Math.abs(Math.sin(flickerProgress * Math.PI * 4)) * 0.7;
        }
        
        // Phase 3: Swap (0.5-1.0)
        else {
            this.alpha = 1.0;
            const swapProgress = (p - 0.5) / 0.5;
            const eased = Easing.easeInOutQuad(swapProgress);
            
            // Interpolate positions (pieces move to each other's original positions)
            this.current1Pixel.x = this.piece1Pixel.x + (this.piece2Pixel.x - this.piece1Pixel.x) * eased;
            this.current1Pixel.y = this.piece1Pixel.y + (this.piece2Pixel.y - this.piece1Pixel.y) * eased;
            
            this.current2Pixel.x = this.piece2Pixel.x + (this.piece1Pixel.x - this.piece2Pixel.x) * eased;
            this.current2Pixel.y = this.piece2Pixel.y + (this.piece1Pixel.y - this.piece2Pixel.y) * eased;
        }
    }
    
    render() {
        // Phase 1: Render orbit particles
        if (this.progress <= 0.4) {
            this.renderParticles(this.particles1);
            this.renderParticles(this.particles2);
        }
        
        // Render pieces (with alpha during flicker)
        this.ctx.save();
        this.ctx.globalAlpha = this.alpha;
        
        // During swap phase (0.5-1.0), render at interpolated positions
        if (this.progress > 0.5) {
            this.drawPieceAtPixel(this.current1Pixel.x, this.current1Pixel.y, this.piece1Obj);
            this.drawPieceAtPixel(this.current2Pixel.x, this.current2Pixel.y, this.piece2Obj);
        } else {
            // Before swap, render at original positions
            this.drawPieceAtPixel(this.piece1Pixel.x, this.piece1Pixel.y, this.piece1Obj);
            this.drawPieceAtPixel(this.piece2Pixel.x, this.piece2Pixel.y, this.piece2Obj);
        }
        
        this.ctx.restore();
    }
    
    cleanup() {
        this.animationManager.showPiece(this.data.piece1.coord);
        this.animationManager.showPiece(this.data.piece2.coord);
    }
    
    createOrbitParticles(centerPixel, count) {
        const particles = [];
        const radius = 20 * (this.boardRenderer.scale / 25);
        
        for (let i = 0; i < count; i++) {
            const angle = (i / count) * Math.PI * 2;
            particles.push({
                angle: angle,
                radius: radius,
                center: centerPixel,
                color: '#87CEEB'
            });
        }
        
        return particles;
    }
    
    updateOrbitParticles(particles, progress) {
        particles.forEach(p => {
            p.angle += 0.1; // Rotate
        });
    }
    
    renderParticles(particles) {
        this.ctx.save();
        this.ctx.fillStyle = '#87CEEB';
        
        particles.forEach(p => {
            const x = p.center.x + Math.cos(p.angle) * p.radius;
            const y = p.center.y + Math.sin(p.angle) * p.radius;
            
            this.ctx.beginPath();
            this.ctx.arc(x, y, 3, 0, Math.PI * 2);
            this.ctx.fill();
        });
        
        this.ctx.restore();
    }
    
    drawPieceAtPixel(x, y, piece) {
        // Reuse MoveAnimation's manual drawing
        const moveAnim = new MoveAnimation({ from: '0,0', to: '0,0', pieceType: piece.type }, {
            canvas: this.canvas,
            ctx: this.ctx,
            boardRenderer: this.boardRenderer,
            pieceRenderer: this.pieceRenderer,
            animationManager: this.animationManager
        });
        
        moveAnim.drawPieceManually(x, y, piece);
    }
}

/**
 * LaunchAnimation - Arc trajectory for launched pieces
 * 
 * Data format:
 * {
 *   type: 'LAUNCH',
 *   from: '0,0',
 *   to: '5,5',
 *   pieceType: 'jadeSquare',
 *   duration: 400
 * }
 */
export class LaunchAnimation extends BaseAnimation {
    constructor(data, context) {
        super(data, context);
        this.duration = data.duration || 400;
    }
    
    start() {
        this.fromGrid = this.parseCoord(this.data.from);
        this.toGrid = this.parseCoord(this.data.to);
        
        this.fromPixel = this.gridToPixel(this.fromGrid.x, this.fromGrid.y);
        this.toPixel = this.gridToPixel(this.toGrid.x, this.toGrid.y);
        
        // Calculate arc height (2 grid cells)
        const scale = this.boardRenderer.scale;
        this.arcHeight = 2 * scale;
        
        // Determine launch direction
        const dx = Math.abs(this.toPixel.x - this.fromPixel.x);
        const dy = Math.abs(this.toPixel.y - this.fromPixel.y);
        const isVertical = dx < scale * 0.5; // Threshold for "vertical"
        
        // Calculate midpoint with perpendicular offset for vertical launches
        this.midPixel = {
            x: (this.fromPixel.x + this.toPixel.x) / 2,
            y: (this.fromPixel.y + this.toPixel.y) / 2 - this.arcHeight
        };
        
        // For vertical launches, add horizontal offset to create visible arc
        if (isVertical) {
            // Offset to the right (creates sideways arc for depth illusion)
            this.midPixel.x += this.arcHeight;
        }
        
        // Current position
        this.currentPixel = { ...this.fromPixel };
        
        // Hide piece at destination
        this.animationManager.hidePiece(this.data.to);
        
        // Use full piece data
        this.piece = this.data.piece;
    }
    
    update(deltaTime) {
        super.update(deltaTime);
        
        if (this.complete) return;
        
        // Quadratic bezier curve
        const t = Easing.easeOutQuad(this.progress);
        
        // P(t) = (1-t)²P0 + 2(1-t)tP1 + t²P2
        const oneMinusT = 1 - t;
        const term0 = oneMinusT * oneMinusT;
        const term1 = 2 * oneMinusT * t;
        const term2 = t * t;
        
        this.currentPixel.x = term0 * this.fromPixel.x + term1 * this.midPixel.x + term2 * this.toPixel.x;
        this.currentPixel.y = term0 * this.fromPixel.y + term1 * this.midPixel.y + term2 * this.toPixel.y;
    }
    
    render() {
        const moveAnim = new MoveAnimation({ from: '0,0', to: '0,0', pieceType: this.piece.type }, {
            canvas: this.canvas,
            ctx: this.ctx,
            boardRenderer: this.boardRenderer,
            pieceRenderer: this.pieceRenderer,
            animationManager: this.animationManager
        });
        
        moveAnim.drawPieceManually(this.currentPixel.x, this.currentPixel.y, this.piece);
    }
    
    cleanup() {
        this.animationManager.showPiece(this.data.to);
    }
}