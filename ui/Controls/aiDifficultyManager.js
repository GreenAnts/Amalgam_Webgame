// UI/Controls/aiDifficultyManager.js - AI strategy selection and management
export class AIDifficultyManager {
    constructor(aiController, dropdownElement, confirmationElements) {
        this.aiController = aiController;
        this.dropdown = dropdownElement;
        
        // Confirmation dialog elements
        this.confirmOverlay = confirmationElements.overlay;
        this.confirmBtn = confirmationElements.confirmBtn;
        this.cancelBtn = confirmationElements.cancelBtn;
        this.dontAskCheckbox = confirmationElements.dontAskCheckbox;
        
        // State
        this.currentPolicyMode = 'DEFAULT';
        this.currentPolicy = null;
        this.pendingStrategy = null; // Strategy selected after game end
        
        // Callbacks (set by orchestrator)
        this.onStrategyChanged = null; // Called after strategy change
        this.isGameEnded = null; // Function to check if game ended
        
        this.bindEvents();
    }
    
    async initialize() {
        await this.loadDifficulties();
    }
    
    bindEvents() {
        this.dropdown.addEventListener('change', (e) => this.handleDropdownChange(e));
    }
    
    async loadDifficulties() {
        try {
            // Import root helper
            const { getProjectRoot } = await import('../../paths.js');
            const root = getProjectRoot();
            
            // Stable options (positioned for ordering)
            const stableOptions = [
                { value: 'DEFAULT', text: 'Current (Full Search)', position: 0 },
                { value: 'RANDOM_MODE', text: 'Random', position: -1 },
                { value: 'DUMMY_MODE', text: 'Practice Dummy', position: -2 }
            ];
            
            // Dynamic options (arena anchors)
            const response = await fetch(`${root}arena/ArenaConfig.json`);
            const arenaConfig = await response.json();
            const activeAnchors = arenaConfig.active_anchors
                .filter(a => a.status !== 'validation_only' || a.competency_level === 'experimental')
                .sort((a, b) => new Date(b.date_established) - new Date(a.date_established));
            
            const dynamicOptions = activeAnchors.map(anchor => ({
                value: anchor.policy_name,
                text: anchor.competency_level === 'experimental'
                    ? `⚠️ ${anchor.id.replace('ANCHOR_', '').replace('_', ' ')} (${anchor.competency_level})`
                    : `${anchor.id.replace('ANCHOR_', '').replace('_', ' ')} (${anchor.competency_level})`,
                position: 1,
                isExperimental: anchor.competency_level === 'experimental'
            }));
            
            // Combine and sort
            const allOptions = [...stableOptions, ...dynamicOptions]
                .sort((a, b) => {
                    if (a.position >= 0 && b.position >= 0) return a.position - b.position;
                    if (a.position >= 0) return -1;
                    if (b.position >= 0) return 1;
                    return b.position - a.position;
                });
            
            // Build dropdown
            this.dropdown.innerHTML = '';
            allOptions.forEach(opt => {
                const option = document.createElement('option');
                option.value = opt.value;
                option.textContent = opt.text;
                if (opt.isExperimental) {
                    option.classList.add('experimental-ai-option');
                }
                this.dropdown.appendChild(option);
            });
            
            // Set default
            this.dropdown.value = 'DEFAULT';
            
        } catch (error) {
            console.error('Failed to load difficulties:', error);
            // Fallback
            this.dropdown.innerHTML = `
                <option value="DEFAULT">Current (Full Search)</option>
                <option value="VOID_OBJECTIVE">Void Rush (baseline)</option>
                <option value="RANDOM_MODE">Random</option>
                <option value="DUMMY_MODE">Practice Dummy</option>
            `;
            this.dropdown.value = 'DEFAULT';
        }
    }
    
    handleDropdownChange(event) {
        const selectedValue = event.target.value;
        const previousValue = this.dropdown.dataset.previousValue || 'DEFAULT';
        
        // After game end: store for later, no confirmation needed
        if (this.isGameEnded && this.isGameEnded()) {
            this.pendingStrategy = selectedValue;
            return;
        }
        
        // During game: show confirmation
        const skipConfirmation = localStorage.getItem('aiStrategySkipConfirmation') === 'true';
        
        if (!skipConfirmation) {
            this.dropdown.dataset.pendingValue = selectedValue;
            this.showConfirmation(selectedValue, previousValue);
            return;
        }
        
        // Skip confirmation - apply directly
        this.applyChange(selectedValue);
    }
    
    showConfirmation(newStrategy, previousStrategy) {
        // Reset checkbox
        this.dontAskCheckbox.checked = false;
        
        // Position dialog (reuse positioning from confirmation overlays)
        const callout = this.confirmOverlay.querySelector('.confirm-callout');
        const canvasContainer = document.querySelector('.canvas-container');
        
        const positionDialog = () => {
            const calloutRect = callout.getBoundingClientRect();
            const viewportHeight = window.innerHeight;
            const verticalCenter = (viewportHeight / 2) - (calloutRect.height / 2);
            
            callout.style.setProperty('--callout-offset', `${Math.max(verticalCenter, 0)}px`);
            
            const canvasRect = canvasContainer.getBoundingClientRect();
            const calloutWidth = 360;
            callout.style.width = calloutWidth + 'px';
            callout.style.left = canvasRect.left + (canvasRect.width / 2) - (calloutWidth / 2) + 'px';
        };
        
        positionDialog();
        this.confirmOverlay.classList.add('active');
        callout.style.top = '-300px';
        
        requestAnimationFrame(() => {
            callout.style.top = getComputedStyle(callout).getPropertyValue('--callout-offset');
        });
        
        // Handle confirm
        const handleConfirm = async () => {
            if (this.dontAskCheckbox.checked) {
                localStorage.setItem('aiStrategySkipConfirmation', 'true');
            }
            
            const pendingValue = this.dropdown.dataset.pendingValue;
            await this.applyChange(pendingValue);
            closeDialog();
        };
        
        // Handle cancel
        const handleCancel = () => {
            this.dropdown.value = previousStrategy;
            this.dropdown.dataset.previousValue = previousStrategy;
            closeDialog();
        };
        
        const closeDialog = () => {
            callout.style.top = '-300px';
            setTimeout(() => {
                this.confirmOverlay.classList.remove('active');
                this.confirmBtn.removeEventListener('click', handleConfirm);
                this.cancelBtn.removeEventListener('click', handleCancel);
            }, 300);
        };
        
        this.confirmBtn.addEventListener('click', handleConfirm);
        this.cancelBtn.addEventListener('click', handleCancel);
        
        // Handle resize
        const handleResize = () => {
            if (this.confirmOverlay.classList.contains('active')) {
                positionDialog();
            }
        };
        window.addEventListener('resize', handleResize);
    }
    
    async applyChange(selectedValue) {
        // Stable options (hardcoded routing)
        if (selectedValue === 'DEFAULT') {
            this.currentPolicyMode = 'DEFAULT';
            this.currentPolicy = null;
            this.aiController.setMode('trace');
            console.log('Switched to Current (Full Search)');
        } else if (selectedValue === 'RANDOM_MODE') {
            this.currentPolicyMode = 'DEFAULT';
            this.currentPolicy = null;
            this.aiController.setMode('fallback');
            console.log('Switched to Random (fallback mode)');
        } else if (selectedValue === 'DUMMY_MODE') {
            this.currentPolicyMode = 'DEFAULT';
            this.currentPolicy = null;
            this.aiController.setMode('debug_idle');
            console.log('Switched to Practice Dummy (debug_idle mode)');
        } else {
            // Dynamic options (arena anchors)
            try {
                this.currentPolicyMode = 'POLICY';
                await this.aiController.setPolicy(selectedValue);
                this.currentPolicy = this.aiController.currentPolicy;
                console.log(`Switched to ${selectedValue} policy`);
            } catch (error) {
                console.error(`Failed to init ${selectedValue} policy:`, error);
                // Fallback
                this.currentPolicyMode = 'DEFAULT';
                this.currentPolicy = null;
                this.aiController.setMode('trace');
                this.dropdown.value = 'DEFAULT';
            }
        }
        
        // Rebuild dropdown to preserve experimental styling
        await this.loadDifficulties();
        this.dropdown.value = selectedValue;
        this.dropdown.dataset.previousValue = selectedValue;
        
        // Notify orchestrator
        if (this.onStrategyChanged) {
            this.onStrategyChanged();
        }
    }
    
    async applyPendingStrategy() {
        if (this.pendingStrategy) {
            await this.applyChange(this.pendingStrategy);
            this.pendingStrategy = null;
        }
    }
    
    getCurrentPolicyMode() {
        return this.currentPolicyMode;
    }
    
    getCurrentPolicy() {
        return this.currentPolicy;
    }
}