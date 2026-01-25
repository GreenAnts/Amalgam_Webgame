// evaluation/LayeredEvaluator.js
// Layered position evaluation with win detection
// DESIGNED FOR: Browser and Node.js (Arena) Compatibility

export class LayeredEvaluator {
    constructor() {
        this.weights = null;
        this.ourPlayer = null;
        
        // Comprehensive fallback weights to prevent NaN errors
        this.defaultWeights = {
            terminal: { WIN_SCORE: 10000, LOSS_SCORE: -10000 },
            material: { void: 1000, amalgam: 500, portal: 300, ruby: 100, pearl: 100, amber: 100, jade: 100 },
            position: { voidGoalDistance: -50, centerControl: 20 },
            tactical: {}
        };
    }

    /**
     * Environment-aware weight loader
     */
    async loadWeights() {
        if (this.weights) return this.weights;

        const configPath = new URL('../config/EvaluationWeights.json', import.meta.url);

        try {
            // Check if we are in Node.js (Arena environment)
            if (typeof process !== 'undefined' && process.versions && process.versions.node) {
                const fs = await import('fs/promises');
                const { fileURLToPath } = await import('url');
                const path = fileURLToPath(configPath);
                const content = await fs.readFile(path, 'utf8');
                this.weights = JSON.parse(content);
            } else {
                // Browser environment
                const response = await fetch(configPath);
                if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);
                this.weights = await response.json();
            }
            return this.weights;
        } catch (error) {
            console.warn('Evaluator: Using default weights due to load error:', error.message);
            this.weights = this.defaultWeights;
            return this.weights;
        }
    }

    evaluate(simulationState, context = {}) {
        const currentWeights = this.weights || this.defaultWeights;
    
        const terminal = this.checkTerminal(simulationState, context, currentWeights);
        if (terminal !== null) return terminal;
    
        const material = this.evaluateMaterial(simulationState, context);
        const position = this.evaluatePosition(simulationState, context);
        const tactical = this.evaluateTactical(simulationState, context);
    
        return material + position + tactical;
    }

    checkTerminal(simulationState, context, weights) {
        const { gameLogic, playerManager } = context;
        if (!gameLogic || !simulationState) return null;

        const pieces = typeof simulationState.getPieces === 'function'
            ? simulationState.getPieces()
            : simulationState.pieces;

        const gameState = { pieces: pieces, selectedPieceCoord: null };

        if (!gameLogic.isTerminal(gameState)) return null;

        const result = gameLogic.getTerminalResult(gameState);
        if (!result || !result.winnerId) return 0;

        if (!this.ourPlayer && playerManager) {
            this.ourPlayer = playerManager.getCurrentPlayer().name;
        }

        const winnerName = result.winnerId === 'player1' ? 'Player 1' : 'Player 2 (AI)';
        return winnerName === this.ourPlayer ? weights.terminal.WIN_SCORE : weights.terminal.LOSS_SCORE;
    }

    /**
     * Evaluate material balance
     * Counts piece values: our pieces - opponent pieces
     * @param {SimulatedGameState} simulationState - Current position
     * @param {Object} context - {gameLogic, playerManager}
     * @returns {number} Material score (positive = we're ahead)
     */
    evaluateMaterial(simulationState, context) {
        if (!this.weights || !this.weights.material) return 0;
        
        const pieces = typeof simulationState.getPieces === 'function'
            ? simulationState.getPieces()
            : simulationState.pieces;
        
        if (!pieces || Object.keys(pieces).length === 0) return 0;
        
        // Determine our player
        let ourPlayer = this.ourPlayer;
        if (!ourPlayer && context.playerManager) {
            ourPlayer = context.playerManager.getCurrentPlayer().name;
            this.ourPlayer = ourPlayer;
        }
        
        // If we still don't know our player, try simulation state
        if (!ourPlayer && simulationState.currentPlayer) {
            ourPlayer = simulationState.currentPlayer;
            this.ourPlayer = ourPlayer;
        }
        
        // Safety: can't evaluate without knowing our player
        if (!ourPlayer) return 0;
        
        const ourSuffix = ourPlayer === 'Player 1' ? 'Square' : 'Circle';
        const oppSuffix = ourPlayer === 'Player 1' ? 'Circle' : 'Square';
        
        let ourScore = 0;
        let oppScore = 0;
        
        const materialWeights = this.weights.material;
        
        for (const piece of Object.values(pieces)) {
            const pieceType = piece.type;
            
            // Determine piece value based on type
            let value = 0;
            if (pieceType.includes('void')) {
                value = materialWeights.void;
            } else if (pieceType.includes('amalgam')) {
                value = materialWeights.amalgam;
            } else if (pieceType.includes('portal')) {
                value = materialWeights.portal;
            } else if (pieceType.includes('ruby')) {
                value = materialWeights.ruby;
            } else if (pieceType.includes('pearl')) {
                value = materialWeights.pearl;
            } else if (pieceType.includes('amber')) {
                value = materialWeights.amber;
            } else if (pieceType.includes('jade')) {
                value = materialWeights.jade;
            }
            
            // Add to appropriate player's total
            if (pieceType.includes(ourSuffix)) {
                ourScore += value;
            } else if (pieceType.includes(oppSuffix)) {
                oppScore += value;
            }
        }
        
        // Return material advantage (positive = we're ahead)
        return ourScore - oppScore;
    }

    /**
     * Evaluate position for simulation states
     * Checks material difference to determine advantage
     */
    evaluatePosition(simulationState, context) {
        if (!this.weights || !this.weights.position) return 0;
        
        const pieces = typeof simulationState.getPieces === 'function'
            ? simulationState.getPieces()
            : simulationState.pieces;
        
        if (!pieces || Object.keys(pieces).length === 0) return 0;
        
        let score = 0;
        
        // Void goal distance (only if we have our player info)
        if (this.ourPlayer && simulationState.currentPlayer === this.ourPlayer) {
            const voidType = this.ourPlayer === 'Player 1' ? 'voidSquare' : 'voidCircle';
            const goalY = this.ourPlayer === 'Player 1' ? 6 : -6;
            
            for (const [coord, piece] of Object.entries(pieces)) {
                if (piece.type === voidType) {
                    const [x, y] = coord.split(',').map(Number);
                    const distToGoal = Math.abs(y - goalY) + Math.abs(x - 0);
                    score += this.weights.position.voidGoalDistance * distToGoal;
                    break; // Only one void
                }
            }
        }
        
        return score;
    }

    /**
     * Evaluate tactical opportunities (formations, threats)
     */
    evaluateTactical(simulationState, context) {
        if (!this.weights || !this.weights.tactical) return 0;
        
        const pieces = typeof simulationState.getPieces === 'function'
            ? simulationState.getPieces()
            : simulationState.pieces;
        
        if (!pieces) return 0;
        
        let score = 0;
        
        // Detect ability formations
        const formations = this.detectFormations(pieces);
        
        // Bonus for having formations ready
        score += formations.rubyPairs * 200;  // Fireball ready
        score += formations.pearlPairs * 200; // Tidal wave ready
        score += formations.amberLines * 150; // Sap ready
        score += formations.jadePairs * 150;  // Launch ready
        
        return score;
    }

    /**
     * Simple formation detection for evaluation
     * @private
     */
    detectFormations(pieces) {
        const formations = {
            rubyPairs: 0,
            pearlPairs: 0,
            amberLines: 0,
            jadePairs: 0
        };
        
        // This is simplified - just counts gem pairs
        // Real implementation would check adjacency/alignment
        const coords = Object.keys(pieces);
        
        for (let i = 0; i < coords.length; i++) {
            const coord1 = coords[i];
            const piece1 = pieces[coord1];
            
            if (!piece1.type.includes('ruby') && !piece1.type.includes('Amalgam')) continue;
            
            for (let j = i + 1; j < coords.length; j++) {
                const coord2 = coords[j];
                const piece2 = pieces[coord2];
                
                if (piece2.type.includes('ruby') || piece2.type.includes('Amalgam')) {
                    if (this.isAdjacent(coord1, coord2)) {
                        formations.rubyPairs++;
                    }
                }
            }
        }
        
        // Similar for other gems... (simplified for now)
        
        return formations;
    }

    /**
     * Check if two coordinates are adjacent
     * @private
     */
    isAdjacent(coord1Str, coord2Str) {
        const [x1, y1] = coord1Str.split(',').map(Number);
        const [x2, y2] = coord2Str.split(',').map(Number);
        
        return Math.abs(x1 - x2) <= 1 && Math.abs(y1 - y2) <= 1 && 
            (x1 !== x2 || y1 !== y2);
    }
}