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

        // Ensure these return 0 if not implemented yet
        const material = this.evaluateMaterial(simulationState, context);
        const position = this.evaluatePosition(simulationState, context);

        return material + position;
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

    evaluateMaterial() { return 0; }
    evaluatePosition() { return 0; }
}