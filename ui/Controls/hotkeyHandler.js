// UI/Controls/hotkeyHandler.js - Keyboard shortcut handler
export class HotkeyHandler {
    constructor(setupManager, playerManager, gameLogic) {
        this.setupManager = setupManager;
        this.playerManager = playerManager;
        this.gameLogic = gameLogic;
        
        // Cycling state
        this.cycleIndex = 0;
        this.lastHotkeyType = null;
        
        // Hotkey mappings
        this.setupKeyMap = {
            '1': 'ruby',
            '2': 'pearl',
            '3': 'amber',
            '4': 'jade'
        };
        
        this.gameKeyMap = {
            '1': 'ruby',
            '2': 'pearl',
            '3': 'amber',
            '4': 'jade',
            '5': 'portal',
            '6': 'amalgam',
            '7': 'void'
        };
        
        // Callbacks (set by orchestrator)
        this.onPieceSelected = null; // Called after selection to trigger UI updates
        this.isGameEnded = null; // Function to check if game ended
        
        this.bindEvents();
    }
    
    bindEvents() {
        window.addEventListener('keydown', (event) => this.handleKeydown(event));
    }
    
    handleKeydown(event) {
        // Block if game ended
        if (this.isGameEnded && this.isGameEnded()) return;
        
        // Don't trigger while typing in inputs
        if (this.isTypingInInput()) return;
        
        // Route to setup or game handler
        if (this.setupManager.isSetupPhase) {
            this.handleSetupHotkey(event);
        } else {
            this.handleGameHotkey(event);
        }
    }
    
    handleSetupHotkey(event) {
        const currentPlayer = this.setupManager.getCurrentPlayer();
        
        // Only human setup uses hotkeys
        if (currentPlayer !== 'square') return;
        
        const pieceType = this.setupKeyMap[event.key];
        if (!pieceType) return;
        
        const counts = this.setupManager.getPieceCounts(currentPlayer);
        
        if (counts[pieceType] < 2) {
            this.setupManager.selectPiece(pieceType);
            
            // Trigger UI update callback
            if (this.onPieceSelected) {
                this.onPieceSelected();
            }
        }
        
        event.preventDefault();
    }
    
    handleGameHotkey(event) {
        const targetType = this.gameKeyMap[event.key];
        if (!targetType) return;
        
        const gameState = this.gameLogic.getState();
        const currentPlayer = this.playerManager.getCurrentPlayer();
        
        // Find pieces belonging to current player
        const playerPieces = Object.entries(gameState.pieces)
            .filter(([coord, piece]) => {
                const isCorrectType = piece.type.toLowerCase().includes(targetType);
                const isSquare = piece.type.includes('Square');
                const isCircle = piece.type.includes('Circle');
                const isOwned = (currentPlayer.name === 'Player 1' && isSquare) ||
                                (currentPlayer.name === 'Player 2' && isCircle);
                return isCorrectType && isOwned;
            });
        
        if (playerPieces.length === 0) return;
        
        // Cycling logic
        if (this.lastHotkeyType === targetType) {
            this.cycleIndex = (this.cycleIndex + 1) % playerPieces.length;
        } else {
            this.cycleIndex = 0;
            this.lastHotkeyType = targetType;
        }
        
        // Get the coordinates of the chosen piece
        const [coordStr] = playerPieces[this.cycleIndex];
        const [x, y] = coordStr.split(',').map(Number);
        
        // Trigger selection via game logic
        this.gameLogic.handleClick(x, y);
        
        // Trigger UI update callback
        if (this.onPieceSelected) {
            this.onPieceSelected();
        }
    }
    
    isTypingInInput() {
        const el = document.activeElement;
        if (!el) return false;
        
        const tag = el.tagName.toLowerCase();
        return (
            tag === 'input' ||
            tag === 'textarea' ||
            el.isContentEditable === true
        );
    }
    
    reset() {
        this.cycleIndex = 0;
        this.lastHotkeyType = null;
    }
}