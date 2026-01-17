// controller/ModeManager.js
// Handles runtime mode switching based on AIConfig.json
// REFACTORED: Removed extraction phase, direct evaluation

import { Logger } from '../utils/Logger.js';
import { LayeredEvaluator } from '../evaluation/LayeredEvaluator.js';
import { DecisionEngine } from '../decision/DecisionEngine.js';
import { RandomSelector } from '../decision/RandomSelector.js';
import { AlphaBetaSearch } from '../search/AlphaBetaSearch.js';
import { MoveOrdering } from '../move_ordering/MoveOrdering.js';
import { TranspositionTable } from '../caching/TranspositionTable.js';
import { ThreatMapGenerator } from '../caching/ThreatMapGenerator.js';
import { FormationDetector } from '../caching/FormationDetector.js';

export class ModeManager {
    constructor() {
        this.logger = new Logger('ModeManager');
        this.currentMode = 'trace'; // Default
        this.config = null;
        this.loadConfig();
    }

    async loadConfig() {
        try {
            const response = await fetch('ai_system/config/AIConfig.json');
            this.config = await response.json();
            this.currentMode = this.config.runtime_mode;
            this.logger.info('Configuration loaded', { mode: this.currentMode });
        } catch (error) {
            this.logger.error('Failed to load config, using defaults', error);
            this.currentMode = 'fallback';
        }
    }

    getCurrentMode() {
        return this.currentMode;
    }

    setMode(modeName) {
        if (this.config.modes[modeName]) {
            this.currentMode = modeName;
        } else {
            this.logger.warn(`Invalid mode: ${modeName}, keeping ${this.currentMode}`);
        }
    }

    async executeMode(gameLogic, playerManager, context = {}) {  // ✅ Accept context
        const modeConfig = this.config.modes[this.currentMode];
        
        switch (this.currentMode) {
            case 'trace':
                return await this.executeTraceMode(gameLogic, playerManager, modeConfig, context);
    
            case 'fallback':
                return await this.executeFallbackMode(gameLogic, playerManager, modeConfig);
            
            case 'debug_idle':
                return this.executeDebugIdleMode(modeConfig);
            
            default:
                this.logger.error(`Unknown mode: ${this.currentMode}`);
                return null;
        }
    }

    async executeTraceMode(gameLogic, playerManager, modeConfig, context) {
        this.logger.info('--- TRACE MODE: Simplified Pipeline ---');
        
        const gameState = gameLogic.getState();
        
        // Step 1: Optional - Show pre-computed caches (for tracing only)
        if (modeConfig.show_caches) {
            this.logger.info('[1/3] Computing caches for trace...');
            
            const threatGen = new ThreatMapGenerator();
            const threatMap = threatGen.generate(gameState, playerManager);
            this.logger.data('Threat map', {
                player1Attacks: threatMap.player1Attacks.size,
                player2Attacks: threatMap.player2Attacks.size
            });
            
            const formationDetector = new FormationDetector();
            const formations = formationDetector.detectFormations(gameState, playerManager);
            this.logger.data('Formations', formations);
        }
        
        // Step 2: Evaluation (with lazy caching inside)
        if (modeConfig.enable_evaluation) {
            this.logger.info('[2/3] Evaluating position...');
            const evaluator = new LayeredEvaluator();
            const score = evaluator.evaluate(gameState, { gameLogic, playerManager, ...context });
            this.logger.data('Evaluation score', { score });
        }
        
        // Step 3: Decision
        if (modeConfig.enable_decision) {
            this.logger.info('[3/3] Making decision...');
            
            const tt = new TranspositionTable();
            const moveOrdering = new MoveOrdering(null);
            const evaluator = new LayeredEvaluator();
            const alphaBeta = new AlphaBetaSearch(evaluator, moveOrdering, tt);
            
            const decisionEngine = new DecisionEngine();
            decisionEngine.setSearchStrategy(alphaBeta);
            
            const move = decisionEngine.selectMove(gameLogic, playerManager, {
                rng: context.rng,
                turnContext: context.turnContext
            });
            
            return move;
        }
        
        // ADD THIS SAFETY FALLBACK:
        this.logger.warn('Decision engine not enabled - using fallback random');
        const selector = new RandomSelector();
        return selector.selectRandomMove(gameLogic, playerManager);
    }

    async executeFallbackMode(gameLogic, playerManager, modeConfig) {
        this.logger.info('--- FALLBACK MODE: Immediate Random ---');
        const selector = new RandomSelector();
        return selector.selectRandomMove(gameLogic, playerManager);
    }

    executeDebugIdleMode(modeConfig) {
        this.logger.info('--- DEBUG IDLE MODE: No Action ---');
        return null;
    }
}