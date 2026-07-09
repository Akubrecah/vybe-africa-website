/**
 * VYBE AFRICA - CMS CLIENT-SIDE SDK
 * Handles dynamic content fetching, dynamic page DOM injection, and
 * authenticated file uploads to Supabase Storage.
 */

(function () {
    const supabaseUrl = 'https://uwfkqitmopqcbvwhkcgg.supabase.co';
    const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InV3ZmtxaXRtb3BxY2J2d2hrY2dnIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODMzMTM2OTksImV4cCI6MjA5ODg4OTY5OX0.clHwO4AOcCB1yFbxGybydSUAlfR3uCaccnqt_mew3H8';

    let supabase = null;
    if (window.supabase) {
        try {
            supabase = window.supabase.createClient(supabaseUrl, supabaseKey);
        } catch (e) {
            console.error('Supabase initialization failed in cms-client:', e);
        }
    }

    const CMSClient = {
        client: supabase,

        // --- CACHE UTILITIES ---
        getLocal(key, fallback) {
            try {
                const val = localStorage.getItem(key);
                return val ? JSON.parse(val) : fallback;
            } catch (e) {
                return fallback;
            }
        },
        setLocal(key, data) {
            try {
                localStorage.setItem(key, JSON.stringify(data));
            } catch (e) {
                console.warn('Failed to write to localStorage:', e);
            }
        },

        // --- FETCH UTILITIES ---
        
        // Fetch raw text for specific page content blocks
        async fetchPageContent(page) {
            const cacheKey = `vybe_cms_page_${page}`;
            if (localStorage.getItem(cacheKey)) {
                return this.getLocal(cacheKey, {});
            }
            if (!supabase) return {};
            try {
                const { data, error } = await supabase
                    .from('page_contents')
                    .select('*')
                    .eq('page', page);
                if (error) throw error;
                
                // Map array to object for quick lookup: { "section.key": "value" }
                const contentMap = {};
                (data || []).forEach(row => {
                    const compositeKey = `${row.section}.${row.content_key}`;
                    contentMap[compositeKey] = row.value;
                });
                this.setLocal(cacheKey, contentMap);
                return contentMap;
            } catch (err) {
                console.error(`CMS: Failed to fetch page content for '${page}':`, err);
                return {};
            }
        },

        // Fallback demo data generators
        getDemoTeam() {
            return [
                { id: 'demo-1', name: 'Sharon Chepkite', role: 'Executive Director', department: 'Executive', is_verified: true, email: 'sharon@vybeafrica.org', image_url: 'assets/images/team/Sharon Chepkite.jpg' },
                { id: 'demo-2', name: 'Moses Kibet', role: 'Programs Manager', department: 'Programs', is_verified: true, email: 'moses@vybeafrica.org', image_url: 'assets/images/team/Moses Kibet.jpg' },
                { id: 'demo-3', name: 'Farex Nandwa', role: 'HR Manager', department: 'Human Resources', is_verified: true, email: 'farex@vybeafrica.org', image_url: 'assets/images/team/Farex Nandwa.jpg' },
                { id: 'demo-4', name: 'Marcellina Cherubia', role: 'Communication Officer', department: 'Communications', is_verified: true, email: 'marcellina@vybeafrica.org', image_url: 'assets/images/team/Marcellina Cherubia.jpg' },
                { id: 'demo-5', name: 'Tony Barasa', role: 'M&E Lead', department: 'Monitoring & Eval', is_verified: true, email: 'tony@vybeafrica.org', image_url: 'assets/images/team/Tony Barasa.jpg' },
                { id: 'demo-6', name: 'Joe Junior', role: 'Finance Manager', department: 'Finance', is_verified: true, email: 'joe@vybeafrica.org', image_url: 'assets/images/team/Joe Junior.jpg' }
            ];
        },

        getDemoPosts() {
            return [
                { id: 'demo-p1', title: 'VYBE Africa Launches New SRHR Initiative', content: 'We are proud to announce the launch of our new program aiming to reach 5000 youth in West Pokot.', category: 'Program Update', is_published: true, created_at: new Date(Date.now() - 172800000).toISOString(), image_url: '' },
                { id: 'demo-p2', title: 'Q3 Financial Report Available', content: 'The financial report for the third quarter has been finalized and is ready for review by the board.', category: 'Internal', is_published: true, created_at: new Date(Date.now() - 432000000).toISOString(), image_url: '' },
                { id: 'demo-p3', title: 'Partnership with County Government', content: 'A new MoU has been signed with the West Pokot County Government to support youth innovation hubs.', category: 'Partnership', is_published: true, created_at: new Date(Date.now() - 864000000).toISOString(), image_url: '' }
            ];
        },

        getDemoGallery() {
            return [
                { id: 'demo-g1', title: 'Local Organizing Initiative', category: 'events', image_url: 'assets/images/gallery/VYBE004847.jpg' },
                { id: 'demo-g2', title: 'Tech Empowerment Workshop', category: 'training', image_url: 'assets/images/gallery/VYBE004841.jpg' },
                { id: 'demo-g3', title: 'Reforestation Drive', category: 'field_work', image_url: 'assets/images/gallery/VYBE004827.jpg' },
                { id: 'demo-g4', title: 'Mobile Care Units', category: 'field_work', image_url: 'assets/images/gallery/VYBE004825.jpg' }
            ];
        },

        getDemoStats() {
            return [
                { key: 'youth_reached', label: 'Youth Reached', value: 1200000, target_value: 1200000, icon: 'group' },
                { key: 'active_programs', label: 'Active Programs', value: 45, target_value: 45, icon: 'event_available' },
                { key: 'staff_members', label: 'Staff Members', value: 320, target_value: 320, icon: 'badge' },
                { key: 'global_partners', label: 'Global Partners', value: 85, target_value: 85, icon: 'public' }
            ];
        },

        // Fetch team members list
        async fetchTeamMembers() {
            if (localStorage.getItem('vybe_cms_team')) {
                return this.getLocal('vybe_cms_team', []);
            }
            if (!supabase) {
                const demo = this.getDemoTeam();
                this.setLocal('vybe_cms_team', demo);
                return demo;
            }
            try {
                const { data, error } = await supabase
                    .from('team_members')
                    .select('*')
                    .order('created_at', { ascending: true });
                if (error) throw error;
                const result = (data && data.length > 0) ? data : this.getDemoTeam();
                this.setLocal('vybe_cms_team', result);
                return result;
            } catch (err) {
                console.error('CMS: Failed to fetch team members:', err);
                const demo = this.getDemoTeam();
                this.setLocal('vybe_cms_team', demo);
                return demo;
            }
        },

        // Fetch impact metrics
        async fetchImpactStats() {
            if (localStorage.getItem('vybe_cms_stats')) {
                return this.getLocal('vybe_cms_stats', []);
            }
            if (!supabase) {
                const demo = this.getDemoStats();
                this.setLocal('vybe_cms_stats', demo);
                return demo;
            }
            try {
                const { data, error } = await supabase
                    .from('impact_stats')
                    .select('*');
                if (error) throw error;
                const result = (data && data.length > 0) ? data : this.getDemoStats();
                this.setLocal('vybe_cms_stats', result);
                return result;
            } catch (err) {
                console.error('CMS: Failed to fetch impact stats:', err);
                const demo = this.getDemoStats();
                this.setLocal('vybe_cms_stats', demo);
                return demo;
            }
        },

        // Fetch gallery items
        async fetchGalleryItems() {
            if (localStorage.getItem('vybe_cms_gallery')) {
                return this.getLocal('vybe_cms_gallery', []);
            }
            if (!supabase) {
                const demo = this.getDemoGallery();
                this.setLocal('vybe_cms_gallery', demo);
                return demo;
            }
            try {
                const { data, error } = await supabase
                    .from('gallery_items')
                    .select('*')
                    .order('created_at', { ascending: false });
                if (error) throw error;
                const result = (data && data.length > 0) ? data : this.getDemoGallery();
                this.setLocal('vybe_cms_gallery', result);
                return result;
            } catch (err) {
                console.error('CMS: Failed to fetch gallery items:', err);
                const demo = this.getDemoGallery();
                this.setLocal('vybe_cms_gallery', demo);
                return demo;
            }
        },

        // Fetch blog posts
        async fetchPosts() {
            if (localStorage.getItem('vybe_cms_posts')) {
                return this.getLocal('vybe_cms_posts', []);
            }
            if (!supabase) {
                const demo = this.getDemoPosts();
                this.setLocal('vybe_cms_posts', demo);
                return demo;
            }
            try {
                const { data, error } = await supabase
                    .from('posts')
                    .select('*')
                    .eq('is_published', true)
                    .order('created_at', { ascending: false });
                if (error) throw error;
                const result = (data && data.length > 0) ? data : this.getDemoPosts();
                this.setLocal('vybe_cms_posts', result);
                return result;
            } catch (err) {
                console.error('CMS: Failed to fetch posts:', err);
                const demo = this.getDemoPosts();
                this.setLocal('vybe_cms_posts', demo);
                return demo;
            }
        },

        // --- UPLOAD TO STORAGE ---
        
        // Upload a file to Supabase Storage and retrieve the public url
        async uploadFile(bucketName, file) {
            if (!supabase) throw new Error('Supabase client not initialized.');
            
            // Clean file name to prevent collision
            const cleanFileName = file.name.replace(/[^a-zA-Z0-9.]/g, '_');
            const fileExt = cleanFileName.split('.').pop();
            const filePath = `${Date.now()}_${Math.random().toString(36).substring(2, 7)}.${fileExt}`;
            
            const { data, error } = await supabase.storage
                .from(bucketName)
                .upload(filePath, file, {
                    cacheControl: '3600',
                    upsert: false
                });
                
            if (error) throw error;
            
            // Generate public URL
            const publicUrl = `${supabaseUrl}/storage/v1/object/public/${bucketName}/${filePath}`;
            return publicUrl;
        },

        autoTagElements() {
            let pageName = window.location.pathname.split('/').pop().replace('.html', '');
            if (!pageName || pageName === 'index') {
                pageName = 'homepage';
            }

            const containers = document.querySelectorAll('section, header, footer, main, nav');
            containers.forEach((container, secIndex) => {
                const containerTag = container.tagName.toLowerCase();
                let secId = container.id || container.className.split(' ')[0] || `sec_${secIndex}`;
                let elPage = pageName;

                if (containerTag === 'header' || containerTag === 'nav' || container.closest('header') || container.closest('nav')) {
                    elPage = 'global';
                    secId = 'header';
                } else if (containerTag === 'footer' || container.closest('footer')) {
                    elPage = 'global';
                    secId = 'footer';
                } else {
                    if (pageName === 'header_footer_editor') {
                        return; // Skip tagging body elements on layout editor
                    }
                }

                const editables = container.querySelectorAll('h1, h2, h3, h4, h5, h6, p, a, button, img, span');
                
                const tagCounts = {};
                editables.forEach(el => {
                    if (el.closest('#cms-live-editor-dock') || el.closest('#cms-visual-inspector') || el.closest('#cms-live-editor-toast')) {
                        return;
                    }

                    if (el.classList.contains('material-symbols-outlined') || el.classList.contains('fa') || el.classList.contains('fab') || el.classList.contains('fas') || el.classList.contains('far')) {
                        return;
                    }

                    const tagName = el.tagName.toLowerCase();
                    
                    if (tagName === 'span' && el.textContent.trim().length === 0) {
                        return;
                    }

                    if (el.hasAttribute('data-cms-page')) {
                        return;
                    }

                    if (!tagCounts[tagName]) tagCounts[tagName] = 0;
                    const index = tagCounts[tagName]++;
                    
                    el.setAttribute('data-cms-page', elPage);
                    el.setAttribute('data-cms-section', secId);
                    el.setAttribute('data-cms-key', `${tagName}_${index}`);
                    
                    if (tagName === 'img') {
                        el.setAttribute('data-cms-type', 'image');
                    }
                });
            });
        },

        // --- AUTOMATIC DOM INJECTION ---
        
        async injectAll() {
            const pageElements = document.querySelectorAll('[data-cms-page]');
            const pagesToFetch = new Set();
            pageElements.forEach(el => pagesToFetch.add(el.getAttribute('data-cms-page')));

            for (const page of pagesToFetch) {
                const content = await this.fetchPageContent(page);

                // 0. Inject Page settings (like document Title)
                const currentPage = window.location.pathname.split('/').pop().replace('.html', '') || 'homepage';
                if (page === currentPage && content['settings.title'] !== undefined) {
                    document.title = content['settings.title'];
                }

                // 1. First: apply structural reordering if present
                pageElements.forEach(el => {
                    if (el.getAttribute('data-cms-page') === page) {
                        const sec = el.getAttribute('data-cms-section');
                        const orderKey = `${sec}.order`;
                        if (content[orderKey] !== undefined) {
                            try {
                                const orderedKeys = JSON.parse(content[orderKey]);
                                const parent = el.parentNode;
                                if (parent && !parent.dataset.cmsOrdered) {
                                    parent.dataset.cmsOrdered = "true";
                                    const siblings = Array.from(parent.children).filter(child => child.hasAttribute('data-cms-key'));
                                    const elementsMap = {};
                                    siblings.forEach(s => {
                                        elementsMap[s.getAttribute('data-cms-key')] = s;
                                    });
                                    orderedKeys.forEach(k => {
                                        if (elementsMap[k]) {
                                            parent.appendChild(elementsMap[k]);
                                        }
                                    });
                                }
                            } catch(e) {
                                console.warn("Failed to parse section ordering", e);
                            }
                        }
                    }
                });

                // 2. Second: inject contents, links, images, and custom styles
                pageElements.forEach(el => {
                    if (el.getAttribute('data-cms-page') === page) {
                        const sec = el.getAttribute('data-cms-section');
                        const key = el.getAttribute('data-cms-key');
                        const compositeKey = `${sec}.${key}`;
                        const type = el.getAttribute('data-cms-type');
                        
                        if (content[compositeKey] !== undefined) {
                            const rawVal = content[compositeKey];
                            let parsed = null;
                            try {
                                parsed = JSON.parse(rawVal);
                            } catch (e) {
                                // Not JSON string, fall back
                            }

                            if (parsed && typeof parsed === 'object') {
                                // A. Inject content value
                                if (parsed.val !== undefined) {
                                    if (type === 'html' || el.tagName === 'A' || el.tagName === 'BUTTON') {
                                        el.innerHTML = parsed.val;
                                    } else {
                                        el.textContent = parsed.val;
                                    }
                                }
                                // B. Inject image source
                                if (parsed.src !== undefined) {
                                    if (el.tagName === 'IMG') {
                                        el.src = parsed.src;
                                    } else if (type === 'bg-image') {
                                        el.style.backgroundImage = `url('${parsed.src}')`;
                                    }
                                }
                                // C. Inject anchor link target
                                if (parsed.href !== undefined && el.tagName === 'A') {
                                    el.setAttribute('href', parsed.href);
                                }
                                // D. Apply custom design styles
                                if (parsed.styles) {
                                    for (const [prop, sVal] of Object.entries(parsed.styles)) {
                                        if (sVal !== undefined) el.style[prop] = sVal;
                                    }
                                }
                            } else {
                                // Raw string fallback
                                if (type === 'html') {
                                    el.innerHTML = rawVal;
                                } else if (type === 'image') {
                                    if (el.tagName === 'IMG') {
                                        el.src = rawVal;
                                    }
                                } else if (type === 'bg-image') {
                                    el.style.backgroundImage = `url('${rawVal}')`;
                                } else {
                                    el.textContent = rawVal;
                                }
                            }
                        }
                    }
                });
            }
        },

        initLiveEditor() {
            // ONLY show editing tools if query param cms_edit is active (guarantees editor only shows inside Visual Builder)
            const urlParams = new URLSearchParams(window.location.search);
            const hasEditParam = urlParams.get('cms_edit') === 'true' || urlParams.get('cms_edit_iframe') === 'true';

            if (!hasEditParam) {
                return;
            }

            let editModeActive = false;
            let selectedElement = null;

            // Inject Visual Inspector styling
            const style = document.createElement('style');
            style.textContent = `
                .cms-selected-element {
                    outline: 2px solid #0070f3 !important;
                    outline-offset: 4px !important;
                    box-shadow: 0 0 15px rgba(0, 112, 243, 0.4) !important;
                }
                .cms-inspector-scroll::-webkit-scrollbar {
                    width: 6px;
                }
                .cms-inspector-scroll::-webkit-scrollbar-track {
                    background: transparent;
                }
                .cms-inspector-scroll::-webkit-scrollbar-thumb {
                    background: rgba(255,255,255,0.1);
                    border-radius: 99px;
                }
                
                #cms-visual-inspector {
                    position: fixed;
                    top: 0;
                    right: -350px;
                    width: 320px;
                    height: 100vh;
                    background-color: #1c1b1b;
                    color: #ffffff;
                    box-shadow: -10px 0 35px rgba(0,0,0,0.3);
                    z-index: 99999;
                    font-family: Inter, sans-serif;
                    font-size: 13px;
                    transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
                    display: flex;
                    flex-direction: column;
                    border-left: 1px solid rgba(255,255,255,0.1);
                }
                
                #cms-visual-inspector.active {
                    right: 0 !important;
                }
                
                @media (max-width: 768px) {
                    #cms-visual-inspector {
                        top: auto !important;
                        bottom: -100% !important;
                        right: 0 !important;
                        width: 100% !important;
                        height: 60vh !important;
                        border-left: none !important;
                        border-top: 1px solid rgba(255,255,255,0.1) !important;
                        border-radius: 20px 20px 0 0 !important;
                        box-shadow: 0 -10px 30px rgba(0,0,0,0.3) !important;
                    }
                    #cms-visual-inspector.active {
                        bottom: 0 !important;
                        right: 0 !important;
                    }
                    #cms-live-editor-dock {
                        bottom: 16px !important;
                        right: 16px !important;
                        left: 16px !important;
                        border-radius: 16px !important;
                        justify-content: center !important;
                        padding: 6px 10px !important;
                        gap: 6px !important;
                    }
                    #cms-live-editor-dock button {
                        padding: 6px 12px !important;
                        font-size: 11px !important;
                    }
                    #cms-live-editor-toast {
                        bottom: 76px !important;
                        right: 16px !important;
                        left: 16px !important;
                        text-align: center !important;
                    }
                }
            `;
            document.head.appendChild(style);

            // Create floating control dock
            const dock = document.createElement('div');
            dock.id = 'cms-live-editor-dock';
            dock.style.position = 'fixed';
            dock.style.bottom = '24px';
            dock.style.right = '24px';
            dock.style.zIndex = '99999';
            dock.style.backgroundColor = '#1c1b1b'; // dark sleek theme
            dock.style.color = '#ffffff';
            dock.style.padding = '8px 12px';
            dock.style.borderRadius = '24px';
            dock.style.boxShadow = '0 12px 36px rgba(0,0,0,0.25)';
            dock.style.display = 'flex';
            dock.style.alignItems = 'center';
            dock.style.gap = '8px';
            dock.style.fontFamily = 'Inter, sans-serif';
            dock.style.fontSize = '13px';
            dock.style.border = '1px solid rgba(255,255,255,0.1)';
            dock.style.transition = 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)';

            dock.innerHTML = `
                <button id="cms-toggle-edit-btn" style="background:#9f402d; color:#fff; border:none; padding:8px 16px; border-radius:99px; font-weight:bold; cursor:pointer; display:flex; align-items:center; gap:6px; transition:all 0.2s ease; outline:none; font-size:12px;">
                    <span class="material-symbols-outlined" style="font-size:16px;">edit_note</span>
                    <span>Enable Edit Mode</span>
                </button>
                <button id="cms-save-changes-btn" style="background:#4d6453; color:#fff; border:none; padding:8px 16px; border-radius:99px; font-weight:bold; cursor:pointer; display:none; align-items:center; gap:6px; transition:all 0.2s ease; outline:none; font-size:12px;">
                    <span class="material-symbols-outlined" style="font-size:16px;">save</span>
                    <span>Save Changes</span>
                </button>
            `;

            document.body.appendChild(dock);

            const toggleBtn = document.getElementById('cms-toggle-edit-btn');
            const saveBtn = document.getElementById('cms-save-changes-btn');

            // Initialize Inspector panel
            const inspector = createVisualInspector();

            // Automatically boot in Edit Mode inside the Visual Page Builder
            editModeActive = true;
            toggleBtn.style.backgroundColor = '#4d6453'; // secondary active green
            toggleBtn.innerHTML = `
                <span class="material-symbols-outlined" style="font-size: 16px;">close</span>
                <span>Exit Edit Mode</span>
            `;
            enableEditing();
            // Send initial sync state to parent dashboard
            window.parent.postMessage({
                action: 'sync_edit_mode',
                active: editModeActive
            }, '*');

            // Listen for set_edit_mode messages from the parent dashboard
            window.addEventListener('message', (e) => {
                if (e.data && e.data.action === 'set_edit_mode') {
                    if (e.data.active !== editModeActive) {
                        toggleBtn.click();
                    }
                }
            });

            toggleBtn.addEventListener('click', () => {
                editModeActive = !editModeActive;
                if (editModeActive) {
                    localStorage.setItem('cms_edit_mode', 'true');
                    toggleBtn.style.backgroundColor = '#4d6453'; // secondary active green
                    toggleBtn.innerHTML = `
                        <span class="material-symbols-outlined" style="font-size: 16px;">close</span>
                        <span>Exit Edit Mode</span>
                    `;
                    enableEditing();
                } else {
                    // Check for unsaved changes
                    const dirtyElements = document.querySelectorAll('[data-cms-dirty="true"]');
                    const dirtyOrders = document.querySelectorAll('[data-cms-dirty-order="true"]');
                    if (dirtyElements.length > 0 || dirtyOrders.length > 0) {
                        if (!confirm(`You have unsaved changes. Are you sure you want to discard them?`)) {
                            editModeActive = true;
                            return; // Keep edit mode active
                        }
                    }
                    
                    localStorage.setItem('cms_edit_mode', 'false');
                    toggleBtn.style.backgroundColor = '#9f402d'; // primary red
                    toggleBtn.innerHTML = `
                        <span class="material-symbols-outlined" style="font-size: 16px;">edit_note</span>
                        <span>Enable Edit Mode</span>
                    `;
                    disableEditing();
                }

                // Notify parent dashboard
                window.parent.postMessage({
                    action: 'sync_edit_mode',
                    active: editModeActive
                }, '*');
            });

            saveBtn.addEventListener('click', async () => {
                await saveAllChanges();
            });

            // Use pointerdown to open inspector panel WITHOUT blocking focus on contentEditable elements
            document.addEventListener('pointerdown', (e) => {
                if (!editModeActive) return;

                // If clicking inside the dock or inspector panel, do nothing
                if (e.target.closest('#cms-live-editor-dock') || e.target.closest('#cms-visual-inspector')) {
                    return;
                }

                const closestEditable = e.target.closest('[data-cms-page]');
                if (closestEditable) {
                    selectElement(closestEditable);
                } else {
                    deselectElement();
                }
            });

            // Prevent link navigation in edit mode, but allow contentEditable focus
            document.addEventListener('click', (e) => {
                if (!editModeActive) return;

                // If clicking inside the dock or inspector panel, do nothing
                if (e.target.closest('#cms-live-editor-dock') || e.target.closest('#cms-visual-inspector')) {
                    return;
                }

                // Only block navigation for anchor tags — let all other clicks go through normally
                const anchor = e.target.closest('a');
                if (anchor && anchor.hasAttribute('data-cms-page')) {
                    e.preventDefault();
                    e.stopPropagation();
                }
            }, true);

            function enableEditing() {
                const editableElements = document.querySelectorAll('[data-cms-page]');
                editableElements.forEach(el => {
                    el.contentEditable = 'true';
                    // Show standard visual cue for editable text
                    el.style.outline = '2px dashed #9f402d';
                    el.style.outlineOffset = '4px';
                    el.style.borderRadius = '4px';
                    el.style.backgroundColor = 'rgba(159, 64, 45, 0.03)';
                    el.title = `CMS: ${el.getAttribute('data-cms-section')}.${el.getAttribute('data-cms-key')}`;
                    
                    // Track edits dynamically
                    el.addEventListener('input', handleInput);
                });
                
                showPageSettings();
                showCmsToast('Live Editor Enabled! Click any section or button to customize text and design.', 'success');
            }

            function disableEditing() {
                const editableElements = document.querySelectorAll('[data-cms-page]');
                editableElements.forEach(el => {
                    el.contentEditable = 'false';
                    el.style.outline = 'none';
                    el.style.backgroundColor = 'transparent';
                    el.removeAttribute('data-cms-dirty');
                    el.removeEventListener('input', handleInput);
                });
                const orderedContainers = document.querySelectorAll('[data-cms-dirty-order="true"]');
                orderedContainers.forEach(container => container.removeAttribute('data-cms-dirty-order'));
                
                selectedElement = null;
                document.querySelectorAll('.cms-selected-element').forEach(sel => sel.classList.remove('cms-selected-element'));
                closeInspector();
                saveBtn.style.display = 'none';
                showCmsToast('Live Editor Disabled.', 'info');
            }

            function handleInput(e) {
                const el = e.target;
                el.dataset.cmsDirty = 'true';
                // Update outline to show it has UNSAVED changes
                el.style.outline = '2px dashed #4d6453'; // Green dashed line
                el.style.backgroundColor = 'rgba(77, 100, 83, 0.06)';
                
                // Show save changes button in dock
                saveBtn.style.display = 'flex';
            }

            function selectElement(el) {
                // Clear any other selections
                document.querySelectorAll('.cms-selected-element').forEach(sel => sel.classList.remove('cms-selected-element'));
                
                selectedElement = el;
                selectedElement.classList.add('cms-selected-element');

                // Populate Inspector Title & Tags
                document.getElementById('inspector-element-title').textContent = `${el.tagName} Element`;
                
                const page = el.getAttribute('data-cms-page');
                const sec = el.getAttribute('data-cms-section');
                const key = el.getAttribute('data-cms-key');
                const type = el.getAttribute('data-cms-type');

                document.getElementById('inspector-elem-tag').textContent = `${page} > ${sec} > ${key}`;
                
                // Show Element Settings, Hide Page Settings
                document.getElementById('inspector-element-settings').style.display = 'flex';
                document.getElementById('inspector-page-settings').style.display = 'none';

                // Show / Hide Image Upload
                const imageSection = document.getElementById('inspector-image-section');
                if (el.tagName === 'IMG' || type === 'image' || type === 'bg-image') {
                    imageSection.style.display = 'block';
                } else {
                    imageSection.style.display = 'none';
                }

                // Show / Hide Anchor Link Target input
                const linkSection = document.getElementById('inspector-link-section');
                if (el.tagName === 'A') {
                    linkSection.style.display = 'block';
                    document.getElementById('inspector-link-url').value = el.getAttribute('href') || '';
                } else {
                    linkSection.style.display = 'none';
                }

                // Pop alignment button styles
                const currentAlign = el.style.textAlign || 'left';
                inspector.querySelectorAll('[data-align]').forEach(b => {
                    if (b.getAttribute('data-align') === currentAlign) {
                        b.style.backgroundColor = '#9f402d';
                    } else {
                        b.style.backgroundColor = 'transparent';
                    }
                });

                // Pop font size values
                document.getElementById('inspector-font-size').value = el.style.fontSize || '';

                // Slide in Inspector Panel
                inspector.classList.add('active');
            }

            function deselectElement() {
                if (selectedElement) {
                    selectedElement.classList.remove('cms-selected-element');
                    selectedElement = null;
                }
                showPageSettings();
            }

            function showPageSettings() {
                document.getElementById('inspector-element-title').textContent = 'Page Settings';
                document.getElementById('inspector-elem-tag').textContent = 'Document settings';
                
                // Show Page Settings, Hide Element Settings
                document.getElementById('inspector-element-settings').style.display = 'none';
                document.getElementById('inspector-page-settings').style.display = 'block';
                
                // Populate page title
                document.getElementById('inspector-page-title-input').value = document.title;
                
                inspector.classList.add('active');
            }

            function closeInspector() {
                inspector.classList.remove('active');
            }

            function getActiveElement() {
                return selectedElement;
            }

            function markAsDirty(el) {
                el.dataset.cmsDirty = 'true';
                el.style.outline = '2px dashed #4d6453'; // Green outline for unsaved design style
                el.style.backgroundColor = 'rgba(77, 100, 83, 0.06)';
                saveBtn.style.display = 'flex';
            }

            function saveLayoutOrder(el) {
                const page = el.getAttribute('data-cms-page');
                const section = el.getAttribute('data-cms-section');
                const parent = el.parentNode;
                if (!parent) return;

                const siblings = Array.from(parent.children).filter(child => child.hasAttribute('data-cms-key'));
                const orderKeys = siblings.map(child => child.getAttribute('data-cms-key'));

                parent.dataset.cmsDirtyOrder = "true";
                parent.dataset.cmsOrderKeys = JSON.stringify(orderKeys);
                parent.dataset.cmsPage = page;
                parent.dataset.cmsSection = section;

                saveBtn.style.display = 'flex';
            }

            async function saveAllChanges() {
                const dirtyElements = document.querySelectorAll('[data-cms-dirty="true"]');
                const dirtyOrders = document.querySelectorAll('[data-cms-dirty-order="true"]');
                
                if (dirtyElements.length === 0 && dirtyOrders.length === 0) return;

                saveBtn.disabled = true;
                saveBtn.innerHTML = `
                    <span class="material-symbols-outlined animate-spin" style="font-size:16px;">sync</span>
                    <span>Saving...</span>
                `;

                let successCount = 0;
                let failCount = 0;

                // 1. Save standard text content & styles
                for (const el of dirtyElements) {
                    const page = el.getAttribute('data-cms-page');
                    const section = el.getAttribute('data-cms-section');
                    const key = el.getAttribute('data-cms-key');
                    const type = el.getAttribute('data-cms-type');

                    // Serialize content, links, images, and styles to a unified JSON string
                    const valueObj = {
                        val: el.innerHTML.trim(),
                        styles: {
                            textAlign: el.style.textAlign || '',
                            color: el.style.color || '',
                            backgroundColor: el.style.backgroundColor || '',
                            fontSize: el.style.fontSize || '',
                            opacity: el.style.opacity || ''
                        }
                    };
                    if (el.tagName === 'A') {
                        valueObj.href = el.getAttribute('href') || '';
                    }
                    if (el.tagName === 'IMG') {
                        valueObj.src = el.getAttribute('src') || '';
                    } else if (type === 'image' || type === 'bg-image') {
                        const bgUrl = el.style.backgroundImage.match(/url\(['"]?([^'"]+)['"]?\)/);
                        if (bgUrl) valueObj.src = bgUrl[1];
                    }

                    const value = JSON.stringify(valueObj);

                    let dbUpdated = false;
                    try {
                        if (supabase) {
                            const { data: existing } = await supabase
                                .from('page_contents')
                                .select('id')
                                .eq('page', page)
                                .eq('section', section)
                                .eq('content_key', key)
                                .maybeSingle();

                            let res;
                            if (existing && existing.id) {
                                res = await supabase
                                    .from('page_contents')
                                    .update({ value })
                                    .eq('id', existing.id)
                                    .select();
                            } else {
                                res = await supabase
                                    .from('page_contents')
                                    .insert([{ page, section, content_key: key, value }])
                                    .select();
                            }

                            if (!res.error && res.data && res.data.length > 0) {
                                dbUpdated = true;
                            }
                        }
                    } catch (err) {
                        console.warn("Live Editor DB Sync Error:", err);
                    }

                    // Always sync to local storage cache
                    const cacheKey = `vybe_cms_page_${page}`;
                    const localContent = JSON.parse(localStorage.getItem(cacheKey) || '{}');
                    localContent[`${section}.${key}`] = value;
                    localStorage.setItem(cacheKey, JSON.stringify(localContent));

                    if (dbUpdated) {
                        successCount++;
                    } else {
                        failCount++;
                    }

                    // Reset visual outline
                    el.removeAttribute('data-cms-dirty');
                    el.style.outline = '2px dashed #9f402d';
                    el.style.backgroundColor = 'rgba(159, 64, 45, 0.03)';
                }

                // 2. Save layout ordering configurations
                for (const container of dirtyOrders) {
                    const page = container.dataset.cmsPage;
                    const section = container.dataset.cmsSection;
                    const key = `${section}.order`;
                    const value = container.dataset.cmsOrderKeys;

                    let dbUpdated = false;
                    try {
                        if (supabase) {
                            const { data: existing } = await supabase
                                .from('page_contents')
                                .select('id')
                                .eq('page', page)
                                .eq('section', section)
                                .eq('content_key', key)
                                .maybeSingle();

                            let res;
                            if (existing && existing.id) {
                                res = await supabase
                                    .from('page_contents')
                                    .update({ value })
                                    .eq('id', existing.id)
                                    .select();
                            } else {
                                res = await supabase
                                    .from('page_contents')
                                    .insert([{ page, section, content_key: key, value }])
                                    .select();
                            }

                            if (!res.error && res.data && res.data.length > 0) {
                                dbUpdated = true;
                            }
                        }
                    } catch (err) {
                        console.warn("Live Editor Layout Order Sync Error:", err);
                    }

                    const cacheKey = `vybe_cms_page_${page}`;
                    const localContent = JSON.parse(localStorage.getItem(cacheKey) || '{}');
                    localContent[key] = value;
                    localStorage.setItem(cacheKey, JSON.stringify(localContent));

                    if (dbUpdated) {
                        successCount++;
                    } else {
                        failCount++;
                    }

                    container.removeAttribute('data-cms-dirty-order');
                }

                // 3. Save page settings title if dirty
                if (document.body.dataset.cmsDirtyTitle === "true") {
                    const page = window.location.pathname.split('/').pop().replace('.html', '') || 'homepage';
                    const section = 'settings';
                    const key = 'title';
                    const value = document.body.dataset.cmsTitleValue;

                    let dbUpdated = false;
                    try {
                        if (supabase) {
                            const { data: existing } = await supabase
                                .from('page_contents')
                                .select('id')
                                .eq('page', page)
                                .eq('section', section)
                                .eq('content_key', key)
                                .maybeSingle();

                            let res;
                            if (existing && existing.id) {
                                res = await supabase
                                    .from('page_contents')
                                    .update({ value })
                                    .eq('id', existing.id)
                                    .select();
                            } else {
                                res = await supabase
                                    .from('page_contents')
                                    .insert([{ page, section, content_key: key, value }])
                                    .select();
                            }

                            if (!res.error && res.data && res.data.length > 0) {
                                dbUpdated = true;
                            }
                        }
                    } catch (err) {
                        console.warn("Live Editor Title Sync Error:", err);
                    }

                    // Cache to localStorage
                    const cacheKey = `vybe_cms_page_${page}`;
                    const localContent = JSON.parse(localStorage.getItem(cacheKey) || '{}');
                    localContent[`${section}.${key}`] = value;
                    localStorage.setItem(cacheKey, JSON.stringify(localContent));

                    if (dbUpdated) successCount++;
                    else failCount++;

                    document.body.removeAttribute('data-cms-dirty-title');
                    document.body.removeAttribute('data-cms-title-value');
                }

                saveBtn.disabled = false;
                saveBtn.style.display = 'none';
                saveBtn.innerHTML = `
                    <span class="material-symbols-outlined" style="font-size:16px;">save</span>
                    <span>Save Changes</span>
                `;

                deselectElement();

                if (failCount === 0) {
                    showCmsToast(`Saved ${successCount} design updates to database!`, 'success');
                } else if (successCount > 0) {
                    showCmsToast(`Saved ${successCount} design updates, ${failCount} to browser cache.`, 'warning');
                } else {
                    showCmsToast(`Saved ${failCount} design updates to browser cache.`, 'warning');
                }
            }

            function rgbToHex(rgb) {
                if (!rgb || rgb === 'transparent') return '';
                if (rgb.startsWith('#')) return rgb;
                const rgbValues = rgb.match(/\d+/g);
                if (!rgbValues) return '';
                const r = parseInt(rgbValues[0]).toString(16).padStart(2, '0');
                const g = parseInt(rgbValues[1]).toString(16).padStart(2, '0');
                const b = parseInt(rgbValues[2]).toString(16).padStart(2, '0');
                return `#${r}${g}${b}`;
            }

            function createVisualInspector() {
                let inspector = document.getElementById('cms-visual-inspector');
                if (inspector) return inspector;

                inspector = document.createElement('div');
                inspector.id = 'cms-visual-inspector';
                
                inspector.style.position = 'fixed';
                inspector.style.top = '0';
                inspector.style.right = '-350px';
                inspector.style.width = '320px';
                inspector.style.height = '100vh';
                inspector.style.backgroundColor = '#1c1b1b';
                inspector.style.color = '#ffffff';
                inspector.style.boxShadow = '-10px 0 35px rgba(0,0,0,0.3)';
                inspector.style.zIndex = '99999';
                inspector.style.fontFamily = 'Inter, sans-serif';
                inspector.style.fontSize = '13px';
                inspector.style.transition = 'right 0.3s cubic-bezier(0.4, 0, 0.2, 1)';
                inspector.style.display = 'flex';
                inspector.style.flexDirection = 'column';
                inspector.style.borderLeft = '1px solid rgba(255,255,255,0.1)';

                inspector.innerHTML = `
                    <div style="padding: 20px; border-bottom: 1px solid rgba(255,255,255,0.1); display:flex; justify-content:space-between; align-items:center;">
                        <div>
                            <h4 style="margin:0; font-weight:bold; font-size:14px; text-transform:uppercase; letter-spacing:0.5px; color:#e2725b;" id="inspector-element-title">Page Settings</h4>
                            <div id="inspector-elem-tag" style="font-size:11px; color:#89726d; margin-top:4px;">Document settings</div>
                        </div>
                        <button id="inspector-close-btn" style="background:none; border:none; color:#89726d; font-size:24px; cursor:pointer; padding:0; line-height:1;">&times;</button>
                    </div>
                    
                    <div style="flex:1; overflow-y:auto; padding:20px; display:flex; flex-direction:column; gap:20px;" class="cms-inspector-scroll">
                        <!-- A. PAGE SETTINGS CARD -->
                        <div id="inspector-page-settings" style="display:block;">
                            <h5 style="margin:0 0 10px 0; color:#ddc0ba; font-size:12px; font-weight:bold; text-transform:uppercase;">Page Configurations</h5>
                            <div style="display:flex; flex-direction:column; gap:12px;">
                                <div>
                                    <label style="display:block; font-size:11px; color:#89726d; margin-bottom:4px;">HTML Document Title</label>
                                    <input type="text" id="inspector-page-title-input" style="width:100%; background:#2c2b2b; border:1px solid rgba(255,255,255,0.1); color:#fff; padding:8px; border-radius:8px; font-size:12px; outline:none;" placeholder="e.g. Home Page - Vybe Africa">
                                </div>
                            </div>
                        </div>

                        <!-- B. ELEMENT SETTINGS CARD -->
                        <div id="inspector-element-settings" style="display:none; flex-direction:column; gap:20px;">
                            <!-- Typography Card -->
                            <div id="inspector-typo-section">
                                <h5 style="margin:0 0 10px 0; color:#ddc0ba; font-size:12px; font-weight:bold; text-transform:uppercase;">Typography</h5>
                                <div style="display:flex; flex-direction:column; gap:12px;">
                                    <div>
                                        <label style="display:block; font-size:11px; color:#89726d; margin-bottom:4px;">Text Alignment</label>
                                        <div style="display:flex; gap:4px; background:#2c2b2b; padding:3px; border-radius:8px;">
                                            <button data-align="left" style="flex:1; background:none; border:none; color:#fff; padding:6px; font-size:11px; border-radius:6px; cursor:pointer;">Left</button>
                                            <button data-align="center" style="flex:1; background:none; border:none; color:#fff; padding:6px; font-size:11px; border-radius:6px; cursor:pointer;">Center</button>
                                            <button data-align="right" style="flex:1; background:none; border:none; color:#fff; padding:6px; font-size:11px; border-radius:6px; cursor:pointer;">Right</button>
                                        </div>
                                    </div>
                                    
                                    <div>
                                        <label style="display:block; font-size:11px; color:#89726d; margin-bottom:4px;">Font Size</label>
                                        <select id="inspector-font-size" style="width:100%; background:#2c2b2b; border:1px solid rgba(255,255,255,0.1); color:#fff; padding:6px; border-radius:6px; font-size:12px;">
                                            <option value="">Default</option>
                                            <option value="12px">12px (XS)</option>
                                            <option value="14px">14px (SM)</option>
                                            <option value="16px">16px (MD)</option>
                                            <option value="18px">18px (LG)</option>
                                            <option value="24px">24px (XL)</option>
                                            <option value="32px">32px (XXL)</option>
                                            <option value="48px">48px (3XL)</option>
                                            <option value="64px">64px (4XL)</option>
                                            <option value="84px">84px (5XL)</option>
                                        </select>
                                    </div>
                                </div>
                            </div>

                            <!-- Colors Card -->
                            <div>
                                <h5 style="margin:0 0 10px 0; color:#ddc0ba; font-size:12px; font-weight:bold; text-transform:uppercase;">Design Colors</h5>
                                <div style="display:flex; flex-direction:column; gap:12px;">
                                    <div>
                                        <label style="display:block; font-size:11px; color:#89726d; margin-bottom:4px;">Text Color</label>
                                        <div style="display:grid; grid-template-columns:repeat(5, 1fr); gap:6px;">
                                            <button class="color-preset" data-color="#9f402d" style="height:24px; border-radius:4px; border:1px solid rgba(255,255,255,0.2); background:#9f402d; cursor:pointer;" title="Primary Red"></button>
                                            <button class="color-preset" data-color="#4d6453" style="height:24px; border-radius:4px; border:1px solid rgba(255,255,255,0.2); background:#4d6453; cursor:pointer;" title="Secondary Green"></button>
                                            <button class="color-preset" data-color="#1c1b1b" style="height:24px; border-radius:4px; border:1px solid rgba(255,255,255,0.2); background:#1c1b1b; cursor:pointer;" title="Dark"></button>
                                            <button class="color-preset" data-color="#ffffff" style="height:24px; border-radius:4px; border:1px solid rgba(255,255,255,0.2); background:#ffffff; cursor:pointer;" title="White"></button>
                                            <input type="color" id="inspector-text-color-picker" style="width:100%; height:24px; border:none; padding:0; background:none; cursor:pointer;" title="Custom Color">
                                        </div>
                                    </div>

                                    <div>
                                        <label style="display:block; font-size:11px; color:#89726d; margin-bottom:4px;">Background Color</label>
                                        <div style="display:grid; grid-template-columns:repeat(5, 1fr); gap:6px;">
                                            <button class="bg-preset" data-color="transparent" style="height:24px; border-radius:4px; border:1px solid rgba(255,255,255,0.2); background:linear-gradient(45deg, #ccc 25%, transparent 25%), linear-gradient(-45deg, #ccc 25%, transparent 25%), linear-gradient(45deg, transparent 75%, #ccc 75%), linear-gradient(-45deg, transparent 75%, #ccc 75%); background-size: 8px 8px; background-position: 0 0, 0 4px, 4px -4px, -4px 0px; cursor:pointer;" title="Transparent"></button>
                                            <button class="bg-preset" data-color="#9f402d" style="height:24px; border-radius:4px; border:1px solid rgba(255,255,255,0.2); background:#9f402d; cursor:pointer;" title="Primary Red"></button>
                                            <button class="bg-preset" data-color="#4d6453" style="height:24px; border-radius:4px; border:1px solid rgba(255,255,255,0.2); background:#4d6453; cursor:pointer;" title="Secondary Green"></button>
                                            <button class="bg-preset" data-color="#1c1b1b" style="height:24px; border-radius:4px; border:1px solid rgba(255,255,255,0.2); background:#1c1b1b; cursor:pointer;" title="Dark"></button>
                                            <input type="color" id="inspector-bg-color-picker" style="width:100%; height:24px; border:none; padding:0; background:none; cursor:pointer;" title="Custom Color">
                                        </div>
                                    </div>
                                </div>
                            </div>

                            <!-- Image Section (Visible for Images) -->
                            <div id="inspector-image-section" style="display:none;">
                                <h5 style="margin:0 0 10px 0; color:#ddc0ba; font-size:12px; font-weight:bold; text-transform:uppercase;">Image & Media</h5>
                                <div style="display:flex; flex-direction:column; gap:12px;">
                                    <div>
                                        <label style="display:block; font-size:11px; color:#89726d; margin-bottom:4px;">Upload Image Asset</label>
                                        <input type="file" id="inspector-image-upload" accept="image/*" style="display:none;">
                                        <button id="inspector-upload-trigger" style="width:100%; background:#9f402d; color:#fff; border:none; padding:10px; border-radius:8px; font-weight:bold; cursor:pointer; font-size:11px; display:flex; align-items:center; justify-content:center; gap:6px;">
                                            <span class="material-symbols-outlined" style="font-size:16px;">upload</span>
                                            <span>Upload New Image</span>
                                        </button>
                                        <div id="inspector-upload-progress" style="font-size:11px; color:#e2725b; margin-top:4px; display:none;">Uploading...</div>
                                    </div>
                                </div>
                            </div>

                            <!-- Anchor Link URL Section -->
                            <div id="inspector-link-section" style="display:none;">
                                <h5 style="margin:0 0 10px 0; color:#ddc0ba; font-size:12px; font-weight:bold; text-transform:uppercase;">Action Link</h5>
                                <div>
                                    <label style="display:block; font-size:11px; color:#89726d; margin-bottom:4px;">Destination URL</label>
                                    <input type="text" id="inspector-link-url" style="width:100%; background:#2c2b2b; border:1px solid rgba(255,255,255,0.1); color:#fff; padding:8px; border-radius:8px; font-size:12px; outline:none;" placeholder="e.g. about.html">
                                </div>
                            </div>

                            <!-- Layout & Arrange Section -->
                            <div>
                                <h5 style="margin:0 0 10px 0; color:#ddc0ba; font-size:12px; font-weight:bold; text-transform:uppercase;">Layout Actions</h5>
                                <div style="display:flex; flex-direction:column; gap:8px;">
                                    <div style="display:flex; gap:8px;">
                                        <button id="inspector-move-up-btn" style="flex:1; background:#2c2b2b; color:#fff; border:1px solid rgba(255,255,255,0.1); padding:10px; border-radius:8px; font-weight:bold; cursor:pointer; display:flex; align-items:center; justify-content:center; gap:6px; font-size:11px;">
                                            <span class="material-symbols-outlined" style="font-size:16px;">arrow_upward</span>
                                            <span>Move Up</span>
                                        </button>
                                        <button id="inspector-move-down-btn" style="flex:1; background:#2c2b2b; color:#fff; border:1px solid rgba(255,255,255,0.1); padding:10px; border-radius:8px; font-weight:bold; cursor:pointer; display:flex; align-items:center; justify-content:center; gap:6px; font-size:11px;">
                                            <span class="material-symbols-outlined" style="font-size:16px;">arrow_downward</span>
                                            <span>Move Down</span>
                                        </button>
                                    </div>
                                    <button id="inspector-duplicate-btn" style="width:100%; background:#4d6453; color:#fff; border:none; padding:10px; border-radius:8px; font-weight:bold; cursor:pointer; font-size:11px; display:flex; align-items:center; justify-content:center; gap:6px; outline:none; transition:0.2s;">
                                        <span class="material-symbols-outlined" style="font-size:16px;">content_copy</span>
                                        <span>Duplicate Element</span>
                                    </button>
                                </div>
                            </div>
                        </div>
                    </div>
                    
                    <div style="padding: 20px; border-top: 1px solid rgba(255,255,255,0.1); font-size:11px; color:#89726d; text-align:center;">
                        Directly click to edit inline.<br/>Click background to deselect.
                    </div>
                `;
                document.body.appendChild(inspector);

                document.getElementById('inspector-close-btn').addEventListener('click', () => {
                    closeInspector();
                });

                inspector.querySelectorAll('[data-align]').forEach(btn => {
                    btn.addEventListener('click', () => {
                        const activeEl = getActiveElement();
                        if (!activeEl) return;
                        
                        const align = btn.getAttribute('data-align');
                        activeEl.style.textAlign = align;
                        markAsDirty(activeEl);

                        inspector.querySelectorAll('[data-align]').forEach(b => b.style.backgroundColor = 'transparent');
                        btn.style.backgroundColor = '#9f402d';
                    });
                });

                document.getElementById('inspector-font-size').addEventListener('change', (e) => {
                    const activeEl = getActiveElement();
                    if (!activeEl) return;
                    activeEl.style.fontSize = e.target.value;
                    markAsDirty(activeEl);
                });

                inspector.querySelectorAll('.color-preset').forEach(btn => {
                    btn.addEventListener('click', () => {
                        const activeEl = getActiveElement();
                        if (!activeEl) return;
                        const color = btn.getAttribute('data-color');
                        activeEl.style.color = color;
                        document.getElementById('inspector-text-color-picker').value = rgbToHex(color) || color;
                        markAsDirty(activeEl);
                    });
                });

                document.getElementById('inspector-text-color-picker').addEventListener('input', (e) => {
                    const activeEl = getActiveElement();
                    if (!activeEl) return;
                    activeEl.style.color = e.target.value;
                    markAsDirty(activeEl);
                });

                inspector.querySelectorAll('.bg-preset').forEach(btn => {
                    btn.addEventListener('click', () => {
                        const activeEl = getActiveElement();
                        if (!activeEl) return;
                        const color = btn.getAttribute('data-color');
                        activeEl.style.backgroundColor = color;
                        document.getElementById('inspector-bg-color-picker').value = color === 'transparent' ? '#ffffff' : (rgbToHex(color) || color);
                        markAsDirty(activeEl);
                    });
                });

                document.getElementById('inspector-bg-color-picker').addEventListener('input', (e) => {
                    const activeEl = getActiveElement();
                    if (!activeEl) return;
                    activeEl.style.backgroundColor = e.target.value;
                    markAsDirty(activeEl);
                });

                document.getElementById('inspector-link-url').addEventListener('input', (e) => {
                    const activeEl = getActiveElement();
                    if (!activeEl || activeEl.tagName !== 'A') return;
                    activeEl.setAttribute('href', e.target.value);
                    markAsDirty(activeEl);
                });

                document.getElementById('inspector-page-title-input').addEventListener('input', (e) => {
                    document.body.dataset.cmsDirtyTitle = "true";
                    document.body.dataset.cmsTitleValue = e.target.value;
                    document.title = e.target.value;
                    saveBtn.style.display = 'flex';
                });

                document.getElementById('inspector-upload-trigger').addEventListener('click', () => {
                    document.getElementById('inspector-image-upload').click();
                });

                document.getElementById('inspector-image-upload').addEventListener('change', async (e) => {
                    const activeEl = getActiveElement();
                    if (!activeEl) return;
                    const file = e.target.files[0];
                    if (!file) return;

                    const progressEl = document.getElementById('inspector-upload-progress');
                    progressEl.style.display = 'block';
                    progressEl.textContent = 'Uploading file...';

                    try {
                        const publicUrl = await CMSClient.uploadFile('gallery', file);
                        if (activeEl.tagName === 'IMG') {
                            activeEl.src = publicUrl;
                        } else {
                            activeEl.style.backgroundImage = `url('${publicUrl}')`;
                        }
                        progressEl.textContent = 'Uploaded successfully!';
                        markAsDirty(activeEl);
                    } catch(err) {
                        console.error("Failed uploading image:", err);
                        progressEl.textContent = 'Upload failed.';
                    }
                    
                    setTimeout(() => progressEl.style.display = 'none', 3000);
                });

                document.getElementById('inspector-move-up-btn').addEventListener('click', () => {
                    const activeEl = getActiveElement();
                    if (!activeEl) return;
                    
                    const prev = activeEl.previousElementSibling;
                    if (prev && prev.hasAttribute('data-cms-key')) {
                        activeEl.parentNode.insertBefore(activeEl, prev);
                        saveLayoutOrder(activeEl);
                    }
                });

                document.getElementById('inspector-move-down-btn').addEventListener('click', () => {
                    const activeEl = getActiveElement();
                    if (!activeEl) return;

                    const next = activeEl.nextElementSibling;
                    if (next && next.hasAttribute('data-cms-key')) {
                        activeEl.parentNode.insertBefore(next, activeEl);
                        saveLayoutOrder(activeEl);
                    }
                });

                document.getElementById('inspector-duplicate-btn').addEventListener('click', () => {
                    const activeEl = getActiveElement();
                    if (!activeEl) return;

                    const parent = activeEl.parentNode;
                    if (!parent) return;

                    const originalKey = activeEl.getAttribute('data-cms-key');

                    const clone = activeEl.cloneNode(true);
                    clone.classList.remove('cms-selected-element');
                    
                    // Give clone visual cue of unsaved edits
                    clone.style.outline = '2px dashed #4d6453';
                    clone.style.backgroundColor = 'rgba(77, 100, 83, 0.06)';
                    
                    const newKey = `${originalKey}_copy_${Date.now()}`;
                    clone.setAttribute('data-cms-key', newKey);
                    clone.dataset.cmsDirty = 'true';

                    // Insert clone next to original
                    parent.insertBefore(clone, activeEl.nextElementSibling);

                    // Rebind input listener
                    clone.addEventListener('input', handleInput);

                    // Save new layout arrangement order
                    saveLayoutOrder(clone);

                    // Select the clone immediately for editing
                    selectElement(clone);

                    showCmsToast('Element duplicated! Click to edit its content.', 'success');
                });

                return inspector;
            }

            function showCmsToast(message, type = 'success') {
                let toast = document.getElementById('cms-live-editor-toast');
                if (!toast) {
                    toast = document.createElement('div');
                    toast.id = 'cms-live-editor-toast';
                    toast.style.position = 'fixed';
                    toast.style.bottom = '84px';
                    toast.style.right = '24px';
                    toast.style.zIndex = '99999';
                    toast.style.color = '#ffffff';
                    toast.style.padding = '10px 16px';
                    toast.style.borderRadius = '8px';
                    toast.style.fontSize = '12px';
                    toast.style.fontWeight = '500';
                    toast.style.transition = 'all 0.3s ease';
                    toast.style.fontFamily = 'Inter, sans-serif';
                    document.body.appendChild(toast);
                }
                
                toast.textContent = message;
                toast.style.display = 'block';
                toast.style.opacity = '1';
                
                if (type === 'success') {
                    toast.style.backgroundColor = '#4d6453'; // secondary
                } else if (type === 'warning') {
                    toast.style.backgroundColor = '#e2725b'; // primary-container
                } else {
                    toast.style.backgroundColor = '#313030'; // dark
                }

                setTimeout(() => {
                    toast.style.opacity = '0';
                    setTimeout(() => { toast.style.display = 'none'; }, 300);
                }, 3000);
            }
        }
    };

    // Expose client globally
    window.cmsClient = CMSClient;

    // Run automatically on load for pages consuming contents
    document.addEventListener('DOMContentLoaded', async () => {
        CMSClient.autoTagElements();
        await CMSClient.injectAll();
        CMSClient.initLiveEditor();
    });
})();
