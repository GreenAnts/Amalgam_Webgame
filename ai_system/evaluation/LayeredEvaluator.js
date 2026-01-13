// evaluation/LayeredEvaluator.js
// Multi-layered position evaluation - DIRECT game state access (standard practice)

import { Logger } from '../utils/Logger.js';
import { EvaluationContext } from '../caching/EvaluationContext.js';

export class LayeredEvaluator {
    constructor(weights) {
        this.logger = new Logger('LayeredEvaluator');
        this.weights = weights || {
            strategic: 1.0,  // Long-term position
            tactical: 2.0,   // Ability formations
            immediate: 3.0   // Threats and captures
        };
    }

    /**
     * Evaluate position using layered approach
     * @param {Object} gameState - Game state from gameLogic.getState()
     * @param {Object} playerManager - Player manager instance
     * @returns {number} Position score (positive = good for current player)
     */
    evaluate(gameState, playerManager) {
        this.logger.debug('Evaluating position (layered)');
        
        // Create evaluation context (lazy computation)
        const ctx = new EvaluationContext(gameState, playerManager);
        
        const strategic = this.evaluateStrategic(gameState, playerManager);
        const tactical = this.evaluateTactical(gameState, playerManager, ctx);
        const immediate = this.evaluateImmediate(gameState, playerManager, ctx);
        
        const totalScore = 
            this.weights.strategic * strategic +
            this.weights.tactical * tactical +
            this.weights.immediate * immediate;
        
        this.logger.debug('Evaluation complete', {
            strategic,
            tactical,
            immediate,
            total: totalScore
        });
        
        return totalScore;
    }

    /**
     * Strategic evaluation (material, position, goal distance)
     * DIRECT ACCESS - No extraction layer
     * @private
     */
    evaluateStrategic(gameState, playerManager) {
        let score = 0;
        
        // TODO: Implement strategic evaluation
        // Example direct access:
        // const pieceCount = Object.keys(gameState.pieces).length;
        // const voidPosition = this.findVoid(gameState, playerManager);
        // const goalDistance = this.calculateGoalDistance(voidPosition);
        
        return score;
    }

    /**
     * Tactical evaluation (ability formations, mobility)
     * Uses cached formations from context
     * @private
     */
    evaluateTactical(gameState, playerManager, ctx) {
        let score = 0;
        
        // TODO: Implement tactical evaluation
        // Example using cached formations:
        // const formations = ctx.formations; // Lazy-computed only if we reach this
        // score += formations.rubyPairs.length * 200;
        // score += formations.pearlPairs.length * 200;
        
        return score;
    }

    /**
     * Immediate evaluation (threats, hanging pieces)
     * Uses cached threat map from context
     * @private
     */
    evaluateImmediate(gameState, playerManager, ctx) {
        let score = 0;
        
        // TODO: Implement immediate evaluation
        // Example using cached threat map:
        // const threatMap = ctx.threatMap; // Lazy-computed only if we reach this
        // score -= this.countHangingPieces(gameState, threatMap) * 200;
        
        return score;
    }
}