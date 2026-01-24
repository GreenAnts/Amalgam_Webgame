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
        
        // Score each move
        const scoredMoves = moves.map(move => ({
            move: move,
            score: this.scoreMoveImportance(move, position, transpositionTable)
        }));
        
        // Sort by score (highest first for best alpha-beta cutoffs)
        scoredMoves.sort((a, b) => b.score - a.score);
        
        // Extract sorted moves
        return scoredMoves.map(sm => sm.move);
    }

    /**
     * Calculate move priority score
     * @private
     */
    scoreMoveImportance(move, position, transpositionTable) {
        let score = 0;
        
        // Check TT for best move from previous search
        if (transpositionTable) {
            const posHash = this.hashPosition(position);
            if (transpositionTable.hasBestMove(posHash)) {
                const ttMove = transpositionTable.getBestMove(posHash);
                if (this.movesEqual(move, ttMove)) {
                    score += 100000; // TT move highest priority
                }
            }
        }
        
        // PRIORITY 1: Abilities that eliminate pieces
        if (move.type && move.type.startsWith('ABILITY_')) {
            score += 10000;
            
            // Bonus for abilities targeting enemy pieces
            if (move.target && position.pieces && position.pieces[move.target]) {
                const targetPiece = position.pieces[move.target];
                const isEnemy = this.isEnemyPiece(targetPiece, position);
                if (isEnemy) {
                    score += 5000;
                }
            }
            return score;
        }
        
        // PRIORITY 2: Captures (standard attacks)
        if (move.type === 'MOVE' && move.from && move.to) {
            const movingPiece = position.pieces ? position.pieces[move.from] : null;
            
            if (movingPiece) {
                const captureCount = this.detectCaptures(move, position, movingPiece);
                if (captureCount > 0) {
                    score += 5000 + (captureCount * 1000); // More captures = higher priority
                }
            }
        }
        
        // PRIORITY 3: Void goal progress
        if (move.type === 'MOVE' && move.from && move.to) {
            const movingPiece = position.pieces ? position.pieces[move.from] : null;
            
            if (movingPiece && movingPiece.type && movingPiece.type.includes('void')) {
                const progress = this.calculateGoalProgress(move, movingPiece);
                score += progress * 100;
            }
        }
        
        // PRIORITY 4: Center control
        const [toX, toY] = move.to ? move.to.split(',').map(Number) : [0, 0];
        const distFromCenter = Math.abs(toX) + Math.abs(toY);
        score += Math.max(0, 12 - distFromCenter) * 10;
        
        return score;
    }

    /**
     * Detect if move results in captures and count them
     * @private
     */
    detectCaptures(move, position, movingPiece) {
        if (!position.pieces) return 0;
        
        const [toX, toY] = move.to.split(',').map(Number);
        
        const directions = [
            {x: 1, y: 0}, {x: 1, y: 1}, {x: 0, y: 1}, {x: -1, y: 1},
            {x: -1, y: 0}, {x: -1, y: -1}, {x: 0, y: -1}, {x: 1, y: -1}
        ];
        
        const isVoid = movingPiece.type.includes('void');
        const isPortal = movingPiece.type.includes('portal');
        const attackingPlayer = movingPiece.type.includes('Square') ? 'player1' : 'player2';
        
        let captureCount = 0;
        
        for (const dir of directions) {
            const adjX = toX + dir.x;
            const adjY = toY + dir.y;
            const adjCoordStr = `${adjX},${adjY}`;
            const adjPiece = position.pieces[adjCoordStr];
            
            if (adjPiece) {
                const targetPlayer = adjPiece.type.includes('Square') ? 'player1' : 'player2';
                const targetIsPortal = adjPiece.type.includes('portal');
                
                if (targetPlayer !== attackingPlayer) {
                    if (isVoid || 
                        (isPortal && targetIsPortal) || 
                        (!isPortal && !targetIsPortal)) {
                        captureCount++;
                    }
                }
            }
        }
        
        return captureCount;
    }

    /**
     * Calculate goal progress for void pieces
     * @private
     */
    calculateGoalProgress(move, movingPiece) {
        const goalY = movingPiece.type.includes('Square') ? 6 : -6;
        
        const [fromX, fromY] = move.from.split(',').map(Number);
        const [toX, toY] = move.to.split(',').map(Number);
        
        const distBefore = Math.abs(fromY - goalY) + Math.abs(fromX - 0);
        const distAfter = Math.abs(toY - goalY) + Math.abs(toX - 0);
        
        return distBefore - distAfter;
    }

    /**
     * Check if piece belongs to enemy
     * @private
     */
    isEnemyPiece(piece, position) {
        // Determine current player from position
        // This is a simplified check - you may need to pass currentPlayer explicitly
        return piece.type.includes('Square') || piece.type.includes('Circle');
    }

    /**
     * Check if two moves are equal
     * @private
     */
    movesEqual(move1, move2) {
        if (!move1 || !move2) return false;
        
        if (move1.type !== move2.type) return false;
        
        if (move1.type === 'MOVE') {
            return move1.from === move2.from && move1.to === move2.to;
        }
        
        // For abilities, compare targets
        return move1.target === move2.target;
    }

    /**
     * Hash position for TT lookup
     * @private
     */
    hashPosition(position) {
        if (!position.pieces) return '0';
        
        // Simple hash: concatenate all piece positions
        const coords = Object.keys(position.pieces).sort();
        return coords.join('|');
    }
}
