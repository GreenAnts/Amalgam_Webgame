// --- Mock Data Generators ---

const mockPlayers = [
    { name: "GrandMasterB", rating: 1450, status: "online" },
    { name: "ChessWiz99", rating: 1100, status: "ingame" },
    { name: "StrategyFan", rating: 1240, status: "online" },
    { name: "NewbieOne", rating: 800, status: "online" },
    { name: "AlphaZero", rating: 3000, status: "ingame" },
    { name: "CasualDave", rating: 1150, status: "online" },
];

const mockLobby = [
    { host: "StrategyFan", rating: 1240, variant: "Standard", time: "10 min", side: "Random" },
    { host: "GrandMasterB", rating: 1450, variant: "Blitz", time: "5 min", side: "Square" },
    { host: "CasualDave", rating: 1150, variant: "Standard", time: "30 min", side: "Circle" },
];

// --- Initialization ---

document.addEventListener('DOMContentLoaded', () => {
    renderLobby();
    renderOnlinePlayers();
});

// --- Theme Toggle Functionality ---

function initDashboardThemeToggle() {
    const themeBtn = document.querySelector('.theme-btn');
    const dropdownToggle = document.querySelector('.theme-dropdown-toggle');
    const dropdownMenu = document.querySelector('.theme-dropdown-menu');
    
    // Theme toggle button
    if (themeBtn) {
        themeBtn.addEventListener('click', (e) => {
            e.preventDefault();
            e.stopPropagation();
            
            // Use the global ThemeManager if available
            if (typeof ThemeManager !== 'undefined' && typeof ThemeManager.toggleColorMode === 'function') {
                ThemeManager.toggleColorMode();
            } else {
                // Fallback: manually toggle theme
                toggleThemeManually();
            }
        });
    }
    
    // Dropdown toggle button
    if (dropdownToggle) {
        dropdownToggle.addEventListener('click', (e) => {
            e.preventDefault();
            e.stopPropagation();
            dropdownMenu.classList.toggle('show');
        });
    }
    
    // Theme selection buttons
    const themeItems = document.querySelectorAll('.dropdown-item[data-theme]');
    themeItems.forEach(item => {
        item.addEventListener('click', (e) => {
            e.preventDefault();
            e.stopPropagation();
            
            const theme = item.getAttribute('data-theme');
            const currentColorMode = document.documentElement.getAttribute('data-theme').includes('-dark') ? 'dark' : 'light';
            
            // Use the global ThemeManager if available
            if (typeof ThemeManager !== 'undefined' && typeof ThemeManager.setTheme === 'function') {
                ThemeManager.setTheme(theme, currentColorMode);
            } else {
                // Fallback: manually set theme
                setThemeManually(theme, currentColorMode);
            }
            
            // Close dropdown
            dropdownMenu.classList.remove('show');
        });
    });
    
    // Close dropdown when clicking outside
    document.addEventListener('click', (e) => {
        if (!dropdownMenu.contains(e.target) && !dropdownToggle.contains(e.target)) {
            dropdownMenu.classList.remove('show');
        }
    });
    
    // Update icon based on current theme
    updateThemeIcon();
    
    // Listen for theme changes to update icon
    const observer = new MutationObserver(() => {
        updateThemeIcon();
    });
    observer.observe(document.documentElement, {
        attributes: true,
        attributeFilter: ['data-theme']
    });
}

function toggleThemeManually() {
    const currentTheme = document.documentElement.getAttribute('data-theme-name') || 'default';
    const currentColorMode = document.documentElement.getAttribute('data-theme').includes('-dark') ? 'dark' : 'light';
    const newColorMode = currentColorMode === 'dark' ? 'light' : 'dark';
    
    // Apply theme
    if (newColorMode === 'dark') {
        document.documentElement.setAttribute('data-theme', `${currentTheme}-dark`);
    } else {
        document.documentElement.setAttribute('data-theme', currentTheme);
    }
    
    // Save to localStorage
    localStorage.setItem('amalgam-color-mode', newColorMode);
    
    // Update icon
    updateThemeIcon();
}

function updateThemeIcon() {
    const themeBtn = document.querySelector('.theme-btn');
    const isDark = document.documentElement.getAttribute('data-theme').includes('-dark');
    
    if (themeBtn) {
        const icon = themeBtn.querySelector('i');
        if (icon) {
            icon.className = isDark ? 'fas fa-moon' : 'fas fa-sun';
        }
        
        // Update button styling for dark mode - use theme variables instead of hardcoded colors
        if (isDark) {
            themeBtn.style.background = getComputedStyle(document.documentElement).getPropertyValue('--bg-input').trim();
            themeBtn.style.color = getComputedStyle(document.documentElement).getPropertyValue('--text-main').trim();
            themeBtn.style.borderColor = getComputedStyle(document.documentElement).getPropertyValue('--border-color').trim();
        } else {
            themeBtn.style.background = '';
            themeBtn.style.color = '';
            themeBtn.style.borderColor = '';
        }
    }
}

// --- Render Functions ---

function renderLobby() {
    const list = document.getElementById('lobby-matches');
    list.innerHTML = '';

    mockLobby.forEach(match => {
        const row = document.createElement('div');
        row.classList.add('lobby-row');
        row.innerHTML = `
            <div class="player-info">
                ${match.host} <span class="rating-sub">(${match.rating})</span>
            </div>
            <div>${match.variant}</div>
            <div>${match.time}</div>
            <div>${match.side}</div>
            <div>
                <button class="btn btn-outline small" onclick="joinMatch('${match.host}')">Join</button>
            </div>
        `;
        list.appendChild(row);
    });
}

function renderOnlinePlayers() {
    const list = document.getElementById('online-list');
    const countEl = document.getElementById('online-count');
    list.innerHTML = '';
    countEl.innerText = mockPlayers.length;

    mockPlayers.forEach(player => {
        const div = document.createElement('div');
        div.classList.add('online-player');
        div.innerHTML = `
            <div class="online-status ${player.status}"></div>
            <div class="avatar-circle" style="width: 24px; height: 24px; font-size: 0.6rem;">${player.name.charAt(0)}</div>
            <div style="font-size: 0.9rem; font-weight: 600;">${player.name}</div>
        `;
        list.appendChild(div);
    });
}

// --- Action Functions ---

function findRankedMatch() {
    const btn = document.querySelector('.ranked .btn-primary');
    btn.disabled = true;
    btn.textContent = 'Finding...';
    
    // Simulate auto-assign (currently just goes to bot match)
    setTimeout(() => {
        alert('Ranked matchmaking coming soon! Starting AI match instead.');
        window.location.href = `../Gameplay/gameplay.html?difficulty=medium&mode=ranked`;
    }, 1500);
}

function startBotMatch() {
    const difficulty = document.getElementById('bot-difficulty').value;
    console.log(`Starting bot match: ${difficulty}`);
    window.location.href = `../Gameplay/gameplay.html?difficulty=${difficulty}&mode=bot`;
}

function joinMatch(host) {
    alert(`Multiplayer coming soon! Starting AI match instead.`);
    window.location.href = `../Gameplay/gameplay.html?difficulty=medium&mode=custom`;
}

function toggleCreateForm() {
    const form = document.getElementById('create-form');
    form.style.display = form.style.display === 'none' ? 'block' : 'none';
}