// ai_system/simulation/SimulatedGameState.js
// Immutable simulation snapshot (search-controlled turns)

export class SimulatedGameState {
	constructor(gameState, currentPlayer, simulationDepth = 0, parentState = null, lastAction = null) {
		this.pieces = {};
		for (const [coord, piece] of Object.entries(gameState.pieces || {})) {
			this.pieces[coord] = { ...piece };
		}

		this.currentPlayer = currentPlayer;
		this.simulationDepth = simulationDepth;
		this.parentState = parentState;
		this.lastAction = lastAction;
		this.isSimulation = true;

		Object.freeze(this);
	}

	applyAction(action) {
		if (!action || typeof action !== 'object') {
			throw new Error('Invalid action');
		}
	
		const childPieces = {};
		for (const [coord, piece] of Object.entries(this.pieces)) {
			childPieces[coord] = { ...piece };
		}
	
		if (action.type === 'MOVE' && childPieces[action.from]) {
			childPieces[action.to] = childPieces[action.from];
			delete childPieces[action.from];
		}
	
		// Determine next player
		// LOGIC: PASS keeps same player? Or switch?
		// Standard rule: PASS ends turn.
		// MOVE might end turn depending on Arena rules. 
		// For safety in this environment where Arena ends turn on MOVE:
		
		let nextPlayer;
		
		// If it's a PASS, we definitely switch.
		if (action.type === 'PASS') {
			nextPlayer = (this.currentPlayer === 'Player 1' ? 'Player 2 (AI)' : 'Player 1');
		} 
		// If it's an ABILITY, we definitely switch (usually ends turn).
		else if (action.type && action.type.startsWith('ABILITY_')) {
			nextPlayer = (this.currentPlayer === 'Player 1' ? 'Player 2 (AI)' : 'Player 1');
		}
		// If it's a MOVE, check if we want to support Move->Ability.
		// Currently Arena adapters imply Move ends turn. 
		else {
			nextPlayer = (this.currentPlayer === 'Player 1' ? 'Player 2 (AI)' : 'Player 1');
		}

		return new SimulatedGameState(
			{ pieces: childPieces },
			nextPlayer,
			this.simulationDepth + 1,
			this,
			action
		);
	}

	/* ---- Compatibility / Introspection ---- */

	isSimulationState() {
		return true;
	}

	getPieces() {
		return this.pieces;
	}

	getCurrentPlayer() {
		return this.currentPlayer;
	}
	
	// Mock method often checked by systems
	getTurnCount() {
		return 0; // Simulation doesn't track global turn count perfectly
	}

	getPieceCount(playerId) {
		return Object.values(this.pieces).filter(p => p.owner === playerId).length;
	}
}