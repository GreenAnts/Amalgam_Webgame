// Settings Management
const settingsKey = 'amalgam-settings';

// Default settings
const defaultSettings = {
    animations: true,
    legalMoves: true,
    confirmActions: true,
    notationFormat: 'english',
    soundEffects: true,
    ambient: true
};

// Initialize tabs
function initTabs() {
    const tabButtons = document.querySelectorAll('.tab-btn');
    const tabPanels = document.querySelectorAll('.tab-panel');
    
    tabButtons.forEach(btn => {
        btn.addEventListener('click', () => {
            const targetTab = btn.dataset.tab;
            
            // Update active states
            tabButtons.forEach(b => b.classList.remove('active'));
            tabPanels.forEach(p => p.classList.remove('active'));
            
            btn.classList.add('active');
            document.getElementById(targetTab).classList.add('active');
        });
    });
}

// Setup sticky save button
function setupStickySave() {
    const stickySave = document.querySelector('.sticky-save');
    if (stickySave) {
        stickySave.classList.add('visible');
    }
}

// Update color mode toggle button appearance
function updateColorModeToggle(colorMode) {
    const toggleBtn = document.getElementById('colorModeToggle');
    const icon = toggleBtn.querySelector('i');
    const label = toggleBtn.querySelector('.toggle-label');
    
    if (colorMode === 'dark') {
        icon.className = 'fas fa-moon';
        label.textContent = 'Dark';
        toggleBtn.classList.add('dark-mode');
    } else {
        icon.className = 'fas fa-sun';
        label.textContent = 'Light';
        toggleBtn.classList.remove('dark-mode');
    }
}

// Load settings on page load
function loadSettings() {
    const saved = localStorage.getItem(settingsKey);
    const settings = saved ? JSON.parse(saved) : defaultSettings;
    
    // Apply settings to UI
    document.getElementById('animationsToggle').checked = settings.animations;
    document.getElementById('legalMovesToggle').checked = settings.legalMoves;
    document.getElementById('confirmActionsToggle').checked = settings.confirmActions;
    document.getElementById('notationFormat').value = settings.notationFormat;
    document.getElementById('soundEffectsToggle').checked = settings.soundEffects;
    document.getElementById('ambientToggle').checked = settings.ambient;
    
    // Load theme settings
    const savedTheme = localStorage.getItem('amalgam-theme') || 'default';
    const savedColorMode = localStorage.getItem('amalgam-color-mode') || 'light';
    
    document.getElementById('themeSelect').value = savedTheme;
    updateColorModeToggle(savedColorMode);
}

// Save settings
function saveSettings() {
    const settings = {
        animations: document.getElementById('animationsToggle').checked,
        legalMoves: document.getElementById('legalMovesToggle').checked,
        confirmActions: document.getElementById('confirmActionsToggle').checked,
        notationFormat: document.getElementById('notationFormat').value,
        soundEffects: document.getElementById('soundEffectsToggle').checked,
        ambient: document.getElementById('ambientToggle').checked
    };
    
    localStorage.setItem(settingsKey, JSON.stringify(settings));
    
    // Visual feedback
    const btn = document.querySelector('.settings-actions .btn-primary');
    const originalText = btn.textContent;
    btn.textContent = '✓ Saved!';
    btn.style.background = '#4ade80';
    
    setTimeout(() => {
        btn.textContent = originalText;
        btn.style.background = '';
    }, 2000);
}

// Reset to defaults
function resetSettings() {
    if (confirm('Reset all settings to defaults?')) {
        localStorage.removeItem(settingsKey);
        loadSettings();
        
        // Visual feedback
        const btn = document.querySelector('.settings-actions .btn-outline');
        const originalText = btn.textContent;
        btn.textContent = '✓ Reset!';
        
        setTimeout(() => {
            btn.textContent = originalText;
        }, 2000);
    }
}

// Theme toggle button
document.getElementById('themeToggleBtn')?.addEventListener('click', () => {
    if (window.ThemeManager) {
        window.ThemeManager.toggle();
    }
});

// Bind event listeners
function bindEventListeners() {
    // Theme selection
    document.getElementById('themeSelect').addEventListener('change', function() {
        const theme = this.value;
        const colorMode = document.documentElement.getAttribute('data-theme').includes('-dark') ? 'dark' : 'light';
        ThemeManager.setTheme(theme, colorMode);
        localStorage.setItem('amalgam-theme', theme);
    });
    
    // Color mode toggle button
    document.getElementById('colorModeToggle').addEventListener('click', function() {
        const currentTheme = document.documentElement.getAttribute('data-theme-name') || 'default';
        const currentColorMode = document.documentElement.getAttribute('data-theme').includes('-dark') ? 'dark' : 'light';
        const newColorMode = currentColorMode === 'dark' ? 'light' : 'dark';
        
        ThemeManager.setTheme(currentTheme, newColorMode);
        localStorage.setItem('amalgam-color-mode', newColorMode);
        updateColorModeToggle(newColorMode);
    });
    
    // Other settings
    const settings = [
        { id: 'animationsToggle', key: 'amalgam-animations' },
        { id: 'legalMovesToggle', key: 'amalgam-legal-moves' },
        { id: 'confirmActionsToggle', key: 'amalgam-confirm-actions' },
        { id: 'soundEffectsToggle', key: 'amalgam-sound-effects' },
        { id: 'ambientToggle', key: 'amalgam-ambient' }
    ];
    
    settings.forEach(setting => {
        document.getElementById(setting.id).addEventListener('change', function() {
            localStorage.setItem(setting.key, this.checked);
        });
    });
    
    document.getElementById('notationFormat').addEventListener('change', function() {
        localStorage.setItem('amalgam-notation-format', this.value);
    });
}

// Initialize
document.addEventListener('DOMContentLoaded', () => {
    initTabs();
    setupStickySave();
    loadSettings();
    bindEventListeners();
});
