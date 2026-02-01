document.addEventListener('DOMContentLoaded', () => {
    renderNavbar();
});

function renderNavbar() {
    const navbarRoot = document.getElementById('navbar-root');
    if (!navbarRoot) return;

    // 1. Determine active page for highlighting
    const path = window.location.pathname;
    const getActiveClass = (page) => path.includes(page) ? 'active' : '';

    // 2. Build the HTML Component
    // We use a specific ID 'navThemeToggle' and 'navDropdownToggle' to easily find them below
    navbarRoot.innerHTML = `
        <nav class="top-nav" id="mainNav">
            <div class="nav-left">
                <a href="../Landing/landing.html" class="logo">Amalgam</a>
                
                <div class="nav-links" id="navLinks">
                    <a href="../Dashboard/dashboard.html" class="${getActiveClass('dashboard.html')}">Dashboard</a>
                    <a href="../Learn/learn.html" class="${getActiveClass('learn.html')}">How to Play</a>
                    <a href="../About/about.html" class="${getActiveClass('about.html')}">About</a>
                </div>
            </div>

            <div class="nav-right">
                <button class="mobile-toggle" id="mobileMenuBtn" aria-label="Toggle Menu">
                    <i class="fas fa-bars"></i>
                </button>

                <div class="user-pill">
                    <div class="avatar-circle">G</div>
                    <span>Guest</span>
                </div>
                
                <a href="../Settings/settings.html" class="settings-link ${getActiveClass('settings.html')}" title="Settings">
                    <i class="fas fa-cog"></i>
                </a>

                <div class="nav-theme-controls">
                    <div class="theme-dropdown" id="navThemeContainer">
                        <div class="theme-toggle-group">
                            <button class="theme-btn theme-toggle" id="navThemeToggle" title="Toggle Light/Dark Mode">
                                <i class="fas fa-sun"></i>
                            </button>
                            <button class="theme-dropdown-toggle" id="navDropdownToggle" aria-label="Open theme menu">
                                <i class="fas fa-chevron-down"></i>
                            </button>
                        </div>
                        
                        <div class="theme-dropdown-menu" id="navThemeMenu">
                            <div class="dropdown-header">Select Theme</div>
                            <button class="dropdown-item" data-theme="default">Default</button>
                            <button class="dropdown-item" data-theme="classic">Classic</button>
                            <button class="dropdown-item" data-theme="nature">Forrest Green</button>
                        </div>
                    </div>
                </div>
            </div>
        </nav>
    `;
    // 3. Initialize Interactions
    initMobileMenu();
    initThemeInteractions();
}

function initThemeInteractions() {
    // A. Light/Dark Mode Toggle
    const toggleBtn = document.getElementById('navThemeToggle');
    if (toggleBtn && typeof ThemeManager !== 'undefined') {
        toggleBtn.addEventListener('click', (e) => {
            e.preventDefault();
            ThemeManager.toggleColorMode();
            // Update icon immediately for visual feedback
            const icon = toggleBtn.querySelector('i');
            if (document.documentElement.getAttribute('data-theme').includes('-dark')) {
                icon.className = 'fas fa-moon';
            } else {
                icon.className = 'fas fa-sun';
            }
        });
    }

    // C. Theme Selection Buttons
    const themeOptions = document.querySelectorAll('#navThemeMenu .dropdown-item');
    themeOptions.forEach(btn => {
        btn.addEventListener('click', (e) => {
            const theme = e.target.getAttribute('data-theme');
            // Check current mode (dark/light) to preserve it
            const currentMode = document.documentElement.getAttribute('data-theme').endsWith('-dark') ? 'dark' : 'light';
            
            if (typeof ThemeManager !== 'undefined') {
                ThemeManager.setTheme(theme, currentMode);
                // Save to local storage explicitly if needed, though ThemeManager usually handles it
                localStorage.setItem('amalgam-theme', theme);
            }
            
            // Close menu after selection
            dropdownMenu.classList.remove('show');
        });
    });
}

function initMobileMenu() {
    const btn = document.getElementById('mobileMenuBtn');
    const links = document.getElementById('navLinks');
    const icon = btn ? btn.querySelector('i') : null;

    if (btn && links) {
        btn.addEventListener('click', (e) => {
            e.stopPropagation();
            links.classList.toggle('mobile-open');
            
            if (links.classList.contains('mobile-open')) {
                icon.className = 'fas fa-times';
            } else {
                icon.className = 'fas fa-bars';
            }
        });

        document.addEventListener('click', (e) => {
            if (links.classList.contains('mobile-open') && 
                !links.contains(e.target) && 
                !btn.contains(e.target)) {
                links.classList.remove('mobile-open');
                icon.className = 'fas fa-bars';
            }
        });
    }
}