// arena/GameLogicAdapter.js
// Adapter between Arena's stateless interface and GameLogic's stateful implementation

import { GameLogic } from '../GameLogic.js';
import { PlayerManager } from '../systems/PlayerManager.js';

export class GameLogicAdapter {
    constructor() {
        this.playerManager = new PlayerManager();
        this.gameLogic = new GameLogic(this.playerManager);
    }

    /**
     * Initialize a new game with given seed
     * @param {number} seed - Game seed (currently unused by main game)
     * @returns {Object} Initial game state snapshot
     */
    initialize(seed) {
        this.playerManager.reset();
        this.gameLogic.resetGame();
        return this.getStateSnapshot();
    }

    /**
     * Check if game is in terminal state
     * @param {Object} gameState - Game state snapshot
     * @returns {boolean} True if game is over
     */
    isTerminal(gameState) {
        this._restoreFromSnapshot(gameState);
        const winResult = this.gameLogic.getWinConditionSystem().checkWin();
        return winResult !== null;
    }

    /**
     * Check if move is legal
     * @param {Object} gameState - Game state snapshot
     * @param {Object} move - Move object
     * @returns {boolean} True if move is legal
     */
    isLegalMove(gameState, move) {
        if (!move) return false;
        
        this._restoreFromSnapshot(gameState);
        
        // Handle PASS moves (always legal when no other moves available)
        if (move.type === 'PASS') {
            return true;
        }
        
        // Handle ABILITY moves
        if (move.type === 'ABILITY') {
            return this._isAbilityLegal(move);
        }
        
        // Standard moves must have from/to
        if (!move.from || !move.to) return false;
        
        const piece = this.gameLogic.getState().pieces[move.from];
        if (!piece) return false;
        
        if (!this.playerManager.canMovePiece(piece.type)) return false;
        
        const validMoves = this.gameLogic.movementSystem.getValidMoves(move.from);
        const toCoord = this.gameLogic.boardUtils.stringToCoord(move.to);
        
        return validMoves.some(m => m.x === toCoord.x && m.y === toCoord.y);
    }

    /**
     * Check if an ability move is legal
     * @private
     */
    _isAbilityLegal(move) {
        const gl = this.gameLogic;
        
        switch (move.abilityType) {
            case 'FIREBALL':
                return gl.getRubyFireballSystem().checkFireball(null);
            case 'TIDALWAVE':
                return gl.getPearlTidalwaveSystem().checkTidalwave(null);
            case 'SAP':
                return gl.getAmberSapSystem().checkSap(null);
            case 'LAUNCH':
                return gl.getJadeLaunchSystem().checkLaunch(null);
            case 'PORTAL_SWAP':
                return gl.getPortalSwapSystem().selectedPortal !== null;
            default:
                return false;
        }
    }

    /**
     * Apply move and return new state
     * @param {Object} gameState - Current game state snapshot
     * @param {Object} move - Move object
     * @returns {Object} New game state snapshot
     */
    applyMove(gameState, move) {
        this._restoreFromSnapshot(gameState);
        
        if (move.type === 'PASS') {
            this.playerManager.switchTurn();
        } else if (move.type === 'ABILITY') {
            this._executeAbility(move);
            this.playerManager.switchTurn();
        } else {
            this._executeStandardMove(move);
            this.playerManager.switchTurn();
        }
        
        return this.getStateSnapshot();
    }

    /**
     * Execute a standard piece move
     * @private
     */
    _executeStandardMove(move) {
        this.gameLogic.getGameState().selectPiece(move.from);
        this.gameLogic.getGameState().movePiece(move.from, move.to);
        this.gameLogic.attackSystem.executeAttackAndReturnEliminated(move.to);
        this.gameLogic.getGameState().deselectPiece();
    }

    /**
     * Execute an ability
     * @private
     */
    _executeAbility(move) {
        const gl = this.gameLogic;
        
        switch (move.abilityType) {
            case 'FIREBALL':
                gl.getRubyFireballSystem().activate();
                gl.getRubyFireballSystem().executeFireball(move.target);
                break;
            case 'TIDALWAVE':
                gl.getPearlTidalwaveSystem().activate();
                gl.getPearlTidalwaveSystem().executeTidalwave(move.target);
                break;
            case 'SAP':
                gl.getAmberSapSystem().activate();
                gl.getAmberSapSystem().executeSap(move.target);
                break;
            case 'LAUNCH':
                gl.getJadeLaunchSystem().activate();
                gl.getJadeLaunchSystem().selectPieceToLaunch(move.pieceCoord);
                gl.getJadeLaunchSystem().executeLaunch(move.target, gl.attackSystem);
                break;
            case 'PORTAL_SWAP':
                gl.getPortalSwapSystem().selectPortal(move.portalCoord);
                gl.getPortalSwapSystem().activate();
                gl.getPortalSwapSystem().executeSwap(move.target);
                break;
        }
    }

    /**
     * Get terminal result
     * @param {Object} gameState - Terminal game state snapshot
     * @returns {Object} {winnerId: string, winConditionType: string}
     */
    getTerminalResult(gameState) {
        this._restoreFromSnapshot(gameState);
        
        const winResult = this.gameLogic.getWinConditionSystem().checkWin();
        
        if (!winResult) {
            return { winnerId: null, winConditionType: 'DRAW' };
        }
        
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
     * Get current state snapshot
     * @returns {Object} Game state snapshot
     */
    getStateSnapshot() {
        const state = this.gameLogic.getState();
        
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
     * Restore game state from snapshot
     * @private
     */
    _restoreFromSnapshot(snapshot) {
        const currentState = this.gameLogic.getGameState();
        const currentPieces = Object.keys(currentState.pieces);
        
        for (const coord of currentPieces) {
            currentState.removePiece(coord);
        }
        
        for (const [coord, piece] of Object.entries(snapshot.pieces)) {
            currentState.addPiece(coord, { ...piece });
        }
        
        while (this.playerManager.getCurrentPlayer().name !== snapshot.currentPlayer) {
            this.playerManager.switchTurn();
        }
    }
}