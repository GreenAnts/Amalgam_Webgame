// move_ordering/MoveOrdering.js
// Orders moves for optimal alpha-beta pruning

import { Logger } from '../utils/Logger.js';

export class MoveOrdering {
    constructor(priorityCalculator) {
        this.logger = new Logger('MoveOrdering');
        this.priorityCalculator = priorityCalculator;
    }

    /**
     * Sort moves by estimated quality (best first for alpha-beta)
     * @param {Array} moves - List of legal moves
     * @param {Object} position - Current game state
     * @param {Object} transpositionTable - TT for move hints
     * @returns {Array} Ordered moves
     */
    orderMoves(moves, position, transpositionTable = null) {
        this.logger.debug(`Ordering ${moves.length} moves`);
        
        // TODO: Implement move ordering
        // 1. Check TT for best move from previous search
        // 2. Score each move by priority
        // 3. Sort by score (highest first)
        
        // For now, return as-is (random order)
        return moves;
    }

    /**
     * Calculate move priority score
     * @private
     */
    scoreMoveImportance(move, position) {
        // TODO: Delegate to PriorityCalculator
        return 0;
    }
}
