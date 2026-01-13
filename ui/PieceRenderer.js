// ui/PieceRenderer.js - Functions to draw game pieces on the canvas
export class PieceRenderer {
    constructor(ctx, originX, originY, scale = 25) {
        this.ctx = ctx;
        this.originX = originX;
        this.originY = originY;
        this.scale = scale;
    }

    updateOrigin(originX, originY, scale = 25) {
        this.originX = originX;
        this.originY = originY;
        this.scale = scale;
    }

    // Utility to darken a hex color
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

    drawAmalgamCircle(x, y, size, colors, rotation) {
        const centerPixelX = this.originX + x * this.scale;
        const centerPixelY = this.originY - y * this.scale;
        const radius = size * (this.scale / 25);
        const outerRadius = radius * 1.2;

        this.ctx.save();
        this.ctx.translate(centerPixelX, centerPixelY);
        // If square pieces are "diamond rotation use first line, if traditional square, use second line.
        // this.ctx.rotate(rotation);
        this.ctx.rotate(Math.PI - 44.78);

        const angles = [
            { start: -Math.PI / 4, end: Math.PI / 4, color: colors[2] },
            { start: Math.PI / 4, end: 3 * Math.PI / 4, color: colors[0] },
            { start: 3 * Math.PI / 4, end: 5 * Math.PI / 4, color: colors[1] },
            { start: 5 * Math.PI / 4, end: 7 * Math.PI / 4, color: colors[3] }
        ];

        // Draw outer ring
        angles.forEach((quadrant) => {
            this.ctx.beginPath();
            this.ctx.moveTo(0, 0);
            this.ctx.arc(0, 0, outerRadius, quadrant.start, quadrant.end);
            this.ctx.lineTo(0, 0);
            this.ctx.fillStyle = this.darkenColor(quadrant.color, 20);
            this.ctx.fill();
            this.ctx.closePath();
        });

        // Draw inner circle
        angles.forEach((quadrant) => {
            this.ctx.beginPath();
            this.ctx.moveTo(0, 0);
            this.ctx.arc(0, 0, radius, quadrant.start, quadrant.end);
            this.ctx.lineTo(0, 0);
            this.ctx.fillStyle = quadrant.color;
            this.ctx.fill();
            this.ctx.closePath();
        });
        
        this.ctx.restore();
    }

    drawAmalgamSquare(x, y, size, colors, rotation) {
        const centerPixelX = this.originX + x * this.scale;
        const centerPixelY = this.originY - y * this.scale;
        
        const scaledSize = size * (this.scale / 25);
        const outerSize = scaledSize * 2.1;
        const innerSize = scaledSize * 1.5;

        this.ctx.save();
        this.ctx.translate(centerPixelX, centerPixelY);

        // Use first line if you want diamond rotation, second line for traditional square rotation.
        // this.ctx.rotate(rotation + (45 * Math.PI / 180));
        this.ctx.rotate(rotation + (Math.PI / 180));

        const halfOuter = outerSize / 2;
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

        const halfInner = innerSize / 2;
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

        this.ctx.restore();
    }

    drawVoidCircle(x, y, size, outerColor, innerColor) {
        const centerPixelX = this.originX + x * this.scale;
        const centerPixelY = this.originY - y * this.scale;
        const radius = size * (this.scale / 25);
        
        this.ctx.beginPath();
        this.ctx.arc(centerPixelX, centerPixelY, radius * 1.2, 0, 2 * Math.PI);
        this.ctx.fillStyle = outerColor;
        this.ctx.fill();
        this.ctx.closePath();

        this.ctx.beginPath();
        this.ctx.arc(centerPixelX, centerPixelY, radius, 0, 2 * Math.PI);
        this.ctx.fillStyle = innerColor;
        this.ctx.fill();
        this.ctx.closePath();
    }

    drawVoidSquare(x, y, size, outerColor, innerColor) {
        const centerPixelX = this.originX + x * this.scale;
        const centerPixelY = this.originY - y * this.scale;

        this.ctx.save();
        this.ctx.translate(centerPixelX, centerPixelY);
        // Used to rotate square to diamond
        // this.ctx.rotate(45 * Math.PI / 180);

        const scaledSize = size * (this.scale / 25);
        const outerSize = scaledSize * 2.1;
        const halfOuter = outerSize / 2;
        const innerSize = scaledSize * 1.5;
        const halfInner = innerSize / 2;

        this.ctx.fillStyle = outerColor;
        this.ctx.fillRect(-halfOuter, -halfOuter, outerSize, outerSize);

        this.ctx.fillStyle = innerColor;
        this.ctx.fillRect(-halfInner, -halfInner, innerSize, innerSize);

        this.ctx.restore();
    }

    drawPortalCircle(x, y, size, outerColor, innerColor) {
        const centerPixelX = this.originX + x * this.scale;
        const centerPixelY = this.originY - y * this.scale;
        const radius = size * (this.scale / 25);

        this.ctx.beginPath();
        this.ctx.arc(centerPixelX, centerPixelY, radius * 1.2, 0, 2 * Math.PI);
        this.ctx.fillStyle = outerColor;
        this.ctx.fill();
        this.ctx.closePath();

        this.ctx.beginPath();
        this.ctx.arc(centerPixelX, centerPixelY, radius, 0, 2 * Math.PI);
        this.ctx.fillStyle = innerColor;
        this.ctx.fill();
        this.ctx.closePath();
    }

    drawPortalSquare(x, y, size, outerColor, innerColor) {
        const centerPixelX = this.originX + x * this.scale;
        const centerPixelY = this.originY - y * this.scale;

        this.ctx.save();
        this.ctx.translate(centerPixelX, centerPixelY);
        // Used to rotate square to diamond
        // this.ctx.rotate(45 * Math.PI / 180);
        
        const scaledSize = size * (this.scale / 25);
        const outerSize = scaledSize * 2.1;
        const halfOuter = outerSize / 2;
        const innerSize = scaledSize * 1.5;
        const halfInner = innerSize / 2;

        this.ctx.fillStyle = outerColor;
        this.ctx.fillRect(-halfOuter, -halfOuter, outerSize, outerSize);

        this.ctx.fillStyle = innerColor;
        this.ctx.fillRect(-halfInner, -halfInner, innerSize, innerSize);

        this.ctx.restore();
    }

    drawPiece(coordStr, piece) {
        const [x, y] = coordStr.split(',').map(Number);

        switch (piece.type) {
            case 'amalgamCircle':
                this.drawAmalgamCircle(x, y, piece.size, piece.colors, piece.rotation);
                break;
            case 'amalgamSquare':
                this.drawAmalgamSquare(x, y, piece.size, piece.colors, piece.rotation);
                break;
            case 'voidCircle':
                this.drawVoidCircle(x, y, piece.size, piece.outerColor, piece.innerColor);
                break;
            case 'voidSquare':
                this.drawVoidSquare(x, y, piece.size, piece.outerColor, piece.innerColor);
                break;
            case 'portalCircle':
                this.drawPortalCircle(x, y, piece.size, piece.outerColor, piece.innerColor);
                break;
            case 'portalSquare':
                this.drawPortalSquare(x, y, piece.size, piece.outerColor, piece.innerColor);
                break;
            // Gem pieces - use same rendering as Void (two-circle pattern)
            case 'rubyCircle':
            case 'pearlCircle':
            case 'amberCircle':
            case 'jadeCircle':
                this.drawVoidCircle(x, y, piece.size, piece.outerColor, piece.innerColor);
                break;
            case 'rubySquare':
            case 'pearlSquare':
            case 'amberSquare':
            case 'jadeSquare':
                this.drawVoidSquare(x, y, piece.size, piece.outerColor, piece.innerColor);
                break;
        }
    }
}

