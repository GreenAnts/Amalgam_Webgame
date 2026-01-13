// ui/UIManager.js - UI update and event handling
export class UIManager {
    constructor(elements) {
        this.turnCounterDisplay = elements.turnCounterDisplay;
    }

    updatePlayerInfo(turnCount, currentPlayer) {
        this.turnCounterDisplay.textContent = "Turn " + turnCount;
        
        // Update turn indicator based on current player
        if (window.updateTurnIndicator) {
            window.updateTurnIndicator(currentPlayer.name);
        }
    }
}
