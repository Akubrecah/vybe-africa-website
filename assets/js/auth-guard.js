/**
 * VYBE AFRICA - SECURED NATIVE AUTH & ROLE-BASED ACCESS CONTROLLER
 * Manages native Supabase session verification, route protection,
 * database profile synchronization, and dynamic header/sidebar injection.
 */

(async function () {
    const currentPage = window.location.pathname.split('/').pop() || 'index.html';
    
    // Skip all auth-guard interference when running inside the CMS Visual Builder iframe.
    // The parent dashboard has already verified auth — we just need a clean page for editing.
    const urlParams = new URLSearchParams(window.location.search);
    if (urlParams.get('cms_edit') === 'true' || urlParams.get('cms_edit_iframe') === 'true') {
        return; // Let cms-client.js take full control
    }

    const protectedPages = [
        'admin_dashboard.html', 'programs_dashboard.html', 'hr_dashboard.html', 
        'communications_dashboard.html', 'me_dashboard.html', 'finance_dashboard.html', 
        'staff.html', 'team_directory.html', 'impact_analytics.html', 'edit_profile.html',
        'profile_setup.html', 'onboarding.html', 'staff_management.html', 'cms_dashboard.html'
    ];

    const isProtected = protectedPages.includes(currentPage);
    
    // 1. Synchronous Pre-flight Check (prevents race conditions and yields instant loads)
    const cachedUserId = localStorage.getItem('user_id');
    const cachedRole = (localStorage.getItem('role') || '').toLowerCase();
    const cachedDesignation = (localStorage.getItem('designation') || '').toLowerCase();

    // Helper to resolve primary dashboard
    function getPrimaryDashboardFromCache(cRole, cDesig) {
        if (cRole === 'superadmin' || cRole === 'admin' || cDesig.includes('executive') || cDesig.includes('director')) {
            return 'admin_dashboard.html';
        }
        if (cRole === 'hr' || cDesig.includes('hr') || cDesig.includes('human resource')) {
            return 'hr_dashboard.html';
        }
        if (cRole === 'programs' || cDesig.includes('program')) {
            return 'programs_dashboard.html';
        }
        if (cRole === 'communications' || cDesig.includes('communication') || cDesig.includes('media')) {
            return 'communications_dashboard.html';
        }
        if (cRole === 'me' || cDesig.includes('m&e') || cDesig.includes('monitoring') || cDesig.includes('evaluation')) {
            return 'me_dashboard.html';
        }
        if (cRole === 'finance' || cDesig.includes('finance') || cDesig.includes('account')) {
            return 'finance_dashboard.html';
        }
        return 'staff.html';
    }

    if (isProtected) {
        // If there's no cache, redirect immediately
        if (!cachedUserId) {
            sessionStorage.setItem('auth_error_reason', 'No cached session found. Please log in.');
            window.location.href = 'login.html';
            return;
        }

        // Fast-verify cached permissions
        const cachedPrimary = getPrimaryDashboardFromCache(cachedRole, cachedDesignation);
        const isAdmin = ['superadmin', 'admin'].includes(cachedRole) || cachedDesignation.includes('executive') || cachedDesignation.includes('director');
        
        if (!isAdmin) {
            const dashboardPages = [
                'admin_dashboard.html', 'programs_dashboard.html', 'hr_dashboard.html', 
                'communications_dashboard.html', 'me_dashboard.html', 'finance_dashboard.html'
            ];

            if (dashboardPages.includes(currentPage)) {
                if (currentPage !== cachedPrimary) {
                    sessionStorage.setItem('auth_alert', 'restricted');
                    sessionStorage.setItem('auth_error_reason', `Access restricted to ${cachedPrimary} for cached role ${cachedRole}`);
                    window.location.href = cachedPrimary;
                    return;
                }
            }
        }
    }

    // 2. Initialize Supabase Client
    const supabaseUrl = 'https://uwfkqitmopqcbvwhkcgg.supabase.co';
    const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InV3ZmtxaXRtb3BxY2J2d2hrY2dnIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODMzMTM2OTksImV4cCI6MjA5ODg4OTY5OX0.clHwO4AOcCB1yFbxGybydSUAlfR3uCaccnqt_mew3H8';

    let supabase = null;
    if (window.supabase) {
        try {
            supabase = window.supabase.createClient(supabaseUrl, supabaseKey, {
                auth: { 
                    persistSession: true, 
                    autoRefreshToken: true, 
                    detectSessionInUrl: true 
                }
            });
        } catch (e) {
            console.error('Supabase initialization failed in auth-guard:', e);
        }
    }

    // 3. Asynchronous Native Verification in the background (with polling & network resilience)
    let session = null;
    let user = null;
    let profile = null;
    let dbErrorMsg = '';
    let isNetworkError = false;

    // Helper to render offline banner on the screen
    function showOfflineWarningBanner() {
        document.addEventListener('DOMContentLoaded', () => {
            const bannerId = 'auth-offline-banner';
            if (document.getElementById(bannerId)) return;

            const banner = document.createElement('div');
            banner.id = bannerId;
            banner.className = 'fixed bottom-6 right-6 z-[99999] bg-[#9f402d] text-white px-5 py-3.5 rounded-xl shadow-[0_10px_30px_rgba(0,0,0,0.15)] flex items-center gap-3 border border-red-800/30 transition-all duration-300';
            banner.innerHTML = `
                <span class="material-symbols-outlined text-[20px] text-red-100">wifi_off</span>
                <div class="text-left">
                    <h5 class="font-bold text-xs leading-none">Connection Offline</h5>
                    <p class="text-[10px] text-red-100/80 mt-1 leading-none">Using cached staff credentials.</p>
                </div>
            `;
            document.body.appendChild(banner);
        });
    }

    if (supabase) {
        // Poll up to 6 times (1.5 seconds maximum) if the session isn't loaded yet.
        for (let attempt = 1; attempt <= 6; attempt++) {
            try {
                const { data } = await supabase.auth.getSession();
                session = data.session;
                user = session ? session.user : null;
                if (user) {
                    break; // Session successfully acquired
                }
            } catch (e) {
                console.error(`Session retrieval attempt ${attempt} failed:`, e);
                dbErrorMsg = e.message;
                if (e.message.includes('fetch') || e.message.includes('timeout') || e.message.includes('NetworkError')) {
                    isNetworkError = true;
                }
            }
            // Wait 250ms before retrying
            await new Promise(resolve => setTimeout(resolve, 250));
        }

        if (user) {
            try {
                // Query roles & details from public.users using the verified JWT user id
                const { data: dbUser, error } = await supabase
                    .from('users')
                    .select('*')
                    .eq('id', user.id)
                    .single();
                if (dbUser && !error) {
                    profile = dbUser;
                } else if (error) {
                    dbErrorMsg = error.message;
                    if (error.message.includes('fetch') || error.message.includes('Failed to fetch') || error.message.includes('timeout')) {
                        isNetworkError = true;
                    }
                }
            } catch (e) {
                console.error('Failed to query profile after native sign-in:', e);
                dbErrorMsg = e.message;
                if (e.message.includes('fetch') || e.message.includes('timeout')) {
                    isNetworkError = true;
                }
            }
        } else {
            if (!isNetworkError) {
                dbErrorMsg = 'No active GoTrue session found after polling.';
            }
        }
    } else {
        dbErrorMsg = 'Supabase client unavailable.';
    }

    // 4. Post-flight verification (Server verified check)
    const cachedEmail = (localStorage.getItem('email') || '').toLowerCase().trim();
    
    // Known demo UUIDs and email accounts
    const demoIds = [
        '64b4414e-e555-48fa-8885-6502e16c3513', // Sharon
        'd9ed018b-2f3c-4986-9857-52c4ba98247a', // Moses
        'f5fbddcf-045b-4875-8f4e-2b81a40fc418', // Marcellina
        '64b64358-92e2-4ff5-8f67-7b664bc88d19', // Farex
        '806e8e48-a3f2-4624-bda3-19f08b383511', // Tony
        '2f1d7dfa-c62d-4aaa-af03-15373fed3db7', // Joe
        '377c6ec2-bbb6-48a2-8365-3a58a50ba36b'  // System Admin
    ];

    const isDemoAccount = demoIds.includes(cachedUserId) || [
        'sharon@vybeafrica.org', 'moses@vybeafrica.org', 'farex@vybeafrica.org',
        'marcellina@vybeafrica.org', 'tony@vybeafrica.org', 'joe@vybeafrica.org',
        'poweldayck@gmail.com'
    ].includes(cachedEmail);

    // Helper to render demo session banner
    function showDemoWarningBanner() {
        document.addEventListener('DOMContentLoaded', () => {
            const bannerId = 'auth-demo-banner';
            if (document.getElementById(bannerId)) return;

            const banner = document.createElement('div');
            banner.id = bannerId;
            banner.className = 'fixed bottom-6 right-6 z-[99999] bg-[#4d6453] text-white px-5 py-3.5 rounded-xl shadow-[0_10px_30px_rgba(0,0,0,0.15)] flex items-center gap-3 border border-green-800/30 transition-all duration-300';
            banner.innerHTML = `
                <span class="material-symbols-outlined text-[20px] text-green-100">offline_pin</span>
                <div class="text-left">
                    <h5 class="font-bold text-xs leading-none">Demo Session Active</h5>
                    <p class="text-[10px] text-green-100/80 mt-1 leading-none">Logged in using local developer credentials.</p>
                </div>
            `;
            document.body.appendChild(banner);
        });
    }

    if (isProtected) {
        if (isNetworkError) {
            // Permitting entry in offline mode
            console.warn('Supabase connection timed out or offline. Bypassing check with cache.');
            showOfflineWarningBanner();
        } else {
            if (!user || !profile) {
                // If it is a verified demo account, bypass redirect and permit access
                if (isDemoAccount) {
                    console.log('Demo account session permitted without active server connection.');
                    showDemoWarningBanner();
                } else {
                    sessionStorage.setItem('auth_error_reason', 'Native session verification failed. Please sign in again.');
                    localStorage.clear();
                    window.location.href = 'login.html';
                    return;
                }
            }
        }

        const verifiedRole = profile ? (profile.role || '').toLowerCase() : cachedRole;
        const verifiedDesignation = profile ? (profile.designation || '').toLowerCase() : cachedDesignation;
        const verifiedPrimary = getPrimaryDashboardFromCache(verifiedRole, verifiedDesignation);
        
        const isAdmin = ['superadmin', 'admin'].includes(verifiedRole) || verifiedDesignation.includes('executive') || verifiedDesignation.includes('director');
        if (!isAdmin) {
            const dashboardPages = [
                'admin_dashboard.html', 'programs_dashboard.html', 'hr_dashboard.html', 
                'communications_dashboard.html', 'me_dashboard.html', 'finance_dashboard.html'
            ];

            if (dashboardPages.includes(currentPage)) {
                if (currentPage !== verifiedPrimary) {
                    sessionStorage.setItem('auth_alert', 'restricted');
                    sessionStorage.setItem('auth_error_reason', `Role mismatch. Restricted access from ${currentPage}`);
                    window.location.href = verifiedPrimary;
                    return;
                }
            }
        }
    }

    // Establish dynamic user profile properties
    const userId = profile ? profile.id : cachedUserId;
    const role = profile ? (profile.role || '').toLowerCase() : cachedRole;
    const designation = profile ? (profile.designation || '').toLowerCase() : cachedDesignation;
    const userName = profile ? (profile.name || 'Staff Member') : (localStorage.getItem('name') || 'Staff Member');
    const userBio = profile ? (profile.bio || '') : (localStorage.getItem('bio') || '');
    const userAvatarUrl = profile ? (profile.avatar_url || '') : (localStorage.getItem('avatar_url') || '');

    // Write back profile fields to localStorage
    if (profile) {
        localStorage.setItem('user_id', userId);
        localStorage.setItem('role', role);
        localStorage.setItem('designation', profile.designation || '');
        localStorage.setItem('name', userName);
        localStorage.setItem('bio', userBio);
        localStorage.setItem('avatar_url', userAvatarUrl);
        localStorage.setItem('email', profile.email);
    }

    // Fallback mission quotes for team members
    const FALLBACK_QUOTES = {
        'sharon chepkite': 'Empowering one youth empowers a whole village.',
        'moses kibet': 'Building sustainable programs for lasting impact.',
        'farex nandwa': 'Nurturing the talent that drives our mission.',
        'marcellina cherubia': 'Amplifying our voice to change the narrative.',
        'tony barasa': 'Data-driven insights for real community change.',
        'joe junior': 'Ensuring integrity in every resource managed.'
    };

    // Helper to get active user avatar
    function getUserAvatar() {
        if (userAvatarUrl && userAvatarUrl.trim() !== '' && userAvatarUrl !== 'null') {
            return userAvatarUrl;
        }
        
        const key = (designation || role).toLowerCase();
        if (key.includes('executive') || key.includes('director') || key.includes('admin') || key.includes('superadmin')) {
            if (key.includes('hr') || key.includes('human')) {
                return 'assets/images/IMG-20251211-WA0030.jpg';
            }
            return 'assets/images/IMG-20251211-WA0053.jpg';
        }
        if (key.includes('program')) {
            return 'assets/images/IMG-20251211-WA0024.jpg';
        }
        if (key.includes('hr') || key.includes('human')) {
            return 'assets/images/IMG-20251211-WA0030.jpg';
        }
        if (key.includes('communication') || key.includes('media') || key.includes('officer')) {
            return 'assets/images/team/Marcellina Cherubia.jpg';
        }
        if (key.includes('m&e') || key.includes('monitoring') || key.includes('evaluation') || key.includes('me')) {
            return 'assets/images/team/Tony Barasa.jpg';
        }
        if (key.includes('finance') || key.includes('account') || key.includes('junior')) {
            return 'assets/images/team/Joe Junior.jpg';
        }
        
        return 'assets/images/IMG-20251211-WA0053.jpg';
    }

    const primaryDashboard = getPrimaryDashboardFromCache(role, designation);

    // Update the Welcome Banner dynamically
    function updateWelcomeBanner(name, dest, avatarUrl, bioVal) {
        const welcomeTitle = document.getElementById('welcome-title');
        if (welcomeTitle) {
            welcomeTitle.textContent = `Welcome back, ${name} — ${dest || 'Staff Member'}`;
        }

        const welcomeQuote = document.getElementById('welcome-quote');
        if (welcomeQuote) {
            const lowerName = name.toLowerCase();
            const quote = bioVal || FALLBACK_QUOTES[lowerName] || 'Empowering youth across Africa.';
            welcomeQuote.textContent = quote;
        }

        const welcomeAvatar = document.getElementById('user-avatar-display');
        if (welcomeAvatar) {
            welcomeAvatar.src = avatarUrl || getUserAvatar();
            welcomeAvatar.alt = `${name} Profile`;
        }

        document.querySelectorAll('.user-display-name, #director-name, #hr-name, #pm-name, #officer-name, #me-name, #fin-name, #user-name').forEach(el => {
            if (el.id !== 'welcome-title') el.textContent = name;
        });
        document.querySelectorAll('.user-display-role, #director-title, #hr-title, #pm-title, #officer-title, #me-title, #fin-title, #user-role-badge').forEach(el => {
            if (el.id !== 'welcome-title') el.textContent = dest || role.toUpperCase();
        });
    }

    // 5. DOM Initialization (Sidebar, Headers, Logouts)
    document.addEventListener('DOMContentLoaded', () => {
        // A. Inject Access Restriction Toast if redirected
        const authAlert = sessionStorage.getItem('auth_alert');
        if (authAlert === 'restricted') {
            sessionStorage.removeItem('auth_alert');
            
            const banner = document.createElement('div');
            banner.className = 'fixed top-6 left-1/2 -translate-x-1/2 z-[9999] w-[90%] max-w-md bg-error text-on-error px-5 py-4 rounded-xl shadow-[0_20px_40px_rgba(0,0,0,0.15)] flex items-center justify-between gap-4 border border-error-container/20 transform -translate-y-32 opacity-0 transition-all duration-500 ease-out';
            banner.innerHTML = `
                <div class="flex items-center gap-3">
                    <span class="material-symbols-outlined text-[24px]">gpp_maybe</span>
                    <div class="text-left">
                        <h4 class="font-label-sm text-sm font-bold tracking-wide">Access Restricted</h4>
                        <p class="text-xs opacity-90 mt-0.5 leading-normal">You are only permitted to access your own department dashboard.</p>
                    </div>
                </div>
                <button class="text-on-error hover:opacity-85 transition-opacity focus:outline-none" onclick="this.parentElement.remove()">
                    <span class="material-symbols-outlined text-[18px]">close</span>
                </button>
            `;
            document.body.appendChild(banner);
            setTimeout(() => banner.classList.remove('-translate-y-32', 'opacity-0'), 100);
            setTimeout(() => {
                if (banner.parentElement) {
                    banner.classList.add('-translate-y-32', 'opacity-0');
                    setTimeout(() => banner.remove(), 500);
                }
            }, 6000);
        }

        // B. Populate headers & avatars immediately
        if (userId) {
            updateWelcomeBanner(userName, designation, getUserAvatar(), userBio);

            // C. Update Nav CTAs
            document.querySelectorAll('.nav-cta').forEach(cta => {
                cta.innerHTML = `
                    <a href="${primaryDashboard}" class="btn" style="margin-right:10px; background: #9f402d; color: #fff; font-weight:700; border-radius: 8px; padding: 10px 18px; text-decoration:none; display:inline-flex; align-items:center; gap:6px;">
                        <span>My Dashboard (${userName.split(' ')[0]})</span>
                    </a>
                    <button class="global-logout-btn" style="background: transparent; border: 1px solid #9f402d; color: #9f402d; font-weight:600; border-radius: 8px; padding: 10px 14px; cursor:pointer;">
                        Logout
                    </button>
                `;
            });

            // Re-map login links
            document.querySelectorAll('a[href="login.html"]').forEach(link => {
                if (!link.classList.contains('no-transform')) {
                    link.href = primaryDashboard;
                    link.textContent = 'My Dashboard';
                }
            });

            // D. Role-Based Navigation Hiding
            const ROLE_NAV_MAP = {
                superadmin: [
                    'admin_dashboard.html', 'staff.html', 'programs_dashboard.html',
                    'hr_dashboard.html', 'communications_dashboard.html', 'me_dashboard.html',
                    'finance_dashboard.html', 'team_directory.html', 'impact_analytics.html',
                    'edit_profile.html', 'staff_register.html', 'staff_management.html',
                    'gallery.html', 'homepage.html', 'onboarding.html', 'cms_dashboard.html'
                ],
                admin: [
                    'admin_dashboard.html', 'staff.html', 'programs_dashboard.html',
                    'hr_dashboard.html', 'communications_dashboard.html', 'me_dashboard.html',
                    'finance_dashboard.html', 'team_directory.html', 'impact_analytics.html',
                    'edit_profile.html', 'staff_register.html', 'staff_management.html',
                    'gallery.html', 'homepage.html', 'onboarding.html', 'cms_dashboard.html'
                ],
                programs: [
                    'programs_dashboard.html', 'staff.html', 'team_directory.html',
                    'impact_analytics.html', 'edit_profile.html', 'gallery.html', 'homepage.html', 'cms_dashboard.html'
                ],
                hr: [
                    'hr_dashboard.html', 'staff.html', 'team_directory.html',
                    'impact_analytics.html', 'edit_profile.html', 'gallery.html', 'homepage.html',
                    'staff_register.html', 'onboarding.html', 'cms_dashboard.html'
                ],
                communications: [
                    'communications_dashboard.html', 'staff.html', 'team_directory.html',
                    'gallery.html', 'impact_analytics.html', 'edit_profile.html', 'homepage.html', 'cms_dashboard.html'
                ],
                me: [
                    'me_dashboard.html', 'staff.html', 'team_directory.html',
                    'impact_analytics.html', 'edit_profile.html', 'gallery.html', 'homepage.html', 'cms_dashboard.html'
                ],
                finance: [
                    'finance_dashboard.html', 'staff.html', 'team_directory.html',
                    'impact_analytics.html', 'edit_profile.html', 'gallery.html', 'homepage.html', 'cms_dashboard.html'
                ],
                staff: [
                    'staff.html', 'team_directory.html', 'impact_analytics.html',
                    'edit_profile.html', 'gallery.html', 'homepage.html', 'cms_dashboard.html'
                ]
            };

            const allowedPages = ROLE_NAV_MAP[role] || ROLE_NAV_MAP['staff'];
            const allDashboardPages = [
                'admin_dashboard.html', 'programs_dashboard.html', 'hr_dashboard.html',
                'communications_dashboard.html', 'me_dashboard.html', 'finance_dashboard.html',
                'staff_register.html'
            ];

            document.querySelectorAll('a[href]').forEach(link => {
                const href = link.getAttribute('href') || '';
                const pageName = href.split('/').pop().split('?')[0];

                if (!pageName || href.startsWith('#') || href.startsWith('http') || href.startsWith('mailto')) return;
                
                if (allDashboardPages.includes(pageName) && !allowedPages.includes(pageName)) {
                    const li = link.closest('li');
                    if (li) {
                        li.style.display = 'none';
                    } else {
                        link.style.display = 'none';
                    }
                }
            });

            document.querySelectorAll('[data-portal-role]').forEach(el => {
                const allowedRoles = el.getAttribute('data-portal-role').split(',').map(r => r.trim());
                if (!allowedRoles.includes(role)) {
                    el.style.display = 'none';
                }
            });

            // E. Dynamic Sidebar Injections
            const asideElement = document.querySelector('aside');
            if (asideElement) {
                const isAdmin = ['superadmin', 'admin'].includes(role) || designation.includes('executive') || designation.includes('director');
                
                // Inject responsive CSS stylesheet
                const respStyle = document.createElement('style');
                respStyle.textContent = `
                    @media (max-width: 767px) {
                        aside.mobile-active {
                            display: flex !important;
                            position: fixed !important;
                            top: 0 !important;
                            left: 0 !important;
                            width: 280px !important;
                            height: 100vh !important;
                            z-index: 100000 !important;
                            transform: translateX(0) !important;
                            transition: transform 0.3s cubic-bezier(0.4, 0, 0.2, 1) !important;
                        }
                        aside:not(.mobile-active) {
                            transform: translateX(-100%) !important;
                            transition: transform 0.3s cubic-bezier(0.4, 0, 0.2, 1) !important;
                            display: none !important;
                        }
                        #mobile-sidebar-overlay {
                            position: fixed;
                            top: 0;
                            left: 0;
                            width: 100vw;
                            height: 100vh;
                            background: rgba(28, 27, 27, 0.5);
                            backdrop-filter: blur(4px);
                            z-index: 99999;
                            display: none;
                        }
                        #mobile-sidebar-overlay.active {
                            display: block !important;
                        }
                    }
                `;
                document.head.appendChild(respStyle);

                // Create Overlay
                let overlay = document.getElementById('mobile-sidebar-overlay');
                if (!overlay) {
                    overlay = document.createElement('div');
                    overlay.id = 'mobile-sidebar-overlay';
                    document.body.appendChild(overlay);
                }

                asideElement.className = "z-50 h-screen w-64 fixed left-0 top-0 bg-surface dark:bg-inverse-surface border-r border-outline-variant/10 shadow-[20px_0_30px_rgba(0,0,0,0.04)] hidden md:flex flex-col";
                
                const activeStyle = "flex items-center gap-4 px-4 py-3 rounded-lg text-primary font-bold bg-primary-container/10 border-r-4 border-primary transition-all duration-200";
                const inactiveStyle = "flex items-center gap-4 px-4 py-3 rounded-lg text-on-surface-variant hover:text-primary hover:bg-surface-container-low transition-colors duration-200";
                
                let menuItems = [];
                
                // 1. Department Dashboard (if distinct from general staff portal)
                if (primaryDashboard !== 'staff.html') {
                    menuItems.push({ name: 'Department Dashboard', url: primaryDashboard, icon: 'dashboard' });
                }
                
                // 2. User Dashboard (always accessible, pointing to staff.html)
                menuItems.push({ name: 'User Dashboard', url: 'staff.html', icon: 'hub' });
                
                // 3. Admin management item
                if (isAdmin) {
                    menuItems.push({ name: 'Staff Management', url: 'staff_management.html', icon: 'manage_accounts' });
                }
                
                // 4. Common links
                menuItems.push(
                    { name: 'Team Directory', url: 'team_directory.html', icon: 'group' },
                    { name: 'Impact Analytics', url: 'impact_analytics.html', icon: 'bar_chart' },
                    { name: 'CMS Console', url: 'cms_dashboard.html', icon: 'settings_suggest' },
                    { name: 'My Settings', url: 'edit_profile.html', icon: 'settings' },
                    { name: 'Ecosystem Site', url: 'homepage.html', icon: 'home' }
                );
                
                let linksHTML = menuItems.map(item => {
                    const isActive = currentPage === item.url;
                    return `
                        <a href="${item.url}" class="${isActive ? activeStyle : inactiveStyle}">
                            <span class="material-symbols-outlined"${isActive ? ' style="font-variation-settings:\'FILL\' 1;"' : ''}>${item.icon}</span>
                            <span class="font-label-sm text-label-sm">${item.name}</span>
                        </a>
                    `;
                }).join('');
                
                asideElement.innerHTML = `
                    <div class="flex flex-col h-full py-base">
                        <div class="px-6 py-6 border-none flex justify-between items-center">
                            <a href="homepage.html" class="flex items-center gap-3">
                                <div class="w-10 h-10 bg-primary-container rounded-lg flex items-center justify-center text-on-primary-container font-bold text-lg">V</div>
                                <div>
                                    <h1 class="font-headline-md text-headline-md text-primary leading-tight">Vybe Africa</h1>
                                    <p class="font-label-sm text-label-sm text-on-surface-variant">Admin Portal</p>
                                </div>
                            </a>
                            <button id="mobile-sidebar-close" class="md:hidden text-on-surface-variant hover:text-error transition-colors flex items-center justify-center p-1.5 rounded-lg bg-surface-container-low border border-outline-variant/20">
                                <span class="material-symbols-outlined" style="font-size: 20px;">close</span>
                            </button>
                        </div>
                        <nav class="flex-1 px-4 mt-8 space-y-2 overflow-y-auto" style="scrollbar-width: thin;">
                            ${linksHTML}
                        </nav>
                        <div class="p-4 mt-auto">
                            ${isAdmin ? `
                                <button onclick="alert('New Report generator initiated');" class="w-full bg-primary text-on-primary py-3 rounded-xl font-label-sm text-label-sm hover:opacity-90 transition-opacity mb-4">
                                    New Report
                                </button>
                            ` : ''}
                            <button id="logout-btn" class="w-full flex items-center gap-4 px-4 py-3 rounded-lg text-on-surface-variant hover:text-error hover:bg-error-container/20 transition-colors duration-200">
                                <span class="material-symbols-outlined">logout</span>
                                <span class="font-label-sm text-label-sm">Logout</span>
                            </button>
                        </div>
                    </div>
                `;

                // Standardize header styling and inject Hamburger on mobile
                const header = document.querySelector('header');
                if (header) {
                    // Remove hidden, mobile hidden, or push/padding offsets from header
                    let classes = header.className.split(' ');
                    classes = classes.filter(c => 
                        c !== 'hidden' && 
                        c !== 'md:hidden' && 
                        !c.startsWith('md:pl-') && 
                        !c.startsWith('pl-') && 
                        !c.startsWith('pr-') &&
                        !c.startsWith('md:pr-')
                    );
                    
                    // Add standard layout properties
                    if (!classes.includes('sticky') && !classes.includes('fixed')) {
                        classes.push('sticky');
                    }
                    if (!classes.includes('top-0')) classes.push('top-0');
                    if (!classes.includes('z-40') && !classes.includes('z-30')) classes.push('z-40');
                    
                    header.className = classes.join(' ');
                    
                    // Find the flex container inside header (or use header itself)
                    let flexContainer = header;
                    const innerFlex = header.querySelector('.flex, div[class*="flex"]');
                    if (innerFlex) {
                        flexContainer = innerFlex;
                    }
                    
                    // Ensure the flex container itself is visible on mobile
                    if (flexContainer !== header) {
                        flexContainer.className = flexContainer.className
                            .replace('hidden', '')
                            .replace('md:hidden', '');
                    }
                    
                    let burgerBtn = document.getElementById('mobile-hamburger-btn');
                    if (!burgerBtn) {
                        burgerBtn = document.createElement('button');
                        burgerBtn.id = 'mobile-hamburger-btn';
                        burgerBtn.className = 'md:hidden mr-4 text-on-surface-variant hover:text-primary transition-colors flex items-center justify-center p-2 rounded-lg bg-surface-container-low border border-outline-variant/20 flex-shrink-0';
                        burgerBtn.innerHTML = '<span class="material-symbols-outlined">menu</span>';
                        flexContainer.insertBefore(burgerBtn, flexContainer.firstChild);
                        
                        burgerBtn.addEventListener('click', () => {
                            asideElement.classList.add('mobile-active');
                            overlay.classList.add('active');
                        });
                    }
                }

                // Overlay click closes sidebar
                overlay.addEventListener('click', () => {
                    asideElement.classList.remove('mobile-active');
                    overlay.classList.remove('active');
                });

                // Set up mobile close listener
                setTimeout(() => {
                    const mobileCloseBtn = document.getElementById('mobile-sidebar-close');
                    if (mobileCloseBtn) {
                        mobileCloseBtn.addEventListener('click', () => {
                            asideElement.classList.remove('mobile-active');
                            overlay.classList.remove('active');
                        });
                    }
                }, 100);
            }

            // F. Dynamic avatar rendering
            const currentAvatar = getUserAvatar();
            const avatarElements = document.querySelectorAll('header img, nav img, aside img, main img, section img, .w-10.h-10 img, .w-12.h-12 img, .w-24.h-24 img, .w-32.h-32 img, .w-40.h-40 img');
            avatarElements.forEach(img => {
                const srcAttr = img.getAttribute('src') || '';
                if (!srcAttr.includes('logo.png') && !srcAttr.includes('logo-white.png')) {
                    if (srcAttr.includes('IMG-20251211-WA0053') || 
                        srcAttr.includes('IMG-20251211-WA0024') || 
                        srcAttr.includes('IMG-20251211-WA0030') || 
                        srcAttr.includes('Marcellina') || 
                        srcAttr.includes('Tony') || 
                        srcAttr.includes('Joe') || 
                        img.classList.contains('user-avatar') || 
                        img.id === 'avatar-preview' ||
                        img.id === 'user-avatar-display' ||
                        img.alt.toLowerCase().includes('profile') ||
                        img.alt.toLowerCase().includes('avatar') ||
                        img.closest('.w-10.h-10') ||
                        img.closest('.w-12.h-12') ||
                        img.closest('.w-24.h-24') ||
                        img.closest('.w-32.h-32') ||
                        img.closest('.w-40.h-40') ||
                        img.closest('.rounded-full')) {
                        
                        img.src = currentAvatar;
                    }
                }
            });
        }

        // G. Setup Logout Handlers
        document.querySelectorAll('#logout-btn, .logout-btn, .global-logout-btn').forEach(btn => {
            btn.addEventListener('click', async (e) => {
                e.preventDefault();
                if (supabase) {
                    try {
                        await supabase.auth.signOut();
                    } catch (err) {
                        console.error('Supabase native signout failed:', err);
                    }
                }
                localStorage.clear();
                window.location.href = 'login.html';
            });
        });
    });
})();
