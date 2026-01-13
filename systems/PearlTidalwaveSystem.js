// systems/PearlTidalwaveSystem.js - Handles Pearl Tidal Wave ability
import { BoardUtils } from '../core/BoardUtils.js';

export class PearlTidalwaveSystem {
    constructor(gameState, playerManager) {
        this.gameState = gameState;
        this.playerManager = playerManager;
        this.boardUtils = new BoardUtils();
        
        this.tidalwaveTargets = []; // Array of {pearl1, pearl2, direction, amplified, targets[], boundingBox, coverageArea}
        this.isActive = false;
        
        // 8 directions
        this.directions = [
            {x: 1, y: 0}, {x: 1, y: 1}, {x: 0, y: 1}, {x: -1, y: 1},
            {x: -1, y: 0}, {x: -1, y: -1}, {x: 0, y: -1}, {x: 1, y: -1}
        ];
    }

    // Check if tidal wave ability is available
    checkTidalwave(movedPieceCoord = null) {
        this.tidalwaveTargets = [];
        
        // Only check tidal wave if Pearl, Amalgam, or Void moved
        if (movedPieceCoord) {
            const movedPiece = this.gameState.getPiece(movedPieceCoord);
            if (movedPiece) {
                const isPearl = movedPiece.type === 'pearlCircle' || movedPiece.type === 'pearlSquare';
                const isAmalgam = movedPiece.type === 'amalgamCircle' || movedPiece.type === 'amalgamSquare';
                const isVoid = movedPiece.type === 'voidCircle' || movedPiece.type === 'voidSquare';
                
                if (!isPearl && !isAmalgam && !isVoid) {
                    return false;
                }
            }
        }
        
        const currentPlayer = this.playerManager.getCurrentPlayer();
        const pearls = this.collectPearlPieces(currentPlayer);
        
        // Check all pairs of Pearl/Amalgam pieces
        for (let i = 0; i < pearls.length; i++) {
            for (let j = i + 1; j < pearls.length; j++) {
                const pearl1 = pearls[i];
                const pearl2 = pearls[j];
                
                if (this.isTidalwaveRelevant(movedPieceCoord, pearl1, pearl2)) {
                    const targets = this.calculateTidalwaveTargets(pearl1, pearl2, movedPieceCoord);
                    if (targets.length > 0) {
                        this.tidalwaveTargets.push(...targets);
                    }
                }
            }
        }
        
        return this.tidalwaveTargets.length > 0;
    }

    // Collect all Pearl and Amalgam pieces for current player
    collectPearlPieces(currentPlayer) {
        const pearls = [];
        const pearlTypes = currentPlayer.pieceType.includes('pearlCircle') 
            ? ['pearlCircle', 'amalgamCircle']
            : ['pearlSquare', 'amalgamSquare'];
        
        for (const coordStr in this.gameState.pieces) {
            const piece = this.gameState.pieces[coordStr];
            if (pearlTypes.includes(piece.type)) {
                pearls.push(coordStr);
            }
        }
        
        return pearls;
    }

    // Check if this tidal wave formation is relevant to the moved piece
    isTidalwaveRelevant(movedPieceCoord, pearl1Str, pearl2Str) {
        if (!movedPieceCoord) {
            return true;
        }
        
        if (movedPieceCoord === pearl1Str || movedPieceCoord === pearl2Str) {
            return true;
        }
        
        const movedPiece = this.gameState.getPiece(movedPieceCoord);
        if (movedPiece && (movedPiece.type === 'voidCircle' || movedPiece.type === 'voidSquare')) {
            if (!this.boardUtils.isAdjacent(pearl1Str, pearl2Str)) {
                return false;
            }
            
            const pearl1 = this.boardUtils.stringToCoord(pearl1Str);
            const pearl2 = this.boardUtils.stringToCoord(pearl2Str);
            
            const direction = {
                x: pearl2.x - pearl1.x,
                y: pearl2.y - pearl1.y
            };
            
            if (direction.x !== 0 && direction.y !== 0 && 
                Math.abs(direction.x) !== Math.abs(direction.y)) {
                return false;
            }
            
            const amp1X = pearl2.x + direction.x;
            const amp1Y = pearl2.y + direction.y;
            const amp1Str = this.boardUtils.coordToString(amp1X, amp1Y);
            
            const amp2X = pearl1.x - direction.x;
            const amp2Y = pearl1.y - direction.y;
            const amp2Str = this.boardUtils.coordToString(amp2X, amp2Y);
            
            if (movedPieceCoord === amp1Str || movedPieceCoord === amp2Str) {
                return true;
            }
        }
        
        return false;
    }

    // Calculate tidal wave targets in both directions
    calculateTidalwaveTargets(pearl1Str, pearl2Str, movedPieceCoord) {
        const targets = [];
        
        if (!this.boardUtils.isAdjacent(pearl1Str, pearl2Str)) {
            return targets;
        }
        
        const pearl1 = this.boardUtils.stringToCoord(pearl1Str);
        const pearl2 = this.boardUtils.stringToCoord(pearl2Str);
        
        const direction = {
            x: pearl2.x - pearl1.x,
            y: pearl2.y - pearl1.y
        };
        
        if (direction.x !== 0 && direction.y !== 0 && 
            Math.abs(direction.x) !== Math.abs(direction.y)) {
            return targets;
        }
        
        const dir1Amplified = this.checkAmplification(pearl2Str, direction);
        const dir2Amplified = this.checkAmplification(pearl1Str, { x: -direction.x, y: -direction.y });
        
        const movedPiece = movedPieceCoord ? this.gameState.getPiece(movedPieceCoord) : null;
        const canFireDir1 = !movedPieceCoord || 
                           !movedPiece ||
                           (movedPiece.type !== 'voidCircle' && movedPiece.type !== 'voidSquare') ||
                           (movedPieceCoord === this.boardUtils.coordToString(pearl2.x + direction.x, pearl2.y + direction.y));
        
        if (canFireDir1) {
            const dir1Targets = this.getTidalwaveTargets(pearl2Str, direction, dir1Amplified);
            if (dir1Targets.length > 0) {
                const boundingBox = this.calculateBoundingBox(dir1Targets);
                const coverageArea = this.calculateCoverageArea(pearl2Str, direction, dir1Amplified);
                targets.push({
                    pearl1: pearl1Str,
                    pearl2: pearl2Str,
                    direction: direction,
                    amplified: dir1Amplified,
                    targets: dir1Targets,
                    boundingBox: boundingBox,
                    coverageArea: coverageArea
                });
            }
        }
        
        const reverseDir = { x: -direction.x, y: -direction.y };
        const canFireDir2 = !movedPieceCoord || 
                           !movedPiece ||
                           (movedPiece.type !== 'voidCircle' && movedPiece.type !== 'voidSquare') ||
                           (movedPieceCoord === this.boardUtils.coordToString(pearl1.x + reverseDir.x, pearl1.y + reverseDir.y));
        
        if (canFireDir2) {
            const dir2Targets = this.getTidalwaveTargets(pearl1Str, reverseDir, dir2Amplified);
            if (dir2Targets.length > 0) {
                const boundingBox = this.calculateBoundingBox(dir2Targets);
                const coverageArea = this.calculateCoverageArea(pearl1Str, reverseDir, dir2Amplified);
                targets.push({
                    pearl1: pearl1Str,
                    pearl2: pearl2Str,
                    direction: reverseDir,
                    amplified: dir2Amplified,
                    targets: dir2Targets,
                    boundingBox: boundingBox,
                    coverageArea: coverageArea
                });
            }
        }
        
        return targets;
    }

    // Check if amplified by Void
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

    // Get tidal wave targets in a specific direction (AREA OF EFFECT)
    getTidalwaveTargets(startCoordStr, direction, amplified) {
        const targets = [];
        const start = this.boardUtils.stringToCoord(startCoordStr);
        
        // Normalize direction
        const normDir = {
            x: direction.x === 0 ? 0 : (direction.x > 0 ? 1 : -1),
            y: direction.y === 0 ? 0 : (direction.y > 0 ? 1 : -1)
        };
        
        // Determine if diagonal
        const isDiagonal = normDir.x !== 0 && normDir.y !== 0;
        
        // Calculate perpendicular direction (right relative to forward)
        const dirRight = {
            x: -normDir.y,
            y: normDir.x
        };
        
        // Forward and sideways distances
        const forwardDist = amplified ? 5 : 4;
        const sidewaysDist = amplified ? 3 : 2;
        
        const seenPositions = new Set();
        
        // Loop through forward distances
        for (let i = 1; i <= forwardDist; i++) {
            // Calculate leftmost position in this row
            const leftmostX = start.x + i * normDir.x - sidewaysDist * dirRight.x;
            const leftmostY = start.y + i * normDir.y - sidewaysDist * dirRight.y;
            
            // Loop through sideways positions
            for (let j = 0; j <= sidewaysDist * 2; j++) {
                const coordX = leftmostX + j * dirRight.x;
                const coordY = leftmostY + j * dirRight.y;
                const coordStr = this.boardUtils.coordToString(coordX, coordY);
                
                if (this.validateTarget(startCoordStr, coordStr, amplified) && !seenPositions.has(coordStr)) {
                    seenPositions.add(coordStr);
                    targets.push(coordStr);
                }
            }
            
            // Handle intermediate cells for diagonals
            if (isDiagonal && i < forwardDist) {
                const subLeftmostX = leftmostX + (normDir.x + dirRight.x) / 2;
                const subLeftmostY = leftmostY + (normDir.y + dirRight.y) / 2;
                
                for (let j = 0; j < sidewaysDist * 2; j++) {
                    const coordX = subLeftmostX + j * dirRight.x;
                    const coordY = subLeftmostY + j * dirRight.y;
                    const coordStr = this.boardUtils.coordToString(coordX, coordY);
                    
                    if (this.validateTarget(startCoordStr, coordStr, amplified) && !seenPositions.has(coordStr)) {
                        seenPositions.add(coordStr);
                        targets.push(coordStr);
                    }
                }
            }
        }
        
        return targets;
    }

    // Validate target position
    validateTarget(startCoordStr, targetCoordStr, amplified) {
        // Must be on board
        if (!this.boardUtils.isOnBoard(targetCoordStr)) {
            return false;
        }
        
        const targetPiece = this.gameState.getPiece(targetCoordStr);
        
        // Must have a piece
        if (!targetPiece) {
            return false;
        }
        
        // If not amplified, skip portals
        if (!amplified) {
            const isPortal = targetPiece.type === 'portalCircle' || targetPiece.type === 'portalSquare';
            if (isPortal) {
                return false;
            }
        }
        
        // Must be enemy piece
        const isEnemy = !this.playerManager.canMovePiece(targetPiece.type);
        return isEnemy;
    }

    // Calculate bounding box for area indicator (based on actual targets)
    calculateBoundingBox(targets) {
        if (targets.length === 0) return null;
        
        let minX = Infinity, maxX = -Infinity;
        let minY = Infinity, maxY = -Infinity;
        
        for (const coordStr of targets) {
            const coord = this.boardUtils.stringToCoord(coordStr);
            minX = Math.min(minX, coord.x);
            maxX = Math.max(maxX, coord.x);
            minY = Math.min(minY, coord.y);
            maxY = Math.max(maxY, coord.y);
        }
        
        return { minX, maxX, minY, maxY };
    }

    // Calculate the full coverage area based on pearl positions and amplification
    calculateCoverageArea(startCoordStr, direction, amplified) {
        const start = this.boardUtils.stringToCoord(startCoordStr);
        
        // Normalize direction
        const normDir = {
            x: direction.x === 0 ? 0 : (direction.x > 0 ? 1 : -1),
            y: direction.y === 0 ? 0 : (direction.y > 0 ? 1 : -1)
        };
        
        // Determine if diagonal
        const isDiagonal = normDir.x !== 0 && normDir.y !== 0;
        
        // Calculate perpendicular direction
        const dirRight = {
            x: -normDir.y,
            y: normDir.x
        };
        
        // Forward and sideways distances
        const forwardDist = amplified ? 5 : 4;
        const sidewaysDist = amplified ? 3 : 2;
        
        if (isDiagonal) {
            const centerOffset = (1 + forwardDist) / 2;
            const centerX = start.x + centerOffset * normDir.x;
            const centerY = start.y + centerOffset * normDir.y;
            
            const rotation = Math.atan2(-normDir.y, normDir.x);
            
            // Fixed sideways calculation to use sqrt(2) scaling for diagonal consistency
            const width = (sidewaysDist * 2 + (amplified ? 0.5 : 1));
            const height = ((forwardDist + 0.5) + (amplified ? 1 : 0)) * Math.sqrt(2); 
            
            return {
                isDiagonal: true,
                centerX: centerX,
                centerY: centerY,
                width: width,
                height: height,
                rotation: rotation
            };
        } else {
            // For horizontal/vertical waves, calculate axis-aligned rectangle
            let minX, maxX, minY, maxY;
            
            if (normDir.x !== 0 && normDir.y === 0) {
                // Horizontal wave - extends from distance 1 to forwardDist
                if (normDir.x > 0) {
                    minX = start.x + 1;
                    maxX = start.x + forwardDist;
                } else {
                    minX = start.x - forwardDist;
                    maxX = start.x - 1;
                }
                minY = start.y - sidewaysDist;
                maxY = start.y + sidewaysDist;
            } else if (normDir.x === 0 && normDir.y !== 0) {
                // Vertical wave - extends from distance 1 to forwardDist
                minX = start.x - sidewaysDist;
                maxX = start.x + sidewaysDist;
                if (normDir.y > 0) {
                    minY = start.y + 1;
                    maxY = start.y + forwardDist;
                } else {
                    minY = start.y - forwardDist;
                    maxY = start.y - 1;
                }
            }
            
            return {
                isDiagonal: false,
                minX: minX,
                maxX: maxX,
                minY: minY,
                maxY: maxY
            };
        }
    }

    // Get all tidal wave data (for rendering indicators)
    getAllTidalwaveData() {
        return this.tidalwaveTargets;
    }

    // Get all valid targets (flattened)
    getAllTargets() {
        const allTargets = [];
        for (const tidalwaveData of this.tidalwaveTargets) {
            allTargets.push(...tidalwaveData.targets);
        }
        return allTargets;
    }

    // Check if a coordinate is within any tidal wave coverage area
    isCoordInTidalwave(coordStr) {
        const coord = this.boardUtils.stringToCoord(coordStr);
        
        for (const tidalwaveData of this.tidalwaveTargets) {
            const area = tidalwaveData.coverageArea;
            if (!area) continue;
            
            if (area.isDiagonal) {
                // Transform the click point to the rectangle's local space
                const dx = coord.x - area.centerX;
                const dy = coord.y - area.centerY;
                
                // Rotate point by negative rotation angle to align with the box
                const cos = Math.cos(-area.rotation);
                const sin = Math.sin(-area.rotation);
                const localX = dx * cos - dy * sin;
                const localY = dx * sin + dy * cos;
                
                // ROOT CAUSE FIX: 
                // In your calculateCoverageArea, 'width' is the sideways thickness 
                // and 'height' is the forward length. 
                // localX is the forward axis, localY is the sideways axis.
                const halfThickness = area.width / 2;
                const halfLength = area.height / 2;

                if (Math.abs(localX) <= (halfLength) && Math.abs(localY) <= (halfThickness)) {
                    return tidalwaveData;
                }
            } else {
                // For axis-aligned waves, simple bounds check
                if (coord.x >= (area.minX) && coord.x <= (area.maxX) &&
                    coord.y >= (area.minY) && coord.y <= (area.maxY)) {
                    return tidalwaveData;
                }
            }
        }
        
        return null;
    }

    // Execute tidal wave attack
    executeTidalwave(clickedCoordStr) {
        const tidalwaveData = this.isCoordInTidalwave(clickedCoordStr);
        
        if (tidalwaveData) {
            // Destroy all targets in this tidal wave
            for (const targetCoordStr of tidalwaveData.targets) {
                if (this.gameState.getPiece(targetCoordStr)) {
                    this.gameState.removePiece(targetCoordStr);
                }
            }
            
            this.reset();
            return {
                success: true,
                message: `Tidal wave destroyed ${tidalwaveData.targets.length} pieces!`,
                moveMade: true
            };
        }
        
        return {
            success: false,
            message: 'Click within the tidal wave area to activate.'
        };
    }

    // Activate tidal wave mode
    activate() {
        if (this.tidalwaveTargets.length === 0) {
            return false;
        }
        this.isActive = true;
        return true;
    }

    // Deactivate tidal wave mode
    deactivate() {
        this.isActive = false;
    }

    // Check if tidal wave mode is active
    isTidalwaveActive() {
        return this.isActive;
    }

    // Reset tidal wave state
    reset() {
        this.tidalwaveTargets = [];
        this.isActive = false;
    }

    // Check if tidal wave is available
    isAvailable() {
        return this.tidalwaveTargets.length > 0;
    }
}
