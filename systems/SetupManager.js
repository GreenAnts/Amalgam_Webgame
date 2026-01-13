// systems/SetupManager.js - Manages piece placement setup phase
import { BoardUtils } from '../core/BoardUtils.js';
import { CIRCLE_START_COORDS, SQUARE_START_COORDS } from '../core/Constants.js';

export class SetupManager {
    constructor(gameState, playerManager) {
        this.gameState = gameState;
        this.playerManager = playerManager;
        this.boardUtils = new BoardUtils();
        
        this.isSetupPhase = true;
        this.setupTurn = 1; // 1-16
        this.selectedPieceType = null; // 'ruby', 'pearl', 'amber', 'jade'
        
        // Track pieces placed by each player
        this.squarePlacements = {
            ruby: 0,
            pearl: 0,
            amber: 0,
            jade: 0
        };
        
        this.circlePlacements = {
            ruby: 0,
            pearl: 0,
            amber: 0,
            jade: 0
        };
        
        // Valid starting positions for each player
        this.circleStartPositions = this.generateCircleStartPositions();
        this.squareStartPositions = this.generateSquareStartPositions();
    }

    generateCircleStartPositions() {
        return new Set(CIRCLE_START_COORDS);
    }

    generateSquareStartPositions() {
        return new Set(SQUARE_START_COORDS);
    }

    getCurrentPlayer() {
        // Squares go on odd turns (1,3,5...), Circles on even turns (2,4,6...)
        return (this.setupTurn % 2 === 1) ? 'square' : 'circle';
    }

    selectPiece(pieceType) {
        const player = this.getCurrentPlayer();
        const placements = player === 'square' ? this.squarePlacements : this.circlePlacements;
        
        // Check if this piece type is already maxed out
        if (placements[pieceType] >= 2) {
            return false;
        }
        
        // Toggle selection
        if (this.selectedPieceType === pieceType) {
            this.selectedPieceType = null; // Deselect
        } else {
            this.selectedPieceType = pieceType; // Select
        }
        
        return true;
    }

    getValidPlacementPositions() {
        if (!this.selectedPieceType) return [];
        
        const player = this.getCurrentPlayer();
        const validPositions = player === 'square' ? this.squareStartPositions : this.circleStartPositions;
        
        // Filter out already occupied positions
        const available = [];
        for (const coordStr of validPositions) {
            if (!this.gameState.getPiece(coordStr)) {
                available.push(coordStr);
            }
        }
        
        return available;
    }

    placePiece(coordStr) {
        if (!this.selectedPieceType) return { success: false, message: 'No piece selected' };
        
        const validPositions = this.getValidPlacementPositions();
        if (!validPositions.includes(coordStr)) {
            return { success: false, message: 'Invalid placement position' };
        }
        
        const player = this.getCurrentPlayer();
        const pieceType = this.selectedPieceType;
        
        // Create the piece
        const coord = this.boardUtils.stringToCoord(coordStr);
        const piece = this.createGemPiece(pieceType, player);
        this.gameState.addPiece(coordStr, piece);
        
        // Update placement count
        if (player === 'square') {
            this.squarePlacements[pieceType]++;
        } else {
            this.circlePlacements[pieceType]++;
        }
        
        // Advance turn
        this.setupTurn++;
        this.selectedPieceType = null;
        
        // Check if setup is complete
        if (this.setupTurn > 16) {
            this.isSetupPhase = false;
            return { success: true, message: 'Setup complete! Game starting...', setupComplete: true };
        }
        
        return { success: true, message: `${player} placed ${pieceType}`, setupComplete: false };
    }

    createGemPiece(gemType, player) {
        const normalPieceSize = 25 * 0.38; // GRID_SIZE * 0.38 [This should match the PieceDefinition.js (normalPieceSize) size and Constants.js (GRID_SIZE)]
        
        const colors = {
            ruby: { outer: '#b72d4c', inner: '#e4395f' },
            pearl: { outer: '#c4c2ad', inner: '#f7f4d8' },
            amber: { outer: '#c19832', inner: '#f4bf3f' },
            jade: { outer: '#86b76a', inner: '#a8e685' }
        };
        
        const typeStr = player === 'square' ? 'Square' : 'Circle';
        
        return {
            name: `${gemType.charAt(0).toUpperCase() + gemType.slice(1)}-${typeStr}`,
            type: `${gemType}${typeStr}`,
            outerColor: colors[gemType].outer,
            innerColor: colors[gemType].inner,
            size: normalPieceSize
        };
    }

    getPieceCounts(player) {
        return player === 'square' ? this.squarePlacements : this.circlePlacements;
    }

    reset() {
        this.isSetupPhase = true;
        this.setupTurn = 1;
        this.selectedPieceType = null;
        this.squarePlacements = { ruby: 0, pearl: 0, amber: 0, jade: 0 };
        this.circlePlacements = { ruby: 0, pearl: 0, amber: 0, jade: 0 };
    }
}
