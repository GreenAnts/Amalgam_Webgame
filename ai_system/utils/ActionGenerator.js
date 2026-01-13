// ai_system/utils/ActionGenerator.js
// Generates ALL legal actions (moves + abilities) for current player

export class ActionGenerator {
    /**
     * @param {GameLogic} gl 
     * @param {PlayerManager} pm
     * @param {string|null} movedPieceCoord - The piece that just moved
     * @param {Set} usedAbilities - Abilities already used this turn
     */
    generateAllActions(gl, pm, movedPieceCoord = null, usedAbilities = new Set()) {
        const actions = [];
        const isStartOfTurn = !movedPieceCoord;
        const currentPlayer = pm.getCurrentPlayer();

        // 1. Standard Moves (Only if no piece has moved yet)
        if (isStartOfTurn) {
            actions.push(...this._generateMoveActions(gl, currentPlayer));
        }

        // 2. Abilities (Check systems based on movedPieceCoord)
        actions.push(...this._generateAbilityActions(gl, pm, movedPieceCoord, usedAbilities));
        
        // 3. PASS Action (Allows AI to end turn instead of being forced to use an ability)
        // Only valid if we've already moved (start of turn PASS is illegal unless stuck)
        if (!isStartOfTurn && actions.length > 0) {
            actions.push({ type: 'PASS' });
        }

        return actions;
    }

    _generateMoveActions(gl, player) {
        const moves = [];
        const pieces = gl.getState().pieces;
        for (const [coord, piece] of Object.entries(pieces)) {
            if (!player.pieceType.includes(piece.type)) continue;
            const valid = gl.movementSystem.getValidMoves(coord);
            valid.forEach(m => moves.push({ type: 'MOVE', from: coord, to: `${m.x},${m.y}` }));
        }
        return moves;
    }

    _generateAbilityActions(gl, pm, movedCoord, used) {
        const abilities = [];

        // 1. Ruby Fireball
        if (!used.has('FIREBALL')) {
            const rubySystem = gl.getRubyFireballSystem();
            // Checking populates the system's internal targets
            if (rubySystem.checkFireball(movedCoord)) {
                for (const group of rubySystem.fireballTargets) {
                    for (const target of group.targets) {
                        abilities.push({
                            type: 'ABILITY_FIREBALL',
                            target: target,
                            // Store metadata for debugging if needed
                            desc: `Fireball at ${target}`
                        });
                    }
                }
            }
        }

        // 2. Pearl Tidal Wave
        if (!used.has('TIDALWAVE')) {
            const pearlSystem = gl.getPearlTidalwaveSystem();
            if (pearlSystem.checkTidalwave(movedCoord)) {
                for (const group of pearlSystem.tidalwaveTargets) {
                    if (group.targets.length > 0) {
                        // For tidal wave, hitting ANY target in the group activates the same wave
                        // We pick the first valid target coordinate to trigger it
                        abilities.push({
                            type: 'ABILITY_TIDALWAVE',
                            target: group.targets[0],
                            desc: `Tidal Wave via ${group.pearl1}-${group.pearl2}`
                        });
                    }
                }
            }
        }

        // 3. Amber Sap
        if (!used.has('SAP')) {
            const amberSystem = gl.getAmberSapSystem();
            if (amberSystem.checkSap(movedCoord)) {
                for (const group of amberSystem.sapTargets) {
                    if (group.targets.length > 0) {
                        abilities.push({
                            type: 'ABILITY_SAP',
                            target: group.targets[0],
                            desc: `Sap Line ${group.amber1}-${group.amber2}`
                        });
                    }
                }
            }
        }

        // 4. Jade Launch
        if (!used.has('LAUNCH')) {
            const jadeSystem = gl.getJadeLaunchSystem();
            if (jadeSystem.checkLaunch(movedCoord)) {
                for (const option of jadeSystem.launchOptions) {
                    for (const target of option.targets) {
                        abilities.push({
                            type: 'ABILITY_LAUNCH',
                            pieceCoord: option.pieceCoord,
                            target: target,
                            desc: `Launch piece at ${option.pieceCoord} to ${target}`
                        });
                    }
                }
            }
        }

        // 5. Portal Swap (Only available at start of turn)
        if (!movedCoord && !used.has('PORTAL_SWAP')) {
            const portalSystem = gl.getPortalSwapSystem();
            const state = gl.getState();
            const currentPlayer = pm.getCurrentPlayer();

            // We must simulate selecting each friendly portal to see valid swaps
            for (const [coord, piece] of Object.entries(state.pieces)) {
                // Must be my portal
                if (!currentPlayer.pieceType.includes(piece.type)) continue;
                if (!piece.type.includes('portal')) continue;

                // Simulate selection
                if (portalSystem.selectPortal(coord)) {
                    const targets = portalSystem.getTargets(); // Gets swap targets for this portal
                    for (const target of targets) {
                        abilities.push({
                            type: 'ABILITY_PORTAL_SWAP',
                            portalCoord: coord,
                            target: target,
                            desc: `Swap portal ${coord} with ${target}`
                        });
                    }
                    // Clean up simulation
                    portalSystem.reset(); 
                }
            }
        }

        return abilities;
    }
}