/**
 * AlphaBetaPolicy.js
 * * Thin adapter exposing AlphaBetaSearch via Arena policy interface.
 * Fixed to handle async weight initialization while keeping search synchronous.
 * * @author AI Decision Layer
 * @version 1.1
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
        this.config = null;
        this.initialized = false;
    }

    async initialize() {
        if (this.initialized) return;
        await this.search.evaluator.loadWeights();
        this.initialized = true;
    }

    async loadConfig() {
        if (this.config) return this.config;
        const configPath = new URL('../config/AIConfig.json', import.meta.url);

        try {
            if (typeof process !== 'undefined' && process.versions && process.versions.node) {
                const fs = await import('fs/promises');
                const { fileURLToPath } = await import('url');
                const path = fileURLToPath(configPath);
                const content = await fs.readFile(path, 'utf8');
                this.config = JSON.parse(content);
            } else {
                const response = await fetch(configPath, { cache: 'no-store' });
                if (!response.ok) throw new Error(`Status: ${response.status}`);
                this.config = await response.json();
            }
            return this.config;
        } catch (error) {
            console.warn('AlphaBetaPolicy: Using default config due to load error');
            return { decision: { default_search_depth: 3 } };
        }
    }

    /**
     * Arena Policy Entry Point
     */
    async selectMove(gameState, context) {
        const { rng, gameLogic, playerManager } = context;

        // 1. PRE-SEARCH ASYNC WORK
        // Ensure weights and configs are loaded before we start the CPU-heavy search
        await this.initialize();
        const config = await this.loadConfig();

        // 2. SETUP PARAMETERS
        const searchDepth = context.searchDepth ||
                            config.decision?.default_search_depth ||
                            3;

        const turnContext = context.turnContext || {
            movedPieceCoord: null,
            usedAbilities: new Set()
        };

        // 3. INITIALIZE SEARCH NODES
        const currentPlayer = playerManager.getCurrentPlayer().name;
        const rootSimState = new SimulatedGameState(
            gameState,
            currentPlayer,
            0,      // simulationDepth
            null,   // parentState
            null    // lastAction
        );
        
        const rootNode = new SearchNode(rootSimState, null, null, 0);
        
        // 4. RUN SYNCHRONOUS SEARCH
        // We do NOT 'await' this. Searching must block the thread to prevent
        // the UI from rendering partial "glitch" moves.
        this.search.bestMove = null;
        this.search.alphaBeta(
            rootNode,
            searchDepth,
            -Infinity,  // alpha
            +Infinity,  // beta
            true,       // maximizingPlayer
            { 
                gameLogic, 
                playerManager, 
                rng, 
                turnContext 
            }
        );
        
        // 5. RETURN BEST MOVE
        return this.search.bestMove;
    }
}