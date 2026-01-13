// systems/RubyFireballSystem.js - Handles Ruby Fireball ability
import { BoardUtils } from '../core/BoardUtils.js';

export class RubyFireballSystem {
    constructor(gameState, playerManager) {
        this.gameState = gameState;
        this.playerManager = playerManager;
        this.boardUtils = new BoardUtils();
        
        this.fireballTargets = []; // Array of {ruby1, ruby2, direction, targets[]}
        this.isActive = false;
        this.selectedDirection = null; // Which fireball direction is selected
        
        // 8 directions
        this.directions = [
            {x: 1, y: 0}, {x: 1, y: 1}, {x: 0, y: 1}, {x: -1, y: 1},
            {x: -1, y: 0}, {x: -1, y: -1}, {x: 0, y: -1}, {x: 1, y: -1}
        ];
    }

    // Check if fireball ability is available
    checkFireball(movedPieceCoord = null) {
        this.fireballTargets = [];
        
        // Only check fireball if Ruby, Amalgam, or Void moved
        if (movedPieceCoord) {
            const movedPiece = this.gameState.getPiece(movedPieceCoord);
            if (movedPiece) {
                const isRuby = movedPiece.type === 'rubyCircle' || movedPiece.type === 'rubySquare';
                const isAmalgam = movedPiece.type === 'amalgamCircle' || movedPiece.type === 'amalgamSquare';
                const isVoid = movedPiece.type === 'voidCircle' || movedPiece.type === 'voidSquare';
                
                if (!isRuby && !isAmalgam && !isVoid) {
                    return false; // Don't check fireball if other piece types moved
                }
            }
        }
        
        const currentPlayer = this.playerManager.getCurrentPlayer();
        const rubies = this.collectRubyPieces(currentPlayer);
        
        // Check all pairs of Ruby/Amalgam pieces
        for (let i = 0; i < rubies.length; i++) {
            for (let j = i + 1; j < rubies.length; j++) {
                const ruby1 = rubies[i];
                const ruby2 = rubies[j];
                
                // Check if this pair is relevant to the moved piece
                if (this.isFireballRelevant(movedPieceCoord, ruby1, ruby2)) {
                    const targets = this.calculateFireballTargets(ruby1, ruby2, movedPieceCoord);
                    if (targets.length > 0) {
                        this.fireballTargets.push(...targets);
                    }
                }
            }
        }
        
        return this.fireballTargets.length > 0;
    }

    // Check if this fireball formation is relevant to the moved piece
    isFireballRelevant(movedPieceCoord, ruby1Str, ruby2Str) {
        // No movement - all fireballs are relevant
        if (!movedPieceCoord) {
            return true;
        }
        
        // If moved piece is one of the aligned rubies
        if (movedPieceCoord === ruby1Str || movedPieceCoord === ruby2Str) {
            return true;
        }
        
        // If moved piece is a Void, check if it's at the amplification position
        const movedPiece = this.gameState.getPiece(movedPieceCoord);
        if (movedPiece && (movedPiece.type === 'voidCircle' || movedPiece.type === 'voidSquare')) {
            // Check if rubies are adjacent
            if (!this.boardUtils.isAdjacent(ruby1Str, ruby2Str)) {
                return false;
            }
            
            const ruby1 = this.boardUtils.stringToCoord(ruby1Str);
            const ruby2 = this.boardUtils.stringToCoord(ruby2Str);
            
            // Calculate direction
            const direction = {
                x: ruby2.x - ruby1.x,
                y: ruby2.y - ruby1.y
            };
            
            // Check if aligned
            if (direction.x !== 0 && direction.y !== 0 && 
                Math.abs(direction.x) !== Math.abs(direction.y)) {
                return false;
            }
            
            // Check if Void is at amplification position for either direction
            // Direction 1: ruby2 + direction
            const amp1X = ruby2.x + direction.x;
            const amp1Y = ruby2.y + direction.y;
            const amp1Str = this.boardUtils.coordToString(amp1X, amp1Y);
            
            // Direction 2: ruby1 - direction
            const amp2X = ruby1.x - direction.x;
            const amp2Y = ruby1.y - direction.y;
            const amp2Str = this.boardUtils.coordToString(amp2X, amp2Y);
            
            if (movedPieceCoord === amp1Str || movedPieceCoord === amp2Str) {
                return true;
            }
        }
        
        return false;
    }

    // Collect all Ruby and Amalgam pieces for current player
    collectRubyPieces(currentPlayer) {
        const rubies = [];
        const rubyTypes = currentPlayer.pieceType.includes('rubyCircle') 
            ? ['rubyCircle', 'amalgamCircle']
            : ['rubySquare', 'amalgamSquare'];
        
        for (const coordStr in this.gameState.pieces) {
            const piece = this.gameState.pieces[coordStr];
            if (rubyTypes.includes(piece.type)) {
                rubies.push(coordStr);
            }
        }
        
        return rubies;
    }

    // Calculate fireball targets in both directions
    calculateFireballTargets(ruby1Str, ruby2Str, movedPieceCoord) {
        const targets = [];
        
        // Check if rubies are adjacent
        if (!this.boardUtils.isAdjacent(ruby1Str, ruby2Str)) {
            return targets;
        }
        
        const ruby1 = this.boardUtils.stringToCoord(ruby1Str);
        const ruby2 = this.boardUtils.stringToCoord(ruby2Str);
        
        // Direction from ruby1 to ruby2
        const direction = {
            x: ruby2.x - ruby1.x,
            y: ruby2.y - ruby1.y
        };
        
        // Check if aligned (horizontal, vertical, or diagonal)
        if (direction.x !== 0 && direction.y !== 0 && 
            Math.abs(direction.x) !== Math.abs(direction.y)) {
            return targets;
        }
        
        // Check amplification for both directions
        const dir1Amplified = this.checkAmplification(ruby2Str, direction);
        const dir2Amplified = this.checkAmplification(ruby1Str, { x: -direction.x, y: -direction.y });
        
        // Direction 1: From ruby2 outward
        // Can fire if: no moved piece, OR moved piece is not Void, OR moved piece is Void at ruby2+direction
        const movedPiece = movedPieceCoord ? this.gameState.getPiece(movedPieceCoord) : null;
        const canFireDir1 = !movedPieceCoord || 
                           !movedPiece ||
                           (movedPiece.type !== 'voidCircle' && movedPiece.type !== 'voidSquare') ||
                           (movedPieceCoord === this.boardUtils.coordToString(ruby2.x + direction.x, ruby2.y + direction.y));
        
        if (canFireDir1) {
            const dir1Targets = this.getFireballTargets(ruby2Str, direction, dir1Amplified);
            if (dir1Targets.length > 0) {
                targets.push({
                    ruby1: ruby1Str,
                    ruby2: ruby2Str,
                    direction: direction,
                    amplified: dir1Amplified,
                    targets: dir1Targets
                });
            }
        }
        
        // Direction 2: From ruby1 outward (reverse direction)
        const reverseDir = { x: -direction.x, y: -direction.y };
        const canFireDir2 = !movedPieceCoord || 
                           !movedPiece ||
                           (movedPiece.type !== 'voidCircle' && movedPiece.type !== 'voidSquare') ||
                           (movedPieceCoord === this.boardUtils.coordToString(ruby1.x + reverseDir.x, ruby1.y + reverseDir.y));
        
        if (canFireDir2) {
            const dir2Targets = this.getFireballTargets(ruby1Str, reverseDir, dir2Amplified);
            if (dir2Targets.length > 0) {
                targets.push({
                    ruby1: ruby1Str,
                    ruby2: ruby2Str,
                    direction: reverseDir,
                    amplified: dir2Amplified,
                    targets: dir2Targets
                });
            }
        }
        
        return targets;
    }

    // Check if fireball is amplified by adjacent Void
    checkAmplification(startCoordStr, direction) {
        const start = this.boardUtils.stringToCoord(startCoordStr);
        const nextX = start.x + direction.x;
        const nextY = start.y + direction.y;
        const nextCoordStr = this.boardUtils.coordToString(nextX, nextY);
        
        const piece = this.gameState.getPiece(nextCoordStr);
        if (piece && (piece.type === 'voidCircle' || piece.type === 'voidSquare')) {
            return true;
        }
        
        return false;
    }

    // Get fireball targets in a specific direction
    getFireballTargets(startCoordStr, direction, amplified) {
        const targets = [];
        const start = this.boardUtils.stringToCoord(startCoordStr);
        
        // Normalize direction
        const stepX = direction.x === 0 ? 0 : (direction.x > 0 ? 1 : -1);
        const stepY = direction.y === 0 ? 0 : (direction.y > 0 ? 1 : -1);
        
        const range = amplified ? 10 : 7;
        
        for (let step = 1; step < range; step++) {
            const targetX = start.x + stepX * step;
            const targetY = start.y + stepY * step;
            const targetCoordStr = this.boardUtils.coordToString(targetX, targetY);
            
            // Check if on board
            if (!this.boardUtils.isOnBoard(targetCoordStr)) {
                break;
            }
            
            const targetPiece = this.gameState.getPiece(targetCoordStr);
            
            // If empty, continue
            if (!targetPiece) {
                continue;
            }
            
            // Check if enemy piece
            const currentPlayer = this.playerManager.getCurrentPlayer();
            const isEnemy = !this.playerManager.canMovePiece(targetPiece.type);
            
            if (isEnemy) {
                // Enemy piece found
                const isPortal = targetPiece.type === 'portalCircle' || 
                                targetPiece.type === 'portalSquare';
                
                if (isPortal && !amplified) {
                    // Normal fireball stops at Portal without destroying
                    break;
                }
                
                // Add as valid target
                targets.push(targetCoordStr);
                break; // Stop after first enemy
            }
            // If friendly piece, continue through it (don't break)
        }
        
        return targets;
    }

    // Get all valid targets (flattened from all directions)
    getAllTargets() {
        const allTargets = [];
        for (const fireballData of this.fireballTargets) {
            allTargets.push(...fireballData.targets);
        }
        return allTargets;
    }

    // Execute fireball attack
    executeFireball(targetCoordStr) {
        // Find which fireball direction contains this target
        for (const fireballData of this.fireballTargets) {
            if (fireballData.targets.includes(targetCoordStr)) {
                // Destroy the target piece
                if (this.gameState.getPiece(targetCoordStr)) {
                    this.gameState.removePiece(targetCoordStr);
                    this.reset();
                    return {
                        success: true,
                        message: `Fireball destroyed piece at ${targetCoordStr}!`,
                        moveMade: true
                    };
                }
            }
        }
        
        return {
            success: false,
            message: 'Invalid fireball target.'
        };
    }

    // Activate fireball mode
    activate() {
        if (this.fireballTargets.length === 0) {
            return false;
        }
        this.isActive = true;
        return true;
    }

    // Deactivate fireball mode
    deactivate() {
        this.isActive = false;
    }

    // Check if fireball mode is active
    isFireballActive() {
        return this.isActive;
    }

    // Reset fireball state
    reset() {
        this.fireballTargets = [];
        this.isActive = false;
        this.selectedDirection = null;
    }

    // Check if fireball is available
    isAvailable() {
        return this.fireballTargets.length > 0;
    }
}
