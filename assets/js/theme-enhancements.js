// Theme-specific enhancements and behaviors
const ThemeEnhancements = {
    currentTheme: null,
    
    init() {
        // Listen for theme changes
        document.addEventListener('DOMContentLoaded', () => {
            this.currentTheme = document.documentElement.getAttribute('data-theme-name') || 'default';
            this.applyEnhancements();
            
            // Watch for theme changes
            const observer = new MutationObserver((mutations) => {
                mutations.forEach((mutation) => {
                    if (mutation.type === 'attributes' && mutation.attributeName === 'data-theme-name') {
                        this.currentTheme = document.documentElement.getAttribute('data-theme-name') || 'default';
                        this.applyEnhancements();
                    }
                });
            });
            
            observer.observe(document.documentElement, {
                attributes: true,
                attributeFilter: ['data-theme-name']
            });
        });
    },
    
    applyEnhancements() {
        // Remove previous enhancements
        this.removeEnhancements();
        
        switch (this.currentTheme) {
            case 'default':
                this.applyPenInkEnhancements();
                break;
            case 'classic':
                this.applyClassicEnhancements();
                break;
            case 'minimal':
                this.applyMinimalEnhancements();
                break;
            case 'nature':
                this.applyNatureEnhancements();
                break;
        }
    },
    
    removeEnhancements() {
        // Remove any theme-specific event listeners or effects
        document.removeEventListener('mousemove', this.penInkEffect);
        document.removeEventListener('scroll', this.classicScrollEffect);
        document.body.style.backgroundImage = '';
        document.body.style.backgroundAttachment = '';
    },
    
    applyPenInkEnhancements() {
        // Add parchment texture to body
        document.body.style.backgroundImage = 'var(--btn-texture)';
        document.body.style.backgroundAttachment = 'fixed';
        
        // Add ink bleed effect on hover for interactive elements
        const interactiveElements = document.querySelectorAll('button, a, input, select');
        interactiveElements.forEach(el => {
            el.addEventListener('mouseenter', this.addInkBleed);
            el.addEventListener('mouseleave', this.removeInkBleed);
        });
    },
    
    applyClassicEnhancements() {
        // Chess board pattern for body background
        document.body.style.backgroundImage = 'var(--wood-texture)';
        document.body.style.backgroundSize = '40px 40px';
        
        // Add subtle scroll animation for cards
        const cards = document.querySelectorAll('.card');
        cards.forEach(card => {
            card.style.transition = 'transform 0.3s ease, box-shadow 0.3s ease';
        });
        
        // Chess piece hover effects
        document.addEventListener('scroll', this.classicScrollEffect);
    },
    
    applyMinimalEnhancements() {
        // Ultra-clean, flat design
        document.body.style.backgroundImage = 'none';
        document.body.style.backgroundAttachment = 'scroll';
        
        // Remove all decorative effects
        const cards = document.querySelectorAll('.card');
        cards.forEach(card => {
            card.style.boxShadow = 'none';
            card.style.border = '1px solid var(--border-color)';
        });
        
        // Sharp, angular buttons
        const buttons = document.querySelectorAll('.btn');
        buttons.forEach(btn => {
            btn.style.borderRadius = '0px';
            btn.style.transition = 'none';
        });
    },
    
    applyNatureEnhancements() {
        // Organic leaf pattern
        document.body.style.backgroundImage = 'var(--leaf-pattern)';
        document.body.style.backgroundSize = '60px 60px';
        
        // Smooth, flowing animations
        const cards = document.querySelectorAll('.card');
        cards.forEach(card => {
            card.style.transition = 'transform 0.4s cubic-bezier(0.175, 0.885, 0.32, 1.275), box-shadow 0.4s ease';
        });
        
        // Gentle hover effects
        const interactiveElements = document.querySelectorAll('button, a, input, select');
        interactiveElements.forEach(el => {
            el.addEventListener('mouseenter', this.addNatureGlow);
            el.addEventListener('mouseleave', this.removeNatureGlow);
        });
    },
    
    // Enhancement effects
    addInkBleed: function(e) {
        e.target.style.filter = 'drop-shadow(0 0 3px rgba(45, 55, 72, 0.4))';
        e.target.style.transform = 'translateY(-2px)';
    },
    
    removeInkBleed: function(e) {
        e.target.style.filter = '';
        e.target.style.transform = '';
    },
    
    classicScrollEffect: function() {
        const cards = document.querySelectorAll('.card');
        const scrollTop = window.pageYOffset || document.documentElement.scrollTop;
        
        cards.forEach((card, index) => {
            const rect = card.getBoundingClientRect();
            const offset = (window.innerHeight - rect.top) * 0.1;
            if (offset > 0) {
                card.style.transform = `translateY(-${Math.min(offset, 20)}px)`;
                card.style.boxShadow = '0 8px 16px rgba(0,0,0,0.2)';
            }
        });
    },
    
    addNatureGlow: function(e) {
        e.target.style.boxShadow = '0 4px 12px rgba(45, 90, 39, 0.3)';
        e.target.style.transform = 'translateY(-3px) scale(1.02)';
    },
    
    removeNatureGlow: function(e) {
        e.target.style.boxShadow = '';
        e.target.style.transform = '';
    }
};

// Initialize theme enhancements
ThemeEnhancements.init();