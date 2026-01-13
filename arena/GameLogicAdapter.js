// arena/GameLogicAdapter.js
// Adapter between Arena's stateless interface and GameLogic's stateful implementation
// Provides complete state isolation for deterministic Arena matches

import { GameLogic } from '../GameLogic.js';
import { PlayerManager } from '../systems/PlayerManager.js';

export class GameLogicAdapter {
    constructor() {
        // Create fresh instances for each adapter
        this.playerManager = new PlayerManager();
        this.gameLogic = new GameLogic(this.playerManager);
    }

    /**
     * Initialize a new game with given seed
     * @param {number} seed - Game seed (currently unused by main game)
     * @returns {Object} Initial game state snapshot
     */
    initialize(seed) {
        // Reset PlayerManager to clean state
        this.playerManager.reset();
        
        // Reset GameLogic state
        this.gameLogic.resetGame();
        
        // Return current state snapshot
        return this.getStateSnapshot();
    }

    /**
     * Check if game is in terminal state
     * @param {Object} gameState - Game state snapshot
     * @returns {boolean} True if game is over
     */
    isTerminal(gameState) {
        // Restore state (safe for read-only check)
        this._restoreFromSnapshot(gameState);
        
        // Use WinConditionSystem to check for win
        const winResult = this.gameLogic.getWinConditionSystem().checkWin();
        return winResult !== null;
    }

    /**
     * Check if move is legal
     * @param {Object} gameState - Game state snapshot
     * @param {Object} move - Move object {from: "x,y", to: "x,y"}
     * @returns {boolean} True if move is legal
     */
    isLegalMove(gameState, move) {
        if (!move || !move.from || !move.to) return false;
        
        // Restore state
        this._restoreFromSnapshot(gameState);
        
        // Parse coordinates
        const fromCoord = this.gameLogic.boardUtils.stringToCoord(move.from);
        const toCoord = this.gameLogic.boardUtils.stringToCoord(move.to);
        
        // Check if piece exists at 'from' position
        const piece = this.gameLogic.getState().pieces[move.from];
        if (!piece) return false;
        
        // Check if piece belongs to current player
        if (!this.playerManager.canMovePiece(piece.type)) return false;
        
        // Get valid moves for this piece
        const validMoves = this.gameLogic.movementSystem.getValidMoves(move.from);
        
        // Check if 'to' position is in valid moves
        return validMoves.some(m => m.x === toCoord.x && m.y === toCoord.y);
    }

    /**
     * Apply move and return new state
     * @param {Object} gameState - Current game state snapshot
     * @param {Object} move - Move object {from: "x,y", to: "x,y"}
     * @returns {Object} New game state snapshot
     */
    applyMove(gameState, move) {
        this._restoreFromSnapshot(gameState);
        
        if (move.type === 'PASS') {
            this.playerManager.switchTurn(); // Only switch on explicit PASS or end
        } else if (move.type === 'ABILITY') {
            this.executeAbilityInAdapter(move);
            // Check if turn should end after this specific ability
            if (!this.gameLogic.anyAbilitiesAvailable()) {
                this.playerManager.switchTurn();
            }
        } else {
            // Standard Move
            this.executeStandardMove(move);
            // Check if chaining is possible
            if (!this.gameLogic.anyAbilitiesAvailable()) {
                this.playerManager.switchTurn();
            }
        }
        
        return this.getStateSnapshot();
    }

    // Helper to map AI ability actions to GameLogic systems
    executeAbilityInAdapter(action) {
        const gl = this.gameLogic;
        switch (action.abilityType) {
            case 'ABILITY_FIREBALL':
                gl.getRubyFireballSystem().activate();
                gl.getRubyFireballSystem().executeFireball(action.target);
                break;
            case 'ABILITY_TIDALWAVE':
                gl.getPearlTidalwaveSystem().activate();
                gl.getPearlTidalwaveSystem().executeTidalwave(action.target);
                break;
            case 'ABILITY_SAP':
                gl.getAmberSapSystem().activate();
                gl.getAmberSapSystem().executeSap(action.target);
                break;
            case 'ABILITY_LAUNCH':
                gl.getJadeLaunchSystem().activate();
                gl.getJadeLaunchSystem().selectPieceToLaunch(action.pieceCoord);
                gl.getJadeLaunchSystem().executeLaunch(action.target, gl.attackSystem);
                break;
            case 'ABILITY_PORTAL_SWAP':
                gl.getPortalSwapSystem().selectPortal(action.portalCoord);
                gl.getPortalSwapSystem().activate();
                gl.getPortalSwapSystem().executeSwap(action.target);
                break;
        }
    }

    /**
     * Get terminal result (winner info)
     * @param {Object} gameState - Terminal game state snapshot
     * @returns {Object} {winnerId: string, winConditionType: string}
     */
    getTerminalResult(gameState) {
        this._restoreFromSnapshot(gameState);
        
        const winResult = this.gameLogic.getWinConditionSystem().checkWin();
        
        if (!winResult) {
            return { winnerId: null, winConditionType: 'DRAW' };
        }
        
        // Map winner name to player ID
        let winnerId;
        if (winResult.winner === 'Player 1') {
            winnerId = 'player1';
        } else if (winResult.winner === 'Player 2 (AI)') {
            winnerId = 'player2';
        } else {
            winnerId = null;
        }
        
        return {
            winnerId: winnerId,
            winConditionType: winResult.method.toUpperCase().replace(/ /g, '_')
        };
    }

    /**
     * Get current state snapshot (read-only)
     * @returns {Object} Game state snapshot
     */
    getStateSnapshot() {
        const state = this.gameLogic.getState();
        
        // Deep clone pieces to prevent mutation
        const piecesCopy = {};
        for (const [coord, piece] of Object.entries(state.pieces)) {
            piecesCopy[coord] = { ...piece };
        }
        
        return {
            pieces: piecesCopy,
            selectedPieceCoord: state.selectedPieceCoord,
            currentPlayer: this.playerManager.getCurrentPlayer().name,
            turnCount: this.playerManager.getTurnCount()
        };
    }

    /**
     * Restore game state from snapshot (internal use)
     * @private
     */
    _restoreFromSnapshot(snapshot) {
        // Clear current pieces
        const currentState = this.gameLogic.getGameState();
        const currentPieces = Object.keys(currentState.pieces);
        for (const coord of currentPieces) {
            currentState.removePiece(coord);
        }
        
        // Restore pieces from snapshot
        for (const [coord, piece] of Object.entries(snapshot.pieces)) {
            currentState.addPiece(coord, { ...piece });
        }
        
        // Restore turn state
        while (this.playerManager.getCurrentPlayer().name !== snapshot.currentPlayer) {
            this.playerManager.switchTurn();
        }
        
        // Note: turnCount restoration would require modifying PlayerManager
        // For now, we accept this limitation
    }
}