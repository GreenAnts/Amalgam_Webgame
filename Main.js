// main.js - Main game orchestrator
import { GameLogic } from './GameLogic.js';
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

    // Policy mode state
    let currentPolicyMode = 'DEFAULT'; // 'DEFAULT' or policy name
    let currentPolicy = null; // Policy instance when in policy mode
    let clickEpoch = 0;
    let currentClickEpoch = 0;

    // Make these available to AILogic
    window.matchHistoryTracker = matchHistoryTracker;

    // --- AI STRATEGY SELECTOR ---
    const aiDifficultyDropdown = document.getElementById('aiDifficultyDropdown');

    // Load available AI difficulties (stable + dynamic with proper ordering)
    async function loadAIDifficulties() {
        try {
            // 🔒 STABLE OPTIONS (positioned for ordering)
            const stableOptions = [
                { value: 'DEFAULT', text: 'Current (Full Search)', position: 0 }, // Top/default
                { value: 'RANDOM_MODE', text: 'Random', position: -1 }, // Second to last
                { value: 'DUMMY_MODE', text: 'Practice Dummy', position: -2 } // Last
            ];

            // 🔄 DYNAMIC OPTIONS (anchors sorted by date, newest first)
            const response = await fetch(`${root}arena/ArenaConfig.json`);
            // console.log(response);
            const arenaConfig = await response.json();
            const activeAnchors = arenaConfig.active_anchors
                .filter(a => a.status !== 'validation_only' || a.competency_level === 'experimental') // Include experimental policies
                .sort((a, b) => new Date(b.date_established) - new Date(a.date_established)); // Newest first

            const dynamicOptions = activeAnchors.map(anchor => ({
                value: anchor.policy_name,
                text: anchor.competency_level === 'experimental'
                    ? `⚠️ ${anchor.id.replace('ANCHOR_', '').replace('_', ' ')} (${anchor.competency_level})`
                    : `${anchor.id.replace('ANCHOR_', '').replace('_', ' ')} (${anchor.competency_level})`,
                position: 1, // All anchors go after Current
                isExperimental: anchor.competency_level === 'experimental' // Flag for styling
            }));

            // 🎯 COMBINE WITH PROPER ORDERING
            const allOptions = [...stableOptions, ...dynamicOptions]
                .sort((a, b) => {
                    // Position-based sorting: negative positions go to end
                    if (a.position >= 0 && b.position >= 0) return a.position - b.position;
                    if (a.position >= 0) return -1; // a before b
                    if (b.position >= 0) return 1;  // b before a
                    return b.position - a.position; // More negative positions last
                });

            // Build dropdown
            aiDifficultyDropdown.innerHTML = '';
            allOptions.forEach(opt => {
                const option = document.createElement('option');
                option.value = opt.value;
                option.textContent = opt.text;
                if (opt.isExperimental) {
                    option.classList.add('experimental-ai-option');
                }
                aiDifficultyDropdown.appendChild(option);
            });

            // Set default selection
            aiDifficultyDropdown.value = 'DEFAULT';
        } catch (error) {
            console.error('Failed to load difficulties:', error);
            // Fallback with basic ordering
            aiDifficultyDropdown.innerHTML = `
                <option value="DEFAULT">Current (Full Search)</option>
                <option value="VOID_OBJECTIVE">Void Rush (baseline)</option>
                <option value="RANDOM_MODE">Random</option>
                <option value="DUMMY_MODE">Practice Dummy</option>
            `;
            aiDifficultyDropdown.value = 'DEFAULT';
        }
    }

    // Handle dropdown changes with confirmation
    aiDifficultyDropdown.addEventListener('change', async (e) => {
        const selectedValue = e.target.value;
        const previousValue = aiDifficultyDropdown.dataset.previousValue || 'DEFAULT';

        if (gameEnded) {
            // After game end: Store for later application, no confirmation needed
            pendingAIStrategy = selectedValue;
            return;
        }

        // During active game: Show confirmation (existing logic)
        // Check if user wants to skip confirmation
        const skipConfirmation = localStorage.getItem('aiStrategySkipConfirmation') === 'true';

        if (!skipConfirmation) {
            // Store the attempted change
            aiDifficultyDropdown.dataset.pendingValue = selectedValue;

            // Show confirmation dialog
            showAIStrategyConfirmation(selectedValue, previousValue);
            return;
        }

        // Skip confirmation - apply change directly
        await applyAIStrategyChange(selectedValue);
    });

    // Show AI strategy confirmation dialog
    function showAIStrategyConfirmation(newStrategy, previousStrategy) {
        const overlay = document.getElementById('aiStrategyConfirmOverlay');
        const dontAskCheckbox = document.getElementById('aiStrategyDontAskAgain');
        const confirmBtn = document.getElementById('confirmAIStrategy');
        const cancelBtn = document.getElementById('cancelAIStrategy');

        // Reset checkbox
        dontAskCheckbox.checked = false;

        // Position the dialog (similar to restart confirmation)
        const callout = overlay.querySelector('.confirm-callout');
        const canvasContainer = document.querySelector('.canvas-container');

        function positionDialog() {
            const calloutRect = callout.getBoundingClientRect();
            const viewportHeight = window.innerHeight;

            const verticalCenter = (viewportHeight / 2) - (calloutRect.height / 2);

            callout.style.setProperty('--callout-offset', `${Math.max(verticalCenter, 0)}px`);

            const canvasRect = canvasContainer.getBoundingClientRect();
            const calloutWidth = 360;

            callout.style.width = calloutWidth + 'px';
            callout.style.left = canvasRect.left + (canvasRect.width / 2) - (calloutWidth / 2) + 'px';
        }

        positionDialog();
        overlay.classList.add('active');
        callout.style.top = '-300px';

        requestAnimationFrame(() => {
            callout.style.top = getComputedStyle(callout).getPropertyValue('--callout-offset');
        });

        // Handle confirm
        const handleConfirm = async () => {
            // Save preference if checkbox is checked
            if (dontAskCheckbox.checked) {
                localStorage.setItem('aiStrategySkipConfirmation', 'true');
            }

            // Apply the change
            const pendingValue = aiDifficultyDropdown.dataset.pendingValue;
            await applyAIStrategyChange(pendingValue);

            // Close dialog
            closeDialog();
        };

        // Handle cancel
        const handleCancel = () => {
            // Revert dropdown to previous value
            aiDifficultyDropdown.value = previousStrategy;
            aiDifficultyDropdown.dataset.previousValue = previousStrategy;

            // Close dialog
            closeDialog();
        };

        const closeDialog = () => {
            callout.style.top = '-300px';
            setTimeout(() => {
                overlay.classList.remove('active');
                // Clean up event listeners
                confirmBtn.removeEventListener('click', handleConfirm);
                cancelBtn.removeEventListener('click', handleCancel);
            }, 300);
        };

        // Attach event listeners
        confirmBtn.addEventListener('click', handleConfirm);
        cancelBtn.addEventListener('click', handleCancel);

        // Handle window resize
        const handleResize = () => {
            if (overlay.classList.contains('active')) {
                positionDialog();
            }
        };

        window.addEventListener('resize', handleResize);

        // Clean up resize listener when dialog closes
        const originalClose = closeDialog;
        const cleanupCloseDialog = () => {
            window.removeEventListener('resize', handleResize);
            originalClose();
        };
    }

    // Apply AI strategy change
    async function applyAIStrategyChange(selectedValue) {
        // 🔒 STABLE OPTIONS (hardcoded routing)
        if (selectedValue === 'DEFAULT') {
            currentPolicyMode = 'DEFAULT';
            currentPolicy = null;
            aiController.setMode('trace');
            console.log('Switched to Current (Full Search)');
        } else if (selectedValue === 'RANDOM_MODE') {
            currentPolicyMode = 'DEFAULT';
            currentPolicy = null;
            aiController.setMode('fallback');
            console.log('Switched to Random (fallback mode)');
        } else if (selectedValue === 'DUMMY_MODE') {
            currentPolicyMode = 'DEFAULT';
            currentPolicy = null;
            aiController.setMode('debug_idle');
            console.log('Switched to Practice Dummy (debug_idle mode)');
        } else {
            // 🔄 DYNAMIC OPTIONS (arena anchors)
            try {
                currentPolicyMode = 'POLICY';
                await aiController.setPolicy(selectedValue);
                currentPolicy = aiController.currentPolicy;
                console.log(`Switched to ${selectedValue} policy`);
            } catch (error) {
                console.error(`Failed to init ${selectedValue} policy:`, error);
                // Fallback to default
                currentPolicyMode = 'DEFAULT';
                currentPolicy = null;
                aiController.setMode('trace');
                aiDifficultyDropdown.value = 'DEFAULT';
            }
        }

        // Rebuild dropdown to preserve experimental styling
        await loadAIDifficulties();

        // Restore the selected value after rebuilding
        aiDifficultyDropdown.value = selectedValue;

        // Store current value for next change
        aiDifficultyDropdown.dataset.previousValue = selectedValue;
    }

    // Initialize difficulties
    loadAIDifficulties();

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
    let gameEnded = false; // Tracks if victory popup was dismissed (not via Play Again)
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
        
        // Draw all pieces
        for (const coordStr in gameState.pieces) {
            pieceRenderer.drawPiece(coordStr, gameState.pieces[coordStr]);
        }
        
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

        if (gameEnded) {
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
        if (gameEnded) return;
    
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
                result = portalSwapSystem.executeSwap(targetCoordStr);
            } else {
                // Normal mode: clicking on target to complete swap
                swapPortalCoord = portalSwapSystem.selectedPortal;
                swapTargetCoord = targetCoordStr;
                targetPiece = gameState.pieces[targetCoordStr];
                result = portalSwapSystem.executeSwap(targetCoordStr);
            }
            
            if (result.success) {
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
                
                // Collect pieces that will be eliminated on landing
                const eliminated = [];
                const landingPiece = gameLogic.getState().pieces[targetCoordStr];
                if (landingPiece) {
                    eliminated.push({ type: landingPiece.type, coord: targetCoordStr });
                }
                
                // BEFORE executing launch, predict what will be eliminated by attack
                const coord = gameLogic.boardUtils.stringToCoord(targetCoordStr);
                const directions = [
                    {x: 1, y: 0}, {x: 1, y: 1}, {x: 0, y: 1}, {x: -1, y: 1},
                    {x: -1, y: 0}, {x: -1, y: -1}, {x: 0, y: -1}, {x: 1, y: -1}
                ];
                
                const attackingPlayer = launchedPiece.type.includes('Square') ? 'player1' : 'player2';
                const isVoid = launchedPiece.type.includes('void');
                const isPortal = launchedPiece.type.includes('portal');
                
                // Predict attack eliminations
                for (const dir of directions) {
                    const adjX = coord.x + dir.x;
                    const adjY = coord.y + dir.y;
                    const adjCoordStr = gameLogic.boardUtils.coordToString(adjX, adjY);
                    const adjPiece = gameLogic.getState().pieces[adjCoordStr];
                    
                    if (adjPiece) {
                        const targetPlayer = adjPiece.type.includes('Square') ? 'player1' : 'player2';
                        const targetIsPortal = adjPiece.type.includes('portal');
                        
                        if (targetPlayer !== attackingPlayer) {
                            // Check if this piece will be eliminated based on attack rules
                            if (isVoid || 
                                (isPortal && targetIsPortal) || 
                                (!isPortal && !targetIsPortal)) {
                                eliminated.push({ type: adjPiece.type, coord: adjCoordStr });
                            }
                        }
                    }
                }
                
                const attackSystem = gameLogic.attackSystem;
                const result = jadeLaunchSystem.executeLaunch(targetCoordStr, attackSystem);

                if (result.success) {
                    // Check if amplified
                    let isAmplified = false;
                    const jade1Coord = gameLogic.boardUtils.stringToCoord(launchOption.jade1);
                    const jade2Coord = gameLogic.boardUtils.stringToCoord(launchOption.jade2);
                    
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
                    
                    matchHistoryTracker.trackAbility('launch', {
                        jade1: launchOption.jade1,
                        jade2: launchOption.jade2,
                        amplified: isAmplified,
                        launchedPieceType: launchedPiece.type,
                        fromCoord: launchedPieceCoord,
                        toCoord: targetCoordStr,
                        eliminated
                    });
                    
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
            moveMadeThisTurn = true;
            lastMovedPieceCoord = `${gameX},${gameY}`;
            
            matchHistoryTracker.startTurn(
                playerManager.getTurnCount(),
                playerManager.getCurrentPlayer().name
            );

            const movedPiece = gameLogic.getState().pieces[`${gameX},${gameY}`];
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
        if (gameEnded) return;

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
                if (aiController.currentPolicyMode !== 'DEFAULT' && aiController.currentPolicy) {
                    // === POLICY MODE: Use Arena policy ===
                    const gameState = gameLogic.getState();
                    const context = {
                        rng: window.currentGameRNG,
                        gameLogic: gameLogic,
                        playerManager: playerManager
                    };
                    
                    try {
                        move = await aiController.currentPolicy.selectMove(gameState, context);
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
                                        
                                        // Check for win after each ability
                                        if (checkForWin()) {
                                            drawBoard();
                                            canvas.style.pointerEvents = 'auto';
                                            canvas.style.cursor = 'default';
                                            return;
                                        }
                                    } else {
                                        abilityUsed = false; // No more good abilities
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
            // --- TRACK AFTER MOVE ---
            if (window.matchHistoryTracker) {
                const movedToCoord = gameLogic.boardUtils.coordToString(coords.moveX, coords.moveY);
                const movedFromCoord = result.fromCoord;
                const movedPiece = gameLogic.getState().pieces[movedToCoord];
                
                if (movedPiece) {
                    window.matchHistoryTracker.trackMove(
                        movedPiece.type,
                        movedFromCoord,
                        movedToCoord
                    );
                    
                    // FIX: Use actual elimination data from result, same as human player
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
                
                // Commit and display
                window.matchHistoryTracker.commitTurnActions();
                if (window.updateLogDisplay) {
                    window.updateLogDisplay();
                }
            }
            
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
        
        if (!rubyAvail && !pearlAvail && !amberAvail && !jadeAvail) {
            return null; // No abilities available
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
        
        for (const ability of abilityActions) {
            // Simulate this ability
            const simState = new SimulatedGameState(currentState, currentPlayer, 0, null, null);
            const afterAbility = simState.applyAction(ability);
            
            // Evaluate resulting position
            const score = evaluator.evaluate(afterAbility, {
                gameLogic: gameLogic,
                playerManager: playerManager
            });
            
            if (score > bestScore) {
                bestScore = score;
                bestAbility = ability;
            }
        }
        
        // Only use ability if it improves position
        if (bestScore > 0 && bestAbility) {
            return bestAbility;
        }
        
        return null;
    }

    async function executeAIAbility(coords) {
        console.log("[Main] Executing AI Ability:", coords); // Debug log

        const currentPlayer = playerManager.getCurrentPlayer();
        if (window.matchHistoryTracker) {
            const turnCount = playerManager.getTurnCount();
            window.matchHistoryTracker.startTurn(turnCount, currentPlayer.name);
        }
        
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
                    
                    // CRITICAL FIX: Fetch the piece type BEFORE executing the swap
                    // The AI is swapping the Portal with the piece at 'coords.target'
                    const targetPiece = gl.getState().pieces[coords.target];
                    const swappedPieceType = targetPiece ? targetPiece.type : "Unknown";
    
                    // 2. Execute
                    result = gl.getPortalSwapSystem().executeSwap(coords.target);
                    
                    // 3. Track
                    if (result.success) {
                        // Use our pre-fetched type (swappedPieceType)
                        // This prevents the "pieceType is undefined" error
                        matchHistoryTracker.trackSwap(
                            coords.portalCoord, 
                            swappedPieceType, 
                            coords.target
                        );
    
                        // Track any side-effect eliminations (telefrags)
                        if (result.eliminated) {
                             result.eliminated.forEach(e => matchHistoryTracker.trackElimination(e.type, e.coord));
                        }
                    }
                }
                break;
    
            case 'FIREBALL':
                const rubySys = gl.getRubyFireballSystem();
                // Re-validate ability state before execution
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
                    }
                } else {
                    console.error("AI tried Fireball but target validation failed", coords);
                }
                break;
    
            case 'LAUNCH':
                const jadeSys = gl.getJadeLaunchSystem();
                // Re-validate ability state before execution
                jadeSys.checkLaunch(null);
                jadeSys.activate();
                jadeSys.selectedPiece = coords.pieceCoord;
                
                result = jadeSys.executeLaunch(coords.target, gl.attackSystem);
                
                if (result.success) {
                     matchHistoryTracker.trackAbility('launch', {
                        jade1: "AI_JADE", // Simplified for AI
                        jade2: "AI_JADE",
                        amplified: false,
                        launchedPieceType: result.launchedPieceType || "Unknown",
                        fromCoord: coords.pieceCoord,
                        toCoord: coords.target,
                        eliminated: [] // AI secondary elims are hard to track perfectly here
                    });
                }
                break;
    
            case 'SAP':
                const amberSys = gl.getAmberSapSystem();
                // Re-validate ability state before execution
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
                    }
                }
                break;
    
            case 'TIDALWAVE':
                const pearlSys = gl.getPearlTidalwaveSystem();
                // Re-validate ability state before execution
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
                    }
                }
                break;
                
            default:
                console.error("Unknown Ability Type in Main:", type);
                break;
        }
    
        // Finalize Turn if successful
        if (result.success) {
            matchHistoryTracker.commitTurnActions();
            if (window.updateLogDisplay) window.updateLogDisplay();
        }
    
        return result.success;
    }

    // Handle reset click
    async function handleResetClick() {
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
    
    // --- VICTORY SYSTEM UI HANDLERS ---
    const victoryOverlay = document.getElementById('victoryOverlay');
    const victoryCard = document.getElementById('victoryCard');
    const victoryTitle = document.getElementById('victoryTitle');
    const victoryMessage = document.getElementById('victoryMessage');
    const victoryIcon = document.getElementById('victoryIcon');
    const victoryResetBtn = document.getElementById('victoryResetBtn');

    function checkForWin() {
        const result = winConditionSystem.checkWin();
        if (result) {
            // 1. Stop Game Interactions
            abilityButtons.resetAll();
            
            // 2. Determine if Player Won or Lost
            // Assumption: 'Player 1' is human (Square), 'Player 2' is AI (Circle)
            const humanPlayer = 'Player 1'; 
            const isVictory = result.winner === humanPlayer;

            // 3. Apply Theme Classes
            victoryCard.classList.remove('is-victory', 'is-defeat');
            victoryCard.classList.add(isVictory ? 'is-victory' : 'is-defeat');

            // 4. Set Content & Icons
            if (isVictory) {
                victoryTitle.textContent = "Victory";
                // Crown Icon
                victoryIcon.innerHTML = `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor"><path d="M2 4l3 12h14l3-12-6 7-4-7-4 7-6-7zm3 16h14"/></svg>`;
            } else {
                victoryTitle.textContent = "Defeat";
                // Broken Heart / Skull Icon
                victoryIcon.innerHTML = `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor"><path d="M18 12L6 12M6 12L12 6M6 12L12 18"/></svg>`; // Arrow pointing back/defeat, or you can use a skull
            }

            victoryMessage.innerHTML = `
                ${result.winner} wins<br>
                via ${result.method}
            `;
            
            // 5. Show Modal
            victoryOverlay.classList.add('active');
            return true;
        }
        return false;
    }

    victoryResetBtn.addEventListener('click', () => {
        victoryOverlay.classList.remove('active');
        handleResetClick();
    });

    // Close button - just close the popup without resetting
    victoryCloseBtn.addEventListener('click', () => {
        victoryOverlay.classList.remove('active');
        gameEnded = true; // Enter "game ended" state - disable most interactions
        updateActionButtonStates(); // Update button styling
    });

    // Copy history button - copy match notation to clipboard
    victoryCopyBtn.addEventListener('click', async () => {
        const text = matchHistoryTracker.getRawHistory().join('\n');

        try {
            await navigator.clipboard.writeText(text);

            // Visual feedback - same as sidebar copy button
            victoryCopyBtn.style.transform = 'scale(0.9)';
            setTimeout(() => victoryCopyBtn.style.transform = '', 120);

            // Play notification sound if available
            if (typeof playNotificationSound === 'function') {
                playNotificationSound();
            }
        } catch (err) {
            console.error('Clipboard copy failed', err);
        }
    });

    // Update handleResetClick to ensure modal is closed if triggered via sidebar
    const originalResetClick = handleResetClick;
    handleResetClick = async function() {
        // Ensure victory modal is closed if user clicked "Restart" on sidebar during win state
        victoryOverlay.classList.remove('active');
        gameEnded = false; // Reset game ended state
        updateActionButtonStates(); // Update button styling

        // Apply any pending AI strategy change from after game end
        if (pendingAIStrategy) {
            await applyAIStrategyChange(pendingAIStrategy);
            pendingAIStrategy = null; // Clear after application
        }

        await originalResetClick();
    };

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
    
    // Add these variables inside window.onload if not already there
    let hotkeyCycleIndex = 0;
    let lastHotkeyType = null;
    
    function isTypingInInput() {
	    const el = document.activeElement;
	    if (!el) return false;

	    const tag = el.tagName.toLowerCase();
	    return (
		    tag === 'input' ||
		    tag === 'textarea' ||
		    el.isContentEditable === true
	    );
    }


    window.addEventListener('keydown', (event) => {
        // GUARD: Block all hotkey interactions if game has ended
        if (gameEnded) return;

        // --- SETUP PHASE HOTKEYS ---
        if (setupManager.isSetupPhase) {
	        const currentPlayer = setupManager.getCurrentPlayer();

	        // Only human setup uses hotkeys
	        if (currentPlayer === 'square') {
		        const setupKeyMap = {
			        '1': 'ruby',
			        '2': 'pearl',
			        '3': 'amber',
			        '4': 'jade'
		        };

		        const pieceType = setupKeyMap[event.key];
		        if (pieceType) {
			        const counts = setupManager.getPieceCounts(currentPlayer);

			        if (counts[pieceType] < 2) {
				        setupManager.selectPiece(pieceType);
				        drawBoard();
			        }

			        event.preventDefault();
			        return; // stop here, do NOT fall into game hotkeys
		        }
	        }

	        // If setup phase but key wasn't a setup hotkey, do nothing
	        return;
        }

        // Do not trigger hotkeys while typing in chat or inputs
        if (isTypingInInput()) return;

        const hotkeyMap = {
            '1': 'ruby',
            '2': 'pearl',
            '3': 'amber',
            '4': 'jade',
            '5': 'portal',
            '6': 'amalgam',
            '7': 'void'
        };

        const targetType = hotkeyMap[event.key];
        if (!targetType) return;

        const gameState = gameLogic.getState();
        const currentPlayer = playerManager.getCurrentPlayer();
        
        // Find pieces belonging to the current player
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
        if (lastHotkeyType === targetType) {
            hotkeyCycleIndex = (hotkeyCycleIndex + 1) % playerPieces.length;
        } else {
            hotkeyCycleIndex = 0;
            lastHotkeyType = targetType;
        }

        // Get the coordinates of the chosen piece
        const [coordStr] = playerPieces[hotkeyCycleIndex];
        const [x, y] = coordStr.split(',').map(Number);

        // FIX: Use handleClick to trigger game logic/selection indicators
        // We pass the coordinates directly to simulate a click on that piece
        gameLogic.handleClick(x, y);

        // Sync UI components
        updateAbilityButtonStates();
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
