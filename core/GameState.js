// core/GameState.js - Central game state management
import { initializePieces } from './PieceDefinitions.js';
import { GOLDEN_COORDS, GOLDEN_LINES_MOVEMENT } from './Constants.js';

export class GameState {
    constructor() {
        this.pieces = initializePieces();
        this.selectedPieceCoord = null;
        this.goldenCoords = GOLDEN_COORDS.map(coord => 
            typeof coord === 'object' ? `${coord.x},${coord.y}` : coord
        );
        this.goldenLinesDict = GOLDEN_LINES_MOVEMENT;  // Use MOVEMENT dict for game logic
    }

    // Get a piece at a specific coordinate
    getPiece(coordStr) {
        return this.pieces[coordStr];
    }

    // Check if a location is empty
    isLocationEmpty(coordStr) {
        return !this.pieces[coordStr];
    }

    // Move a piece from one location to another
    movePiece(fromCoordStr, toCoordStr) {
        this.pieces[toCoordStr] = this.pieces[fromCoordStr];
        delete this.pieces[fromCoordStr];
    }

    // Remove a piece (for captures/attacks)
    removePiece(coordStr) {
        if (this.pieces[coordStr]) {
            delete this.pieces[coordStr];
        }
    }
    
    // Add a piece to a specific coordinate
    addPiece(coordStr, piece) {
        this.pieces[coordStr] = piece;
    }

    // Select a piece
    selectPiece(coordStr) {
        this.selectedPieceCoord = coordStr;
    }

    // Deselect the current piece
    deselectPiece() {
        this.selectedPieceCoord = null;
    }

    // Get current game state snapshot
    getState() {
        return {
            pieces: { ...this.pieces },
            selectedPieceCoord: this.selectedPieceCoord,
            goldenCoords: this.goldenCoords,
            goldenLinesDict: this.goldenLinesDict
        };
    }

    // Reset game to initial state
    reset() {
        this.pieces = initializePieces();
        this.selectedPieceCoord = null;
    }
}
