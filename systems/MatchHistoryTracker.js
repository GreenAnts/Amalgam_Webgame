// systems/MatchHistoryTracker.js - Tracks game moves and generates notation
import { BoardUtils } from '../core/BoardUtils.js';

export class MatchHistoryTracker {
    constructor() {
        this.boardUtils = new BoardUtils();
        
        // Setup phase tracking
        this.setupHistory = { S: [], C: [] };
        this.isSetupPhase = true;
        
        // Game phase tracking
        this.gameHistory = [];
        this.currentTurnNumber = 0;
        this.currentPlayer = null; // 'S' or 'C'
        this.currentTurnActions = [];
        
        // Track pending actions within a turn
        this.pendingMove = null;
        this.pendingEliminations = [];
        this.pendingAbilities = [];
    }

    // ============ SETUP PHASE ============

    trackSetupPlacement(player, pieceType, coordStr) {
        const playerCode = player === 'square' ? 'S' : 'C';
        const pieceCode = this.gemTypeToCode(pieceType);
        const coord = this.coordToString(coordStr);
        
        // Buffer setup placements instead of emitting immediately
        this.setupHistory[playerCode].push({
            pieceCode,
            coord
        });
    }


    finalizeSetup() {
        // Emit grouped setup notation per player
        ['S', 'C'].forEach(playerCode => {
            const placements = this.setupHistory[playerCode];
            if (placements.length === 0) return;

            let notation = `0${playerCode}:`;
            
            placements.forEach(p => {
                notation += ` ${p.pieceCode}${p.coord}`;
            });

            this.gameHistory.push(notation);
        });

        // Cleanup
        this.isSetupPhase = false;
        this.currentPlayer = null;
        this.setupHistory = { S: [], C: [] };
    }

    // ============ GAME PHASE ============

    startTurn(turnNumber, playerName) {
        this.currentTurnNumber = turnNumber;
        // Ensure we map player names to S and C correctly
        if (playerName === 'Player 1' || playerName === 'square') {
            this.currentPlayer = 'S';
        } else {
            this.currentPlayer = 'C';
        }
        this.currentTurnActions = [];
        
        // Reset pending actions
        this.pendingMove = null;
        this.pendingEliminations = [];
        this.pendingAbilities = [];
    }

    trackMove(pieceType, fromCoordStr, toCoordStr) {
        const pieceCode = this.pieceTypeToCode(pieceType);
        const fromCoord = this.coordToString(fromCoordStr);
        const toCoord = this.coordToString(toCoordStr);
        
        this.pendingMove = {
            type: 'move',
            pieceCode,
            fromCoord,
            toCoord
        };
    }

    trackSwap(portalCoordStr, targetPieceType, targetCoordStr) {
        const portalPieceCode = 'P';
        const portalCoord = this.coordToString(portalCoordStr);
        const targetPieceCode = this.pieceTypeToCode(targetPieceType);
        const targetCoord = this.coordToString(targetCoordStr);
        
        this.pendingMove = {
            type: 'swap',
            portalPieceCode,
            portalCoord,
            targetPieceCode,
            targetCoord
        };
    }

    trackElimination(pieceType, coordStr) {
        const pieceCode = this.pieceTypeToCode(pieceType);
        const coord = this.coordToString(coordStr);
        
        this.pendingEliminations.push({
            pieceCode,
            coord
        });
    }

    trackAbility(abilityType, params) {
        this.pendingAbilities.push({
            type: abilityType,
            params
        });
    }

    commitTurnActions() {
        if (this.currentPlayer === null) {
            console.error(
                'commitTurnActions called without startTurn()',
                { turn: this.currentTurnNumber }
            );
            return;
        }

        let turnNotation = `${this.currentTurnNumber}${this.currentPlayer}:`;
        
        // Add move or swap
        if (this.pendingMove) {
            if (this.pendingMove.type === 'move') {
                turnNotation += `${this.pendingMove.pieceCode}${this.pendingMove.fromCoord}~${this.pendingMove.toCoord}`;
            } else if (this.pendingMove.type === 'swap') {
                turnNotation += `P${this.pendingMove.portalCoord}@${this.pendingMove.targetPieceCode}${this.pendingMove.targetCoord}`;
            }
        }
        
        // Add eliminations from move/swap
        if (this.pendingEliminations.length > 0) {
            turnNotation += '!';
            this.pendingEliminations.forEach(elim => {
                turnNotation += `${elim.pieceCode}${elim.coord}`;
            });
        }
        
        // Add ALL abilities
        if (this.pendingAbilities.length > 0) {
            this.pendingAbilities.forEach(ability => {
                turnNotation += this.formatAbility(ability);
            });
        }
        
        this.gameHistory.push(turnNotation);
        
        // Reset for next turn
        this.pendingMove = null;
        this.pendingEliminations = [];
        this.pendingAbilities = []; // Clear array
        this.currentPlayer = null;
    }

    formatAbility(ability) {
        let notation = '#';
        
        switch (ability.type) {
            case 'fireball':
                notation += 'F';
                if (ability.params.amplified) notation += '+';  // Move this line up
                notation += this.coordToString(ability.params.ruby1);
                notation += this.coordToString(ability.params.ruby2);
                if (ability.params.eliminated.length > 0) {
                    notation += '!';
                    ability.params.eliminated.forEach(elim => {
                        notation += `${this.pieceTypeToCode(elim.type)}${this.coordToString(elim.coord)}`;
                    });
                }
                break;
                
            case 'tidalwave':
                notation += 'W';
                if (ability.params.amplified) notation += '+';  // Move this line up
                notation += this.coordToString(ability.params.pearl1);
                notation += this.coordToString(ability.params.pearl2);
                if (ability.params.eliminated.length > 0) {
                    notation += '!';
                    ability.params.eliminated.forEach(elim => {
                        notation += `${this.pieceTypeToCode(elim.type)}${this.coordToString(elim.coord)}`;
                    });
                }
                break;
                
            case 'sap':
                notation += 'S';
                if (ability.params.amplified) notation += '+';  // Move this line up
                notation += this.coordToString(ability.params.amber1);
                notation += this.coordToString(ability.params.amber2);
                if (ability.params.eliminated.length > 0) {
                    notation += '!';
                    ability.params.eliminated.forEach(elim => {
                        notation += `${this.pieceTypeToCode(elim.type)}${this.coordToString(elim.coord)}`;
                    });
                }
                break;
                
            case 'launch':
                notation += 'L';
                if (ability.params.amplified) notation += '+';  // Amplified first
                notation += `${this.pieceTypeToCode(ability.params.launchedPieceType)}`;
                notation += this.coordToString(ability.params.fromCoord);
                notation += '~';
                notation += this.coordToString(ability.params.toCoord);
                if (ability.params.eliminated.length > 0) {
                    notation += '!';
                    ability.params.eliminated.forEach(elim => {
                        notation += `${this.pieceTypeToCode(elim.type)}${this.coordToString(elim.coord)}`;
                    });
                }
                break;
        }
        
        return notation;
    }

    // ============ UTILITIES ============

    getRawHistory() {
        return this.gameHistory;
    }

    gemTypeToCode(gemType) {
        const map = {
            'ruby': 'rG',
            'pearl': 'pG',
            'amber': 'aG',
            'jade': 'jG'
        };
        return map[gemType.toLowerCase()] || gemType;
    }

    pieceTypeToCode(pieceType) {
        const type = pieceType.toLowerCase();
        
        if (type.includes('amalgam')) return 'A';
        if (type.includes('void')) return 'V';
        if (type.includes('portal')) return 'P';
        if (type.includes('ruby')) return 'rG';
        if (type.includes('pearl')) return 'pG';
        if (type.includes('amber')) return 'aG';
        if (type.includes('jade')) return 'jG';
        
        return '?';
    }

    coordToString(coordStr) {
        // Handle both string "x,y" and coord object {x, y}
        if (typeof coordStr === 'string') {
            const [x, y] = coordStr.split(',').map(Number);
            return `(${x},${y})`;
        } else if (coordStr.x !== undefined && coordStr.y !== undefined) {
            return `(${coordStr.x},${coordStr.y})`;
        }
        return '(?,?)';
    }

    reset() {
        this.setupHistory = { S: [], C: [] };
        this.isSetupPhase = true;
        this.gameHistory = [];
        this.currentTurnNumber = 0;
        this.currentPlayer = null;
        this.currentTurnActions = [];
        this.pendingMove = null;
        this.pendingEliminations = [];
        this.pendingAbilities = [];
    }
}
