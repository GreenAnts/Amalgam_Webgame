// systems/AmberSapSystem.js - Handles Amber Sap ability
import { BoardUtils } from '../core/BoardUtils.js';

export class AmberSapSystem {
    constructor(gameState, playerManager) {
        this.gameState = gameState;
        this.playerManager = playerManager;
        this.boardUtils = new BoardUtils();
        
        this.sapTargets = []; // Array of {amber1, amber2, amplified, targets[], mainLine[], parallelLines[]}
        this.isActive = false;
    }

    // Check if sap ability is available
    checkSap(movedPieceCoord = null) {
        this.sapTargets = [];
        
        // Only check sap if Amber, Amalgam, or Void moved
        if (movedPieceCoord) {
            const movedPiece = this.gameState.getPiece(movedPieceCoord);
            if (movedPiece) {
                const isAmber = movedPiece.type === 'amberCircle' || movedPiece.type === 'amberSquare';
                const isAmalgam = movedPiece.type === 'amalgamCircle' || movedPiece.type === 'amalgamSquare';
                const isVoid = movedPiece.type === 'voidCircle' || movedPiece.type === 'voidSquare';
                
                if (!isAmber && !isAmalgam && !isVoid) {
                    return false;
                }
            }
        }
        
        const currentPlayer = this.playerManager.getCurrentPlayer();
        const ambers = this.collectAmberPieces(currentPlayer);
        
        // Check all pairs of Amber/Amalgam pieces
        for (let i = 0; i < ambers.length; i++) {
            for (let j = i + 1; j < ambers.length; j++) {
                const amber1 = ambers[i];
                const amber2 = ambers[j];
                
                if (this.isSapRelevant(movedPieceCoord, amber1, amber2)) {
                    const sapData = this.calculateSapTargets(amber1, amber2);
                    if (sapData && sapData.targets.length > 0) {
                        this.sapTargets.push(sapData);
                    }
                }
            }
        }
        
        return this.sapTargets.length > 0;
    }

    // Collect all Amber and Amalgam pieces for current player
    collectAmberPieces(currentPlayer) {
        const ambers = [];
        const amberTypes = currentPlayer.pieceType.includes('amberCircle') 
            ? ['amberCircle', 'amalgamCircle']
            : ['amberSquare', 'amalgamSquare'];
        
        for (const coordStr in this.gameState.pieces) {
            const piece = this.gameState.pieces[coordStr];
            if (amberTypes.includes(piece.type)) {
                ambers.push(coordStr);
            }
        }
        
        return ambers;
    }

    // Check if this sap formation is relevant to the moved piece
    isSapRelevant(movedPieceCoord, amber1Str, amber2Str) {
        if (!movedPieceCoord) {
            return true;
        }
        
        // If moved piece is one of the ambers
        if (movedPieceCoord === amber1Str || movedPieceCoord === amber2Str) {
            return true;
        }
        
        // If moved piece is a Void, check if it's on the line between ambers
        const movedPiece = this.gameState.getPiece(movedPieceCoord);
        if (movedPiece && (movedPiece.type === 'voidCircle' || movedPiece.type === 'voidSquare')) {
            const amber1 = this.boardUtils.stringToCoord(amber1Str);
            const amber2 = this.boardUtils.stringToCoord(amber2Str);
            const linePoints = this.getPointsOnLine(amber1.x, amber1.y, amber2.x, amber2.y);
            
            return linePoints.some(point => 
                this.boardUtils.coordToString(point.x, point.y) === movedPieceCoord
            );
        }
        
        return false;
    }

    // Calculate sap targets between two ambers
    calculateSapTargets(amber1Str, amber2Str) {
        const amber1 = this.boardUtils.stringToCoord(amber1Str);
        const amber2 = this.boardUtils.stringToCoord(amber2Str);
        
        // Check if aligned (horizontal, vertical, or diagonal)
        if (!this.isAligned(amber1, amber2)) {
            return null;
        }
        
        // Get the line between the two ambers
        const mainLine = this.getPointsOnLine(amber1.x, amber1.y, amber2.x, amber2.y);
        const targets = [];
        const tempPortals = [];
        let amplified = false;
        
        // Check main line for targets and amplification
        for (const point of mainLine) {
            const coordStr = this.boardUtils.coordToString(point.x, point.y);
            
            if (!this.boardUtils.isOnBoard(coordStr)) {
                continue;
            }
            
            const piece = this.gameState.getPiece(coordStr);
            if (!piece) {
                continue;
            }
            
            // Check if enemy piece
            const isEnemy = !this.playerManager.canMovePiece(piece.type);
            
            if (isEnemy) {
                const isPortal = piece.type === 'portalCircle' || piece.type === 'portalSquare';
                if (isPortal) {
                    tempPortals.push(coordStr);
                } else {
                    targets.push(coordStr);
                }
            } else {
                // Check if friendly Void (amplification)
                const isVoid = piece.type === 'voidCircle' || piece.type === 'voidSquare';
                if (isVoid) {
                    amplified = true;
                }
            }
        }
        
        let parallelLines = [];
        
        // If amplified, add portals and check parallel lines
        if (amplified) {
            targets.push(...tempPortals);
            
            const offset = 1;
            const parallelData = this.getParallelLines(amber1.x, amber1.y, amber2.x, amber2.y, offset);
            parallelLines = [parallelData.parallel1, parallelData.parallel2];
            
            // Check parallel lines for any enemy pieces
            for (const line of parallelLines) {
                for (const point of line) {
                    const coordStr = this.boardUtils.coordToString(point.x, point.y);
                    
                    if (!this.boardUtils.isOnBoard(coordStr)) {
                        continue;
                    }
                    
                    const piece = this.gameState.getPiece(coordStr);
                    if (!piece) {
                        continue;
                    }
                    
                    const isEnemy = !this.playerManager.canMovePiece(piece.type);
                    if (isEnemy) {
                        targets.push(coordStr);
                    }
                }
            }
        }
        
        if (targets.length === 0) {
            return null;
        }
                
        const sapData = {
            amber1: amber1Str,
            amber2: amber2Str,
            amplified: amplified,
            targets: targets,
            mainLine: mainLine.map(p => this.boardUtils.coordToString(p.x, p.y)),
            parallelLines: parallelLines.map(line => 
                line.map(p => this.boardUtils.coordToString(p.x, p.y))
            )
        };

        sapData.boundingBox = this.calculateBoundingBox(sapData);

        return sapData;
    }

    // Calculate bounding box for the sap area
    calculateBoundingBox(sapData) {
        const amber1 = this.boardUtils.stringToCoord(sapData.amber1);
        const amber2 = this.boardUtils.stringToCoord(sapData.amber2);
        
        // Determine if diagonal, horizontal, or vertical
        const isDiagonal = amber1.x !== amber2.x && amber1.y !== amber2.y;
        
        if (isDiagonal) {
            // For diagonal lines, create a rotated rectangle
            const centerX = (amber1.x + amber2.x) / 2;
            const centerY = (amber1.y + amber2.y) / 2;
            
            const dx = amber2.x - amber1.x;
            const dy = amber2.y - amber1.y;
            const rotation = Math.atan2(-dy, dx); // Negative dy because canvas y is inverted
            
            // Add padding to both dimensions for easier clicking
            // Length: amber-to-amber distance, but we add padding since we exclude the amber positions
            const length = Math.sqrt(dx * dx + dy * dy);
            // Width: add extra padding for unamplified to make clicks more forgiving
            const width = sapData.amplified ? 3 : 1.5; // 1.5 cells wide for better click detection
            
            return {
                isDiagonal: true,
                centerX: centerX,
                centerY: centerY,
                width: width,
                length: length,
                rotation: rotation
            };
        } else {
            // For horizontal/vertical lines, use axis-aligned box
            const allCoords = [...sapData.mainLine];
            
            if (sapData.amplified) {
                for (const line of sapData.parallelLines) {
                    allCoords.push(...line);
                }
            }
            
            if (allCoords.length === 0) return null;
            
            let minX = Infinity, maxX = -Infinity;
            let minY = Infinity, maxY = -Infinity;
            
            for (const coordStr of allCoords) {
                const coord = this.boardUtils.stringToCoord(coordStr);
                minX = Math.min(minX, coord.x);
                maxX = Math.max(maxX, coord.x);
                minY = Math.min(minY, coord.y);
                maxY = Math.max(maxY, coord.y);
            }
            
            return { 
                isDiagonal: false,
                minX, 
                maxX, 
                minY, 
                maxY 
            };
        }
    }

    // Check if two points are aligned
    isAligned(coord1, coord2) {
        return coord1.x === coord2.x || 
               coord1.y === coord2.y || 
               Math.abs(coord1.x - coord2.x) === Math.abs(coord1.y - coord2.y);
    }

    // Get points on line between two coordinates (excluding endpoints)
    getPointsOnLine(x1, y1, x2, y2) {
        const points = [];
        
        // Vertical line
        if (x1 === x2) {
            const step = y2 > y1 ? 1 : -1;
            for (let y = y1 + step; y !== y2; y += step) {
                points.push({ x: x1, y: y });
            }
        }
        // Horizontal line
        else if (y1 === y2) {
            const step = x2 > x1 ? 1 : -1;
            for (let x = x1 + step; x !== x2; x += step) {
                points.push({ x: x, y: y1 });
            }
        }
        // Diagonal line
        else if (Math.abs(x2 - x1) === Math.abs(y2 - y1)) {
            const xStep = x2 > x1 ? 1 : -1;
            const yStep = y2 > y1 ? 1 : -1;
            const distance = Math.abs(x2 - x1);
            for (let i = 1; i < distance; i++) {
                points.push({ x: x1 + i * xStep, y: y1 + i * yStep });
            }
        }
        
        return points;
    }

    // Get parallel lines offset by a given amount
    getParallelLines(x1, y1, x2, y2, offset) {
        const mainLine = this.getPointsOnLine(x1, y1, x2, y2);
        
        const isVertical = x1 === x2;
        const isHorizontal = y1 === y2;
        const isDiagonal = Math.abs(x2 - x1) === Math.abs(y2 - y1);
        
        const parallel1 = [];
        const parallel2 = [];
        
        if (isVertical || isHorizontal) {
            for (const point of mainLine) {
                if (isVertical) {
                    parallel1.push({ x: point.x + offset, y: point.y });
                    parallel2.push({ x: point.x - offset, y: point.y });
                } else if (isHorizontal) {
                    parallel1.push({ x: point.x, y: point.y + offset });
                    parallel2.push({ x: point.x, y: point.y - offset });
                }
            }
        } else if (isDiagonal) {
            const directionX = x2 - x1;
            const directionY = y2 - y1;
            const perpX = -directionY / Math.abs(directionX);
            const perpY = directionX / Math.abs(directionX);
            
            for (const point of mainLine) {
                const p1 = { 
                    x: point.x + perpX * offset, 
                    y: point.y + perpY * offset 
                };
                const p2 = { 
                    x: point.x - perpX * offset, 
                    y: point.y - perpY * offset 
                };
                
                parallel1.push(p1);
                parallel2.push(p2);
                
                // Add extra points for diagonal pattern
                if (Math.abs(p1.x - point.x) === 1) {
                    parallel1.push({ x: p1.x, y: point.y });
                    parallel1.push({ x: point.x, y: p1.y });
                }
                
                if (Math.abs(p2.x - point.x) === 1) {
                    parallel2.push({ x: p2.x, y: point.y });
                    parallel2.push({ x: point.x, y: p2.y });
                }
            }
        }
        
        return { parallel1, parallel2 };
    }

    // Get all valid targets (flattened from all sap lines)
    getAllTargets() {
        const allTargets = [];
        for (const sapData of this.sapTargets) {
            allTargets.push(...sapData.targets);
        }
        return allTargets;
    }

    // Get all sap data (for rendering indicators)
    getAllSapData() {
        return this.sapTargets;
    }
    
    // Check if a coordinate is within any sap bounding box
    isCoordInSap(coordStr) {
        const coord = this.boardUtils.stringToCoord(coordStr);
        
        for (const sapData of this.sapTargets) {
            const bb = sapData.boundingBox;
            if (!bb) continue;
            
            if (bb.isDiagonal) {
                // For diagonal lines, check if point is within rotated rectangle
                const dx = coord.x - bb.centerX;
                const dy = bb.centerY - coord.y;  // Inverted to match canvas coordinate space
                
                // Rotate point by negative rotation angle
                const cos = Math.cos(-bb.rotation);
                const sin = Math.sin(-bb.rotation);
                const localX = dx * cos - dy * sin;
                const localY = dx * sin + dy * cos;
                
                // Check if within rectangle bounds
                const halfLength = bb.length / 2;
                const halfWidth = bb.width / 2;
                
                if (Math.abs(localX) <= halfLength && Math.abs(localY) <= halfWidth) {
                    return sapData;
                }
            } else {
                // For axis-aligned boxes, simple bounds check
                if (coord.x >= bb.minX && coord.x <= bb.maxX &&
                    coord.y >= bb.minY && coord.y <= bb.maxY) {
                    return sapData;
                }
            }
        }
        
        return null;
    }

    // Execute sap ability
    executeSap(clickedCoordStr) {
        const sapData = this.isCoordInSap(clickedCoordStr);
        
        if (sapData) {
            // Destroy all targets in this sap line
            for (const target of sapData.targets) {
                if (this.gameState.getPiece(target)) {
                    this.gameState.removePiece(target);
                }
            }
            
            this.reset();
            return {
                success: true,
                message: `Sap destroyed ${sapData.targets.length} pieces!`,
                moveMade: true
            };
        }
        
        return {
            success: false,
            message: 'Click within the sap line area to activate.'
        };
    }

    // Activate sap mode
    activate() {
        if (this.sapTargets.length === 0) {
            return false;
        }
        this.isActive = true;
        return true;
    }

    // Deactivate sap mode
    deactivate() {
        this.isActive = false;
    }

    // Check if sap mode is active
    isSapActive() {
        return this.isActive;
    }

    // Reset sap state
    reset() {
        this.sapTargets = [];
        this.isActive = false;
    }

    // Check if sap is available
    isAvailable() {
        return this.sapTargets.length > 0;
    }
}
