// movement/MovementSystem.js - Movement validation logic
import { BoardUtils } from '../core/BoardUtils.js';

export class MovementSystem {
    constructor(gameState) {
        this.gameState = gameState;
        this.boardUtils = new BoardUtils();
        // 8 adjacent directions (N, NE, E, SE, S, SW, W, NW)
        this.directions = [
            {x: 1, y: 0}, {x: 1, y: 1}, {x: 0, y: 1}, {x: -1, y: 1},
            {x: -1, y: 0}, {x: -1, y: -1}, {x: 0, y: -1}, {x: 1, y: -1}
        ];
    }

    // Get all valid moves for a given piece at startCoordStr
    getValidMoves(startCoordStr) {
        const validMoves = [];
        const piece = this.gameState.getPiece(startCoordStr);

        if (!piece) return validMoves;

        const startCoord = this.boardUtils.stringToCoord(startCoordStr);
        const candidateMoves = new Set();

        // All pieces can move to adjacent locations
        for (let dx = -1; dx <= 1; dx++) {
            for (let dy = -1; dy <= 1; dy++) {
                if (dx === 0 && dy === 0) continue;

                const targetX = startCoord.x + dx;
                const targetY = startCoord.y + dy;
                const targetCoordStr = this.boardUtils.coordToString(targetX, targetY);
                
                candidateMoves.add(targetCoordStr);
            }
        }

        // Portal pieces: add golden line movement
        if (this.isPortalPiece(piece)) {
            const connections = this.gameState.goldenLinesDict[startCoordStr];
            if (connections) {
                for (const conn of connections) {
                    const connStr = this.boardUtils.coordToString(conn.x, conn.y);
                    if (this.boardUtils.isGoldenCoordinate(connStr)) {
                        candidateMoves.add(connStr);
                    }
                }
            }
        }

        // Add phasing moves
        const phaseMoves = this.getPhaseMovesForPiece(startCoordStr, piece);
        phaseMoves.forEach(move => candidateMoves.add(move));

        // Filter candidate moves based on game rules and emptiness
        for (const endCoordStr of Array.from(candidateMoves)) {
            // Must be on the board
            if (!this.boardUtils.isOnBoard(endCoordStr)) {
                continue;
            }
            
            // Must be empty
            if (!this.gameState.isLocationEmpty(endCoordStr)) {
                continue;
            }

            const isAdjacentMove = this.boardUtils.isAdjacent(startCoordStr, endCoordStr);
            
            // Non-portal pieces can move to ANY adjacent, empty space.
            if (!this.isPortalPiece(piece)) {
                if (isAdjacentMove) {
                    validMoves.push(this.boardUtils.stringToCoord(endCoordStr));
                }
            } else {
                // Portal pieces: can move along golden lines OR to adjacent golden intersections
                const isTargetGolden = this.boardUtils.isGoldenCoordinate(endCoordStr);
                const canPortalMoveByLine = this.boardUtils.isValidMoveAlongGoldenLine(startCoordStr, endCoordStr);
                if (canPortalMoveByLine || (isAdjacentMove && isTargetGolden)) {
                    validMoves.push(this.boardUtils.stringToCoord(endCoordStr));
                }
            }
        }

        // Add phasing moves (already validated in phase methods)
        const phaseMoves2 = this.getPhaseMovesForPiece(startCoordStr, piece);
        phaseMoves2.forEach(moveCoordStr => {
            validMoves.push(this.boardUtils.stringToCoord(moveCoordStr));
        });

        // Add nexus moves (already validated in nexus method)
        const nexusMoves = this.getNexusMoves(startCoordStr, piece);
        nexusMoves.forEach(moveCoordStr => {
            validMoves.push(this.boardUtils.stringToCoord(moveCoordStr));
        });

        return validMoves;
    }

    // Calculate phase moves for a piece
    getPhaseMovesForPiece(startCoordStr, piece) {
        const isPortal = this.isPortalPiece(piece);
        
        let phaseMoves;
        if (isPortal) {
            phaseMoves = this.getPortalPhaseMoves(startCoordStr);
        } else {
            phaseMoves = this.getNonPortalPhaseMoves(startCoordStr);
        }
        
        return phaseMoves;
    }

    // Non-Portal pieces phase through Portal pieces
    getNonPortalPhaseMoves(startCoordStr) {
        const phaseMoves = [];
        const startCoord = this.boardUtils.stringToCoord(startCoordStr);

        for (const dir of this.directions) {
            let phaseFound = false;
            let currentX = startCoord.x;
            let currentY = startCoord.y;

            // Move through adjacent Portal pieces
            while (true) {
                const nextX = currentX + dir.x;
                const nextY = currentY + dir.y;
                const nextCoordStr = this.boardUtils.coordToString(nextX, nextY);
                const nextPiece = this.gameState.getPiece(nextCoordStr);

                // Stop if no piece or piece is not a Portal
                if (!nextPiece || !this.isPortalPiece(nextPiece)) {
                    break;
                }

                // Continue phasing through Portal
                currentX = nextX;
                currentY = nextY;
                phaseFound = true;
            }

            // If we phased through at least one Portal, check landing spot
            if (phaseFound) {
                const landingX = currentX + dir.x;
                const landingY = currentY + dir.y;
                const landingCoordStr = this.boardUtils.coordToString(landingX, landingY);

                // Valid if on board and empty
                if (this.boardUtils.isOnBoard(landingCoordStr) && 
                    this.gameState.isLocationEmpty(landingCoordStr)) {
                    phaseMoves.push(landingCoordStr);
                }
            }
        }

        return phaseMoves;
    }

    // Portal pieces phase through all pieces
    getPortalPhaseMoves(startCoordStr) {
        const phaseMoves = [];
        const startCoord = this.boardUtils.stringToCoord(startCoordStr);

        for (const dir of this.directions) {
            let phaseFound = false;
            let currentX = startCoord.x;
            let currentY = startCoord.y;

            // Move through any adjacent pieces
            while (true) {
                const nextX = currentX + dir.x;
                const nextY = currentY + dir.y;
                const nextCoordStr = this.boardUtils.coordToString(nextX, nextY);
                const nextPiece = this.gameState.getPiece(nextCoordStr);

                // Stop if no piece
                if (!nextPiece) {
                    break;
                }

                // Continue phasing through any piece
                currentX = nextX;
                currentY = nextY;
                phaseFound = true;
            }

            // If we phased through at least one piece, check landing spot
            if (phaseFound) {
                const landingX = currentX + dir.x;
                const landingY = currentY + dir.y;
                const landingCoordStr = this.boardUtils.coordToString(landingX, landingY);

                // Valid if on golden line and empty
                if (this.boardUtils.isGoldenCoordinate(landingCoordStr) && 
                    this.gameState.isLocationEmpty(landingCoordStr)) {
                    phaseMoves.push(landingCoordStr);
                }
            }
        }

        return phaseMoves;
    }

    // Get nexus moves for a piece (matches Godot nexus_movement exactly)
    getNexusMoves(startCoordStr, piece) {
        const availableMoves = [];
        const nexusPositions = this.findNexusFormations(startCoordStr);
              
        if (nexusPositions.length === 0) {
            return availableMoves;
        }

        const isPortal = this.isPortalPiece(piece);
        const seenMoves = new Set();

        // For each nexus piece, check all adjacent positions
        for (const nexusCoordStr of nexusPositions) {
            const nexusCoord = this.boardUtils.stringToCoord(nexusCoordStr);
            
            for (const dir of this.directions) {
                const moveX = nexusCoord.x + dir.x;
                const moveY = nexusCoord.y + dir.y;
                const moveCoordStr = this.boardUtils.coordToString(moveX, moveY);

                // Skip if is the starting position or already processed
                if (moveCoordStr === startCoordStr || seenMoves.has(moveCoordStr)) {
                    continue;
                }

                // Must be on board and empty
                if (!this.boardUtils.isOnBoard(moveCoordStr) || 
                    !this.gameState.isLocationEmpty(moveCoordStr)) {
                    continue;
                }

                // Non-portal pieces: any valid board position
                // Portal pieces: must be on golden line
                if (!isPortal) {
                    availableMoves.push(moveCoordStr);
                    seenMoves.add(moveCoordStr);
                } else if (isPortal && this.boardUtils.isGoldenCoordinate(moveCoordStr)) {
                    availableMoves.push(moveCoordStr);
                    seenMoves.add(moveCoordStr);
                }
            }
        }

        return availableMoves;
    }

    // Find all nexus formations adjacent to the starting piece
    // Matches Godot logic exactly
    findNexusFormations(startCoordStr) {
        const nexusPositions = [];
        const nexusSet = new Set();
        const startCoord = this.boardUtils.stringToCoord(startCoordStr);

        // Step 1: Check all adjacent positions for potential nexus pieces
        for (const dir1 of this.directions) {
            const firstX = startCoord.x + dir1.x;
            const firstY = startCoord.y + dir1.y;
            const firstCoordStr = this.boardUtils.coordToString(firstX, firstY);
            const firstPiece = this.gameState.getPiece(firstCoordStr);

            // Must be a nexus-capable piece (Pearl, Amber, or Amalgam)
            if (!firstPiece || !this.isNexusCapablePiece(firstPiece)) {
                continue;
            }

            const firstType = firstPiece.type; // Use actual type, not category

            // Step 2: Check positions adjacent to this piece for a second nexus piece
            for (const dir2 of this.directions) {
                const secondX = firstX + dir2.x;
                const secondY = firstY + dir2.y;
                const secondCoordStr = this.boardUtils.coordToString(secondX, secondY);

                // Cannot be the starting position
                if (secondCoordStr === startCoordStr) {
                    continue;
                }

                const secondPiece = this.gameState.getPiece(secondCoordStr);

                // Must be a nexus-capable piece
                if (!secondPiece || !this.isNexusCapablePiece(secondPiece)) {
                    continue;
                }

                const secondType = secondPiece.type; // Use actual type, not category

                // Must be different types to form a nexus
                // This means pearlCircle != pearlSquare, pearlCircle != amberCircle, etc.
                if (firstType !== secondType) {
                    // Valid nexus formation found - add both pieces
                    if (!nexusSet.has(firstCoordStr)) {
                        nexusSet.add(firstCoordStr);
                        nexusPositions.push(firstCoordStr);
                    }
                    if (!nexusSet.has(secondCoordStr)) {
                        nexusSet.add(secondCoordStr);
                        nexusPositions.push(secondCoordStr);
                    }
                }
            }
        }

        return nexusPositions;
    }

    // Check if piece can participate in nexus formations
    // Only Pearl, Amber, and Amalgam can form nexuses (not Ruby, Jade, Void, or Portal)
    isNexusCapablePiece(piece) {
        return this.isPearlPiece(piece) || 
               this.isAmberPiece(piece) || 
               this.isAmalgamPiece(piece);
    }

    // Get nexus piece type (Pearl, Amber, or Amalgam)
    getNexusPieceType(piece) {
        if (this.isPearlPiece(piece)) return 'pearl';
        if (this.isAmberPiece(piece)) return 'amber';
        if (this.isAmalgamPiece(piece)) return 'amalgam';
        return null;
    }

    // Helper: Check piece types
    isPearlPiece(piece) {
        return piece.type === 'pearlCircle' || piece.type === 'pearlSquare';
    }

    isAmberPiece(piece) {
        return piece.type === 'amberCircle' || piece.type === 'amberSquare';
    }

    isAmalgamPiece(piece) {
        return piece.type === 'amalgamCircle' || piece.type === 'amalgamSquare';
    }

    isJadePiece(piece) {
        return piece.type === 'jadeCircle' || piece.type === 'jadeSquare';
    }

    isRubyPiece(piece) {
        return piece.type === 'rubyCircle' || piece.type === 'rubySquare';
    }

    // Helper: Check if piece is a void type
    isVoidPiece(piece) {
        return piece.type === 'voidCircle' || piece.type === 'voidSquare';
    }

    // Helper: Check if piece is a portal type
    isPortalPiece(piece) {
        return piece.type === 'portalCircle' || piece.type === 'portalSquare';
    }
}
