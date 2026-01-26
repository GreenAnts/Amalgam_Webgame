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
	
		// Apply the action based on type
		if (action.type === 'MOVE' && childPieces[action.from]) {
			childPieces[action.to] = childPieces[action.from];
			delete childPieces[action.from];
			
			const attackedPieces = this._computeAttacks(action.to, childPieces);
			attackedPieces.forEach(coord => delete childPieces[coord]);
			
		} else if (action.type === 'ABILITY_PORTAL_SWAP') {
			const portalCoord = action.portalCoord;
			const targetCoord = action.target;
			
			if (childPieces[portalCoord] && childPieces[targetCoord]) {
				const temp = childPieces[portalCoord];
				childPieces[portalCoord] = childPieces[targetCoord];
				childPieces[targetCoord] = temp;
				
				const attacks1 = this._computeAttacks(portalCoord, childPieces);
				attacks1.forEach(coord => delete childPieces[coord]);
				
				const attacks2 = this._computeAttacks(targetCoord, childPieces);
				attacks2.forEach(coord => delete childPieces[coord]);
			}
			
		} else if (action.type === 'ABILITY_FIREBALL') {
			if (action.formationData && action.formationData.targets) {
				action.formationData.targets.forEach(target => {
					if (childPieces[target]) {
						delete childPieces[target];
					}
				});
			} else if (childPieces[action.target]) {
				delete childPieces[action.target];
			}
			
		} else if (action.type === 'ABILITY_TIDALWAVE') {
			if (action.formationData && action.formationData.targets) {
				action.formationData.targets.forEach(target => {
					if (childPieces[target]) {
						delete childPieces[target];
					}
				});
			} else if (childPieces[action.target]) {
				delete childPieces[action.target];
			}
			
		} else if (action.type === 'ABILITY_SAP') {
			if (action.formationData && action.formationData.targets) {
				action.formationData.targets.forEach(target => {
					if (childPieces[target]) {
						delete childPieces[target];
					}
				});
			} else if (childPieces[action.target]) {
				delete childPieces[action.target];
			}
			
		} else if (action.type === 'ABILITY_LAUNCH') {
			if (childPieces[action.pieceCoord]) {
				if (childPieces[action.target]) {
					delete childPieces[action.target];
				}
				
				childPieces[action.target] = childPieces[action.pieceCoord];
				delete childPieces[action.pieceCoord];
				
				const attackedPieces = this._computeAttacks(action.target, childPieces);
				attackedPieces.forEach(coord => {
					delete childPieces[coord];
				});
			}
		}
	
		// ✅ FIX: Determine next player based on Amalgam's turn structure
		let nextPlayer;
		
		if (action.type === 'MOVE') {
			// After MOVE: Same player (can use ability or pass)
			nextPlayer = this.currentPlayer;
		} else if (action.type === 'PASS') {
			// After PASS: Switch player (turn ends)
			nextPlayer = (this.currentPlayer === 'Player 1' ? 'Player 2 (AI)' : 'Player 1');
		} else if (action.type && action.type.startsWith('ABILITY_')) {
			// After ABILITY: Switch player (turn ends)
			nextPlayer = (this.currentPlayer === 'Player 1' ? 'Player 2 (AI)' : 'Player 1');
		} else {
			// Fallback: switch player
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
		
		// ✅ NEW: If portal, check golden line attacks
		if (isPortal) {
			const connections = this._getGoldenLineConnections(coordStr);
			for (const conn of connections) {
				const targetCoord = `${conn.x},${conn.y}`;
				const targetPiece = pieces[targetCoord];
				
				if (!targetPiece) continue;
				
				const targetPlayer = targetPiece.type.includes('Square') ? 'player1' : 'player2';
				if (targetPlayer === attackingPlayer) continue;
				
				const targetIsPortal = targetPiece.type.includes('portal');
				
				// Portal attacks enemy portals via golden lines
				if (targetIsPortal) {
					eliminated.push(targetCoord);
				}
			}
		}
		
		return eliminated;
	}

	/**
	 * Get golden line connections for a coordinate
	 * Simplified version - uses hardcoded golden lines from Constants
	 * @private
	 */
	_getGoldenLineConnections(coordStr) {
		// Hardcoded golden line connections (from GOLDEN_LINES_DICT)
		const GOLDEN_LINES = {
			"-12,0": [{x: -11, y: 5}, {x: -11, y: -5}, {x: -8, y: 3}, {x: -8, y: -3}, {x: 12, y: 0}],
			"-11,5": [{x: -12, y: 0}, {x: -9, y: 8}],
			"-9,8": [{x: -11, y: 5}, {x: -8, y: 3}, {x: -6, y: 6}, {x: -8, y: 9}],
			"-8,9": [{x: -9, y: 8}, {x: -5, y: 11}, {x: -6, y: 6}],
			"-5,11": [{x: -8, y: 9}, {x: 0, y: 12}, {x: 0, y: 6}],
			"0,12": [{x: -5, y: 11}, {x: 5, y: 11}, {x: 0, y: -12}],
			"5,11": [{x: 0, y: 12}, {x: 8, y: 9}, {x: 0, y: 6}],
			"8,9": [{x: 5, y: 11}, {x: 9, y: 8}, {x: 6, y: 6}],
			"9,8": [{x: 11, y: 5}, {x: 8, y: 3}, {x: 6, y: 6}, {x: 8, y: 9}],
			"11,5": [{x: 12, y: 0}, {x: 9, y: 8}],
			"12,0": [{x: 11, y: 5}, {x: 11, y: -5}, {x: 8, y: 3}, {x: 8, y: -3}, {x: -12, y: 0}],
			"11,-5": [{x: 12, y: 0}, {x: 9, y: -8}],
			"9,-8": [{x: 11, y: -5}, {x: 8, y: -3}, {x: 6, y: -6}, {x: 8, y: -9}],
			"8,-9": [{x: 9, y: -8}, {x: 5, y: -11}, {x: 6, y: -6}],
			"5,-11": [{x: 8, y: -9}, {x: 0, y: -12}, {x: 0, y: -6}],
			"0,-12": [{x: 5, y: -11}, {x: -5, y: -11}, {x: 0, y: 12}],
			"-5,-11": [{x: 0, y: -12}, {x: -8, y: -9}],
			"-8,-9": [{x: -5, y: -11}, {x: -9, y: -8}, {x: -6, y: -6}],
			"-9,-8": [{x: -11, y: -5}, {x: -8, y: -3}, {x: -6, y: -6}, {x: -8, y: -9}],
			"-11,-5": [{x: -12, y: 0}, {x: -9, y: -8}],
			"6,6": [{x: 8, y: 9}, {x: 9, y: 8}, {x: 6, y: -6}, {x: -6, y: 6}, {x: 0, y: 0}],
			"6,-6": [{x: 8, y: -9}, {x: 9, y: -8}, {x: 6, y: 6}, {x: -6, y: -6}, {x: 0, y: 0}],
			"-6,-6": [{x: -8, y: -9}, {x: -9, y: -8}, {x: -6, y: 6}, {x: 6, y: -6}, {x: 0, y: 0}],
			"-6,6": [{x: -8, y: 9}, {x: -9, y: 8}, {x: -6, y: -6}, {x: 6, y: 6}, {x: 0, y: 0}],
			"6,0": [{x: 8, y: 3}, {x: 8, y: -3}, {x: 0, y: 6}, {x: 0, y: -6}],
			"-6,0": [{x: -8, y: 3}, {x: -8, y: -3}, {x: 0, y: 6}, {x: 0, y: -6}],
			"0,6": [{x: 6, y: 0}, {x: -6, y: 0}, {x: 5, y: 11}, {x: -5, y: 11}],
			"0,-6": [{x: 6, y: 0}, {x: -6, y: 0}, {x: 5, y: -11}, {x: -5, y: -11}],
			"-8,3": [{x: -6, y: 0}, {x: -12, y: 0}, {x: -9, y: 8}],
			"-8,-3": [{x: -6, y: 0}, {x: -12, y: 0}, {x: -9, y: -8}],
			"8,3": [{x: 6, y: 0}, {x: 12, y: 0}, {x: 9, y: 8}],
			"8,-3": [{x: 6, y: 0}, {x: 12, y: 0}, {x: 9, y: -8}]
		};
		
		return GOLDEN_LINES[coordStr] || [];
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