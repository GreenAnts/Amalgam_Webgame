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
     * Perform deterministic setup phase
     * Places all 16 gems in valid starting positions based on RNG seed
     * @param {Object} rng - Random number generator
     */
    _performDeterministicSetup(rng) {
        const gameState = this.gameLogic.getGameState();
        
        // Import constants
        const CIRCLE_START_COORDS = [
            "1,8", "1,9", "1,10", "1,11", "2,7", "2,9", "2,10", "2,11",
            "3,7", "3,8", "3,10", "3,11", "4,7", "4,8", "4,9", "4,11",
            "5,7", "5,8", "5,9", "5,10", "6,7", "6,8", "6,9", "6,10",
            "7,8", "7,9", "-1,8", "-1,9", "-1,10", "-1,11", "-2,7",
            "-2,9", "-2,10", "-2,11", "-3,7", "-3,8", "-3,10", "-3,11",
            "-4,7", "-4,8", "-4,9", "-4,11", "-5,7", "-5,8", "-5,9",
            "-5,10", "-6,7", "-6,8", "-6,9", "-6,10", "-7,8", "-7,9"
        ];
        
        const SQUARE_START_COORDS = [
            "-1,-8", "-1,-9", "-1,-10", "-1,-11", "-2,-7", "-2,-9", "-2,-10", "-2,-11",
            "-3,-7", "-3,-8", "-3,-10", "-3,-11", "-4,-7", "-4,-8", "-4,-9", "-4,-11",
            "-5,-7", "-5,-8", "-5,-9", "-5,-10", "-6,-7", "-6,-8", "-6,-9", "-6,-10",
            "-7,-8", "-7,-9", "1,-8", "1,-9", "1,-10", "1,-11", "2,-7", "2,-9",
            "2,-10", "2,-11", "3,-7", "3,-8", "3,-10", "3,-11", "4,-7", "4,-8",
            "4,-9", "4,-11", "5,-7", "5,-8", "5,-9", "5,-10", "6,-7", "6,-8",
            "6,-9", "6,-10", "7,-8", "7,-9"
        ];
        
        // Shuffle positions deterministically
        const shuffleArray = (arr) => {
            const shuffled = [...arr];
            for (let i = shuffled.length - 1; i > 0; i--) {
                const j = rng.nextInt(i + 1);
                [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
            }
            return shuffled;
        };
        
        const circlePositions = shuffleArray(CIRCLE_START_COORDS);
        const squarePositions = shuffleArray(SQUARE_START_COORDS);
        
        // Gem types (2 of each)
        const gemTypes = ['ruby', 'ruby', 'pearl', 'pearl', 'amber', 'amber', 'jade', 'jade'];
        
        // Place Circle gems
        gemTypes.forEach((gemType, i) => {
            const coord = circlePositions[i];
            const piece = this._createGemPiece(gemType, 'circle');
            gameState.addPiece(coord, piece);
        });
        
        // Place Square gems
        gemTypes.forEach((gemType, i) => {
            const coord = squarePositions[i];
            const piece = this._createGemPiece(gemType, 'square');
            gameState.addPiece(coord, piece);
        });
    }

    /**
     * Create a gem piece (helper for setup)
     * @private
     */
    _createGemPiece(gemType, player) {
        const normalPieceSize = 25 * 0.38;
        
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

    /**
     * Initialize a new game with given seed
     * @param {number} seed - Game seed (currently unused by main game)
     * @returns {Object} Initial game state snapshot
     */
    initialize(seed) {
        this.playerManager.reset();
        this.gameLogic.resetGame();
        
        // Create RNG from seed for deterministic setup
        const rng = this._createSetupRNG(seed);
        
        // Perform deterministic setup (place all gems)
        this._performDeterministicSetup(rng);
        
        return this.getStateSnapshot();
    }
    
    /**
     * Create a setup-specific RNG from game seed
     * @private
     */
    _createSetupRNG(seed) {
        // Simple mulberry32 implementation
        let state = seed >>> 0;
        
        return {
            nextInt(max) {
                state = (state + 0x6D2B79F5) >>> 0;
                let t = Math.imul(state ^ (state >>> 15), state | 1);
                t = t ^ (t + Math.imul(t ^ (t >>> 7), state | 61));
                return (((t ^ (t >>> 14)) >>> 0) / 4294967296) * max | 0;
            }
        };
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
                // CRITICAL FIX: Simulate the selection to verify legality
                // The move contains portalCoord and target from ActionGenerator
                const portalSystem = gl.getPortalSwapSystem();
                const piece = gl.getState().pieces[move.portalCoord];
                
                // Must be a valid piece
                if (!piece) return false;
                
                // Must belong to current player
                if (!this.playerManager.canMovePiece(piece.type)) return false;
                
                // Temporarily select to check if swap is valid
                const originalPortal = portalSystem.selectedPortal;
                const originalTargets = portalSystem.swapTargets;
                const originalReverseMode = portalSystem.reverseMode;
                
                let isValid = false;
                
                if (piece.type.includes('portal')) {
                    // Normal mode: portal swapping with piece
                    if (portalSystem.selectPortal(move.portalCoord)) {
                        const targets = portalSystem.getTargets();
                        isValid = targets.includes(move.target);
                    }
                } else {
                    // Reverse mode: piece on golden line swapping with portal
                    if (portalSystem.selectTarget(move.portalCoord)) {
                        const portals = portalSystem.availablePortals || [];
                        isValid = portals.includes(move.target);
                    }
                }
                
                // Restore original state
                portalSystem.selectedPortal = originalPortal;
                portalSystem.swapTargets = originalTargets;
                portalSystem.reverseMode = originalReverseMode;
                
                return isValid;
                
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
     * Used by GameRunner to sync state before AI decision
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