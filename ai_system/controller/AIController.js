// controller/AIController.js // SINGLE ENTRY POINT - Only file that communicates with game engine

import { ModeManager } from './ModeManager.js'; import { Logger } from '../utils/Logger.js';

export class AIController {

    constructor(gameLogic, playerManager) {
        this.gameLogic = gameLogic; this.playerManager = playerManager;
        this.modeManager = new ModeManager();
        this.logger = new Logger('AIController');

        // Setup handler - lazy loaded only if needed
        this.setupHandler = null;
        this.setupBookLoaded = false;
        
        this.turnState = {
            actionMade: false,
            lastActionCoord: null,
            abilitiesUsed: new Set()
        };

        this.logger.info('AI Controller initialized');
    }

    /**
     * Primary interface for game engine
     * NOW HANDLES: Setup phase detection and delegation
     * @returns {Object|null} Move object or null
     */
    async findBestMove(turnContext = {}, rng = null) {
        this.logger.info('=== AI Turn Started ===');
        
        try {
            // CRITICAL: Check if in setup phase first
            if (this.isInSetupPhase()) {
                this.logger.info('Setup phase detected - using opening book');
                return await this.handleSetupPlacement(rng);
            }
            
            // Normal gameplay - delegate to ModeManager
            const context = {
                rng: rng,
                turnContext: turnContext
            };
            
            const move = await this.modeManager.executeMode(
                this.gameLogic,
                this.playerManager,
                context
            );
            
            this.logger.info('Move selected', { move });
            return move;
            
        } catch (error) {
            this.logger.error('AI execution failed', error);
            
            // Fallback to random
            if (rng) {
                const { RandomSelector } = await import('../decision/RandomSelector.js');
                const selector = new RandomSelector();
                return selector.selectRandomMove(this.gameLogic, this.playerManager, rng, turnContext);
            }
            return null;
        }
    }

    /**
     * Check if game is in setup phase
     * CRITICAL: Use turn count, NOT gem count
     * Gem count drops when pieces are eliminated, causing false positives
     * @returns {boolean}
     */
    isInSetupPhase() {
        // Setup phase only happens at turn 0 (before turn 1 starts)
        if (this.playerManager.getTurnCount() > 0) {
            return false;
        }
        
        // Fallback: Check if GameLogic has the method (browser mode)
        if (typeof this.gameLogic.isInSetupPhase === 'function') {
            return this.gameLogic.isInSetupPhase();
        }
        
        // Double fallback: count gems (but only if turn count is 0)
        const gameState = this.gameLogic.getState();
        let gemCount = 0;
        
        for (const piece of Object.values(gameState.pieces)) {
            const type = piece.type.toLowerCase();
            if (type.includes('ruby') || type.includes('pearl') || 
                type.includes('amber') || type.includes('jade')) {
                gemCount++;
            }
        }
        
        return gemCount < 16;
    }

    /**
     * Handle setup phase placement using opening book
     * @param {Object} rng - Random number generator (for seed)
     * @returns {Object} Setup move {type: 'SETUP', gem: 'ruby', position: '4,-8'}
     */
    async handleSetupPlacement(rng) {
        try {
            // Lazy load SetupBookHandler only when needed
            if (!this.setupHandler) {
                const { SetupBookHandler } = await import('../utils/SetupBookHandler.js');
                this.setupHandler = new SetupBookHandler();
            }
            
            // Load opening book if not already loaded
            if (!this.setupBookLoaded) {
                await this.setupHandler.loadBook();
                this.setupBookLoaded = true;
            }
            
            // Determine current player side
            // 'squares' vs 'circles' (plural) for Book keys
            const currentPlayer = this.playerManager.getCurrentPlayer();
            const sideKey = currentPlayer.name.includes('1') ? 'squares' : 'circles';
            
            // Use RNG seed for deterministic setup selection
            const seed = rng ? rng.seed : Date.now();
            
            // Select setup for this player
            const setup = this.setupHandler.selectSetup(sideKey, seed);
            
            // Get next placement based on current board state
            const gameState = this.gameLogic.getState();
            // Note: getNextPlacement handles singular/plural normalization internally now
            const placement = this.setupHandler.getNextPlacement(setup, gameState, sideKey);
            
            if (!placement) {
                this.logger.warn('Setup complete but still in setup phase - returning null');
                return null;
            }
            
            this.logger.info('Setup placement selected', { placement });
            
            // Return in format that Main.js can interpret
            return {
                type: 'SETUP',
                gem: placement.gem,
                position: placement.position
            };
            
        } catch (error) {
            this.logger.error('Setup placement failed', error);
            return null;
        }
    }

    /**
     * Convert move format to game coordinates or ability execution
     */
    convertMoveToCoordinates(move) {
        if (!move || Object.keys(move).length === 0) return null;

        // Handle Setup Actions
        if (move.type === 'SETUP') {
            return {
                type: 'SETUP',
                gem: move.gem,
                position: move.position
            };
        }

        // Handle Ability Actions
        if (move.type === 'ABILITY' || (move.type && move.type.startsWith('ABILITY_'))) {
            return {
                type: 'ABILITY',
                abilityType: move.abilityType || move.type.replace('ABILITY_', ''),
                target: move.target,
                pieceCoord: move.pieceCoord,
                portalCoord: move.portalCoord
            };
        }

        // Handle Standard Moves
        if (move.from && move.to) {
            const fromParts = move.from.split(',').map(Number);
            const toParts = move.to.split(',').map(Number);
            return {
                type: 'MOVE',
                selectX: fromParts[0], selectY: fromParts[1],
                moveX: toParts[0], moveY: toParts[1]
            };
        }
        
        return null;
    }

    setMode(modeName) {
        this.modeManager.setMode(modeName);
        this.logger.info(`Mode changed to: ${modeName}`);
    }

    async setPolicy(policyName) {
        try {
            const { createPolicy } = await import('../decision/PolicyRegistry.js');
            this.currentPolicy = createPolicy(policyName);
            this.currentPolicyMode = 'POLICY';
            this.logger.info(`Policy set to: ${policyName}`);
        } catch (error) {
            this.logger.error(`Failed to create policy ${policyName}`, error);
            this.currentPolicy = null;
            this.currentPolicyMode = 'DEFAULT';
        }
    }

    resetTurnState() {
        this.turnState = {
            actionMade: false,
            lastActionCoord: null,
            abilitiesUsed: new Set()
        };
    }

}