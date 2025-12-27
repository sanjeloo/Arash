// Hamburger Menu functionality

// Toggle hamburger menu
function toggleMenu() {
    const menu = document.getElementById('hamburgerMenu');
    const backdrop = document.getElementById('menuBackdrop');
    
    if (menu && backdrop) {
        if (menu.classList.contains('active')) {
            // Close menu
            menu.classList.remove('active');
            backdrop.style.display = 'none';
        } else {
            // Open menu
            backdrop.style.display = 'block';
            menu.classList.add('active');
        }
    }
}

// Close menu
function closeMenu() {
    const menu = document.getElementById('hamburgerMenu');
    const backdrop = document.getElementById('menuBackdrop');
    
    if (menu && backdrop) {
        menu.classList.remove('active');
        backdrop.style.display = 'none';
    }
}

// Initialize menu functionality
function initMenu() {
    const hamburgerBtn = document.getElementById('hamburgerBtn');
    const closeMenuBtn = document.getElementById('closeMenuBtn');
    const backdrop = document.getElementById('menuBackdrop');
    
    if (hamburgerBtn) {
        hamburgerBtn.addEventListener('click', toggleMenu);
    }
    
    if (closeMenuBtn) {
        closeMenuBtn.addEventListener('click', closeMenu);
    }
    
    if (backdrop) {
        backdrop.addEventListener('click', closeMenu);
    }
    
    // Close menu when clicking on menu items (optional - you can remove this if you want menu to stay open)
    const menuItems = document.querySelectorAll('.menu-item, .menu-btn');
    menuItems.forEach(btn => {
        btn.addEventListener('click', function() {
            // Close menu after a short delay to allow button action to complete
            setTimeout(closeMenu, 300);
        });
    });
}

// Initialize when DOM is ready
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initMenu);
} else {
    initMenu();
}

