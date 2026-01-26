// move_ordering/MoveOrdering.js
// Orders moves for optimal alpha-beta pruning with SMART elimination detection

import { Logger } from '../utils/Logger.js';

export class MoveOrdering {
    constructor(priorityCalculator) {
        this.logger = new Logger('MoveOrdering');
        this.priorityCalculator = priorityCalculator;
    }

    orderMoves(moves, position, transpositionTable = null) {
        this.logger.debug(`Ordering ${moves.length} moves`);
        
        const scoredMoves = moves.map(move => ({
            move: move,
            score: this.scoreMoveImportance(move, position, transpositionTable)
        }));
        
        scoredMoves.sort((a, b) => b.score - a.score);
        
        return scoredMoves.map(sm => sm.move);
    }

    scoreMoveImportance(move, position, transpositionTable) {
        let score = 0;
        
        // TT move
        if (transpositionTable) {
            const posHash = this.hashPosition(position);
            if (transpositionTable.hasBestMove(posHash)) {
                const ttMove = transpositionTable.getBestMove(posHash);
                if (this.movesEqual(move, ttMove)) {
                    score += 100000;
                }
            }
        }
        
        // PRIORITY 1: Abilities
        if (move.type && move.type.startsWith('ABILITY_')) {
            score += 10000;
            
            // ✅ FIX: Predict eliminations for each ability type
            const eliminationCount = this.predictAbilityEliminations(move, position);
            
            if (eliminationCount > 0) {
                console.log(`[MoveOrdering] ${move.type} will eliminate ${eliminationCount} pieces → +${eliminationCount * 5000} priority`);
                score += eliminationCount * 5000; // Huge bonus per elimination
            }
            
            if (move.type === 'ABILITY_LAUNCH') {
                score += 2000; // Launch still gets base bonus
            }
            
            return score;
        }
        
        // PRIORITY 2: Moves that enable abilities
        if (move.type === 'MOVE') {
            const enablesAbility = this.detectAbilitySetup(move, position);
            if (enablesAbility) {
                console.log(`[MoveOrdering] Move ${move.from}→${move.to} enables ability → +8000 priority`);
                score += 8000;
            }
        }
        
        // PRIORITY 3: Captures
        if (move.type === 'MOVE' && move.from && move.to) {
            const movingPiece = position.pieces ? position.pieces[move.from] : null;
            
            if (movingPiece) {
                const captureCount = this.detectCaptures(move, position, movingPiece);
                if (captureCount > 0) {
                    score += 5000 + (captureCount * 1000);
                }
            }
        }
        
        // PRIORITY 4: Void goal progress (REDUCED)
        if (move.type === 'MOVE' && move.from && move.to) {
            const movingPiece = position.pieces ? position.pieces[move.from] : null;
            
            if (movingPiece && movingPiece.type && movingPiece.type.includes('void')) {
                const progress = this.calculateGoalProgress(move, movingPiece);
                score += progress * 50; // Reduced from 100
            }
        }
        
        // PRIORITY 5: Center control
        const [toX, toY] = move.to ? move.to.split(',').map(Number) : [0, 0];
        const distFromCenter = Math.abs(toX) + Math.abs(toY);
        score += Math.max(0, 12 - distFromCenter) * 10;
        
        return score;
    }

    /**
     * ✅ NEW: Predict how many pieces an ability will eliminate
     * This is the KEY fix - we simulate the ability to count eliminations
     */
    predictAbilityEliminations(move, position) {
        if (!position.pieces) return 0;
        
        let count = 0;
        
        switch (move.type) {
            case 'ABILITY_LAUNCH':
                count = this.predictLaunchEliminations(move, position);
                break;
                
            case 'ABILITY_FIREBALL':
                count = this.predictFireballEliminations(move, position);
                break;
                
            case 'ABILITY_TIDALWAVE':
                count = this.predictTidalwaveEliminations(move, position);
                break;
                
            case 'ABILITY_SAP':
                count = this.predictSapEliminations(move, position);
                break;
                
            case 'ABILITY_PORTAL_SWAP':
                count = this.predictSwapEliminations(move, position);
                break;
        }
        
        return count;
    }

    /**
     * Predict launch eliminations: collision + attacks after landing
     */
    predictLaunchEliminations(move, position) {
        let count = 0;
        
        // 1. Collision elimination (landing on enemy)
        const landingPiece = position.pieces[move.target];
        if (landingPiece) {
            const launchedPiece = position.pieces[move.pieceCoord];
            if (launchedPiece && this.areEnemies(launchedPiece, landingPiece)) {
                count++;
            }
        }
        
        // 2. Attack eliminations after landing
        const launchedPiece = position.pieces[move.pieceCoord];
        if (launchedPiece) {
            const [targetX, targetY] = move.target.split(',').map(Number);
            const directions = [
                {x: 1, y: 0}, {x: 1, y: 1}, {x: 0, y: 1}, {x: -1, y: 1},
                {x: -1, y: 0}, {x: -1, y: -1}, {x: 0, y: -1}, {x: 1, y: -1}
            ];
            
            const isVoid = launchedPiece.type.includes('void');
            const isPortal = launchedPiece.type.includes('portal');
            const attackingPlayer = launchedPiece.type.includes('Square') ? 'player1' : 'player2';
            
            for (const dir of directions) {
                const adjX = targetX + dir.x;
                const adjY = targetY + dir.y;
                const adjCoord = `${adjX},${adjY}`;
                const adjPiece = position.pieces[adjCoord];
                
                if (adjPiece && adjCoord !== move.pieceCoord) { // Don't count original position
                    const targetPlayer = adjPiece.type.includes('Square') ? 'player1' : 'player2';
                    const targetIsPortal = adjPiece.type.includes('portal');
                    
                    if (targetPlayer !== attackingPlayer) {
                        if (isVoid || 
                            (isPortal && targetIsPortal) || 
                            (!isPortal && !targetIsPortal)) {
                            count++;
                        }
                    }
                }
            }
        }
        
        return count;
    }

    /**
     * Predict fireball eliminations from formationData
     */
    predictFireballEliminations(move, position) {
        if (move.formationData && move.formationData.targets) {
            return move.formationData.targets.filter(t => 
                position.pieces[t] && this.isEnemyPiece(position.pieces[t], position)
            ).length;
        }
        
        // Fallback: check if target exists and is enemy
        if (move.target && position.pieces[move.target]) {
            return this.isEnemyPiece(position.pieces[move.target], position) ? 1 : 0;
        }
        
        return 0;
    }

    /**
     * Predict tidal wave eliminations
     */
    predictTidalwaveEliminations(move, position) {
        if (move.formationData && move.formationData.targets) {
            return move.formationData.targets.filter(t => 
                position.pieces[t] && this.isEnemyPiece(position.pieces[t], position)
            ).length;
        }
        return 0;
    }

    /**
     * Predict sap eliminations
     */
    predictSapEliminations(move, position) {
        if (move.formationData && move.formationData.targets) {
            return move.formationData.targets.filter(t => 
                position.pieces[t] && this.isEnemyPiece(position.pieces[t], position)
            ).length;
        }
        return 0;
    }

    /**
     * Predict swap eliminations (attacks from both swapped positions)
     */
    predictSwapEliminations(move, position) {
        let count = 0;
        
        const portal = position.pieces[move.portalCoord];
        const target = position.pieces[move.target];
        
        if (!portal || !target) return 0;
        
        // Count attacks from portal's new position (target's old position)
        count += this.countAttacksFromPosition(move.target, portal, position);
        
        // Count attacks from target's new position (portal's old position)
        count += this.countAttacksFromPosition(move.portalCoord, target, position);
        
        return count;
    }

    /**
     * Count how many enemies would be attacked from a position
     */
    countAttacksFromPosition(coordStr, piece, position) {
        const [x, y] = coordStr.split(',').map(Number);
        const directions = [
            {x: 1, y: 0}, {x: 1, y: 1}, {x: 0, y: 1}, {x: -1, y: 1},
            {x: -1, y: 0}, {x: -1, y: -1}, {x: 0, y: -1}, {x: 1, y: -1}
        ];
        
        const isVoid = piece.type.includes('void');
        const isPortal = piece.type.includes('portal');
        const attackingPlayer = piece.type.includes('Square') ? 'player1' : 'player2';
        
        let count = 0;
        
        for (const dir of directions) {
            const adjX = x + dir.x;
            const adjY = y + dir.y;
            const adjCoord = `${adjX},${adjY}`;
            const adjPiece = position.pieces[adjCoord];
            
            if (adjPiece) {
                const targetPlayer = adjPiece.type.includes('Square') ? 'player1' : 'player2';
                const targetIsPortal = adjPiece.type.includes('portal');
                
                if (targetPlayer !== attackingPlayer) {
                    if (isVoid || 
                        (isPortal && targetIsPortal) || 
                        (!isPortal && !targetIsPortal)) {
                        count++;
                    }
                }
            }
        }
        
        return count;
    }

    /**
     * Check if two pieces are enemies
     */
    areEnemies(piece1, piece2) {
        const player1 = piece1.type.includes('Square') ? 'player1' : 'player2';
        const player2 = piece2.type.includes('Square') ? 'player1' : 'player2';
        return player1 !== player2;
    }

    /**
     * Detect if move creates formation for ability
     */
    detectAbilitySetup(move, position) {
        if (!position.pieces || !move.to) return false;
        
        const movedPiece = position.pieces[move.from];
        if (!movedPiece) return false;
        
        const movedType = movedPiece.type;
        const isGem = movedType.includes('ruby') || movedType.includes('pearl') || 
                      movedType.includes('amber') || movedType.includes('jade');
        
        if (!isGem && !movedType.includes('amalgam')) return false;
        
        const [toX, toY] = move.to.split(',').map(Number);
        const directions = [
            {x: 1, y: 0}, {x: 1, y: 1}, {x: 0, y: 1}, {x: -1, y: 1},
            {x: -1, y: 0}, {x: -1, y: -1}, {x: 0, y: -1}, {x: 1, y: -1}
        ];
        
        for (const dir of directions) {
            const adjX = toX + dir.x;
            const adjY = toY + dir.y;
            const adjCoordStr = `${adjX},${adjY}`;
            const adjPiece = position.pieces[adjCoordStr];
            
            if (adjPiece) {
                if (movedType.includes('ruby') && (adjPiece.type.includes('ruby') || adjPiece.type.includes('amalgam'))) {
                    return true;
                }
                if (movedType.includes('pearl') && (adjPiece.type.includes('pearl') || adjPiece.type.includes('amalgam'))) {
                    return true;
                }
                if (movedType.includes('amber') && (adjPiece.type.includes('amber') || adjPiece.type.includes('amalgam'))) {
                    return true;
                }
                if (movedType.includes('jade') && (adjPiece.type.includes('jade') || adjPiece.type.includes('amalgam'))) {
                    return true;
                }
                if (movedType.includes('amalgam')) {
                    if (adjPiece.type.includes('ruby') || adjPiece.type.includes('pearl') ||
                        adjPiece.type.includes('amber') || adjPiece.type.includes('jade')) {
                        return true;
                    }
                }
            }
        }
        
        return false;
    }

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

    calculateGoalProgress(move, movingPiece) {
        const goalY = movingPiece.type.includes('Square') ? 6 : -6;
        
        const [fromX, fromY] = move.from.split(',').map(Number);
        const [toX, toY] = move.to.split(',').map(Number);
        
        const distBefore = Math.abs(fromY - goalY) + Math.abs(fromX - 0);
        const distAfter = Math.abs(toY - goalY) + Math.abs(toX - 0);
        
        return distBefore - distAfter;
    }

    isEnemyPiece(piece, position) {
        return piece.type.includes('Square') || piece.type.includes('Circle');
    }

    movesEqual(move1, move2) {
        if (!move1 || !move2) return false;
        
        if (move1.type !== move2.type) return false;
        
        if (move1.type === 'MOVE') {
            return move1.from === move2.from && move1.to === move2.to;
        }
        
        return move1.target === move2.target;
    }

    hashPosition(position) {
        if (!position.pieces) return '0';
        
        const coords = Object.keys(position.pieces).sort();
        return coords.join('|');
    }
}