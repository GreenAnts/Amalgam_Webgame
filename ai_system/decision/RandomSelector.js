// decision/RandomSelector.js
// Random action selection (moves + abilities)

import { ActionGenerator } from '../utils/ActionGenerator.js';

export class RandomSelector {
    constructor() {
        this.generator = new ActionGenerator();
    }

    selectRandomMove(gameLogic, playerManager, rng = null, turnContext = null) {
        if (!rng) {
            throw new Error('RandomSelector requires RNG for determinism. Math.random() is forbidden.');
        }
        
        const nextInt = (max) => rng.nextInt(max);
        
        // Default context if null
        const context = turnContext || { movedPieceCoord: null, usedAbilities: new Set() };

        const allActions = this.generator.generateAllActions(
            gameLogic, 
            playerManager, 
            context.movedPieceCoord, 
            context.usedAbilities
        );

        if (allActions.length === 0) return null;

        const selected = allActions[nextInt(allActions.length)];
        return this.actionToMove(selected);
    }

    actionToMove(action) {
        switch (action.type) {
            case 'MOVE':
                return { from: action.from, to: action.to };
            case 'ABILITY_FIREBALL':
                return { type: 'ABILITY', abilityType: 'FIREBALL', target: action.target };
            case 'ABILITY_TIDALWAVE':
                return { type: 'ABILITY', abilityType: 'TIDALWAVE', target: action.target };
            case 'ABILITY_SAP':
                return { type: 'ABILITY', abilityType: 'SAP', target: action.target };
            case 'ABILITY_LAUNCH':
                return { type: 'ABILITY', abilityType: 'LAUNCH', pieceCoord: action.pieceCoord, target: action.target };
            case 'ABILITY_PORTAL_SWAP':
                return { type: 'ABILITY', abilityType: 'PORTAL_SWAP', portalCoord: action.portalCoord, target: action.target };
            case 'PASS':
                return { type: 'PASS' };
            default:
                return null;
        }
    }
}