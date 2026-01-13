// GameLogic.js - Game logic orchestrator using modular components
import { GameState } from './core/GameState.js';
import { BoardUtils } from './core/BoardUtils.js';
import { MovementSystem } from './systems/MovementSystem.js';
import { PlayerManager } from './systems/PlayerManager.js';
import { AttackSystem } from './systems/AttackSystem.js';
import { PortalSwapSystem } from './systems/PortalSwapSystem.js';
import { RubyFireballSystem } from './systems/RubyFireballSystem.js';
import { PearlTidalwaveSystem } from './systems/PearlTidalwaveSystem.js';
import { AmberSapSystem } from './systems/AmberSapSystem.js';
import { JadeLaunchSystem } from './systems/JadeLaunchSystem.js';
import { WinConditionSystem } from './systems/WinConditionSystem.js';

export class GameLogic {
    constructor(playerManager) {
        this.gameState = new GameState();
        this.boardUtils = new BoardUtils();
        this.movementSystem = new MovementSystem(this.gameState);
        this.playerManager = playerManager;
        this.attackSystem = new AttackSystem(this.gameState, this.playerManager);
        this.portalSwapSystem = new PortalSwapSystem(this.gameState, this.playerManager, this.attackSystem);
        this.rubyFireballSystem = new RubyFireballSystem(this.gameState, this.playerManager);
        this.pearlTidalwaveSystem = new PearlTidalwaveSystem(this.gameState, this.playerManager);
        this.amberSapSystem = new AmberSapSystem(this.gameState, this.playerManager);
        this.jadeLaunchSystem = new JadeLaunchSystem(this.gameState, this.playerManager);
        this.winConditionSystem = new WinConditionSystem(this.gameState, this.playerManager);
    }

    getValidMoves(startCoordStr) {
        return this.movementSystem.getValidMoves(startCoordStr);
    }

    getPortalSwapSystem() {
        return this.portalSwapSystem;
    }
    
    getRubyFireballSystem() {
        return this.rubyFireballSystem;
    }
    
    getPearlTidalwaveSystem() {
        return this.pearlTidalwaveSystem;
    }
    
    getAmberSapSystem() {
        return this.amberSapSystem;
    }
    
    getJadeLaunchSystem() {
        return this.jadeLaunchSystem;
    }
    
    getWinConditionSystem() {
        return this.winConditionSystem;
    }

    handleClick(gameX, gameY) {
        const clickedCoordStr = this.boardUtils.coordToString(gameX, gameY);
        const currentPlayer = this.playerManager.getCurrentPlayer();
        let message = '';
        let success = false;
        let moveMade = false;

        if (this.gameState.selectedPieceCoord) {
            // A piece is already selected
            if (clickedCoordStr === this.gameState.selectedPieceCoord) {
                this.gameState.deselectPiece();
                return { success: true, message: 'Piece deselected.', moveMade: false };
            } else if (this.gameState.getPiece(clickedCoordStr)) {
                const pieceToSelect = this.gameState.getPiece(clickedCoordStr);
                if (!this.playerManager.canMovePiece(pieceToSelect.type)) {
                    return { success: false, message: `That's not ${currentPlayer.name}'s piece!`, moveMade: false };
                }
                this.gameState.selectPiece(clickedCoordStr);
                return { success: true, message: `Selected new piece: ${pieceToSelect.name}`, moveMade: false };
            } else if (!this.gameState.isLocationEmpty(clickedCoordStr)) {
                return { success: false, message: 'Cannot move to an occupied space.', moveMade: false };
            } else {
                // The target location is empty. Check if the move is valid.
                const pieceToMove = this.gameState.getPiece(this.gameState.selectedPieceCoord);
                
                // Get all valid moves for this piece (includes phasing)
                const validMoves = this.movementSystem.getValidMoves(this.gameState.selectedPieceCoord);
                const clickedCoord = this.boardUtils.stringToCoord(clickedCoordStr);
                
                // Check if clicked position is in the list of valid moves
                const canMove = validMoves.some(move => 
                    move.x === clickedCoord.x && move.y === clickedCoord.y
                );
                
                if (!canMove) {
                    message = 'Invalid move for this piece.';
                }

                if (canMove) {
                    if (!this.playerManager.canMovePiece(pieceToMove.type)) {
                        return { 
                            success: false, 
                            message: `It's ${currentPlayer.name}'s turn. They cannot move ${pieceToMove.name}.`, 
                            moveMade: false 
                        };
                    }

                    // Execute the move
                    const fromCoord = this.gameState.selectedPieceCoord;
                    this.gameState.movePiece(this.gameState.selectedPieceCoord, clickedCoordStr);

                    // Execute attack from new position and track what was eliminated
                    const eliminated = this.attackSystem.executeAttackAndReturnEliminated(clickedCoordStr);

                    this.gameState.deselectPiece();
                    return { 
                        success: true, 
                        message: `Moved ${pieceToMove.name} to (${gameX}, ${gameY}).`, 
                        moveMade: true,
                        fromCoord: fromCoord,
                        eliminated: eliminated  // Add this
                    };
                } else {
                    return { success: false, message: message, moveMade: false };
                }
            }
        } else {
            // No piece is selected
            if (this.gameState.getPiece(clickedCoordStr)) {
                const pieceToSelect = this.gameState.getPiece(clickedCoordStr);
                if (!this.playerManager.canMovePiece(pieceToSelect.type)) {
                    return { success: false, message: `That's not ${currentPlayer.name}'s piece!`, moveMade: false };
                }
                this.gameState.selectPiece(clickedCoordStr);
                return { success: true, message: `Selected piece: ${pieceToSelect.name}`, moveMade: false };
            } else {
                return { success: false, message: 'Clicked on an invalid area.', moveMade: false };
            }
        }
    }

    resetGame() {
        this.gameState.reset();
        this.playerManager.reset();
        return { success: true, message: 'Game reset to initial state.' };
    }

    getState() {
        return this.gameState.getState();
    }
    
    // Get the actual GameState instance (not a snapshot)
    getGameState() {
        return this.gameState;
    }

    // ========== Arena-specific methods ==========
    
    /**
     * Initialize game with a seed (for Arena determinism)
     * @param {number} seed - Seed value (currently unused, but required for interface)
     * @returns {Object} Initial game state snapshot
     */
    initialize(seed) {
        this.resetGame();
        return this.getState();
    }

    /**
     * Restore internal state from snapshot (for Arena)
     * This allows AI to work with current state without Arena mutating state directly
     * @param {Object} gameState - Game state snapshot
     */
    restoreState(gameState) {
        this.gameState.pieces = { ...gameState.pieces };
        this.gameState.selectedPieceCoord = gameState.selectedPieceCoord || null;
    }

    /**
     * Check if game is in terminal state
     * @param {Object} gameState - Game state snapshot
     * @returns {boolean} True if game is over
     */
    isTerminal(gameState) {
        // Restore game state from snapshot
        this.gameState.pieces = { ...gameState.pieces };
        this.gameState.selectedPieceCoord = gameState.selectedPieceCoord || null;
        
        // Check win condition
        const winResult = this.winConditionSystem.checkWin();
        return winResult !== null;
    }

    /**
     * Check if a move is legal
     * @param {Object} gameState - Game state snapshot
     * @param {Object} move - Move object {from: "x,y", to: "x,y"}
     * @returns {boolean} True if move is legal
     */
    isLegalMove(gameState, move) {
        if (!move || !move.from || !move.to) return false;
        
        // Restore game state from snapshot
        this.gameState.pieces = { ...gameState.pieces };
        this.gameState.selectedPieceCoord = gameState.selectedPieceCoord || null;
        
        // Check if piece exists and belongs to current player
        const piece = this.gameState.getPiece(move.from);
        if (!piece) return false;
        
        const currentPlayer = this.playerManager.getCurrentPlayer();
        if (!currentPlayer.pieceType.includes(piece.type)) return false;
        
        // Check if destination is valid
        const validMoves = this.movementSystem.getValidMoves(move.from);
        const toCoord = this.boardUtils.stringToCoord(move.to);
        
        return validMoves.some(m => m.x === toCoord.x && m.y === toCoord.y);
    }

    /**
     * Apply a move and return new game state
     * @param {Object} gameState - Current game state snapshot
     * @param {Object} move - Move object {from: "x,y", to: "x,y"}
     * @returns {Object} New game state snapshot
     */
    applyMove(gameState, move) {
        // Restore game state from snapshot
        this.gameState.pieces = { ...gameState.pieces };
        this.gameState.selectedPieceCoord = null;
        
        // Select piece
        this.gameState.selectPiece(move.from);
        
        // Convert move to coordinates
        const fromCoord = this.boardUtils.stringToCoord(move.from);
        const toCoord = this.boardUtils.stringToCoord(move.to);
        
        // Execute move using handleClick logic
        this.gameState.movePiece(move.from, move.to);
        
        // Execute attack from new position
        this.attackSystem.executeAttackAndReturnEliminated(move.to);
        
        // Switch turn
        this.playerManager.switchTurn();
        
        // Return new state snapshot
        return this.getState();
    }

    /**
     * Get terminal result (winner information)
     * @param {Object} gameState} - Current game state snapshot
     * @returns {Object} {winnerId: string|null, winConditionType: string|null}
     */
    getTerminalResult(gameState) {
        // Restore game state from snapshot
        this.gameState.pieces = { ...gameState.pieces };
        
        const winResult = this.winConditionSystem.checkWin();
        
        if (!winResult) {
            return { winnerId: null, winConditionType: null };
        }
        
        // Map winner name to player ID
        let winnerId = null;
        if (winResult.winner === 'Player 1') {
            winnerId = 'player1';
        } else if (winResult.winner === 'Player 2 (AI)') {
            winnerId = 'player2';
        }
        
        // Map win method to condition type
        let winConditionType = null;
        if (winResult.method === 'reached goal') {
            winConditionType = 'GOAL_REACHED';
        } else if (winResult.method === 'elimination') {
            winConditionType = 'ELIMINATION';
        }
        
        return { winnerId, winConditionType };
    }
}
