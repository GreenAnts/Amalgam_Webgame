// systems/PlayerManager.js - Manages player turns and piece ownership
export class PlayerManager {
    constructor() {
        this.players = {
            'player1': { 
                name: 'Player 1', 
                pieceType: [
                    'amalgamSquare', 'voidSquare', 'portalSquare',
                    'rubySquare', 'pearlSquare', 'amberSquare', 'jadeSquare'
                ], 
                isAI: false, 
                turn: true 
            },
            'player2': { 
                name: 'Player 2 (AI)', 
                pieceType: [
                    'amalgamCircle', 'voidCircle', 'portalCircle',
                    'rubyCircle', 'pearlCircle', 'amberCircle', 'jadeCircle'
                ], 
                isAI: true, 
                turn: false 
            }
        };
        this.currentPlayerId = 'player1';
        this.turnCount = 1;
    }

    getCurrentPlayer() {
        return this.players[this.currentPlayerId];
    }

    switchTurn() {
        this.players[this.currentPlayerId].turn = false;
        if (this.currentPlayerId === 'player1') {
            this.currentPlayerId = 'player2';
        } else {
            this.currentPlayerId = 'player1';
            this.turnCount++;
        }
        this.players[this.currentPlayerId].turn = true;
        return this.getCurrentPlayer();
    }

    canMovePiece(pieceType) {
        const currentPlayer = this.getCurrentPlayer();
        return currentPlayer.pieceType.includes(pieceType);
    }
    
    getTurnCount() {
        return this.turnCount;
    }

    reset() {
        this.currentPlayerId = 'player1';
        this.turnCount = 1;
        this.players['player1'].turn = true;
        this.players['player2'].turn = false;
    }
}
