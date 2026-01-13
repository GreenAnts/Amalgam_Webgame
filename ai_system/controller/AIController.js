// controller/AIController.js
// SINGLE ENTRY POINT - Only file that communicates with game engine

import { ModeManager } from './ModeManager.js';
import { Logger } from '../utils/Logger.js';

export class AIController {
    constructor(gameLogic, playerManager) {
        this.gameLogic = gameLogic;
        this.playerManager = playerManager;
        this.modeManager = new ModeManager();
        this.logger = new Logger('AIController');
        
        this.turnState = {
            actionMade: false,
            lastActionCoord: null,
            abilitiesUsed: new Set() // Track which abilities used this turn
        };

        this.logger.info('AI Controller initialized');
    }


    /**
     * Primary interface for game engine
     * @returns {Object|null} Move object or null
     */
    async findBestMove(turnContext = {}, rng = null) { // Accept args
        // Logger.clearGlobalLogs(); // Optional: keeps logs clean
        this.logger.info('=== AI Turn Started ===');
        
        // Create the standard context object expected by inner layers
        const context = {
            rng: rng,
            turnContext: turnContext
        };
    
        try {
            const move = await this.modeManager.executeMode(
                this.gameLogic,
                this.playerManager,
                context // Pass the wrapper object
            );
            
            // ... logging ...
            return move;
        } catch (error) {
            this.logger.error('AI execution failed', error);
            // Fallback needs RNG too!
            if (rng) {
                const { RandomSelector } = await import('../decision/RandomSelector.js');
                const selector = new RandomSelector();
                return selector.selectRandomMove(this.gameLogic, this.playerManager, rng, turnContext);
            }
            return null;
        }
    }

    /**
     * Emergency fallback: always returns random legal move
     */
    fallbackToRandom() {
        this.logger.warn('Fallback to random move');
        // TODO: Implement random move selection
        return null;
    }

    /**
     * External interface to change AI mode
     */
    setMode(modeName) {
        this.modeManager.setMode(modeName);
        this.logger.info(`Mode changed to: ${modeName}`);
    }
    
    /**
     * Convert move format to game coordinates or ability execution
     */
    convertMoveToCoordinates(move) {
        if (!move || Object.keys(move).length === 0) return null;
    
        // 1. Handle Ability Actions
        if (move.type === 'ABILITY' || (move.type && move.type.startsWith('ABILITY_'))) {
            return {
                type: 'ABILITY',
                // If the search returned {type: "ABILITY", abilityType: "PORTAL_SWAP"}
                // OR if it returned {type: "ABILITY_PORTAL_SWAP"}
                abilityType: move.abilityType || move.type.replace('ABILITY_', ''),
                target: move.target,
                pieceCoord: move.pieceCoord,
                portalCoord: move.portalCoord
            };
        }
    
        // 2. Handle Standard Moves
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
    
    /**
     * Set AI difficulty (placeholder for future implementation)
     */
    setDifficulty(difficulty) {
        this.logger.info(`Difficulty set to: ${difficulty} (not yet implemented)`);
        // TODO: Implement difficulty settings when evaluation logic exists
    }

    /**
     * Reset turn state (call at start of AI turn)
     */
    resetTurnState() {
        this.turnState = {
            actionMade: false,
            lastActionCoord: null,
            abilitiesUsed: new Set()
        };
    }
}
