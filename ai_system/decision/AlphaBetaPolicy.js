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

import { readFileSync } from 'fs';
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

        // Load config once at initialization
        try {
            const configPath = new URL('../config/AIConfig.json', import.meta.url);
            const rawConfig = JSON.parse(readFileSync(configPath, 'utf8'));
            
            // Ensure decision section exists with proper fallback
            this.config = {
                decision: {
                    default_search_depth: rawConfig.decision?.default_search_depth || 3,
                    strategy: rawConfig.decision?.strategy || 'random'
                }
            };
        } catch (e) {
            // Safe fallback if config is missing or invalid
            this.config = { decision: { default_search_depth: 3 } };
        }
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

        // 1. DYNAMIC DEPTH: Fallback chain ensures the AI never has "null" depth
        const searchDepth = context.searchDepth || 
                            this.config.decision?.default_search_depth || 
                            3;

        // 2. CONTEXT BRIDGE: Arena provides board state; we provide turn state
        const turnContext = context.turnContext || {
            movedPieceCoord: null,
            usedAbilities: new Set()
        };

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
        
        // Run search with configurable depth
        this.search.bestMove = null;
        this.search.alphaBeta(
            rootNode,
            searchDepth, // <--- Now fully configurable
            -Infinity,  // alpha
            +Infinity,  // beta
            true,  // maximizingPlayer
            { 
                gameLogic, 
                playerManager, 
                rng, 
                turnContext // <--- Crucial bridge for abilities
            }
        );
        
        return this.search.bestMove;
    }
}
