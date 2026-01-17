/**
 * SimulatedGameState.js
 *
 * Immutable snapshot of game state for hypothetical search.
 *
 * This class provides a simulation-safe representation of the game state
 * that can be used for search algorithms without affecting live gameplay.
 *
 * IMPORTANT:
 * - This class is NOT wired into Arena, policies, or search.
 * - AlphaBetaSearch remains inactive and uses live GameLogic.
 * - This is simulation infrastructure only.
 *
 * Session: 4 — Simulation Action Application (No Search Activation)
 *
 * @author Simulation Infrastructure
 * @version 0.2
 *
 * @property {Object} lastAction
 *   Opaque metadata describing the action that produced this state.
 *   Never interpreted at this layer. Used only for tracking/debugging.
 */

class SimulatedGameState {
	/**
	 * Create a new simulated game state from live game data.
	 *
	 * @param {Object} gameLogic - Live GameLogic instance
	 * @param {Object} playerManager - Live PlayerManager instance
	 * @param {number} currentTurn - Current turn number
	 * @param {string} currentPlayer - Current player ('A' or 'B')
	 */
	constructor(gameLogic, playerManager, currentTurn, currentPlayer) {
		// Snapshot core board state
		this.board = this._deepCopyBoard(gameLogic.board);

		// Snapshot minimal player state
		this.playerA = this._createMinimalPlayer(playerManager.playerA);
		this.playerB = this._createMinimalPlayer(playerManager.playerB);

		// Game metadata (opaque, copied verbatim)
		this.currentTurn = currentTurn;
		this.currentPlayer = currentPlayer;
		this.gamePhase = gameLogic.gamePhase;
		this.turnPhase = gameLogic.turnPhase;

		// Simulation metadata
		this.isSimulation = true;
		this.simulationDepth = 0;
		this.parentState = null;
		this.lastAction = null;

		Object.freeze(this);
	}

	/**
	 * WARNING:
	 * This class is a READ-ONLY SNAPSHOT.
	 * It does NOT enforce rules, legality, or outcomes.
	 * It performs only mechanical state copying.
	 */

	/* ------------------------------------------------------------------ */
	/* Internal helpers                                                    */
	/* ------------------------------------------------------------------ */

	_deepCopyBoard(board) {
		return board.map(row =>
			row.map(cell =>
				cell ? { ...cell } : null
			)
		);
	}

	_createMinimalPlayer(player) {
		return {
			id: player.id,
			color: player.color,
			pieces: player.pieces.map(piece => ({ ...piece }))
		};
	}

	/* ------------------------------------------------------------------ */
	/* Read-only accessors                                                 */
	/* ------------------------------------------------------------------ */

	getCurrentPlayer() {
		return this.currentPlayer === 'A' ? this.playerA : this.playerB;
	}

	getOpponentPlayer() {
		return this.currentPlayer === 'A' ? this.playerB : this.playerA;
	}

	isInSetupPhase() {
		return this.gamePhase === 'SETUP';
	}

	isInPlayPhase() {
		return this.gamePhase === 'PLAY';
	}

	isGameFinished() {
		return this.gamePhase === 'FINISHED';
	}

	getPieceAt(row, col) {
		if (
			row < 0 ||
			col < 0 ||
			row >= this.board.length ||
			col >= this.board[row].length
		) {
			return null;
		}
		return this.board[row][col];
	}

	isPositionEmpty(row, col) {
		return this.getPieceAt(row, col) === null;
	}

	isPositionOccupiedBy(row, col, playerId) {
		const piece = this.getPieceAt(row, col);
		return piece !== null && piece.playerId === playerId;
	}

	getPiecesForPlayer(playerId) {
		const player = playerId === 'A' ? this.playerA : this.playerB;
		return player.pieces.filter(piece => !piece.isCaptured);
	}

	hasPieces(playerId) {
		return this.getPiecesForPlayer(playerId).length > 0;
	}

	getPieceCount(playerId) {
		return this.getPiecesForPlayer(playerId).length;
	}

	getBoardString() {
		let result = '';
		for (let row = 0; row < this.board.length; row++) {
			for (let col = 0; col < this.board[row].length; col++) {
				const piece = this.board[row][col];
				result += piece ? piece.type[0].toUpperCase() : '.';
			}
			result += '\n';
		}
		return result;
	}

	isSimulationState() {
		return this.isSimulation === true;
	}

	getSimulationMetadata() {
		return {
			isSimulation: this.isSimulation,
			simulationDepth: this.simulationDepth,
			parentState: this.parentState,
			currentTurn: this.currentTurn,
			currentPlayer: this.currentPlayer,
			lastAction: this.lastAction
		};
	}

	/* ------------------------------------------------------------------ */
	/* Session 4: Action application (mechanical, inert)                   */
	/* ------------------------------------------------------------------ */

	/**
	 * Apply an action to create a new simulation state.
	 *
	 * IMPORTANT:
	 * - Does NOT enforce rules
	 * - Does NOT validate legality
	 * - Does NOT infer outcomes
	 * - Treats the action as opaque metadata only
	 *
	 * @param {Object} action - Opaque action descriptor
	 * @returns {SimulatedGameState} New child simulation state
	 */
	applyAction(action) {
		if (!action || typeof action !== 'object') {
			throw new Error('Invalid action: must be an object');
		}

		const child = Object.create(Object.getPrototypeOf(this));

		// Structural snapshot (parent remains untouched)
		child.board = this._deepCopyBoard(this.board);
		child.playerA = this._createMinimalPlayer(this.playerA);
		child.playerB = this._createMinimalPlayer(this.playerB);

		// Copied metadata
		child.currentTurn = this.currentTurn;
		child.currentPlayer = this.currentPlayer;
		child.gamePhase = this.gamePhase;
		child.turnPhase = this.turnPhase;

		// Simulation lineage
		child.isSimulation = true;
		child.simulationDepth = this.simulationDepth + 1;
		child.parentState = this;
		child.lastAction = action;

		Object.freeze(child);
		return child;
	}
}

module.exports = SimulatedGameState;
