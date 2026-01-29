// main.js - Main game orchestrator
import { GameLogic } from './GameLogic.js';
import { VictoryNotification } from './ui/Overlays/victoryNotification.js';
import { HotkeyHandler } from './ui/Controls/hotkeyHandler.js';
import { AIDifficultyManager } from './ui/Controls/aiDifficultyManager.js';
import { PlayerManager } from './systems/PlayerManager.js';
import { BoardRenderer } from './ui/BoardRenderer.js';
import { PieceRenderer } from './ui/PieceRenderer.js';
import { IndicatorRenderer } from './ui/IndicatorRenderer.js';
import { UIManager } from './ui/UIManager.js';
import { AbilityButtons } from './ui/AbilityButtons.js';
import { SetupManager } from './systems/SetupManager.js';
import { SetupUI } from './ui/SetupUI.js';
import { MatchHistoryTracker } from './systems/MatchHistoryTracker.js';
import { AIController } from './ai_system/controller/AIController.js';  //AI System
import { getProjectRoot } from './paths.js';
import { AnimationManager } from './ui/AnimationManager.js';

window.onload = function() {
    // Get canvas and UI elements
    const canvas = document.getElementById('gameCanvas');
    const ctx = canvas.getContext('2d');
    
    const uiElements = {
        turnCounterDisplay: document.getElementById('turnCounterDisplay')
    };
    
    const resetButton = document.getElementById('confirmRestart');

    const root = getProjectRoot();
    // Initialize systems
    const playerManager = new PlayerManager();
    const gameLogic = new GameLogic(playerManager);
    const boardRenderer = new BoardRenderer(ctx, canvas);
    let { originX, originY } = boardRenderer.getOrigin();
    const pieceRenderer = new PieceRenderer(ctx, originX, originY, boardRenderer.scale);
    const indicatorRenderer = new IndicatorRenderer(ctx, originX, originY, boardRenderer.scale);
    const uiManager = new UIManager(uiElements);
    const aiController = new AIController(gameLogic, playerManager);
    const abilityButtons = new AbilityButtons(canvas, ctx);
    const setupManager = new SetupManager(gameLogic.getGameState(), playerManager);
    const setupUI = new SetupUI(canvas, ctx);
    const matchHistoryTracker = new MatchHistoryTracker();
    const animationManager = new AnimationManager(canvas, ctx, boardRenderer, pieceRenderer);
    const victoryModal = new VictoryNotification(matchHistoryTracker);

    victoryModal.onReset = handleResetClick;
    victoryModal.onClose = () => {
        updateActionButtonStates();
    };

    // Initialize hotkey handler
    const hotkeyHandler = new HotkeyHandler(setupManager, playerManager, gameLogic);
    hotkeyHandler.isGameEnded = () => victoryModal.isGameEnded();
    hotkeyHandler.onPieceSelected = () => {
        updateAbilityButtonStates();
        drawBoard();
    };

    // Initialize AI difficulty manager
    const aiDifficultyManager = new AIDifficultyManager(
        aiController,
        document.getElementById('aiDifficultyDropdown'),
        {
            overlay: document.getElementById('aiStrategyConfirmOverlay'),
            confirmBtn: document.getElementById('confirmAIStrategy'),
            cancelBtn: document.getElementById('cancelAIStrategy'),
            dontAskCheckbox: document.getElementById('aiStrategyDontAskAgain')
        }
    );
    aiDifficultyManager.isGameEnded = () => victoryModal.isGameEnded();
    aiDifficultyManager.onStrategyChanged = () => {
        // Any UI updates needed after strategy change
    };
    
    // Load difficulties on startup
    aiDifficultyManager.initialize();

    let clickEpoch = 0;
    let currentClickEpoch = 0;

    // Make these available to AILogic
    window.matchHistoryTracker = matchHistoryTracker;



    // Ability system references
    const portalSwapSystem = gameLogic.getPortalSwapSystem();
    const rubyFireballSystem = gameLogic.getRubyFireballSystem();
    const pearlTidalwaveSystem = gameLogic.getPearlTidalwaveSystem();
    const amberSapSystem = gameLogic.getAmberSapSystem();
    const jadeLaunchSystem = gameLogic.getJadeLaunchSystem();
    const winConditionSystem = gameLogic.getWinConditionSystem();
    
    // Track game state
    let moveMadeThisTurn = false;
    let lastMovedPieceCoord = null;
    let launchUsedThisTurn = false;
    let pendingAIStrategy = null; // Stores AI strategy selected after game end
    
    function drawBoard() {
        boardRenderer.render();
        const gameState = gameLogic.getState();
        
        // Update both renderers' origins and scale in case canvas resized
        const { originX, originY } = boardRenderer.getOrigin();
        pieceRenderer.updateOrigin(originX, originY, boardRenderer.scale);
        indicatorRenderer.updateOrigin(originX, originY, boardRenderer.scale);
        
        // If in setup phase, draw placement regions BEFORE pieces
        if (setupManager.isSetupPhase) {
            setupUI.renderPlacementRegions(setupManager, originX, originY, boardRenderer.scale);
        }
        
        // Draw all pieces (skip hidden pieces being animated)
        for (const coordStr in gameState.pieces) {
            // Skip pieces being animated
            if (animationManager.isHidden(coordStr)) continue;
            
            pieceRenderer.drawPiece(coordStr, gameState.pieces[coordStr]);
        }

        // Render active animations on top
        animationManager.render();
        
        // If in setup phase, show setup tray
        if (setupManager.isSetupPhase) {
            setupUI.render(setupManager);
        } else {
            // Normal game - draw selected piece highlight
            indicatorRenderer.drawSelectedPieceHighlight(
                gameState.selectedPieceCoord, 
                gameState.pieces
            );
            // Draw movement indicators for selected piece
            if (gameState.selectedPieceCoord && !setupManager.isSetupPhase) {
                const currentPlayer = playerManager.getCurrentPlayer();
                const selectedPiece = gameState.pieces[gameState.selectedPieceCoord];
                
                // Only show if it's the player's piece, no abilities are active, AND no move made yet
                if (selectedPiece && 
                    playerManager.canMovePiece(selectedPiece.type) &&
                    !moveMadeThisTurn &&  // NEW: Don't show if move already made
                    !portalSwapSystem.isSwapActive() &&
                    !rubyFireballSystem.isFireballActive() &&
                    !pearlTidalwaveSystem.isTidalwaveActive() &&
                    !amberSapSystem.isSapActive() &&
                    !jadeLaunchSystem.isLaunchActive()) {
                    
                    const validMoves = gameLogic.getValidMoves(gameState.selectedPieceCoord);
                    
                    // DEDUPLICATE: Use Set to remove duplicate coordinates
                    const uniqueMoveCoords = [...new Set(validMoves.map(move => `${move.x},${move.y}`))];
                    
                    indicatorRenderer.drawMovementIndicators(uniqueMoveCoords);
                }
            }
            
            // Draw ability target indicators
            if (rubyFireballSystem.isFireballActive()) {
                const targets = rubyFireballSystem.getAllTargets();
                indicatorRenderer.drawTargetIndicators(targets);
            }
            
            if (pearlTidalwaveSystem.isTidalwaveActive()) {
                const tidalwaveData = pearlTidalwaveSystem.getAllTidalwaveData();
                indicatorRenderer.drawTidalwaveIndicators(tidalwaveData);
            }
            
            if (amberSapSystem.isSapActive()) {
                const sapData = amberSapSystem.getAllSapData();
                indicatorRenderer.drawAmberSapIndicators(sapData);
            }
            
            if (jadeLaunchSystem.isLaunchActive()) {
                if (jadeLaunchSystem.isPieceSelectionPhase()) {
                    const launchablePieces = jadeLaunchSystem.getLaunchablePieces();
                    indicatorRenderer.drawJadeLaunchPieceIndicators(launchablePieces, gameState.pieces);
                } else if (jadeLaunchSystem.isTargetSelectionPhase()) {
                    indicatorRenderer.drawJadeLaunchTargetIndicators(jadeLaunchSystem.selectedTargets);
                }
            }
            
            if (portalSwapSystem.isSwapActive()) {
                const swapTargets = portalSwapSystem.getTargets();
                indicatorRenderer.drawPortalSwapIndicators(swapTargets);
            }
            
            // Draw ability buttons
            abilityButtons.render();
        }
    }

    // AI Setup Logic
    function handleAISetup() {
        console.log('[handleAISetup] Called');
        
        if (!setupManager.isSetupPhase) {
            console.log('[handleAISetup] Not in setup phase, returning');
            return;
        }
        
        if (setupManager.getCurrentPlayer() !== 'circle') {
            console.log('[handleAISetup] Not AI turn, returning');
            return;
        }
        
        console.log('[handleAISetup] AI turn confirmed');
        
        if (window.updateTurnIndicator) {
            window.updateTurnIndicator('Player 2 (AI)');
        }
        
        // Use opening book for AI setup placement
        (async () => {
            try {
                console.log('[handleAISetup] Starting async setup logic');
                
                // Ensure RNG exists
                if (!window.currentGameRNG) {
                    window.currentGameRNG = {
                        seed: Date.now(),
                        nextInt: function(max) {
                            this.seed = (this.seed * 1664525 + 1013904223) % 4294967296;
                            return Math.floor((this.seed / 4294967296) * max);
                        }
                    };
                    console.log('[handleAISetup] Created RNG');
                }
                
                // Import setup handler
                const { SetupBookHandler } = await import('./ai_system/utils/SetupBookHandler.js');
                console.log('[handleAISetup] Imported SetupBookHandler');
                
                // Initialize if needed
                if (!window.aiSetupHandler) {
                    console.log('[handleAISetup] Creating new SetupBookHandler');
                    window.aiSetupHandler = new SetupBookHandler();
                    await window.aiSetupHandler.loadBook();
                    console.log('[handleAISetup] Book loaded');
                }
                
                // Get current player and select setup
                const side = 'circles';
                const seed = window.currentGameRNG.seed;
                console.log('[handleAISetup] Selecting setup with seed:', seed);
                
                const setup = window.aiSetupHandler.selectSetup(side, seed);
                console.log('[handleAISetup] Setup selected:', setup);
                
                // Get next placement
                // Get FRESH state - must be called here to see pieces placed by setupManager
                const gameState = gameLogic.getState();
                console.log('[handleAISetup] Getting next placement, gameState pieces count:', Object.keys(gameState.pieces).length);

                const placement = window.aiSetupHandler.getNextPlacement(setup, gameState, side);

                console.log('[handleAISetup] Placement returned:', placement);
                
                if (!placement) {
                    console.error('[handleAISetup] No placement returned!');
                    return;
                }
                
                // Execute placement
                const setupPlayer = setupManager.getCurrentPlayer();
                console.log('[handleAISetup] Setup player:', setupPlayer);
                
                console.log('[handleAISetup] Selecting piece:', placement.gem);
                const selectSuccess = setupManager.selectPiece(placement.gem);
                console.log('[handleAISetup] Select success:', selectSuccess);
                
                if (!selectSuccess) {
                    console.error('[handleAISetup] Failed to select piece!');
                    return;
                }
                
                console.log('[handleAISetup] Placing piece at:', placement.position);
                const result = setupManager.placePiece(placement.position);
                console.log('[handleAISetup] Place result:', result);
                
                if (result.success) {
                    matchHistoryTracker.trackSetupPlacement(
                        setupPlayer,
                        placement.gem,
                        placement.position
                    );
                    
                    drawBoard();
                    
                    if (result.setupComplete) {
                        console.log('[handleAISetup] Setup complete!');
                        matchHistoryTracker.finalizeSetup();
                        
                        const firstPlayer = playerManager.getCurrentPlayer();
                        matchHistoryTracker.startTurn(1, firstPlayer.name);
                        
                        updateLogDisplay();
                        
                        if (window.updateTurnIndicator) {
                            window.updateTurnIndicator(playerManager.getCurrentPlayer().name);
                        }
                        uiManager.updatePlayerInfo(
                            playerManager.getTurnCount(),
                            playerManager.getCurrentPlayer()
                        );
                        updateAbilityButtonStates();
                    } else {
                        const nextSetupPlayer = setupManager.getCurrentPlayer();
                        const nextPlayerName = nextSetupPlayer === 'square' ? 'Player 1' : 'Player 2 (AI)';
                        
                        console.log('[handleAISetup] Setup not complete, next player:', nextPlayerName);
                        
                        if (window.updateTurnIndicator) {
                            window.updateTurnIndicator(nextPlayerName);
                        }
                        
                        console.log('[handleAISetup] Scheduling next AI turn');
                        setTimeout(handleAISetup, 200);
                    }
                } else {
                    console.error('[handleAISetup] Placement failed:', result.message);
                }
            } catch (error) {
                console.error('[handleAISetup] Error in async block:', error);
                console.error('[handleAISetup] Error stack:', error.stack);
            }
        })();
    }

    // Update action button states (Offer Draw, Forfeit, Request Takeback)
    function updateActionButtonStates() {
        const offerDrawBtn = document.getElementById('offerDrawBtn');
        const forfeitBtn = document.getElementById('forfeitBtn');
        const requestTakebackBtn = document.getElementById('requestTakebackBtn');

        if (victoryModal.isGameEnded()) {
            offerDrawBtn.classList.add('disabled');
            forfeitBtn.classList.add('disabled');
            requestTakebackBtn.classList.add('disabled');
        } else {
            offerDrawBtn.classList.remove('disabled');
            forfeitBtn.classList.remove('disabled');
            requestTakebackBtn.classList.remove('disabled');
        }
    }

    // Update ability button states based on game state
    function updateAbilityButtonStates() {
        const gameState = gameLogic.getState();

        // CRITICAL: Only show abilities if it's the current player's turn
        const currentPlayer = playerManager.getCurrentPlayer();

        // If it's AI's turn, disable all buttons
        if (currentPlayer.isAI) {
            abilityButtons.setButtonState('portalSwap', 'disabled');
            abilityButtons.setButtonState('rubyFireball', 'disabled');
            abilityButtons.setButtonState('pearlTidalwave', 'disabled');
            abilityButtons.setButtonState('amberSap', 'disabled');
            abilityButtons.setButtonState('jadeLaunch', 'disabled');
            abilityButtons.setEndTurnVisible(false);
            return;
        }
        
        // Portal Swap button
        if (gameState.selectedPieceCoord) {
            const selectedPiece = gameState.pieces[gameState.selectedPieceCoord];
            
            // GUARD: Disable portal swap if move already made
            if (moveMadeThisTurn) {
                abilityButtons.setButtonState('portalSwap', 'disabled');
            } else if (selectedPiece) {
                const isPortal = selectedPiece.type === 'portalCircle' || 
                                selectedPiece.type === 'portalSquare';
                const isOnGoldenLine = gameLogic.boardUtils.isGoldenCoordinate(gameState.selectedPieceCoord);
                
                if (isPortal) {
                    // Normal mode: portal can initiate swap
                    if (portalSwapSystem.selectPortal(gameState.selectedPieceCoord)) {
                        const currentState = abilityButtons.getButtonState('portalSwap');
                        if (currentState !== 'active') {
                            abilityButtons.setButtonState('portalSwap', 'available');
                        }
                    } else {
                        abilityButtons.setButtonState('portalSwap', 'disabled');
                    }
                } else if (isOnGoldenLine && playerManager.canMovePiece(selectedPiece.type)) {
                    // Reverse mode: non-portal on golden line can be swap target
                    const tempSelectedPortal = portalSwapSystem.selectedPortal;
                    const tempSwapTargets = portalSwapSystem.swapTargets;
                    const tempReverseMode = portalSwapSystem.reverseMode;
                    const tempSelectedTarget = portalSwapSystem.selectedTarget;
                    const tempAvailablePortals = portalSwapSystem.availablePortals;
                    
                    const canReverseSwap = portalSwapSystem.selectTarget(gameState.selectedPieceCoord);
                    
                    // Restore state (don't actually select yet)
                    portalSwapSystem.selectedPortal = tempSelectedPortal;
                    portalSwapSystem.swapTargets = tempSwapTargets;
                    portalSwapSystem.reverseMode = tempReverseMode;
                    portalSwapSystem.selectedTarget = tempSelectedTarget;
                    portalSwapSystem.availablePortals = tempAvailablePortals;
                    
                    if (canReverseSwap) {
                        const currentState = abilityButtons.getButtonState('portalSwap');
                        if (currentState !== 'active') {
                            abilityButtons.setButtonState('portalSwap', 'available');
                        }
                    } else {
                        abilityButtons.setButtonState('portalSwap', 'disabled');
                    }
                } else {
                    abilityButtons.setButtonState('portalSwap', 'disabled');
                }
            } else {
                abilityButtons.setButtonState('portalSwap', 'disabled');
            }
        } else {
            abilityButtons.setButtonState('portalSwap', 'disabled');
        }
        
        // Ruby Fireball button
        const movedPiece = moveMadeThisTurn ? lastMovedPieceCoord : null;
        if (rubyFireballSystem.checkFireball(movedPiece)) {
            const currentState = abilityButtons.getButtonState('rubyFireball');
            if (currentState !== 'active') {
                abilityButtons.setButtonState('rubyFireball', 'available');
            }
            
            if (moveMadeThisTurn) {
                abilityButtons.setEndTurnVisible(true);
            }
        } else {
            abilityButtons.setButtonState('rubyFireball', 'disabled');
        }
        
        // Pearl Tidal Wave button
        const movedPieceForPearl = moveMadeThisTurn ? lastMovedPieceCoord : null;
        if (pearlTidalwaveSystem.checkTidalwave(movedPieceForPearl)) {
            const currentState = abilityButtons.getButtonState('pearlTidalwave');
            if (currentState !== 'active') {
                abilityButtons.setButtonState('pearlTidalwave', 'available');
            }
            
            if (moveMadeThisTurn) {
                abilityButtons.setEndTurnVisible(true);
            }
        } else {
            abilityButtons.setButtonState('pearlTidalwave', 'disabled');
        }
        
        // Amber Sap button
        const movedPieceForAmber = moveMadeThisTurn ? lastMovedPieceCoord : null;
        if (amberSapSystem.checkSap(movedPieceForAmber)) {
            const currentState = abilityButtons.getButtonState('amberSap');
            if (currentState !== 'active') {
                abilityButtons.setButtonState('amberSap', 'available');
            }
            
            if (moveMadeThisTurn) {
                abilityButtons.setEndTurnVisible(true);
            }
        } else {
            abilityButtons.setButtonState('amberSap', 'disabled');
        }
        
        // Jade Launch button - skip if already used this turn
        if (!launchUsedThisTurn) {
            const movedPieceForJade = moveMadeThisTurn ? lastMovedPieceCoord : null;
            if (jadeLaunchSystem.checkLaunch(movedPieceForJade)) {
                const currentState = abilityButtons.getButtonState('jadeLaunch');
                if (currentState !== 'active') {
                    abilityButtons.setButtonState('jadeLaunch', 'available');
                }
                
                if (moveMadeThisTurn) {
                    abilityButtons.setEndTurnVisible(true);
                }
            } else {
                abilityButtons.setButtonState('jadeLaunch', 'disabled');
            }
        } else {
            abilityButtons.setButtonState('jadeLaunch', 'disabled');
        }
    }

    async function handleCanvasClick(event) {
        // GUARD: Block all interactions if game has ended
        if (victoryModal.isGameEnded()) return;
    
        // GUARD: Block all clicks during AI's turn
        const currentPlayerTurn = playerManager.getCurrentPlayer();
        if (currentPlayerTurn.isAI) {
            event.stopPropagation();
            event.preventDefault();
            return;
        }
        
        // GUARD: Invalidate stale clicks from previous turn
        const capturedEpoch = currentClickEpoch;
        if (capturedEpoch !== clickEpoch) {
            return; // This click is from a previous turn, ignore it
        }
        
        const rect = canvas.getBoundingClientRect();
        const scaleX = canvas.width / rect.width;
        const scaleY = canvas.height / rect.height;
        const mouseX = (event.clientX - rect.left) * scaleX;
        const mouseY = (event.clientY - rect.top) * scaleY;

        // SETUP PHASE HANDLING
        if (setupManager.isSetupPhase) {
            const currentPlayer = setupManager.getCurrentPlayer();
            
            // AI's turn - ignore clicks
            if (currentPlayer === 'circle') {
                return;
            }
            
            // Check if clicked on piece selector in tray
            const clickedPieceType = setupUI.isClickOnTray(mouseX, mouseY, setupManager);
            if (clickedPieceType) {
                const counts = setupManager.getPieceCounts(currentPlayer);
                
                if (counts[clickedPieceType] >= 2) {
                    // Already placed 2 of this type
                } else {
                    setupManager.selectPiece(clickedPieceType);
                }
                drawBoard();
                return;
            }
            
            // Check if clicked on valid placement position
            const { originX, originY } = boardRenderer.getOrigin();
            const gameX = Math.round((mouseX - originX) / boardRenderer.scale);
            const gameY = Math.round((originY - mouseY) / boardRenderer.scale);
            const clickedCoordStr = `${gameX},${gameY}`;
            
            // Capture the piece type BEFORE placing (it gets cleared in placePiece)
            const setupPlayer = setupManager.getCurrentPlayer();
            const selectedPieceType = setupManager.selectedPieceType;

            const result = setupManager.placePiece(clickedCoordStr);
            if (result.success) {
                // Ensure we track placement BEFORE the setup manager potentially clears state
                matchHistoryTracker.trackSetupPlacement(
                    setupPlayer, 
                    selectedPieceType,
                    clickedCoordStr
                );
                
                drawBoard();
                
                if (result.setupComplete) {
                    matchHistoryTracker.finalizeSetup();
                    
                    // Initialize the tracker for Turn 1
                    const firstPlayer = playerManager.getCurrentPlayer();
                    matchHistoryTracker.startTurn(1, firstPlayer.name);
                    
                    updateLogDisplay();
                    
                    // Update turn indicator to show who goes first
                    if (window.updateTurnIndicator) {
                        window.updateTurnIndicator(playerManager.getCurrentPlayer().name);
                    }
                    uiManager.updatePlayerInfo(
                        playerManager.getTurnCount(),
                        playerManager.getCurrentPlayer()
                    );
                    updateAbilityButtonStates();
                } else {
                    // During setup - update turn indicator based on setup manager
                    const nextPlayer = setupManager.getCurrentPlayer() === 'square' ? 'Player 1' : 'Player 2 (AI)';
                    if (window.updateTurnIndicator) {
                        window.updateTurnIndicator(nextPlayer);
                    }
                    
                    // ONLY call handleAISetup if next turn is actually AI's turn
                    if (setupManager.getCurrentPlayer() === 'circle') {
                        setTimeout(() => {
                            handleAISetup();
                        }, 200);
                    }
                }
            }
            return;
        }

        // NORMAL GAME HANDLING
        const currentPlayer = playerManager.getCurrentPlayer();
        if (currentPlayer.isAI) {
            return;
        }

        // Check if clicked on ability button
        const clickedButton = abilityButtons.getClickedButton(mouseX, mouseY);
        if (clickedButton) {
            await handleAbilityButtonClick(clickedButton);
            updateAbilityButtonStates();
            drawBoard();
            return;
        }

        // Convert to game coordinates
        const { originX, originY } = boardRenderer.getOrigin();
        const gameX = Math.round((mouseX - originX) / boardRenderer.scale);
        const gameY = Math.round((originY - mouseY) / boardRenderer.scale);

        // Handle portal swap execution if active
        if (portalSwapSystem.isSwapActive()) {
            if (moveMadeThisTurn) {
                return;
            }
            const gameState = gameLogic.getState();
            const targetCoordStr = `${gameX},${gameY}`;
            
            // Start turn if not already started
            if (!moveMadeThisTurn) {
                matchHistoryTracker.startTurn(
                    playerManager.getTurnCount(),
                    playerManager.getCurrentPlayer().name
                );
            }
            
            let result;
            let swapPortalCoord, swapTargetCoord, targetPiece;
            
            if (portalSwapSystem.reverseMode) {
                // Reverse mode: clicking on portal to complete swap
                swapPortalCoord = targetCoordStr;
                swapTargetCoord = portalSwapSystem.selectedTarget;
                targetPiece = gameState.pieces[swapTargetCoord];
            } else {
                // Normal mode: clicking on target to complete swap
                swapPortalCoord = portalSwapSystem.selectedPortal;
                swapTargetCoord = targetCoordStr;
                targetPiece = gameState.pieces[targetCoordStr];
            }
            
            // Store eliminated pieces BEFORE swap (they're still in gameState)
            const predictedEliminations = portalSwapSystem.predictSwapEliminations(swapPortalCoord, swapTargetCoord);
            const eliminatedPieceData = [];
            predictedEliminations.forEach(elim => {
                const piece = gameState.pieces[elim.coord];
                if (piece) {
                    eliminatedPieceData.push({ coord: elim.coord, piece: { ...piece } });
                }
            });
            
            // Execute swap (removes pieces from gameState immediately)
            result = portalSwapSystem.executeSwap(portalSwapSystem.reverseMode ? targetCoordStr : targetCoordStr);

            if (result.success) {
                // Restore eliminated pieces to ACTUAL gameState (not local copy)
                const actualGameState = gameLogic.getGameState();
                eliminatedPieceData.forEach(ep => {
                    actualGameState.addPiece(ep.coord, ep.piece);
                });
                // CRITICAL: Use the GameState method to properly deselect
                gameLogic.getGameState().deselectPiece();
                abilityButtons.setButtonState('portalSwap', 'disabled');
                
                if (result.moveMade) {
                    // Track swap in history
                    if (targetPiece) {
                        matchHistoryTracker.trackSwap(
                            swapPortalCoord,
                            targetPiece.type,
                            swapTargetCoord
                        );
                    }
                    
                    // Track eliminations from swap
                    if (result.eliminated && result.eliminated.length > 0) {
                        const eliminatedSet = new Set();
                        result.eliminated.forEach(elim => {
                            const key = `${elim.type}:${elim.coord}`;
                            if (!eliminatedSet.has(key)) {
                                eliminatedSet.add(key);
                                matchHistoryTracker.trackElimination(elim.type, elim.coord);
                            }
                        });
                    }
                    
                    // === ANIMATION INTEGRATION ===
                    canvas.style.pointerEvents = 'none';
                    
                    const animationSequence = [];
                    
                    // Swap animation - pieces are already swapped in state
                    // piece1 (portal position) now contains what was at piece2 (target position)
                    // piece2 (target position) now contains what was at piece1 (portal position)
                    const piece1Current = gameState.pieces[swapPortalCoord];
                    const piece2Current = gameState.pieces[swapTargetCoord];

                    animationSequence.push({
                        type: 'SWAP',
                        piece1: { coord: swapPortalCoord, pieceData: { ...piece1Current } },
                        piece2: { coord: swapTargetCoord, pieceData: { ...piece2Current } },
                        amplified: false
                    });
                    
                    // Attack animations (if eliminations from swap)
                    if (result.eliminated && result.eliminated.length > 0) {
                        // Attacks happen at BOTH swap positions
                        animationSequence.push({
                            type: 'ATTACK',
                            attackerCoord: swapPortalCoord,
                            eliminated: result.eliminated.filter(e => 
                                // Filter eliminations adjacent to portal position
                                gameLogic.boardUtils.isAdjacent(swapPortalCoord, e.coord)
                            ),
                            amplified: false
                        });
                        
                        animationSequence.push({
                            type: 'ATTACK',
                            attackerCoord: swapTargetCoord,
                            eliminated: result.eliminated.filter(e => 
                                // Filter eliminations adjacent to target position
                                gameLogic.boardUtils.isAdjacent(swapTargetCoord, e.coord)
                            ),
                            amplified: false
                        });
                    }
                    
                    await animationManager.playSequence(animationSequence);
                
                    canvas.style.pointerEvents = 'auto';
                    // === END ANIMATION ===
                    
                    // Cleanup: Remove eliminated pieces from actual gameState
                    const actualGameState = gameLogic.getGameState();
                    eliminatedPieceData.forEach(ep => {
                        actualGameState.removePiece(ep.coord);
                    });
                    
                    moveMadeThisTurn = true;
                    
                    // Check for abilities on BOTH swapped pieces
                    const portalMovedCheck = rubyFireballSystem.checkFireball(swapTargetCoord) || 
                                            pearlTidalwaveSystem.checkTidalwave(swapTargetCoord) ||
                                            amberSapSystem.checkSap(swapTargetCoord) ||
                                            jadeLaunchSystem.checkLaunch(swapTargetCoord);
                    const pieceMovedCheck = rubyFireballSystem.checkFireball(swapPortalCoord) || 
                                           pearlTidalwaveSystem.checkTidalwave(swapPortalCoord) ||
                                           amberSapSystem.checkSap(swapPortalCoord) ||
                                           jadeLaunchSystem.checkLaunch(swapPortalCoord);
                                           
                    if (portalMovedCheck) {
                        lastMovedPieceCoord = swapTargetCoord;
                    } else if (pieceMovedCheck) {
                        lastMovedPieceCoord = swapPortalCoord;
                    } else {
                        lastMovedPieceCoord = swapTargetCoord;
                    }
                    
                    updateAbilityButtonStates();
                    
                    // CHECK WIN BEFORE ENDING
                    if (checkForWin()) {
                        matchHistoryTracker.commitTurnActions(); // Ensure swap is logged on win
                        updateLogDisplay();
                        drawBoard();
                        return;
                    }
                    
                    if (!rubyFireballSystem.isAvailable() && 
                        !pearlTidalwaveSystem.isAvailable() && 
                        !amberSapSystem.isAvailable() &&
                        !jadeLaunchSystem.isAvailable()) {
                        
                        matchHistoryTracker.commitTurnActions(); 
                        updateLogDisplay();
                        await endTurn();
                    }
                    // REMOVED: The redundant else clause that was clearing selection again
                }
                drawBoard();
            }
            return;
        }
        
        // Handle Ruby Fireball target selection if active
        if (rubyFireballSystem.isFireballActive()) {
            const targetCoordStr = `${gameX},${gameY}`;
            
            // Find the fireball data BEFORE execution (piece gets destroyed)
            const fireballData = rubyFireballSystem.fireballTargets.find(f => 
                f.targets.includes(targetCoordStr)
            );
            
            if (!fireballData) {
                return; // Invalid target
            }
            
            // Collect pieces that will be eliminated
            const eliminated = [];
            for (const target of fireballData.targets) {
                if (target === targetCoordStr) {
                    const piece = gameLogic.getState().pieces[target];
                    if (piece) {
                        eliminated.push({ type: piece.type, coord: target });
                    }
                }
            }
            
            // NOW execute the fireball
            const result = rubyFireballSystem.executeFireball(targetCoordStr);

            if (result.success) {
                // Track the ability
                matchHistoryTracker.trackAbility('fireball', {
                    ruby1: fireballData.ruby1,
                    ruby2: fireballData.ruby2,
                    amplified: fireballData.amplified,
                    eliminated
                });
                
                matchHistoryTracker.commitTurnActions();
                updateLogDisplay();
                
                // === ANIMATION INTEGRATION ===
                canvas.style.pointerEvents = 'none';
                
                await animationManager.playSequence([{
                    type: 'FIREBALL',
                    from: fireballData.ruby2, // Foremost ruby
                    to: targetCoordStr,
                    amplified: fireballData.amplified,
                    eliminated: eliminated
                }]);
                
                canvas.style.pointerEvents = 'auto';
                // === END ANIMATION ===
                
                abilityButtons.setButtonState('rubyFireball', 'disabled');
                
                if (checkForWin()) {
                    drawBoard();
                    return;
                }
                
                await endTurn();
            }
            return;
        }
        
        // Handle Pearl Tidal Wave execution if active
        if (pearlTidalwaveSystem.isTidalwaveActive()) {
            const targetCoordStr = `${gameX},${gameY}`;
            const tidalwaveData = pearlTidalwaveSystem.isCoordInTidalwave(targetCoordStr);
            
            if (!tidalwaveData) {
                return; // Invalid target
            }
            
            // Collect pieces that will be eliminated BEFORE execution
            const eliminated = [];
            for (const target of tidalwaveData.targets) {
                const piece = gameLogic.getState().pieces[target];
                if (piece) {
                    eliminated.push({ type: piece.type, coord: target });
                }
            }
            
            // NOW execute
            const result = pearlTidalwaveSystem.executeTidalwave(targetCoordStr);

            if (result.success) {
                // Track the ability
                matchHistoryTracker.trackAbility('tidalwave', {
                    pearl1: tidalwaveData.pearl1,
                    pearl2: tidalwaveData.pearl2,
                    amplified: tidalwaveData.amplified,
                    eliminated
                });
                
                matchHistoryTracker.commitTurnActions();
                updateLogDisplay();
                
                // === ANIMATION INTEGRATION ===
                canvas.style.pointerEvents = 'none';
                
                await animationManager.playSequence([{
                    type: 'TIDALWAVE',
                    from: tidalwaveData.pearl2, // Foremost pearl
                    direction: tidalwaveData.direction,
                    amplified: tidalwaveData.amplified,
                    coverageArea: tidalwaveData.coverageArea,
                    eliminated: eliminated
                }]);
                
                canvas.style.pointerEvents = 'auto';
                // === END ANIMATION ===
                
                abilityButtons.setButtonState('pearlTidalwave', 'disabled');
                
                if (checkForWin()) {
                    drawBoard();
                    return;
                }
                
                await endTurn();
            }
            return;
        }

        // Handle Amber Sap execution if active
        if (amberSapSystem.isSapActive()) {
            const targetCoordStr = `${gameX},${gameY}`;
            const sapData = amberSapSystem.isCoordInSap(targetCoordStr);
            
            if (!sapData) {
                return; // Invalid target
            }
            
            // Collect pieces that will be eliminated BEFORE execution
            const eliminated = [];
            for (const target of sapData.targets) {
                const piece = gameLogic.getState().pieces[target];
                if (piece) {
                    eliminated.push({ type: piece.type, coord: target });
                }
            }
            
            // NOW execute
            const result = amberSapSystem.executeSap(targetCoordStr);

            if (result.success) {
                // Track the ability
                matchHistoryTracker.trackAbility('sap', {
                    amber1: sapData.amber1,
                    amber2: sapData.amber2,
                    amplified: sapData.amplified,
                    eliminated
                });
                
                matchHistoryTracker.commitTurnActions();
                updateLogDisplay();
                
                // === ANIMATION INTEGRATION ===
                canvas.style.pointerEvents = 'none';
                
                await animationManager.playSequence([{
                    type: 'SAP',
                    amber1: sapData.amber1,
                    amber2: sapData.amber2,
                    amplified: sapData.amplified,
                    eliminated: eliminated
                }]);
                
                canvas.style.pointerEvents = 'auto';
                // === END ANIMATION ===
                
                abilityButtons.setButtonState('amberSap', 'disabled');
                
                if (checkForWin()) {
                    drawBoard();
                    return;
                }
                
                await endTurn();
            }
            return;
        }

        // Handle Jade Launch execution if active
        if (jadeLaunchSystem.isLaunchActive()) {
            const targetCoordStr = `${gameX},${gameY}`;
            
            if (jadeLaunchSystem.isPieceSelectionPhase()) {
                if (jadeLaunchSystem.selectPieceToLaunch(targetCoordStr)) {
                    drawBoard();
                }
            } else if (jadeLaunchSystem.isTargetSelectionPhase()) {
                // Find which launch option this belongs to
                const launchOption = jadeLaunchSystem.launchOptions.find(opt => 
                    opt.pieceCoord === jadeLaunchSystem.selectedPiece &&
                    opt.targets.includes(targetCoordStr)
                );
                
                if (!launchOption) {
                    return; // Invalid launch
                }
                
                // Get the piece being launched BEFORE it moves
                const launchedPieceCoord = jadeLaunchSystem.selectedPiece;
                const launchedPiece = gameLogic.getState().pieces[launchedPieceCoord];
                
                if (!launchedPiece) {
                    return;
                }
                
                const attackSystem = gameLogic.attackSystem;
                const result = jadeLaunchSystem.executeLaunch(targetCoordStr, attackSystem);
            
                if (result.success) {
                    // Restore eliminated pieces for animation
                    const actualGameState = gameLogic.getGameState();
                    
                    // Restore landing piece (if any)
                    if (result.landingElimination) {
                        actualGameState.addPiece(
                            result.landingElimination.coord, 
                            result.landingElimination.piece
                        );
                    }
                    
                    // Restore attacked pieces (if any)
                    if (result.attackedPieces && result.attackedPieces.length > 0) {
                        result.attackedPieces.forEach(elim => {
                            actualGameState.addPiece(elim.coord, elim.piece);
                        });
                    }
                    
                    // Check if amplified
                    let isAmplified = false;
                    const jade1Coord = gameLogic.boardUtils.stringToCoord(launchOption.jade1);
                    const jade2Coord = gameLogic.boardUtils.stringToCoord(launchOption.jade2);
                    const directions = [
                        {x: 1, y: 0}, {x: 1, y: 1}, {x: 0, y: 1}, {x: -1, y: 1},
                        {x: -1, y: 0}, {x: -1, y: -1}, {x: 0, y: -1}, {x: 1, y: -1}
                    ];
                    
                    for (const dir of directions) {
                        const check1 = gameLogic.boardUtils.coordToString(jade1Coord.x + dir.x, jade1Coord.y + dir.y);
                        const check2 = gameLogic.boardUtils.coordToString(jade2Coord.x + dir.x, jade2Coord.y + dir.y);
                        
                        const piece1 = gameLogic.getState().pieces[check1];
                        const piece2 = gameLogic.getState().pieces[check2];
                        
                        if ((piece1 && piece1.type.includes('void')) || (piece2 && piece2.type.includes('void'))) {
                            isAmplified = true;
                            break;
                        }
                    }
                    
                    // Build eliminated list for tracking
                    const eliminated = [];
                    if (result.landingElimination) {
                        eliminated.push({
                            type: result.landingElimination.type,
                            coord: result.landingElimination.coord
                        });
                    }
                    if (result.attackedPieces && result.attackedPieces.length > 0) {
                        result.attackedPieces.forEach(elim => {
                            eliminated.push({ type: elim.type, coord: elim.coord });
                        });
                    }
                    
                    matchHistoryTracker.trackAbility('launch', {
                        jade1: launchOption.jade1,
                        jade2: launchOption.jade2,
                        amplified: isAmplified,
                        launchedPieceType: launchedPiece.type,
                        fromCoord: launchedPieceCoord,
                        toCoord: targetCoordStr,
                        eliminated
                    });
                    
                    // === ANIMATION INTEGRATION ===
                    canvas.style.pointerEvents = 'none';
                    
                    const animationSequence = [];
                    
                    // Launch animation (piece flies to destination)
                    animationSequence.push({
                        type: 'LAUNCH',
                        from: launchedPieceCoord,
                        to: targetCoordStr,
                        piece: launchedPiece,
                        amplified: isAmplified
                    });
                    
                    // Attack animation (if pieces were attacked, not just landed on)
                    if (result.attackedPieces && result.attackedPieces.length > 0) {
                        animationSequence.push({
                            type: 'ATTACK',
                            attackerCoord: targetCoordStr,
                            eliminated: result.attackedPieces,
                            amplified: false
                        });
                    }
                    
                    await animationManager.playSequence(animationSequence);
                    
                    // Remove ALL eliminated pieces after animation completes
                    if (result.landingElimination) {
                        actualGameState.removePiece(result.landingElimination.coord);
                    }
                    if (result.attackedPieces && result.attackedPieces.length > 0) {
                        result.attackedPieces.forEach(elim => {
                            actualGameState.removePiece(elim.coord);
                        });
                    }
                    
                    canvas.style.pointerEvents = 'auto';
                    // === END ANIMATION ===
                    // DON'T commit yet - might have follow-up abilities
                    // matchHistoryTracker.commitTurnActions();  // REMOVE THIS LINE
                    // updateLogDisplay();  // REMOVE THIS LINE
                    
                    abilityButtons.setButtonState('jadeLaunch', 'disabled');
                    
                    moveMadeThisTurn = true;
                    lastMovedPieceCoord = result.launchedPieceCoord;
                    launchUsedThisTurn = true;
                    
                    rubyFireballSystem.checkFireball(result.launchedPieceCoord);
                    pearlTidalwaveSystem.checkTidalwave(result.launchedPieceCoord);
                    amberSapSystem.checkSap(result.launchedPieceCoord);
                    
                    updateAbilityButtonStates();
                    
                    if (checkForWin()) {
                        drawBoard();
                        return;
                    }
                    
                    if (!rubyFireballSystem.isAvailable() && 
                        !pearlTidalwaveSystem.isAvailable() && 
                        !amberSapSystem.isAvailable()) {
                        // NOW commit when turn actually ends
                        matchHistoryTracker.commitTurnActions();
                        updateLogDisplay();
                        await endTurn();
                    }
                }
                return;
            }
        }

        // If a move was already made this turn and abilities are available, block all piece interaction
        if (moveMadeThisTurn && (rubyFireballSystem.isAvailable() || 
                                pearlTidalwaveSystem.isAvailable() || 
                                amberSapSystem.isAvailable() || 
                                jadeLaunchSystem.isAvailable())) {
            return;
        }

        // Normal piece selection/movement
        const result = gameLogic.handleClick(gameX, gameY);

        const gameState = gameLogic.getState();
        if (gameState.selectedPieceCoord) {
            const selectedPiece = gameState.pieces[gameState.selectedPieceCoord];
            if (!selectedPiece) {
                gameState.selectedPieceCoord = null;
            }
        }

        updateAbilityButtonStates();
        uiManager.updatePlayerInfo(
            playerManager.getTurnCount(),
            playerManager.getCurrentPlayer()
        );

        drawBoard();

        if (result.moveMade) {
            // === CAPTURE PIECE DATA ===
            const movedPiece = gameLogic.getState().pieces[`${gameX},${gameY}`];
            
            // Sanity check
            if (!movedPiece) {
                console.error('[Animation] Piece not found at destination:', `${gameX},${gameY}`);
                return;
            }
            
            // Restore eliminated pieces for animation (they were removed by handleClick)
            const actualGameState = gameLogic.getGameState();
            if (result.eliminated && result.eliminated.length > 0) {
                result.eliminated.forEach(elim => {
                    actualGameState.addPiece(elim.coord, elim.piece);
                });
            }
            
            moveMadeThisTurn = true;
            lastMovedPieceCoord = `${gameX},${gameY}`;
            
            matchHistoryTracker.startTurn(
                playerManager.getTurnCount(),
                playerManager.getCurrentPlayer().name
            );
        
            matchHistoryTracker.trackMove(
                movedPiece.type,
                result.fromCoord,
                `${gameX},${gameY}`
            );
            
            // Track eliminations from the move
            if (result.eliminated && result.eliminated.length > 0) {
                const eliminatedSet = new Set();
                result.eliminated.forEach(elim => {
                    const key = `${elim.type}:${elim.coord}`;
                    if (!eliminatedSet.has(key)) {
                        eliminatedSet.add(key);
                        matchHistoryTracker.trackElimination(elim.type, elim.coord);
                    }
                });
            }
            
            // === ANIMATION INTEGRATION ===
            canvas.style.pointerEvents = 'none';
            
            const animationSequence = [];
            
            // Move animation
            animationSequence.push({
                type: 'MOVE',
                from: result.fromCoord,
                to: `${gameX},${gameY}`,
                piece: { ...movedPiece },
                amplified: false
            });
            
            // Attack animation (if eliminations occurred)
            if (result.eliminated && result.eliminated.length > 0) {
                animationSequence.push({
                    type: 'ATTACK',
                    attackerCoord: `${gameX},${gameY}`,
                    eliminated: result.eliminated,
                    amplified: false
                });
            }
            
            await animationManager.playSequence(animationSequence);
            
            // Remove eliminated pieces after animation completes
            if (result.eliminated && result.eliminated.length > 0) {
                result.eliminated.forEach(elim => {
                    actualGameState.removePiece(elim.coord);
                });
            }
            
            canvas.style.pointerEvents = 'auto';
            // === END ANIMATION ===
            
            drawBoard();
        
            updateAbilityButtonStates();
            
            if (checkForWin()) {
                    matchHistoryTracker.commitTurnActions();
                    updateLogDisplay();
                    return;
                }
            
            if (!rubyFireballSystem.isAvailable() && 
                !pearlTidalwaveSystem.isAvailable() && 
                !amberSapSystem.isAvailable() && 
                !jadeLaunchSystem.isAvailable()) {
                
                matchHistoryTracker.commitTurnActions();
                updateLogDisplay();
                await endTurn();
            } else {
                gameLogic.getState().selectedPieceCoord = null;
            }
        }
    }

    // Handle ability button clicks
    async function handleAbilityButtonClick(buttonKey) {
        // GUARD: Block all ability interactions if game has ended
        if (victoryModal.isGameEnded()) return;

        if (buttonKey === 'endTurn') {
            await endTurn();
            return;
        }
        
        const currentState = abilityButtons.getButtonState(buttonKey);
        
        // Deactivate all other abilities first
        if (currentState === 'available') {
            portalSwapSystem.reset();
            rubyFireballSystem.deactivate();
            pearlTidalwaveSystem.deactivate();
            amberSapSystem.deactivate();
            jadeLaunchSystem.deactivate();
            
            // Reset all buttons to available (not active)
            if (abilityButtons.getButtonState('portalSwap') === 'active') {
                abilityButtons.setButtonState('portalSwap', 'available');
            }
            if (abilityButtons.getButtonState('rubyFireball') === 'active') {
                abilityButtons.setButtonState('rubyFireball', 'available');
            }
            if (abilityButtons.getButtonState('pearlTidalwave') === 'active') {
                abilityButtons.setButtonState('pearlTidalwave', 'available');
            }
            if (abilityButtons.getButtonState('amberSap') === 'active') {
                abilityButtons.setButtonState('amberSap', 'available');
            }
            if (abilityButtons.getButtonState('jadeLaunch') === 'active') {
                abilityButtons.setButtonState('jadeLaunch', 'available');
            }
            
            // START TURN if no move was made yet (ability at start of turn)
            if (!moveMadeThisTurn && buttonKey !== 'portalSwap') {
                matchHistoryTracker.startTurn(
                    playerManager.getTurnCount(),
                    playerManager.getCurrentPlayer().name
                );
            }
            
            // Deselect any selected piece when activating an ability
            if (buttonKey !== 'portalSwap') {
                gameLogic.getGameState().deselectPiece();
            }
        }
        
        if (buttonKey === 'portalSwap') {
            if (currentState === 'available') {
                const gameState = gameLogic.getGameState();
                const selectedCoord = gameState.selectedPieceCoord;
                
                if (selectedCoord) {
                    const selectedPiece = gameState.getPiece(selectedCoord);
                    
                    if (selectedPiece) {
                        const isPortal = selectedPiece.type === 'portalCircle' || 
                                        selectedPiece.type === 'portalSquare';
                        
                        if (isPortal) {
                            // Normal mode: portal selected first
                            if (portalSwapSystem.selectPortal(selectedCoord) && 
                                portalSwapSystem.activate()) {
                                abilityButtons.setButtonState('portalSwap', 'active');
                            }
                        } else {
                            // Reverse mode: non-portal target selected first
                            if (portalSwapSystem.selectTarget(selectedCoord) && 
                                portalSwapSystem.activate()) {
                                abilityButtons.setButtonState('portalSwap', 'active');
                            }
                        }
                    }
                }
            } else if (currentState === 'active') {
                portalSwapSystem.deactivate();
                abilityButtons.setButtonState('portalSwap', 'available');
            }
        } else if (buttonKey === 'rubyFireball') {
            if (currentState === 'available') {
                if (rubyFireballSystem.activate()) {
                    abilityButtons.setButtonState('rubyFireball', 'active');
                }
            } else if (currentState === 'active') {
                rubyFireballSystem.deactivate();
                abilityButtons.setButtonState('rubyFireball', 'available');
            }
        } else if (buttonKey === 'pearlTidalwave') {
            if (currentState === 'available') {
                if (pearlTidalwaveSystem.activate()) {
                    abilityButtons.setButtonState('pearlTidalwave', 'active');
                }
            } else if (currentState === 'active') {
                pearlTidalwaveSystem.deactivate();
                abilityButtons.setButtonState('pearlTidalwave', 'available');
            }
        } else if (buttonKey === 'amberSap') {
            if (currentState === 'available') {
                if (amberSapSystem.activate()) {
                    abilityButtons.setButtonState('amberSap', 'active');
                }
            } else if (currentState === 'active') {
                amberSapSystem.deactivate();
                abilityButtons.setButtonState('amberSap', 'available');
            }
        } else if (buttonKey === 'jadeLaunch') {
            if (currentState === 'available') {
                if (jadeLaunchSystem.activate()) {
                    abilityButtons.setButtonState('jadeLaunch', 'active');
                }
            } else if (currentState === 'active') {
                jadeLaunchSystem.deactivate();
                abilityButtons.setButtonState('jadeLaunch', 'available');
            }
        }
    }
    
    // End the current turn
    async function endTurn() {
        // PRESERVE FIX: Keep commitTurnActions() out of here to prevent "Double Commit" errors.
    
        // Reset animation skip flag (was set for AI, needs reset for human)
        // animationManager.skipNext = false;
        
        // 1. Reset Turn State
        moveMadeThisTurn = false;
        lastMovedPieceCoord = null;
        launchUsedThisTurn = false;
        abilityButtons.setEndTurnVisible(false);
        
        // Reset systems
        portalSwapSystem.reset();
        rubyFireballSystem.reset();
        pearlTidalwaveSystem.reset();
        amberSapSystem.reset();
        jadeLaunchSystem.reset();
        
        // 2. Switch Turn
        playerManager.switchTurn();
        // Update click epoch for new turn
        currentClickEpoch = clickEpoch;
        uiManager.updatePlayerInfo(
            playerManager.getTurnCount(),
            playerManager.getCurrentPlayer()
        );
        abilityButtons.resetAll();
        updateAbilityButtonStates();
        
        // 3. AI Logic
        if (playerManager.getCurrentPlayer().isAI) {
            // Check if game is already over before AI thinks
            if (checkForWin()) return;
            // Disable canvas pointer events during AI turn
            canvas.style.pointerEvents = 'none';
            canvas.style.cursor = 'wait';
            // Invalidate any pending clicks from human turn
            clickEpoch++;
            // Skip animations for AI moves (instant execution)
            //animationManager.skipNext = true;

            setTimeout(async () => {
                // 1. Ensure we have an RNG
                if (!window.currentGameRNG) {
                    window.currentGameRNG = {
                        seed: Date.now(),
                        nextInt: function(max) {
                            this.seed = (this.seed * 1664525 + 1013904223) % 4294967296;
                            return Math.floor((this.seed / 4294967296) * max);
                        }
                    };
                }

                let move = null;
                
                // POLICY MODE vs DEFAULT AI MODE
                if (aiDifficultyManager.getCurrentPolicyMode() !== 'DEFAULT' && aiDifficultyManager.getCurrentPolicy()) {
                    // === POLICY MODE: Use Arena policy ===
                    const gameState = gameLogic.getState();
                    const context = {
                        rng: window.currentGameRNG,
                        gameLogic: gameLogic,
                        playerManager: playerManager
                    };
                    
                    try {
                        move = await aiDifficultyManager.getCurrentPolicy().selectMove(gameState, context);
                    } catch (error) {
                        console.error('Policy error:', error);
                        move = null;
                    }
                } else {
                    // === DEFAULT MODE: Use AIController with difficulty ===
                    const turnContext = {
                        movedPieceCoord: lastMovedPieceCoord,
                        usedAbilities: new Set(launchUsedThisTurn ? ['LAUNCH'] : [])
                    };
                    
                    move = await aiController.findBestMove(turnContext, window.currentGameRNG);
                }
                
                
                // Handle debug_idle mode or no moves found
                if (!move) {
                    console.log('AI returned null move (debug mode) - skipping AI turn');
                    await endTurn();
                    updateAbilityButtonStates();
                    drawBoard();
                    
                    // CRITICAL: Re-enable canvas before returning
                    canvas.style.pointerEvents = 'auto';
                    canvas.style.cursor = 'default';
                    return;
                }
                
                if (move) {
                    const coords = aiController.convertMoveToCoordinates(move);
                    if (coords) {
                        let success = false;
                        
                        if (coords.type === 'ABILITY') {
                            success = await executeAIAbility(coords);
                        } else {
                            success = await executeAIMove(coords);
                            
                            // NEW: After move, check for best ability
                            if (success) {
                                let abilityUsed = true;
                                while (abilityUsed) {
                                    const bestAbility = await findAndExecuteBestAbility();
                                    if (bestAbility) {
                                        const abilityCoords = aiController.convertMoveToCoordinates(bestAbility);
                                        abilityUsed = await executeAIAbility(abilityCoords);
                                        
                                        if (checkForWin()) {
                                            drawBoard();
                                            canvas.style.pointerEvents = 'auto';
                                            canvas.style.cursor = 'default';
                                            return;
                                        }
                                    } else {
                                        abilityUsed = false;
                                    }
                                }
                                
                                // ✅ COMMIT ALL ACTIONS (move + abilities) ONCE
                                if (window.matchHistoryTracker) {
                                    window.matchHistoryTracker.commitTurnActions();
                                    if (window.updateLogDisplay) {
                                        window.updateLogDisplay();
                                    }
                                }
                            }
                        }
                        
                        // Check for win after all AI actions
                        if (checkForWin()) {
                            drawBoard();
                            canvas.style.pointerEvents = 'auto';
                            canvas.style.cursor = 'default';
                            return;
                        }

                        // CRITICAL: Only call endTurn ONCE after all AI actions complete
                        if (success) {
                            await endTurn();
                        }
                    }
                } else {
                    // AI Pass/Fail
                    await endTurn();
                }
                
                updateAbilityButtonStates();
                drawBoard();

                // Re-enable canvas interaction
                canvas.style.pointerEvents = 'auto';
                canvas.style.cursor = 'default';
            }, 50);
        }
    }
    
    // Execute AI move and handle tracking
    async function executeAIMove(coords) {
        const currentPlayer = playerManager.getCurrentPlayer();
        
        // --- START TRACKING BEFORE MOVE ---
        if (window.matchHistoryTracker) {
            const turnCount = playerManager.getTurnCount();
            window.matchHistoryTracker.startTurn(turnCount, currentPlayer.name);
        }
        
        // Select the piece
        let result = gameLogic.handleClick(coords.selectX, coords.selectY);
        
        if (!result.success) {
            console.error('Failed to select piece', coords);
            return false;
        }
        
        // Move the piece
        result = gameLogic.handleClick(coords.moveX, coords.moveY);
        
        if (result.success && result.moveMade) {
            // === CAPTURE DATA BEFORE TRACKING ===
            const movedToCoord = gameLogic.boardUtils.coordToString(coords.moveX, coords.moveY);
            const movedFromCoord = result.fromCoord;
            const movedPiece = gameLogic.getState().pieces[movedToCoord];
            
            // --- TRACK AFTER MOVE ---
            if (window.matchHistoryTracker) {
                if (movedPiece) {
                    window.matchHistoryTracker.trackMove(
                        movedPiece.type,
                        movedFromCoord,
                        movedToCoord
                    );
                    
                    // Track eliminations from move
                    if (result.eliminated && result.eliminated.length > 0) {
                        const eliminatedSet = new Set();
                        result.eliminated.forEach(elim => {
                            const key = `${elim.type}:${elim.coord}`;
                            if (!eliminatedSet.has(key)) {
                                eliminatedSet.add(key);
                                matchHistoryTracker.trackElimination(elim.type, elim.coord);
                            }
                        });
                    }
                }
            }
            
            // === ANIMATION INTEGRATION FOR AI ===
            // Restore eliminated pieces for animation
            const actualGameState = gameLogic.getGameState();
            if (result.eliminated && result.eliminated.length > 0) {
                result.eliminated.forEach(elim => {
                    actualGameState.addPiece(elim.coord, elim.piece);
                });
            }

            const animationSequence = [];

            // Move animation
            if (movedPiece) {
                animationSequence.push({
                    type: 'MOVE',
                    from: movedFromCoord,
                    to: movedToCoord,
                    piece: { ...movedPiece },
                    amplified: false
                });
            }

            // Attack animation (if eliminations occurred)
            if (result.eliminated && result.eliminated.length > 0) {
                animationSequence.push({
                    type: 'ATTACK',
                    attackerCoord: movedToCoord,
                    eliminated: result.eliminated,
                    amplified: false
                });
            }

            await animationManager.playSequence(animationSequence);

            // Remove eliminated pieces after animation completes
            if (result.eliminated && result.eliminated.length > 0) {
                result.eliminated.forEach(elim => {
                    actualGameState.removePiece(elim.coord);
                });
            }
            // === END ANIMATION ===
            
            // ✅ CRITICAL FIX: Set turn state variables so abilities can be detected
            moveMadeThisTurn = true;
            lastMovedPieceCoord = movedToCoord;
            
            return true;
        } else {
            console.error('Failed to execute move', coords, result);
            return false;
        }
    }

    // Search for best ability to use after AI move
    async function findAndExecuteBestAbility() {
        // Check if any abilities are available
        const movedPiece = lastMovedPieceCoord;
        
        const rubyAvail = rubyFireballSystem.checkFireball(movedPiece);
        const pearlAvail = pearlTidalwaveSystem.checkTidalwave(movedPiece);
        const amberAvail = amberSapSystem.checkSap(movedPiece);
        const jadeAvail = !launchUsedThisTurn && jadeLaunchSystem.checkLaunch(movedPiece);
        
        console.log(`[FindAbility] Available: Ruby=${rubyAvail}, Pearl=${pearlAvail}, Amber=${amberAvail}, Jade=${jadeAvail}`);
        
        if (!rubyAvail && !pearlAvail && !amberAvail && !jadeAvail) {
            return null;
        }
        
        // Generate all available abilities
        const { ActionGenerator } = await import('./ai_system/utils/ActionGenerator.js');
        const generator = new ActionGenerator();
        
        const turnContext = {
            movedPieceCoord: lastMovedPieceCoord,
            usedAbilities: new Set(launchUsedThisTurn ? ['LAUNCH'] : [])
        };
        
        const allActions = generator.generateAllActions(
            gameLogic,
            playerManager,
            turnContext.movedPieceCoord,
            turnContext.usedAbilities
        );
        
        // Filter for only abilities
        const abilityActions = allActions.filter(a => 
            a.type && a.type.startsWith('ABILITY_')
        );
        
        console.log(`[FindAbility] Generated ${abilityActions.length} ability actions:`, 
                    abilityActions.map(a => a.type));
        
        if (abilityActions.length === 0) return null;
        
        // Evaluate each ability by simulating it
        const { SimulatedGameState } = await import('./ai_system/simulation/SimulatedGameState.js');
        const { LayeredEvaluator } = await import('./ai_system/evaluation/LayeredEvaluator.js');
        
        const evaluator = new LayeredEvaluator();
        await evaluator.loadWeights();
        
        const currentState = gameLogic.getState();
        const currentPlayer = playerManager.getCurrentPlayer().name;
        
        let bestAbility = null;
        let bestScore = -Infinity;
        let eliminatesPieces = false;
        
        for (const ability of abilityActions) {
            // Simulate this ability
            const simState = new SimulatedGameState(currentState, currentPlayer, 0, null, null);
            const afterAbility = simState.applyAction(ability);
            
            // Check if ability eliminates pieces
            const beforePieceCount = Object.keys(simState.getPieces()).length;
            const afterPieceCount = Object.keys(afterAbility.getPieces()).length;
            const eliminatesEnemy = afterPieceCount < beforePieceCount;
            
            // Evaluate resulting position
            const score = evaluator.evaluate(afterAbility, {
                gameLogic: gameLogic,
                playerManager: playerManager
            });
            
            console.log(`[FindAbility] ${ability.type} at ${ability.target || ability.pieceCoord}: score=${score}, eliminates=${eliminatesEnemy}`);
            
            if (score > bestScore) {
                bestScore = score;
                bestAbility = ability;
                eliminatesPieces = eliminatesEnemy;
            }
        }
        
        console.log(`[FindAbility] Best: ${bestAbility?.type}, score=${bestScore}, eliminates=${eliminatesPieces}`);
        
        // Use ability if it eliminates pieces OR improves position
        if ((eliminatesPieces || bestScore > 150) && bestAbility) {  // ✅ Raised threshold from 50 to 150
            return bestAbility;
        }
        
        return null;
    }

    async function executeAIAbility(coords) {
        console.log("[Main] Executing AI Ability:", coords); // Debug log

        const currentPlayer = playerManager.getCurrentPlayer();
        
        let result = { success: false, message: "Unknown Ability Type" };
        
        // Normalize type (handle 'ABILITY_FIREBALL' vs 'FIREBALL')
        const type = coords.abilityType || coords.type.replace('ABILITY_', '');
        const gl = gameLogic; 
    
        // Helper: Track eliminated pieces BEFORE they are removed from the board
        const eliminatedPieces = [];
        const trackTargets = (targets) => {
            if (!targets) return;
            targets.forEach(t => {
                const p = gl.getState().pieces[t];
                if (p) eliminatedPieces.push({ type: p.type, coord: t });
            });
        };
    
        switch (type) {
            case 'PORTAL_SWAP':
            // 1. Setup: Select the portal
            if (gl.getPortalSwapSystem().selectPortal(coords.portalCoord)) {
                
                const targetPiece = gl.getState().pieces[coords.target];
                const swappedPieceType = targetPiece ? targetPiece.type : "Unknown";

                // 2. Execute
                result = gl.getPortalSwapSystem().executeSwap(coords.target);
                
                // 3. Track
                if (result.success) {
                    matchHistoryTracker.trackSwap(
                        coords.portalCoord, 
                        swappedPieceType, 
                        coords.target
                    );

                    if (result.eliminated) {
                        result.eliminated.forEach(e => matchHistoryTracker.trackElimination(e.type, e.coord));
                    }
                    
                    // === ANIMATION ===
                    const gameState = gl.getState();
                    const piece1Current = gameState.pieces[coords.portalCoord];
                    const piece2Current = gameState.pieces[coords.target];
                    
                    const animSeq = [{
                        type: 'SWAP',
                        piece1: { coord: coords.portalCoord, pieceData: { ...piece1Current } },
                        piece2: { coord: coords.target, pieceData: { ...piece2Current } },
                        amplified: false
                    }];
                    
                    if (result.eliminated && result.eliminated.length > 0) {
                        animSeq.push({
                            type: 'ATTACK',
                            attackerCoord: coords.portalCoord,
                            eliminated: result.eliminated,
                            amplified: false
                        });
                    }
                    
                    await animationManager.playSequence(animSeq);
                    // === END ANIMATION ===
                }
            }
            break;
    
            case 'FIREBALL':
                const rubySys = gl.getRubyFireballSystem();
                rubySys.checkFireball(null);
                const fireballData = rubySys.fireballTargets.find(f => f.targets.includes(coords.target));
                
                if (fireballData) {
                    trackTargets(fireballData.targets);
                    
                    rubySys.activate();
                    result = rubySys.executeFireball(coords.target);
                    
                    if (result.success) {
                        matchHistoryTracker.trackAbility('fireball', {
                            ruby1: fireballData.ruby1,
                            ruby2: fireballData.ruby2,
                            amplified: fireballData.amplified,
                            eliminated: eliminatedPieces
                        });
                        
                        // === ANIMATION ===
                        await animationManager.playSequence([{
                            type: 'FIREBALL',
                            from: fireballData.ruby2,
                            to: coords.target,
                            amplified: fireballData.amplified,
                            eliminated: eliminatedPieces
                        }]);
                        // === END ANIMATION ===
                    }
                } else {
                    console.error("AI tried Fireball but target validation failed", coords);
                }
                break;
    
                case 'LAUNCH':
                    const jadeSys = gl.getJadeLaunchSystem();
                    jadeSys.checkLaunch(null);
                    jadeSys.activate();
                    jadeSys.selectedPiece = coords.pieceCoord;
                    
                    const launchedPieceData = gl.getState().pieces[coords.pieceCoord];
                    
                    result = jadeSys.executeLaunch(coords.target, gl.attackSystem);
                    
                    if (result.success) {
                        // Restore eliminated pieces for animation
                        const actualGameState = gl.getGameState();
                        
                        if (result.landingElimination) {
                            actualGameState.addPiece(
                                result.landingElimination.coord,
                                result.landingElimination.piece
                            );
                        }
                        
                        if (result.attackedPieces && result.attackedPieces.length > 0) {
                            result.attackedPieces.forEach(elim => {
                                actualGameState.addPiece(elim.coord, elim.piece);
                            });
                        }
                        
                        // Build eliminated list for tracking
                        const eliminated = [];
                        if (result.landingElimination) {
                            eliminated.push({
                                type: result.landingElimination.type,
                                coord: result.landingElimination.coord
                            });
                        }
                        if (result.attackedPieces && result.attackedPieces.length > 0) {
                            result.attackedPieces.forEach(elim => {
                                eliminated.push({ type: elim.type, coord: elim.coord });
                            });
                        }
                        
                        matchHistoryTracker.trackAbility('launch', {
                            jade1: "AI_JADE",
                            jade2: "AI_JADE",
                            amplified: false,
                            launchedPieceType: result.launchedPieceType || "Unknown",
                            fromCoord: coords.pieceCoord,
                            toCoord: coords.target,
                            eliminated: eliminated
                        });
                        
                        // === ANIMATION ===
                        const animSeq = [];
                        
                        // Launch animation
                        animSeq.push({
                            type: 'LAUNCH',
                            from: coords.pieceCoord,
                            to: coords.target,
                            piece: launchedPieceData,
                            amplified: false
                        });
                        
                        // Attack animation (if attacked pieces exist)
                        if (result.attackedPieces && result.attackedPieces.length > 0) {
                            animSeq.push({
                                type: 'ATTACK',
                                attackerCoord: coords.target,
                                eliminated: result.attackedPieces,
                                amplified: false
                            });
                        }
                        
                        await animationManager.playSequence(animSeq);
                        
                        // Remove eliminated pieces after animation
                        if (result.landingElimination) {
                            actualGameState.removePiece(result.landingElimination.coord);
                        }
                        if (result.attackedPieces && result.attackedPieces.length > 0) {
                            result.attackedPieces.forEach(elim => {
                                actualGameState.removePiece(elim.coord);
                            });
                        }
                        // === END ANIMATION ===
                    }
                    break;
    
            case 'SAP':
                const amberSys = gl.getAmberSapSystem();
                amberSys.checkSap(null);
                const sapData = amberSys.isCoordInSap(coords.target);
                
                if (sapData) {
                    trackTargets(sapData.targets);
                    amberSys.activate();
                    result = amberSys.executeSap(coords.target);
                    
                    if (result.success) {
                        matchHistoryTracker.trackAbility('sap', {
                            amber1: sapData.amber1,
                            amber2: sapData.amber2,
                            amplified: sapData.amplified,
                            eliminated: eliminatedPieces
                        });
                        
                        // === ANIMATION ===
                        await animationManager.playSequence([{
                            type: 'SAP',
                            amber1: sapData.amber1,
                            amber2: sapData.amber2,
                            amplified: sapData.amplified,
                            eliminated: eliminatedPieces
                        }]);
                        // === END ANIMATION ===
                    }
                }
                break;
    
            case 'TIDALWAVE':
                const pearlSys = gl.getPearlTidalwaveSystem();
                pearlSys.checkTidalwave(null);
                const tidalData = pearlSys.isCoordInTidalwave(coords.target);
                
                if (tidalData) {
                    trackTargets(tidalData.targets);
                    pearlSys.activate();
                    result = pearlSys.executeTidalwave(coords.target);
                    
                    if (result.success) {
                        matchHistoryTracker.trackAbility('tidalwave', {
                            pearl1: tidalData.pearl1,
                            pearl2: tidalData.pearl2,
                            amplified: tidalData.amplified,
                            eliminated: eliminatedPieces
                        });
                        
                        // === ANIMATION ===
                        await animationManager.playSequence([{
                            type: 'TIDALWAVE',
                            from: tidalData.pearl2,
                            direction: tidalData.direction,
                            amplified: tidalData.amplified,
                            coverageArea: tidalData.coverageArea,
                            eliminated: eliminatedPieces
                        }]);
                        // === END ANIMATION ===
                    }
                }
                break;
                
            default:
                console.error("Unknown Ability Type in Main:", type);
                break;
        }
    
        return result.success;
    }

    // Handle reset click
    // Handle reset click
    async function handleResetClick() {
        // Close victory modal if open
        victoryModal.hide();
        victoryModal.resetGameEndedState();
        updateActionButtonStates();
        
        // Apply any pending AI strategy change from after game end
        await aiDifficultyManager.applyPendingStrategy();

        const result = gameLogic.resetGame();
        matchHistoryTracker.reset();
        moveMadeThisTurn = false;
        lastMovedPieceCoord = null;
        launchUsedThisTurn = false;
        portalSwapSystem.reset();
        rubyFireballSystem.reset();
        pearlTidalwaveSystem.reset();
        amberSapSystem.reset();
        jadeLaunchSystem.reset();
        abilityButtons.resetAll();
        hotkeyHandler.reset();
        setupManager.reset();
        uiManager.updatePlayerInfo(
            playerManager.getTurnCount(),
            playerManager.getCurrentPlayer()
        );
        drawBoard();
        
        // Start AI setup if needed
        setTimeout(handleAISetup, 100);
        
        updateLogDisplay();
    }
    
    // Handle mouse move for hover effects
    function handleMouseMove(event) {
        const rect = canvas.getBoundingClientRect();
        const scaleX = canvas.width / rect.width;
        const scaleY = canvas.height / rect.height;
        const mouseX = (event.clientX - rect.left) * scaleX;
        const mouseY = (event.clientY - rect.top) * scaleY;
        
        abilityButtons.updateEndTurnHover(mouseX, mouseY);
    }
    
    function checkForWin() {
        const result = winConditionSystem.checkWin();
        if (result) {
            abilityButtons.resetAll();
            victoryModal.show(result, 'Player 1');
            return true;
        }
        return false;
    }

    function updateLogDisplay() {
        const history = matchHistoryTracker.getRawHistory();
        
        // Ensure the UI-owned array exists
        if (!Array.isArray(window.rawHistory)) {
            console.error('window.rawHistory is not initialized or not an array');
            return;
        }
        
        // 🔒 Preserve the original array reference (CRITICAL)
        window.rawHistory.length = 0;
        
        history.forEach(entry => {
            window.rawHistory.push(entry);
        });
        
        // Trigger the display update
        if (typeof window.renderMatchHistory === 'function') {
            window.renderMatchHistory();
        } else {
            console.error('window.renderMatchHistory is not defined');
        }
        
        // Force immediate DOM update
        requestAnimationFrame(() => {
            if (typeof window.renderMatchHistory === 'function') {
                window.renderMatchHistory();
            }
        });
    }
    
    window.updateLogDisplay = updateLogDisplay;

    // Event listeners
    canvas.addEventListener('click', (event) => {
        if (playerManager.getCurrentPlayer().isAI) {
            event.stopImmediatePropagation();
            event.preventDefault();
            return;
        }
        handleCanvasClick(event);
    });
    canvas.addEventListener('mousemove', handleMouseMove);
    resetButton.addEventListener('click', handleResetClick);
    
    window.addEventListener('resize', function() {
        boardRenderer.updateCanvasSize();
        drawBoard();
    });


    // Animation loop for button pulsing
    function animate() {
        drawBoard();
        requestAnimationFrame(animate);
    }

    // Initial setup
    animate();
    uiManager.updatePlayerInfo(
        playerManager.getTurnCount(),
        playerManager.getCurrentPlayer()
    );
    
    // Start AI setup if needed
    setTimeout(handleAISetup, 100);
};
