// ai_system/simulation/SimulationEvaluator.js
// Session 5+ compatible simulation evaluator

export class SimulationEvaluator {
	evaluate(state) {
		if (!state || !state.isSimulationState?.()) {
			throw new Error('SimulationEvaluator requires SimulatedGameState');
		}

		return 0.0; // no-op by design
	}

	getObservationData(state) {
		if (!state || !state.isSimulationState?.()) {
			throw new Error('Invalid simulation state');
		}

		return {
			pieceCount: Object.keys(state.getPieces()).length,
			currentPlayer: state.getCurrentPlayer(),
			simulationDepth: state.simulationDepth
		};
	}
}
