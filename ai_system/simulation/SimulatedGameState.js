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
	
		// Apply the action
		if (action.type === 'MOVE' && childPieces[action.from]) {
			childPieces[action.to] = childPieces[action.from];
			delete childPieces[action.from];
			
			// CRITICAL: Apply attacks after move
			const attackedPieces = this._computeAttacks(action.to, childPieces);
			attackedPieces.forEach(coord => delete childPieces[coord]);
		}
	
		// Determine next player (all actions end turn for now)
		const nextPlayer = (this.currentPlayer === 'Player 1' ? 'Player 2 (AI)' : 'Player 1');
	
		return new SimulatedGameState(
			{ pieces: childPieces },
			nextPlayer,
			this.simulationDepth + 1,
			this,
			action
		);
	}
	
	/**
	 * Compute which pieces would be eliminated by an attack from coordStr
	 * Mirrors AttackSystem logic without mutating state
	 * @private
	 */
	_computeAttacks(coordStr, pieces) {
		const eliminated = [];
		const attackingPiece = pieces[coordStr];
		if (!attackingPiece) return eliminated;
		
		const attackingPlayer = attackingPiece.type.includes('Square') ? 'player1' : 'player2';
		const isVoid = attackingPiece.type.includes('void');
		const isPortal = attackingPiece.type.includes('portal');
		
		// Parse coordinate
		const [x, y] = coordStr.split(',').map(Number);
		
		// 8 adjacent directions
		const directions = [
			{x: 1, y: 0}, {x: 1, y: 1}, {x: 0, y: 1}, {x: -1, y: 1},
			{x: -1, y: 0}, {x: -1, y: -1}, {x: 0, y: -1}, {x: 1, y: -1}
		];
		
		// Check adjacent squares
		for (const dir of directions) {
			const targetX = x + dir.x;
			const targetY = y + dir.y;
			const targetCoord = `${targetX},${targetY}`;
			const targetPiece = pieces[targetCoord];
			
			if (!targetPiece) continue;
			
			const targetPlayer = targetPiece.type.includes('Square') ? 'player1' : 'player2';
			if (targetPlayer === attackingPlayer) continue; // Can't attack own pieces
			
			const targetIsPortal = targetPiece.type.includes('portal');
			
			// Void attacks all adjacent enemies
			if (isVoid) {
				eliminated.push(targetCoord);
			}
			// Portal attacks adjacent portals only
			else if (isPortal && targetIsPortal) {
				eliminated.push(targetCoord);
			}
			// Non-portal attacks adjacent non-portals only
			else if (!isPortal && !targetIsPortal) {
				eliminated.push(targetCoord);
			}
		}
		
		// If portal, check golden line attacks
		if (isPortal) {
			// We need golden line data - for now, skip this
			// This is an optimization we can add later
		}
		
		return eliminated;
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