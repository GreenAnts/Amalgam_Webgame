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
     * AUTO-PLACES GEMS: Arena has no setup phase UI, so gems are placed automatically
     * @param {number} seed - Seed value for deterministic setup
     * @returns {Object} Initial game state snapshot with all pieces placed
     */
    async initialize(seed) {
        // 1. Reset to base state (Amalgam, Void, Portals)
        this.resetGame();
        
        // 2. Auto-place gems for Arena compatibility
        try {
            // Dynamic imports to avoid issues if files don't exist
            const { SetupBookHandler } = await import('./ai_system/utils/SetupBookHandler.js');
            const { createGemPiece } = await import('./core/PieceDefinitions.js');
            
            const setupHandler = new SetupBookHandler();
            await setupHandler.loadBook();
            
            // Select setups deterministically
            const squareSetup = setupHandler.selectSetup('squares', seed);
            const circleSetup = setupHandler.selectSetup('circles', seed);
            
            // Get placement sequences
            const squarePlacements = setupHandler.getPlacementSequence(squareSetup);
            const circlePlacements = setupHandler.getPlacementSequence(circleSetup);
            
            // Place all gems
            squarePlacements.forEach(placement => {
                const piece = createGemPiece(placement.gem, 'square');
                this.gameState.addPiece(placement.coord, piece);
            });
            
            circlePlacements.forEach(placement => {
                const piece = createGemPiece(placement.gem, 'circle');
                this.gameState.addPiece(placement.coord, piece);
            });
            
        } catch (error) {
            console.error('Failed to auto-place gems during initialization:', error);
            // Continue with base pieces only (graceful degradation)
        }
        
        return this.getState();
    }


    /**
     * Check if game is in setup phase (browser only)
     * @returns {boolean} True if < 16 gems placed
     */
    isInSetupPhase() {
        const gameState = this.gameState.getState();
        
        let gemCount = 0;
        for (const piece of Object.values(gameState.pieces)) {
            const type = piece.type.toLowerCase();
            if (type.includes('ruby') || type.includes('pearl') || 
                type.includes('amber') || type.includes('jade')) {
                gemCount++;
            }
        }
        
        return gemCount < 16;
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
        // DON'T mutate this.gameState - just temporarily check win condition
        // Save current state
        const savedPieces = this.gameState.pieces;
        const savedSelectedCoord = this.gameState.selectedPieceCoord;
        
        try {
            // Temporarily set state for win check (restore in finally)
            this.gameState.pieces = gameState.pieces;  // Don't copy, just reference
            this.gameState.selectedPieceCoord = gameState.selectedPieceCoord || null;
            
            const winResult = this.winConditionSystem.checkWin();
            return winResult !== null;
        } finally {
            // ALWAYS restore original state
            this.gameState.pieces = savedPieces;
            this.gameState.selectedPieceCoord = savedSelectedCoord;
        }
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
        const savedPieces = this.gameState.pieces;
        const savedSelectedCoord = this.gameState.selectedPieceCoord;
        
        try {
            this.gameState.pieces = gameState.pieces;
            this.gameState.selectedPieceCoord = null;
            
            this.gameState.selectPiece(move.from);
            const fromCoord = this.boardUtils.stringToCoord(move.from);
            const toCoord = this.boardUtils.stringToCoord(move.to);
            
            this.gameState.movePiece(move.from, move.to);
            this.attackSystem.executeAttackAndReturnEliminated(move.to);
            this.playerManager.switchTurn();
            
            return this.getState();
        } finally {
            this.gameState.pieces = savedPieces;
            this.gameState.selectedPieceCoord = savedSelectedCoord;
        }
    }

    /**
     * Get terminal result (winner information)
     * @param {Object} gameState} - Current game state snapshot
     * @returns {Object} {winnerId: string|null, winConditionType: string|null}
     */
    getTerminalResult(gameState) {
        const savedPieces = this.gameState.pieces;
    
        try {
            this.gameState.pieces = gameState.pieces;
            const winResult = this.winConditionSystem.checkWin();
            
            if (!winResult) {
                return { winnerId: null, winConditionType: null };
            }
        
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

        } finally {
            this.gameState.pieces = savedPieces;
        }
    }
}
