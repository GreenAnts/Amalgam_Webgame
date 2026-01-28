// systems/PortalSwapSystem.js - Handles portal piece swapping ability
import { BoardUtils } from '../core/BoardUtils.js';

export class PortalSwapSystem {
    constructor(gameState, playerManager, attackSystem) {
        this.gameState = gameState;
        this.playerManager = playerManager;
        this.attackSystem = attackSystem;
        this.boardUtils = new BoardUtils();
        
        this.selectedPortal = null;
        this.swapTargets = [];
        this.isActive = false;
        
        this.reverseMode = false; // true when target selected first
        this.selectedTarget = null; // Non-portal piece selected first
        this.availablePortals = []; // Portals that can swap with selected target
    }

    // Select a portal piece to initiate swap
    selectPortal(coordStr) {
        const piece = this.gameState.getPiece(coordStr);
        
        if (!piece) return false;
        
        // Must be a portal piece
        if (piece.type !== 'portalCircle' && piece.type !== 'portalSquare') {
            return false;
        }
        
        // Must belong to current player
        const currentPlayer = this.playerManager.getCurrentPlayer();
        if (!this.playerManager.canMovePiece(piece.type)) {
            return false;
        }
        
        this.selectedPortal = coordStr;
        this.swapTargets = this.getSwapTargets(coordStr);
        
        return this.swapTargets.length > 0;
    }
    
    // Select a non-portal target piece first (reverse swap)
    selectTarget(coordStr) {
        const piece = this.gameState.getPiece(coordStr);
        
        if (!piece) return false;
        
        // Must NOT be a portal piece
        if (piece.type === 'portalCircle' || piece.type === 'portalSquare') {
            return false;
        }
        
        // Must be on a golden line
        if (!this.boardUtils.isGoldenCoordinate(coordStr)) {
            return false;
        }
        
        // Must belong to current player
        if (!this.playerManager.canMovePiece(piece.type)) {
            return false;
        }
        
        this.selectedTarget = coordStr;
        this.availablePortals = this.getPortalsForTarget(coordStr);
        this.reverseMode = true;
        
        return this.availablePortals.length > 0;
    }

    // Get all portals that can swap with the target piece
    getPortalsForTarget(targetCoordStr) {
        const portals = [];
        const currentPlayer = this.playerManager.getCurrentPlayer();
        
        // Find all friendly portals
        for (const coordStr in this.gameState.pieces) {
            const piece = this.gameState.pieces[coordStr];
            
            // Must be a portal
            if (piece.type !== 'portalCircle' && piece.type !== 'portalSquare') {
                continue;
            }
            
            // Must belong to current player
            if (!this.playerManager.canMovePiece(piece.type)) {
                continue;
            }
            
            // Check if this portal can swap with the target
            // (reuse existing swap validation logic)
            const tempSelectedPortal = this.selectedPortal;
            const tempSwapTargets = this.swapTargets;
            const tempReverseMode = this.reverseMode;
            
            this.selectedPortal = coordStr;
            this.swapTargets = this.getSwapTargets(coordStr);
            this.reverseMode = false;
            
            const canSwap = this.swapTargets.includes(targetCoordStr);
            
            // Restore state
            this.selectedPortal = tempSelectedPortal;
            this.swapTargets = tempSwapTargets;
            this.reverseMode = tempReverseMode;
            
            if (canSwap) {
                portals.push(coordStr);
            }
        }
        
        return portals;
    }

    // Get all valid swap targets for a portal
    getSwapTargets(portalCoordStr) {
        const targets = [];
        const portalPiece = this.gameState.getPiece(portalCoordStr);
        
        if (!portalPiece) return targets;
        
        const currentPlayer = this.playerManager.getCurrentPlayer();
        
        // Check all pieces on the board
        for (const coordStr in this.gameState.pieces) {
            const piece = this.gameState.pieces[coordStr];
            
            // Must be on a golden line
            if (!this.boardUtils.isGoldenCoordinate(coordStr)) {
                continue;
            }
            
            // Must NOT be a portal
            if (piece.type === 'portalCircle' || piece.type === 'portalSquare') {
                continue;
            }
            
            // Must belong to the same player
            if (!this.playerManager.canMovePiece(piece.type)) {
                continue;
            }
            PortalSwapSystem
            targets.push(coordStr);
        }
        
        return targets;
    }

    // Execute the swap between portal and target piece
    executeSwap(targetOrPortalCoordStr) {
        let portalCoord, targetCoord;
        
        if (this.reverseMode) {
            // Reverse mode: selectedTarget is the non-portal, clicking on portal
            if (!this.selectedTarget || !this.availablePortals.includes(targetOrPortalCoordStr)) {
                return { success: false, message: 'Invalid portal for swap.' };
            }
            portalCoord = targetOrPortalCoordStr;
            targetCoord = this.selectedTarget;
        } else {
            // Normal mode: selectedPortal is the portal, clicking on target
            if (!this.selectedPortal || !this.swapTargets.includes(targetOrPortalCoordStr)) {
                return { success: false, message: 'Invalid swap target.' };
            }
            portalCoord = this.selectedPortal;
            targetCoord = targetOrPortalCoordStr;
        }
        
        const portalPiece = this.gameState.getPiece(portalCoord);
        const targetPiece = this.gameState.getPiece(targetCoord);
        
        if (!portalPiece || !targetPiece) {
            return { success: false, message: 'Invalid pieces for swap.' };
        }
        
        // Predict eliminations from BOTH positions AFTER swap
        const eliminated = this.predictSwapEliminations(portalCoord, targetCoord);
        
        // Perform the swap
        const tempPiece = this.gameState.pieces[portalCoord];
        this.gameState.pieces[portalCoord] = this.gameState.pieces[targetCoord];
        this.gameState.pieces[targetCoord] = tempPiece;
        
        // Execute attacks from BOTH positions
        this.attackSystem.executeAttack(portalCoord);
        this.attackSystem.executeAttack(targetCoord);
        
        // Clean up
        this.reset();
        
        return { 
            success: true, 
            message: `Swapped ${portalPiece.name} with ${targetPiece.name}.`,
            moveMade: true,
            eliminated: eliminated
        };
    }

    // Predict what will be eliminated after swap
    predictSwapEliminations(portalCoord, targetCoord) {
        const eliminated = [];
        
        const portalPiece = this.gameState.getPiece(portalCoord);
        const targetPiece = this.gameState.getPiece(targetCoord);
        
        // Validation: Both pieces must exist
        if (!portalPiece || !targetPiece) {
            console.warn('[PortalSwapSystem] Cannot predict swap - pieces not found:', 
                         { portalCoord, targetCoord, portalPiece: !!portalPiece, targetPiece: !!targetPiece });
            return eliminated;
        }
        
        // After swap:
        // - targetPiece will be at portalCoord
        // - portalPiece will be at targetCoord
        
        // Check what targetPiece will eliminate at portalCoord
        const elim1 = this.predictEliminations(portalCoord, targetPiece);
        eliminated.push(...elim1);
        
        // Check what portalPiece will eliminate at targetCoord
        const elim2 = this.predictEliminations(targetCoord, portalPiece);
        eliminated.push(...elim2);
        
        return eliminated;
    }

    // Predict eliminations for a piece at a position
    predictEliminations(coordStr, piece) {
        const eliminated = [];
        const coord = this.boardUtils.stringToCoord(coordStr);
        const attackingPlayer = piece.type.includes('Square') ? 'player1' : 'player2';
        
        const directions = [
            {x: 1, y: 0}, {x: 1, y: 1}, {x: 0, y: 1}, {x: -1, y: 1},
            {x: -1, y: 0}, {x: -1, y: -1}, {x: 0, y: -1}, {x: 1, y: -1}
        ];
        
        const isVoid = piece.type.includes('void');
        const isPortal = piece.type.includes('portal');
        
        // Check adjacent
        for (const dir of directions) {
            const targetX = coord.x + dir.x;
            const targetY = coord.y + dir.y;
            const targetCoordStr = this.boardUtils.coordToString(targetX, targetY);
            
            if (this.boardUtils.isOnBoard(targetCoordStr)) {
                const targetPiece = this.gameState.getPiece(targetCoordStr);
                
                if (targetPiece) {
                    const targetPlayer = targetPiece.type.includes('Square') ? 'player1' : 'player2';
                    const targetIsPortal = targetPiece.type.includes('portal');
                    
                    if (targetPlayer !== attackingPlayer) {
                        if (isVoid || 
                            (isPortal && targetIsPortal) || 
                            (!isPortal && !targetIsPortal)) {
                            eliminated.push({ type: targetPiece.type, coord: targetCoordStr });
                        }
                    }
                }
            }
        }
        
        // If portal, check golden lines too
        if (isPortal) {
            const connections = this.gameState.goldenLinesDict[coordStr];
            if (connections && Array.isArray(connections)) {
                for (const conn of connections) {
                    const targetCoordStr = this.boardUtils.coordToString(conn.x, conn.y);
                    const targetPiece = this.gameState.getPiece(targetCoordStr);
                    
                    if (targetPiece) {
                        const targetPlayer = targetPiece.type.includes('Square') ? 'player1' : 'player2';
                        const targetIsPortal = targetPiece.type.includes('portal');
                        
                        if (targetPlayer !== attackingPlayer && targetIsPortal) {
                            eliminated.push({ type: targetPiece.type, coord: targetCoordStr });
                        }
                    }
                }
            }
        }
        
        return eliminated;
    }

    // Activate swap mode
    activate() {
        if (this.reverseMode) {
            // Reverse mode: target already selected, portals available
            if (!this.selectedTarget || this.availablePortals.length === 0) {
                return false;
            }
        } else {
            // Normal mode: portal selected, targets available
            if (!this.selectedPortal || this.swapTargets.length === 0) {
                return false;
            }
        }
        this.isActive = true;
        return true;
    }

    // Deactivate swap mode
    deactivate() {
        this.isActive = false;
        // If we deactivate without finishing, we should usually reset 
        // to avoid "sticking" in reverseMode.
        this.reset(); 
    }

    // Check if swap mode is active
    isSwapActive() {
        return this.isActive;
    }

    // Get current swap targets (works for both modes)
    getTargets() {
        return this.reverseMode ? this.availablePortals : this.swapTargets;
    }

    // Reset swap state
    reset() {
        this.selectedPortal = null;
        this.swapTargets = [];
        this.isActive = false;
        // Reset reverse mode
        this.reverseMode = false;
        this.selectedTarget = null;
        this.availablePortals = [];
    }

    // Check if a portal is selected
    hasSelectedPortal() {
        return this.selectedPortal !== null;
    }
}
