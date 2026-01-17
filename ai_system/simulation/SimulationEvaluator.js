/**
 * SimulationEvaluator.js
 *
 * Pure, stateless evaluation of SimulatedGameState instances.
 *
 * This evaluator provides a deterministic, side-effect-free scoring interface
 * for simulation states without activating search, tree traversal, or Arena integration.
 *
 * Session: 5 — Simulation Evaluation Interface (No Search Activation)
 *
 * @author Simulation Infrastructure
 * @version 0.1
 */

class SimulationEvaluator {
	/**
	 * Evaluate a SimulatedGameState and return a deterministic score.
	 *
	 * This method is intentionally no-op and returns 0 to maintain:
	 * - Purity: No side effects or state mutation
	 * - Safety: No access to live game objects
	 * - Determinism: Identical inputs always produce identical outputs
	 * - Isolation: Simulation remains decoupled from live gameplay
	 *
	 * @param {SimulatedGameState} simState - The simulation state to evaluate
	 * @returns {number} A deterministic score (currently always 0)
	 * @throws {Error} If simState is invalid or not a simulation state
	 */
	evaluate(simState) {
		// Validation: ensure we're evaluating a valid simulation state
		if (!simState) {
			throw new Error('SimulationEvaluator.evaluate() requires a SimulatedGameState instance');
		}

		if (typeof simState.isSimulationState !== 'function' || !simState.isSimulationState()) {
			throw new Error('SimulationEvaluator can only evaluate SimulatedGameState instances');
		}

		// No-op evaluation: return constant score
		// This proves the interface exists without introducing bias
		return 0;
	}

	/**
	 * Get structured observation data from a simulation state.
	 *
	 * This method provides access to raw simulation data without interpretation.
	 * It is purely observational and does not infer game outcomes or quality.
	 *
	 * @param {SimulatedGameState} simState - The simulation state to observe
	 * @returns {Object} Structured data about the simulation state
	 * @throws {Error} If simState is invalid
	 */
	getObservationData(simState) {
		if (!simState) {
			throw new Error('getObservationData() requires a SimulatedGameState instance');
		}

		if (typeof simState.isSimulationState !== 'function' || !simState.isSimulationState()) {
			throw new Error('getObservationData() can only process SimulatedGameState instances');
		}

		return {
			// Simulation metadata
			isSimulation: simState.isSimulation,
			simulationDepth: simState.simulationDepth,
			currentTurn: simState.currentTurn,
			currentPlayer: simState.currentPlayer,
			gamePhase: simState.gamePhase,
			turnPhase: simState.turnPhase,

			// Player data (structural only)
			playerA: {
				id: simState.playerA.id,
				color: simState.playerA.color,
				pieceCount: simState.getPieceCount('A')
			},
			playerB: {
				id: simState.playerB.id,
				color: simState.playerB.color,
				pieceCount: simState.getPieceCount('B')
			},

			// Board data (structural only)
			boardDimensions: {
				rows: simState.board.length,
				cols: simState.board[0] ? simState.board[0].length : 0
			},
			totalPieces: simState.getPieceCount('A') + simState.getPieceCount('B')
		};
	}
}

module.exports = SimulationEvaluator;
