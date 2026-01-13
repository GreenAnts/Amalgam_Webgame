// systems/WinConditionSystem.js - Checks for win conditions
export class WinConditionSystem {
    constructor(gameState, playerManager) {
        this.gameState = gameState;
        this.playerManager = playerManager;
    }

    // Check if game has been won
    checkWin() {
        // Win condition 1: Void reaches opponent's Amalgam starting position
        // Squares win if voidSquare at (0,6) - Circle's Amalgam start
        const squareVoidAtGoal = this.gameState.getPiece('0,6');
        if (squareVoidAtGoal && squareVoidAtGoal.type === 'voidSquare') {
            return { winner: 'Player 1', method: 'reached goal' };
        }
        
        // Circles win if voidCircle at (0,-6) - Square's Amalgam start
        const circleVoidAtGoal = this.gameState.getPiece('0,-6');
        if (circleVoidAtGoal && circleVoidAtGoal.type === 'voidCircle') {
            return { winner: 'Player 2 (AI)', method: 'reached goal' };
        }
        
        // Win condition 2: All opponent's non-portal pieces eliminated
        let circleHasNonPortal = false;
        let squareHasNonPortal = false;
        
        const circleNonPortalTypes = [
            'rubyCircle', 'pearlCircle', 'amberCircle', 'jadeCircle', 'amalgamCircle', 'voidCircle'
        ];
        const squareNonPortalTypes = [
            'rubySquare', 'pearlSquare', 'amberSquare', 'jadeSquare', 'amalgamSquare', 'voidSquare'
        ];
        
        for (const coordStr in this.gameState.pieces) {
            const piece = this.gameState.pieces[coordStr];
            
            if (circleNonPortalTypes.includes(piece.type)) {
                circleHasNonPortal = true;
            }
            if (squareNonPortalTypes.includes(piece.type)) {
                squareHasNonPortal = true;
            }
            
            // Early exit if both players have pieces
            if (circleHasNonPortal && squareHasNonPortal) {
                break;
            }
        }
        
        // Squares win if Circles have no non-portal pieces
        if (!circleHasNonPortal) {
            return { winner: 'Player 1', method: 'elimination' };
        }
        
        // Circles win if Squares have no non-portal pieces
        if (!squareHasNonPortal) {
            return { winner: 'Player 2 (AI)', method: 'elimination' };
        }
        
        // No winner yet
        return null;
    }
}
