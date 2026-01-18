/**
 * AlphaBetaPolicy.js
 * 
 * Thin adapter exposing AlphaBetaSearch via Arena policy interface.
 * Uses adapter pattern to avoid duplicating search logic.
 * 
 * Session: 7 — Alpha-Beta Search Implementation
 * 
 * @author AI Decision Layer
 * @version 0.1
 */

import { AlphaBetaSearch } from '../search/AlphaBetaSearch.js';
import { SimulatedGameState } from '../simulation/SimulatedGameState.js';
import { SearchNode } from '../search/SearchNode.js';
import { LayeredEvaluator } from '../evaluation/LayeredEvaluator.js';
import { MoveOrdering } from '../move_ordering/MoveOrdering.js';
import { TranspositionTable } from '../caching/TranspositionTable.js';

export class AlphaBetaPolicy {
    constructor() {
        const evaluator = new LayeredEvaluator();
        const moveOrdering = new MoveOrdering(null);
        const tt = new TranspositionTable();
        
        this.search = new AlphaBetaSearch(evaluator, moveOrdering, tt);
    }
    
    /**
     * Select move using alpha-beta search
     * 
     * @param {Object} gameState - Game state snapshot
     * @param {Object} context - {rng, gameLogic, playerManager}
     * @returns {Object} Selected move
     */
    async selectMove(gameState, context) {
        const { rng, gameLogic, playerManager } = context;
        
        // Create root simulation state
        const currentPlayer = playerManager.getCurrentPlayer().name;
        const rootSimState = new SimulatedGameState(
            gameState,
            currentPlayer,
            0,      // simulationDepth
            null,   // parentState
            null    // lastAction
        );
        
        // Create root search node
        const rootNode = new SearchNode(rootSimState, null, null, 0);
        
        // Run search (depth 3)
        this.search.bestMove = null;
        this.search.alphaBeta(
            rootNode,
            3,  // depth
            -Infinity,  // alpha
            +Infinity,  // beta
            true,  // maximizingPlayer
            { 
                gameLogic, 
                playerManager, 
                rng, 
                turnContext: { 
                    movedPieceCoord: null, 
                    usedAbilities: new Set() 
                } 
            }
        );
        
        return this.search.bestMove;
    }
}