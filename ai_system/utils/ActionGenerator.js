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
            
            // Only cap at extreme move counts (keep phasing viable)
            const moveLimit = 100; // Increased from 50
            const limitedMoves = valid.slice(0, moveLimit);
            
            if (valid.length > moveLimit) {
                console.warn(`Piece at ${coord} has ${valid.length} moves, limiting to ${moveLimit}`);
            }
            
            limitedMoves.forEach(m => moves.push({ type: 'MOVE', from: coord, to: `${m.x},${m.y}` }));
        }
        
        return moves;
    }

    _generateAbilityActions(gl, pm, movedCoord, used) {
        const abilities = [];
    
        // 1. Ruby Fireball - ONE action per formation (all targets in that direction)
        if (!used.has('FIREBALL')) {
            const rubySystem = gl.getRubyFireballSystem();
            if (rubySystem.checkFireball(movedCoord)) {
                for (const group of rubySystem.fireballTargets) {
                    // One action per formation - targets handled by system
                    abilities.push({
                        type: 'ABILITY_FIREBALL',
                        target: group.targets[0], // System handles direction
                        formationData: group, // Store for simulation
                        desc: `Fireball via ${group.ruby1}-${group.ruby2}`
                    });
                }
            }
        }
    
        // 2. Pearl Tidal Wave - ONE action per formation
        if (!used.has('TIDALWAVE')) {
            const pearlSystem = gl.getPearlTidalwaveSystem();
            if (pearlSystem.checkTidalwave(movedCoord)) {
                for (const group of pearlSystem.tidalwaveTargets) {
                    if (group.targets.length > 0) {
                        abilities.push({
                            type: 'ABILITY_TIDALWAVE',
                            target: group.targets[0], // Representative target
                            formationData: group, // Full AOE data
                            desc: `Tidal Wave via ${group.pearl1}-${group.pearl2}`
                        });
                    }
                }
            }
        }
    
        // 3. Amber Sap - ONE action per amber pair
        if (!used.has('SAP')) {
            const amberSystem = gl.getAmberSapSystem();
            if (amberSystem.checkSap(movedCoord)) {
                for (const group of amberSystem.sapTargets) {
                    if (group.targets.length > 0) {
                        abilities.push({
                            type: 'ABILITY_SAP',
                            target: group.targets[0], // Representative target
                            formationData: group, // Full line data
                            desc: `Sap Line ${group.amber1}-${group.amber2}`
                        });
                    }
                }
            }
        }
    
        // 4. Jade Launch - ONE action per (piece, landing) combination
        if (!used.has('LAUNCH')) {
            const jadeSystem = gl.getJadeLaunchSystem();
            if (jadeSystem.checkLaunch(movedCoord)) {
                for (const option of jadeSystem.launchOptions) {
                    for (const target of option.targets) {
                        abilities.push({
                            type: 'ABILITY_LAUNCH',
                            pieceCoord: option.pieceCoord,
                            target: target,
                            formationData: option, // Jade pair data
                            desc: `Launch ${option.pieceCoord} to ${target}`
                        });
                    }
                }
            }
        }
    
        // 5. Portal Swap (Only at start of turn)
        if (!movedCoord && !used.has('PORTAL_SWAP')) {
            const portalSystem = gl.getPortalSwapSystem();
            const state = gl.getState();
            const currentPlayer = pm.getCurrentPlayer();
    
            for (const [coord, piece] of Object.entries(state.pieces)) {
                if (!currentPlayer.pieceType.includes(piece.type)) continue;
                if (!piece.type.includes('portal')) continue;
    
                if (portalSystem.selectPortal(coord)) {
                    const targets = portalSystem.getTargets();
                    for (const target of targets) {
                        abilities.push({
                            type: 'ABILITY_PORTAL_SWAP',
                            portalCoord: coord,
                            target: target,
                            desc: `Swap portal ${coord} with ${target}`
                        });
                    }
                    portalSystem.reset();
                }
            }
        }
    
        return abilities;
    }
}