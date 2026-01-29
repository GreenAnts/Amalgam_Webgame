// systems/JadeLaunchSystem.js - Handles Jade Launch ability
import { BoardUtils } from '../core/BoardUtils.js';

export class JadeLaunchSystem {
    constructor(gameState, playerManager) {
        this.gameState = gameState;
        this.playerManager = playerManager;
        this.boardUtils = new BoardUtils();
        
        this.launchOptions = []; // Array of {pieceCoord: string, targets: [coords]}
        this.isActive = false;
        this.selectedPiece = null; // Piece selected to launch
        this.selectedTargets = []; // Valid landing spots for selected piece
        
        // 8 directions
        this.directions = [
            {x: 1, y: 0}, {x: 1, y: 1}, {x: 0, y: 1}, {x: -1, y: 1},
            {x: -1, y: 0}, {x: -1, y: -1}, {x: 0, y: -1}, {x: 1, y: -1}
        ];
    }

    // Check if launch ability is available
    checkLaunch(movedPieceCoord = null) {
        this.launchOptions = [];
        
        const currentPlayer = this.playerManager.getCurrentPlayer();
        const jades = this.collectJadePieces(currentPlayer);
        
        // Check all pairs of Jade/Amalgam pieces
        for (let i = 0; i < jades.length; i++) {
            for (let j = i + 1; j < jades.length; j++) {
                const jade1 = jades[i];
                const jade2 = jades[j];
                
                const launches = this.calculateLaunches(jade1, jade2, movedPieceCoord);
                for (const launch of launches) {
                    // IMPORTANT FIX: Only add launch if it has valid targets
                    if (launch.targets && launch.targets.length > 0) {
                        this.launchOptions.push(launch);
                    }
                }
            }
        }
        
        return this.launchOptions.length > 0;
    }

    // Collect all Jade and Amalgam pieces for current player
    collectJadePieces(currentPlayer) {
        const jades = [];
        const jadeTypes = currentPlayer.pieceType.includes('jadeCircle') 
            ? ['jadeCircle', 'amalgamCircle']
            : ['jadeSquare', 'amalgamSquare'];
        
        for (const coordStr in this.gameState.pieces) {
            const piece = this.gameState.pieces[coordStr];
            if (jadeTypes.includes(piece.type)) {
                jades.push(coordStr);
            }
        }
        
        return jades;
    }

    // Calculate launch options for a jade pair
    calculateLaunches(jade1Str, jade2Str, movedPieceCoord) {
        const launches = [];
        
        // Check if adjacent
        if (!this.boardUtils.isAdjacent(jade1Str, jade2Str)) {
            return launches;
        }
        
        const jade1 = this.boardUtils.stringToCoord(jade1Str);
        const jade2 = this.boardUtils.stringToCoord(jade2Str);
        
        // Direction from jade1 to jade2
        const direction = {
            x: jade2.x - jade1.x,
            y: jade2.y - jade1.y
        };
        
        // Check if aligned
        if (direction.x !== 0 && direction.y !== 0 && 
            Math.abs(direction.x) !== Math.abs(direction.y)) {
            return launches;
        }
        
        // Forward direction: piece at jade2 + direction, launches toward jade1
        const forwardPieceX = jade2.x + direction.x;
        const forwardPieceY = jade2.y + direction.y;
        const forwardPieceStr = this.boardUtils.coordToString(forwardPieceX, forwardPieceY);
        
        if (this.gameState.getPiece(forwardPieceStr)) {
            if (this.isLaunchRelevant(movedPieceCoord, jade1Str, jade2Str, forwardPieceStr)) {
                const amplified = this.checkAmplification(jade1Str, { x: -direction.x, y: -direction.y });
                const targets = this.getLaunchTargets(jade1Str, { x: -direction.x, y: -direction.y }, amplified, forwardPieceStr);
                
                if (targets.length > 0) {
                    launches.push({
                        pieceCoord: forwardPieceStr,
                        targets: targets,
                        jade1: jade1Str,
                        jade2: jade2Str
                    });
                }
            }
        }
        
        // Backward direction: piece at jade1 - direction, launches toward jade2
        const backwardPieceX = jade1.x - direction.x;
        const backwardPieceY = jade1.y - direction.y;
        const backwardPieceStr = this.boardUtils.coordToString(backwardPieceX, backwardPieceY);
        
        if (this.gameState.getPiece(backwardPieceStr)) {
            if (this.isLaunchRelevant(movedPieceCoord, jade1Str, jade2Str, backwardPieceStr)) {
                const amplified = this.checkAmplification(jade2Str, direction);
                const targets = this.getLaunchTargets(jade2Str, direction, amplified, backwardPieceStr);
                
                if (targets.length > 0) {
                    launches.push({
                        pieceCoord: backwardPieceStr,
                        targets: targets,
                        jade1: jade1Str,
                        jade2: jade2Str
                    });
                }
            }
        }
        
        return launches;
    }

    // Check if this launch is relevant to the moved piece
    isLaunchRelevant(movedPieceCoord, jade1Str, jade2Str, launchPieceStr) {
        if (!movedPieceCoord) {
            return true; // Start of turn - all launches available
        }
        
        // If moved piece is one of the jades or the launch piece
        if (movedPieceCoord === jade1Str || movedPieceCoord === jade2Str || movedPieceCoord === launchPieceStr) {
            return true;
        }
        
        // If moved piece is a Void adjacent to one of the jades
        const movedPiece = this.gameState.getPiece(movedPieceCoord);
        if (movedPiece && (movedPiece.type === 'voidCircle' || movedPiece.type === 'voidSquare')) {
            if (this.boardUtils.isAdjacent(movedPieceCoord, jade1Str) || 
                this.boardUtils.isAdjacent(movedPieceCoord, jade2Str)) {
                return true;
            }
        }
        
        return false;
    }

    // Check if launch is amplified by Void
    checkAmplification(startCoordStr, direction) {
        const start = this.boardUtils.stringToCoord(startCoordStr);
        const checkX = start.x + direction.x;
        const checkY = start.y + direction.y;
        const checkCoordStr = this.boardUtils.coordToString(checkX, checkY);
        
        const piece = this.gameState.getPiece(checkCoordStr);
        if (piece && (piece.type === 'voidCircle' || piece.type === 'voidSquare')) {
            return true;
        }
        
        return false;
    }

    // Get valid launch targets
    getLaunchTargets(startCoordStr, direction, amplified, launchedPieceStr) {
        const targets = [];
        const start = this.boardUtils.stringToCoord(startCoordStr);
        const launchedPiece = this.gameState.getPiece(launchedPieceStr);
        
        if (!launchedPiece) return targets;
        
        // Normalize direction
        const stepX = direction.x === 0 ? 0 : (direction.x > 0 ? 1 : -1);
        const stepY = direction.y === 0 ? 0 : (direction.y > 0 ? 1 : -1);
        
        const range = amplified ? 7 : 5; // 1-6 if amplified, 1-4 normal
        
        const isPortal = launchedPiece.type === 'portalCircle' || launchedPiece.type === 'portalSquare';
        
        for (let step = 1; step < range; step++) {
            const targetX = start.x + stepX * step;
            const targetY = start.y + stepY * step;
            const targetCoordStr = this.boardUtils.coordToString(targetX, targetY);
            
            // Must be on board
            if (!this.boardUtils.isOnBoard(targetCoordStr)) {
                break;
            }
            
            // Portals can only land on golden lines
            if (isPortal && !this.boardUtils.isGoldenCoordinate(targetCoordStr)) {
                continue;
            }
            
            const targetPiece = this.gameState.getPiece(targetCoordStr);
            
            // Check if occupied
            if (targetPiece) {
                // Cannot land on friendly pieces
                if (this.playerManager.canMovePiece(targetPiece.type)) {
                    continue;
                }
                
                // Portal can only land on enemy portal
                if (isPortal) {
                    const targetIsPortal = targetPiece.type === 'portalCircle' || targetPiece.type === 'portalSquare';
                    if (!targetIsPortal) {
                        continue;
                    }
                } else {
                    // Non-portal cannot land on portal
                    const targetIsPortal = targetPiece.type === 'portalCircle' || targetPiece.type === 'portalSquare';
                    if (targetIsPortal) {
                        continue;
                    }
                }
            }
            
            targets.push(targetCoordStr);
        }
        
        return targets;
    }

    // Get all launchable pieces
    getLaunchablePieces() {
        return this.launchOptions.map(option => option.pieceCoord);
    }

    // Select a piece to launch
    selectPieceToLaunch(pieceCoordStr) {
        for (const option of this.launchOptions) {
            if (option.pieceCoord === pieceCoordStr) {
                this.selectedPiece = pieceCoordStr;
                this.selectedTargets = option.targets;
                return true;
            }
        }
        return false;
    }

    // Execute launch and return eliminated pieces data
executeLaunch(targetCoordStr, attackSystem) {
    if (!this.selectedPiece || !this.selectedTargets.includes(targetCoordStr)) {
        return {
            success: false,
            message: 'Invalid launch target.'
        };
    }
    
    const launchedPiece = this.gameState.getPiece(this.selectedPiece);
    const targetPiece = this.gameState.getPiece(targetCoordStr);
    
    // Track landing elimination (piece at destination)
    let landingElimination = null;
    if (targetPiece) {
        const isEnemy = !this.playerManager.canMovePiece(targetPiece.type);
        if (isEnemy) {
            // Store full piece data before removal
            landingElimination = {
                type: targetPiece.type,
                coord: targetCoordStr,
                piece: { ...targetPiece }
            };
            this.gameState.removePiece(targetCoordStr);
        }
    }
    
    // Move the piece
    this.gameState.movePiece(this.selectedPiece, targetCoordStr);
    
    // Execute attacks from new position and get attacked pieces
    const attackedPieces = attackSystem.executeAttackAndReturnEliminated(targetCoordStr);
    
    const pieceName = launchedPiece.name;
    this.reset();
    
    return {
        success: true,
        message: `Launched ${pieceName} to ${targetCoordStr}!`,
        moveMade: true,
        launchedPieceCoord: targetCoordStr,
        landingElimination: landingElimination,  // Piece landed on (if any)
        attackedPieces: attackedPieces           // Pieces eliminated by attack
    };
}

    // Activate launch mode
    activate() {
        if (this.launchOptions.length === 0) {
            return false;
        }
        this.isActive = true;
        return true;
    }

    // Deactivate launch mode
    deactivate() {
        this.isActive = false;
        this.selectedPiece = null;
        this.selectedTargets = [];
    }

    // Check if launch mode is active
    isLaunchActive() {
        return this.isActive;
    }

    // Check if in piece selection phase
    isPieceSelectionPhase() {
        return this.isActive && !this.selectedPiece;
    }

    // Check if in target selection phase
    isTargetSelectionPhase() {
        return this.isActive && this.selectedPiece !== null;
    }

    // Reset launch state
    reset() {
        this.launchOptions = [];
        this.isActive = false;
        this.selectedPiece = null;
        this.selectedTargets = [];
    }

    // Check if launch is available
    isAvailable() {
        return this.launchOptions.length > 0;
    }
}
