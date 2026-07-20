/**
 * VYBE Admin Sidebar Loader
 * Loads the shared admin sidebar component and handles interactions
 */
(function() {
    'use strict';

    const SIDEBAR_URL = '/staff/admin-sidebar.html';
    const PLACEHOLDER_ID = 'admin-sidebar-placeholder';

    // Prevent double initialization if already handled by auth-guard.js
    if (document.getElementById('admin-sidebar') || document.querySelector('.sidebar')) {
        console.log('[AdminSidebar] Already initialized by auth-guard');
        return;
    }

    // Current page detection
    function getCurrentPage() {
        const path = window.location.pathname;
        const filename = path.split('/').pop() || 'admin_dashboard.html';
        const urlParams = new URLSearchParams(window.location.search);
        
        // If it's the CMS dashboard, check the tab parameter for highlighting
        if (filename === 'cms_dashboard.html') {
            const tab = urlParams.get('tab');
            if (tab === 'pages') return 'admin_pages';
            if (tab === 'team') return 'admin_team';
            if (tab === 'stats') return 'admin_stats';
            if (tab === 'gallery') return 'cms_gallery';
            return 'cms_dashboard';
        }
        
        // Map clean URL paths or filenames to page identifier
        if (path.includes('/staff/admin/') || filename === 'admin_dashboard.html') return 'admin_dashboard';
        if (path.includes('/staff/hr/') || filename === 'hr_dashboard.html') return 'hr_dashboard';
        if (path.includes('/staff/programs/') || filename === 'programs_dashboard.html') return 'programs_dashboard';
        if (path.includes('/staff/finance/') || filename === 'finance_dashboard.html') return 'finance_dashboard';
        if (path.includes('/staff/communications/') || filename === 'communications_dashboard.html') return 'communications_dashboard';
        if (path.includes('/staff/me/') || filename === 'me_dashboard.html') return 'me_dashboard';

        const pageMap = {
            'admin_images.html': 'admin_images',
            'admin_categories.html': 'admin_categories',
            'admin_users.html': 'admin_users',
            'staff_management.html': 'staff_management',
            'impact_analytics.html': 'impact_analytics',
        };
        
        return pageMap[filename] || 'admin_dashboard';
    }

    // Highlight active nav item
    function setActivePage(pageId) {
        // Remove all active states
        document.querySelectorAll('.nav-link, .dropdown-item').forEach(el => {
            el.classList.remove('active');
        });

        // Add active to current page
        const activeLink = document.querySelector(`[data-page="${pageId}"]`);
        if (activeLink) {
            activeLink.classList.add('active');
            
            // If it's a dropdown item, also open the parent dropdown
            const dropdown = activeLink.closest('.dropdown');
            if (dropdown) {
                dropdown.classList.add('open');
            }
        }
    }

    // Setup dropdown toggles
    function setupDropdowns() {
        document.querySelectorAll('.dropdown-toggle').forEach(btn => {
            btn.addEventListener('click', (e) => {
                e.preventDefault();
                e.stopPropagation();
                const dropdown = btn.closest('.dropdown');
                dropdown.classList.toggle('open');
                btn.setAttribute('aria-expanded', dropdown.classList.contains('open'));
            });
        });

        // Close dropdowns when clicking outside
        document.addEventListener('click', (e) => {
            if (!e.target.closest('.dropdown')) {
                document.querySelectorAll('.dropdown.open').forEach(d => {
                    d.classList.remove('open');
                    const btn = d.querySelector('.dropdown-toggle');
                    if (btn) btn.setAttribute('aria-expanded', 'false');
                });
            }
        });
    }

    // Setup mobile sidebar
    function setupMobileSidebar() {
        const hamburger = document.getElementById('admin-hamburger-btn');
        const overlay = document.getElementById('admin-mobile-overlay');
        const sidebar = document.getElementById('admin-sidebar');

        if (!hamburger || !overlay || !sidebar) return;

        // Open sidebar
        hamburger.addEventListener('click', () => {
            sidebar.classList.add('open');
            overlay.classList.add('active');
            document.body.style.overflow = 'hidden';
        });

        // Close sidebar via overlay
        overlay.addEventListener('click', closeSidebar);

        // Close when a nav link is tapped on mobile
        sidebar.querySelectorAll('a').forEach(el => {
            el.addEventListener('click', () => {
                if (window.innerWidth < 768) closeSidebar();
            });
        });

        function closeSidebar() {
            sidebar.classList.remove('open');
            overlay.classList.remove('active');
            document.body.style.overflow = '';
        }
    }

    // Setup logout
    function setupLogout() {
        const logoutBtn = document.getElementById('admin-logout-btn');
        if (logoutBtn) {
            logoutBtn.addEventListener('click', () => {
                localStorage.clear();
                sessionStorage.clear();
                window.location.href = '/staff/login.html';
            });
        }
    }

    // Load sidebar HTML
    async function loadSidebar() {
        const placeholder = document.getElementById(PLACEHOLDER_ID);
        if (!placeholder) {
            console.warn('[AdminSidebar] Placeholder not found');
            return;
        }

        try {
            const res = await fetch(SIDEBAR_URL);
            if (!res.ok) throw new Error(`HTTP ${res.status}`);
            const html = await res.text();
            placeholder.outerHTML = html;

            // Initialize after DOM insertion
            const currentPage = getCurrentPage();
            setActivePage(currentPage);
            setupDropdowns();
            setupMobileSidebar();
            setupLogout();
        } catch (err) {
            console.error('[AdminSidebar] Failed to load:', err);
        }
    }

    // Auto-load when DOM ready
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', loadSidebar);
    } else {
        loadSidebar();
    }

    // Expose for manual reload
    window.vybeReloadAdminSidebar = loadSidebar;
})();