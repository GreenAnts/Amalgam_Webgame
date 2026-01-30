const ThemeManager = {
    themes: {
        'default': 'Default',
        'classic': 'Classic', 
        'nature': 'Forrest Green'
    },

    init() {
        const savedTheme = localStorage.getItem('amalgam-theme') || 'default';
        const savedColorMode = localStorage.getItem('amalgam-color-mode') || 'light';
        
        // Apply saved theme and color mode
        this.setTheme(savedTheme, savedColorMode);
        
        // Bind theme selection dropdown
        const themeSelect = document.getElementById('themeSelect');
        if (themeSelect) {
            themeSelect.value = savedTheme;
            themeSelect.addEventListener('change', (e) => {
                const currentColorMode = document.documentElement.getAttribute('data-theme').includes('-dark') ? 'dark' : 'light';
                this.setTheme(e.target.value, currentColorMode);
                localStorage.setItem('amalgam-theme', e.target.value);
            });
        }
        
        // Bind all theme toggle buttons (for backward compatibility)
        const toggles = document.querySelectorAll('.theme-toggle, #toggleTheme');
        toggles.forEach(btn => {
            btn.addEventListener('click', (e) => {
                e.preventDefault();
                this.toggleColorMode();
            });
        });
        
        // Initialize dropdown functionality
        this.initDropdowns();
        
        this.updateIcons();
    },

    setTheme(theme, colorMode) {
        // Remove all theme attributes
        document.documentElement.removeAttribute('data-theme');
        document.documentElement.removeAttribute('data-theme-name');
        
        // Set new theme
        if (colorMode === 'dark') {
            document.documentElement.setAttribute('data-theme', `${theme}-dark`);
        } else {
            document.documentElement.setAttribute('data-theme', theme);
        }
        
        document.documentElement.setAttribute('data-theme-name', theme);
        
        // Update theme link if needed
        this.loadThemeCSS(theme);
    },

    loadThemeCSS(theme) {
        // Remove existing theme link
        const existingLink = document.querySelector('link[href*="themes/"]');
        if (existingLink) {
            existingLink.remove();
        }
        
        // Add new theme link
        const link = document.createElement('link');
        link.rel = 'stylesheet';
        link.href = `../../assets/css/themes/${theme}.css`;
        link.id = 'theme-stylesheet';
        document.head.appendChild(link);
    },

    toggleColorMode() {
        const currentTheme = document.documentElement.getAttribute('data-theme-name') || 'default';
        const currentColorMode = document.documentElement.getAttribute('data-theme').includes('-dark') ? 'dark' : 'light';
        const newColorMode = currentColorMode === 'dark' ? 'light' : 'dark';
        
        this.setTheme(currentTheme, newColorMode);
        localStorage.setItem('amalgam-color-mode', newColorMode);
        this.updateIcons();
    },

    updateIcons() {
        const isDark = document.documentElement.getAttribute('data-theme').includes('-dark');
        const icons = document.querySelectorAll('.theme-icon');
        icons.forEach(icon => {
            icon.textContent = isDark ? '☀️' : '🌙';
        });
        
        // Update toggle button icons
        const toggleButtons = document.querySelectorAll('.theme-toggle');
        toggleButtons.forEach(btn => {
            const icon = btn.querySelector('i');
            if (icon) {
                icon.className = isDark ? 'fas fa-sun' : 'fas fa-moon';
            }
        });
    },

    initDropdowns() {
        // Handle dropdown toggles (chevron buttons)
        const dropdownToggles = document.querySelectorAll('.theme-dropdown-toggle');
        dropdownToggles.forEach(toggle => {
            toggle.addEventListener('click', (e) => {
                e.preventDefault();
                const dropdown = toggle.parentElement.nextElementSibling;
                if (dropdown && dropdown.classList.contains('theme-dropdown-menu')) {
                    dropdown.classList.toggle('show');
                    this.updateDropdownPosition(dropdown);
                }
            });
        });

        // Handle theme toggle button (sun/moon) - including corner controls
        const themeToggles = document.querySelectorAll('.theme-toggle');
        themeToggles.forEach(toggle => {
            toggle.addEventListener('click', (e) => {
                e.preventDefault();
                this.toggleColorMode();
            });
        });

        // Handle theme selection from dropdown
        const dropdownItems = document.querySelectorAll('.dropdown-item[data-theme]');
        dropdownItems.forEach(item => {
            item.addEventListener('click', (e) => {
                e.preventDefault();
                const theme = item.getAttribute('data-theme');
                const currentColorMode = document.documentElement.getAttribute('data-theme').includes('-dark') ? 'dark' : 'light';
                
                this.setTheme(theme, currentColorMode);
                localStorage.setItem('amalgam-theme', theme);
                
                // Close dropdown
                const dropdown = item.closest('.theme-dropdown-menu');
                if (dropdown) {
                    dropdown.classList.remove('show');
                }
                
                this.updateIcons();
            });
        });

        // Close dropdown when clicking outside
        document.addEventListener('click', (e) => {
            const dropdowns = document.querySelectorAll('.theme-dropdown-menu.show');
            dropdowns.forEach(dropdown => {
                if (!dropdown.parentElement.contains(e.target)) {
                    dropdown.classList.remove('show');
                }
            });
        });

        // Handle keyboard navigation
        document.addEventListener('keydown', (e) => {
            if (e.key === 'Escape') {
                const dropdowns = document.querySelectorAll('.theme-dropdown-menu.show');
                dropdowns.forEach(dropdown => {
                    dropdown.classList.remove('show');
                });
            }
        });
    },

    updateDropdownPosition(dropdown) {
        // Ensure dropdown stays within viewport
        const rect = dropdown.getBoundingClientRect();
        const viewportWidth = window.innerWidth;
        const viewportHeight = window.innerHeight;
        
        if (rect.right > viewportWidth) {
            dropdown.style.right = '0';
            dropdown.style.left = 'auto';
        }
        
        if (rect.bottom > viewportHeight) {
            dropdown.style.bottom = '0';
            dropdown.style.top = 'auto';
        }
    }
};

// Auto-initialize on page load
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => {
        ThemeManager.init();
        // Load theme enhancements if available
        if (typeof ThemeEnhancements !== 'undefined') {
            ThemeEnhancements.init();
        }
    });
} else {
    ThemeManager.init();
    // Load theme enhancements if available
    if (typeof ThemeEnhancements !== 'undefined') {
        ThemeEnhancements.init();
    }
}
