// systems/AttackSystem.js - Handles piece capture logic after moves
import { BoardUtils } from '../core/BoardUtils.js';

export class AttackSystem {
    constructor(gameState, playerManager) {
        this.gameState = gameState;
        this.playerManager = playerManager;
        this.boardUtils = new BoardUtils();
        
        // 8 adjacent directions
        this.directions = [
            {x: 1, y: 0}, {x: 1, y: 1}, {x: 0, y: 1}, {x: -1, y: 1},
            {x: -1, y: 0}, {x: -1, y: -1}, {x: 0, y: -1}, {x: 1, y: -1}
        ];
    }

    // Execute attack from a piece that just moved
    executeAttack(coordStr) {
        const piece = this.gameState.getPiece(coordStr);
        if (!piece) return;

        const attackingPlayer = this.getPlayerOfPiece(piece);

        if (this.isVoidPiece(piece)) {
            this.voidAttack(coordStr, attackingPlayer);
        } else if (this.isPortalPiece(piece)) {
            this.portalAttack(coordStr, attackingPlayer);
        } else {
            this.nonPortalAttack(coordStr, attackingPlayer);
        }
    }

    // Void pieces attack ALL adjacent enemy pieces
    voidAttack(coordStr, attackingPlayer) {
        const coord = this.boardUtils.stringToCoord(coordStr);
        
        for (const dir of this.directions) {
            const targetX = coord.x + dir.x;
            const targetY = coord.y + dir.y;
            const targetCoordStr = this.boardUtils.coordToString(targetX, targetY);
            
            // Check if position is on board and has an enemy piece
            if (this.boardUtils.isOnBoard(targetCoordStr)) {
                const targetPiece = this.gameState.getPiece(targetCoordStr);
                if (targetPiece && this.getPlayerOfPiece(targetPiece) !== attackingPlayer) {
                    this.gameState.removePiece(targetCoordStr);
                }
            }
        }
    }

    // Portal pieces attack ONLY other portal pieces (adjacent + golden line distance)
    portalAttack(coordStr, attackingPlayer) {
        const coord = this.boardUtils.stringToCoord(coordStr);
        
        // Adjacent portal attacks
        for (const dir of this.directions) {
            const targetX = coord.x + dir.x;
            const targetY = coord.y + dir.y;
            const targetCoordStr = this.boardUtils.coordToString(targetX, targetY);
            
            if (this.boardUtils.isOnBoard(targetCoordStr)) {
                const targetPiece = this.gameState.getPiece(targetCoordStr);
                if (targetPiece && 
                    this.isPortalPiece(targetPiece) && 
                    this.getPlayerOfPiece(targetPiece) !== attackingPlayer) {
                    this.gameState.removePiece(targetCoordStr);
                }
            }
        }

        // Golden line distance portal attacks
        const connections = this.gameState.goldenLinesDict[coordStr];
        if (connections && Array.isArray(connections)) {
            for (const conn of connections) {
                const targetCoordStr = this.boardUtils.coordToString(conn.x, conn.y);
                const targetPiece = this.gameState.getPiece(targetCoordStr);
                
                if (targetPiece && 
                    this.isPortalPiece(targetPiece) && 
                    this.getPlayerOfPiece(targetPiece) !== attackingPlayer) {
                    this.gameState.removePiece(targetCoordStr);
                }
            }
        }
    }

    // Non-portal pieces attack ONLY non-portal pieces (adjacent only)
    nonPortalAttack(coordStr, attackingPlayer) {
        const coord = this.boardUtils.stringToCoord(coordStr);
        
        for (const dir of this.directions) {
            const targetX = coord.x + dir.x;
            const targetY = coord.y + dir.y;
            const targetCoordStr = this.boardUtils.coordToString(targetX, targetY);
            
            if (this.boardUtils.isOnBoard(targetCoordStr)) {
                const targetPiece = this.gameState.getPiece(targetCoordStr);
                if (targetPiece && 
                    !this.isPortalPiece(targetPiece) && 
                    this.getPlayerOfPiece(targetPiece) !== attackingPlayer) {
                    this.gameState.removePiece(targetCoordStr);
                }
            }
        }
    }
    
    // Execute attack and return list of eliminated pieces (with full piece data)
    executeAttackAndReturnEliminated(coordStr) {
        const eliminated = [];
        const piece = this.gameState.getPiece(coordStr);
        if (!piece) return eliminated;

        const attackingPlayer = this.getPlayerOfPiece(piece);
        const coord = this.boardUtils.stringToCoord(coordStr);

        if (this.isVoidPiece(piece)) {
            // Void attacks all adjacent
            for (const dir of this.directions) {
                const targetX = coord.x + dir.x;
                const targetY = coord.y + dir.y;
                const targetCoordStr = this.boardUtils.coordToString(targetX, targetY);
                
                if (this.boardUtils.isOnBoard(targetCoordStr)) {
                    const targetPiece = this.gameState.getPiece(targetCoordStr);
                    if (targetPiece && this.getPlayerOfPiece(targetPiece) !== attackingPlayer) {
                        // Store FULL piece data for animation restoration
                        eliminated.push({ 
                            type: targetPiece.type, 
                            coord: targetCoordStr,
                            piece: { ...targetPiece }
                        });
                    }
                }
            }
        } else if (this.isPortalPiece(piece)) {
            // Portal attacks adjacent portals
            for (const dir of this.directions) {
                const targetX = coord.x + dir.x;
                const targetY = coord.y + dir.y;
                const targetCoordStr = this.boardUtils.coordToString(targetX, targetY);
                
                if (this.boardUtils.isOnBoard(targetCoordStr)) {
                    const targetPiece = this.gameState.getPiece(targetCoordStr);
                    if (targetPiece && 
                        this.isPortalPiece(targetPiece) && 
                        this.getPlayerOfPiece(targetPiece) !== attackingPlayer) {
                        eliminated.push({ 
                            type: targetPiece.type, 
                            coord: targetCoordStr,
                            piece: { ...targetPiece }
                        });
                    }
                }
            }

            // Portal attacks along golden lines
            const connections = this.gameState.goldenLinesDict[coordStr];
            if (connections && Array.isArray(connections)) {
                for (const conn of connections) {
                    const targetCoordStr = this.boardUtils.coordToString(conn.x, conn.y);
                    const targetPiece = this.gameState.getPiece(targetCoordStr);
                    
                    if (targetPiece && 
                        this.isPortalPiece(targetPiece) && 
                        this.getPlayerOfPiece(targetPiece) !== attackingPlayer) {
                        eliminated.push({ 
                            type: targetPiece.type, 
                            coord: targetCoordStr,
                            piece: { ...targetPiece }
                        });
                    }
                }
            }
        } else {
            // Non-portal attacks adjacent non-portals
            for (const dir of this.directions) {
                const targetX = coord.x + dir.x;
                const targetY = coord.y + dir.y;
                const targetCoordStr = this.boardUtils.coordToString(targetX, targetY);
                
                if (this.boardUtils.isOnBoard(targetCoordStr)) {
                    const targetPiece = this.gameState.getPiece(targetCoordStr);
                    if (targetPiece && 
                        !this.isPortalPiece(targetPiece) && 
                        this.getPlayerOfPiece(targetPiece) !== attackingPlayer) {
                        eliminated.push({ 
                            type: targetPiece.type, 
                            coord: targetCoordStr,
                            piece: { ...targetPiece }
                        });
                    }
                }
            }
        }
        
        // Now actually execute the attack (removes pieces from gameState)
        this.executeAttack(coordStr);
        
        return eliminated;
    }

    // Helper to check if a piece will be eliminated
    willBeEliminated(attackerPiece, targetPiece, attackingPlayer) {
        const targetPlayer = this.getPlayerOfPiece(targetPiece);
        
        if (targetPlayer === attackingPlayer) return false;
        
        if (this.isVoidPiece(attackerPiece)) return true;
        
        if (this.isPortalPiece(attackerPiece) && this.isPortalPiece(targetPiece)) return true;
        
        if (!this.isPortalPiece(attackerPiece) && !this.isPortalPiece(targetPiece)) return true;
        
        return false;
    }

    // Helper: Check if piece is a void type
    isVoidPiece(piece) {
        return piece.type === 'voidCircle' || piece.type === 'voidSquare';
    }

    // Helper: Check if piece is a portal type
    isPortalPiece(piece) {
        return piece.type === 'portalCircle' || piece.type === 'portalSquare';
    }

    // Helper: Get which player owns a piece
    getPlayerOfPiece(piece) {
        // Player 1 owns: all Square pieces
        // Player 2 owns: all Circle pieces
        const player1Types = [
            'amalgamSquare', 'voidSquare', 'portalSquare',
            'rubySquare', 'pearlSquare', 'amberSquare', 'jadeSquare'
        ];
        return player1Types.includes(piece.type) ? 'player1' : 'player2';
    }
    
}
