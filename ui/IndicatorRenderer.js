// ui/IndicatorRenderer.js - UI overlay indicators (highlights, targets, ability areas)

export const VOID_OUTER_COLOR = '#5B4E7A';
export const VOID_INNER_COLOR = '#8D7EA9';
export const PORTAL_OUTER_COLOR = '#87CEEB';
export const PORTAL_INNER_COLOR = '#ADD8E6';

const TEA = {
	ruby:  { main: '#e4395f', ink: '#8f1f3a' },
	pearl: { main: '#eae0c8', ink: '#8b8262' },
	amber: { main: '#f3bf3f', ink: '#9a5f14' },
	jade:  { main: '#a8e685', ink: '#1f6f55' }
};

export class IndicatorRenderer {
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

	// -------------------------------------------------
	// Helpers
	// -------------------------------------------------

	gridToPixel(x, y) {
		return [
			this.originX + x * this.scale,
			this.originY - y * this.scale
		];
	}

	// -------------------------------------------------
	// Lethal Pit (theme-consistent)
	// -------------------------------------------------

    drawSpectralTarget(px, py, radius) {
	    const t = Date.now() / 1000;

	    const pulse = Math.sin(t * 2.0) * 0.03; // ±3%
	    const innerR = radius * 1.02;
	    const outerR = radius * (1.35 + pulse);

	    this.ctx.save();
	    this.ctx.translate(px, py);

	    // ---- Define shadow region with hole ----
	    this.ctx.beginPath();

	    // Outer allowed region
	    this.ctx.arc(0, 0, outerR, 0, Math.PI * 2);

	    // Inner cutout (piece)
	    this.ctx.arc(0, 0, innerR, 0, Math.PI * 2, true);

	    this.ctx.clip('evenodd');

	    // ---- Heavy contact shadow ----
	    const shadow = this.ctx.createRadialGradient(
		    0, 0, innerR,
		    0, 0, outerR
	    );
	    shadow.addColorStop(0, 'rgba(0,0,0,0.85)');
	    shadow.addColorStop(0.45, 'rgba(0,0,0,0.5)');
	    shadow.addColorStop(0.75, 'rgba(0,0,0,0.2)');
	    shadow.addColorStop(1, 'rgba(0,0,0,0)');

	    this.ctx.fillStyle = shadow;
	    this.ctx.beginPath();
	    this.ctx.arc(0, 0, outerR, 0, Math.PI * 2);
	    this.ctx.fill();

	    this.ctx.restore();
    }



	// -------------------------------------------------
	// Selected Piece (neutral rotating halo)
	// -------------------------------------------------

    drawSelectedPieceHighlight(selectedPieceCoord, pieces) {
        if (!selectedPieceCoord) return;
        const piece = pieces[selectedPieceCoord];
        if (!piece) return;

        const [x, y] = selectedPieceCoord.split(',').map(Number);
        const [px, py] = this.gridToPixel(x, y);
        const t = Date.now() / 700;

        // Use a scale-relative multiplier for the radius
        // 0.8 * scale usually creates a nice halo around a standard piece
        const relScale = this.scale / 45; // Base line thickness on default scale
        const indicatorRadius = 25 * relScale; 
        
        this.ctx.save();
        this.ctx.translate(px, py);
        this.ctx.rotate(t);

        this.ctx.setLineDash([12 * relScale, 8 * relScale]); // Scale the dashes too!
        this.ctx.shadowColor = 'rgba(255,255,255,0.4)';
        this.ctx.shadowBlur = 10 * relScale;
        this.ctx.strokeStyle = 'rgba(255,255,255,0.8)';
        this.ctx.lineWidth = 2.5 * relScale;

        this.ctx.beginPath();
        // Using indicatorRadius instead of piece.size * 2.2
        this.ctx.arc(0, 0, indicatorRadius, 0, Math.PI * 2); 
        this.ctx.stroke();

        this.ctx.restore();
    }

	// -------------------------------------------------
	// Unified lethal targets
	// -------------------------------------------------

	drawTargetIndicators(targets, pieces = {}) {
		if (!targets?.length) return;

		for (const coord of targets) {
			const [x, y] = coord.split(',').map(Number);
			const [px, py] = this.gridToPixel(x, y);
			const piece = pieces[coord];
			const radius = piece ? piece.size * 1.7 : 18 * (this.scale / 45);

			this.drawSpectralTarget(px, py, radius);
		}
	}

	// -------------------------------------------------
	// Tidal Wave
	// -------------------------------------------------

	drawTidalwaveIndicators(waves) {
		if (!waves?.length) return;

		for (const wave of waves) {
			this.drawTargetIndicators(wave.targets);

			if (!wave.coverageArea) continue;
			const a = wave.coverageArea;

			this.ctx.save();
			this.ctx.shadowColor = TEA.pearl.ink;
			this.ctx.shadowBlur = 20;
			this.ctx.strokeStyle = 'rgba(234,224,200,0.9)';
			this.ctx.fillStyle = 'rgba(234,224,200,0.12)';
			this.ctx.lineWidth = 4 * (this.scale / 45);

			if (a.isDiagonal) {
				const [cx, cy] = this.gridToPixel(a.centerX, a.centerY);
				this.ctx.translate(cx, cy);
				this.ctx.rotate(a.rotation);
				this.ctx.fillRect(
					-(a.width * this.scale) / 2,
					-(a.height * this.scale) / 2,
					a.width * this.scale,
					a.height * this.scale
				);
				this.ctx.strokeRect(
					-(a.width * this.scale) / 2,
					-(a.height * this.scale) / 2,
					a.width * this.scale,
					a.height * this.scale
				);
			} else {
				const minX = this.originX + (a.minX - 0.5) * this.scale;
				const minY = this.originY - (a.maxY + 0.5) * this.scale;
				const w = (a.maxX - a.minX + 1) * this.scale;
				const h = (a.maxY - a.minY + 1) * this.scale;
				this.ctx.fillRect(minX, minY, w, h);
				this.ctx.strokeRect(minX, minY, w, h);
			}

			this.ctx.restore();
		}
	}

	// -------------------------------------------------
	// Portal Swap
	// -------------------------------------------------

	drawPortalSwapIndicators(targets) {
		if (!targets?.length) return;

		const t = Date.now() / 600;

		for (const coord of targets) {
			const [x, y] = coord.split(',').map(Number);
			const [px, py] = this.gridToPixel(x, y);

			this.ctx.save();
			this.ctx.translate(px, py);
			this.ctx.rotate(t);

			this.ctx.shadowColor = PORTAL_OUTER_COLOR;
			this.ctx.shadowBlur = 16;
			this.ctx.strokeStyle = PORTAL_OUTER_COLOR;
			this.ctx.lineWidth = 3;

			for (let i = 0; i < 2; i++) {
				this.ctx.beginPath();
				this.ctx.arc(
					0,
					0,
					22,
					i * Math.PI,
					i * Math.PI + Math.PI / 1.5
				);
				this.ctx.stroke();
			}

			this.ctx.restore();
		}
	}

	// -------------------------------------------------
	// Amber Sap
	// -------------------------------------------------

	drawAmberSapIndicators(sapData) {
		if (!sapData?.length) return;

		for (const sap of sapData) {
			this.drawTargetIndicators(sap.targets);

			if (!sap.boundingBox) continue;
			const bb = sap.boundingBox;

			this.ctx.save();
			this.ctx.shadowColor = TEA.amber.ink;
			this.ctx.shadowBlur = 18 * (this.scale / 45);
			this.ctx.strokeStyle = TEA.amber.main;
			this.ctx.fillStyle = 'rgba(243,191,63,0.14)';
			this.ctx.lineWidth = 4 * (this.scale / 45);

			if (bb.isDiagonal) {
				const [cx, cy] = this.gridToPixel(bb.centerX, bb.centerY);
				this.ctx.translate(cx, cy);
				this.ctx.rotate(bb.rotation);
				this.ctx.fillRect(
					-(bb.length * this.scale) / 2,
					-(bb.width * this.scale) / 2,
					bb.length * this.scale,
					bb.width * this.scale
				);
				this.ctx.strokeRect(
					-(bb.length * this.scale) / 2,
					-(bb.width * this.scale) / 2,
					bb.length * this.scale,
					bb.width * this.scale
				);
			} else {
				const minX = this.originX + (bb.minX - 0.5) * this.scale;
				const minY = this.originY - (bb.maxY + 0.5) * this.scale;
				const w = (bb.maxX - bb.minX + 1) * this.scale;
				const h = (bb.maxY - bb.minY + 1) * this.scale;
				this.ctx.fillRect(minX, minY, w, h);
				this.ctx.strokeRect(minX, minY, w, h);
			}

			this.ctx.restore();
		}
	}

	// -------------------------------------------------
	// Jade Launch
	// -------------------------------------------------

	drawJadeLaunchPieceIndicators(launchablePieces, pieces) {
		if (!launchablePieces?.length) return;

		const t = Date.now() / 700;

		for (const coord of launchablePieces) {
			const piece = pieces[coord];
			if (!piece) continue;

			const [x, y] = coord.split(',').map(Number);
			const [px, py] = this.gridToPixel(x, y);
            
            const indicatorRadius = 0.5 * this.scale;
            
			this.ctx.save();
			this.ctx.translate(px, py);
			this.ctx.rotate(t);

			this.ctx.shadowColor = TEA.jade.ink;
			this.ctx.shadowBlur = 14 * (this.scale / 25);
			this.ctx.strokeStyle = TEA.jade.main;
			this.ctx.lineWidth = 3 * (this.scale / 45);

			for (let i = 0; i < 3; i++) {
				this.ctx.beginPath();
				this.ctx.arc(
					0,
					0,
					indicatorRadius,
					i * (Math.PI * 2 / 3),
					i * (Math.PI * 2 / 3) + Math.PI / 3
				);
				this.ctx.stroke();
			}

			this.ctx.restore();
		}
	}

	drawJadeLaunchTargetIndicators(targets, pieces = {}) {
		if (!targets?.length) return;

		const t = Date.now() / 500;

		for (const coord of targets) {
			const [x, y] = coord.split(',').map(Number);
			const [px, py] = this.gridToPixel(x, y);
			const piece = pieces[coord];
			const r = (piece ? piece.size * 2.4 : 22 ) * (this.scale / 45);;

			this.ctx.save();
			this.ctx.translate(px, py);
			this.ctx.rotate(t);

			this.ctx.shadowColor = TEA.jade.ink;
			this.ctx.shadowBlur = 18 * (this.scale / 45);
			this.ctx.strokeStyle = TEA.jade.main;
			this.ctx.lineWidth = 3 * (this.scale / 45);

			for (let i = 0; i < 5; i++) {
				this.ctx.beginPath();
				this.ctx.arc(
					0,
					0,
					r,
					i * (Math.PI * 2 / 5),
					i * (Math.PI * 2 / 5) + Math.PI / 4
				);
				this.ctx.stroke();
			}

			this.ctx.setLineDash([6, 6]);
			this.ctx.beginPath();
			this.ctx.arc(0, 0, r * 0.75, 0, Math.PI * 2);
			this.ctx.stroke();

			this.ctx.restore();
		}
	}
	
	// Draw movement option indicators (white jade-launch style)
    drawMovementIndicators(validMoves) {
        if (!validMoves?.length) return;
        
        const t = Date.now() / 500;
        
        for (const move of validMoves) {
            const coordStr = typeof move === 'string' ? move : `${move.x},${move.y}`;
            const [x, y] = coordStr.split(',').map(Number);
            const [px, py] = this.gridToPixel(x, y);
            const r = 15 * (this.scale / 45); // Fixed radius for empty spaces
            
            this.ctx.save();
            this.ctx.translate(px, py);
            this.ctx.rotate(t);
            
            // White glow to match selection highlight
            this.ctx.shadowColor = 'rgba(255,215,75,0.3)';
            this.ctx.shadowBlur = 10;
            this.ctx.strokeStyle = 'rgba(255,255,255,0.3)';
            this.ctx.lineWidth = 2 * (this.scale / 45);
            
            // Five arcs pattern (jade launch style)
            for (let i = 0; i < 5; i++) {
                this.ctx.beginPath();
                this.ctx.arc(
                    0,
                    0,
                    r,
                    i * (Math.PI * 2 / 5),
                    i * (Math.PI * 2 / 5) + Math.PI / 4
                );
                this.ctx.stroke();
            }
            
            // Inner dashed circle
            this.ctx.setLineDash([6, 6]);
            this.ctx.beginPath();
            this.ctx.arc(0, 0, r * .80, 0, Math.PI * 2);
            this.ctx.stroke();
            
            this.ctx.restore();
        }
    }
}

