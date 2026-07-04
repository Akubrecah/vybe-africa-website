document.addEventListener('DOMContentLoaded', () => {
  const currentPage = window.location.pathname.split('/').pop() || 'homepage.html';
  const pageKey = currentPage.replace(/\.html$/i, '') || 'homepage';

  const navLinks = [
    { href: 'homepage.html', label: 'Ecosystem', key: 'homepage' },
    { href: 'west_pokot.html', label: 'County Chapter', key: 'west_pokot' },
    { href: 'impact_registry.html', label: 'Impact Registry', key: 'impact_registry' },
    { href: 'about.html', label: 'About Us', key: 'about' },
    { href: 'work.html', label: 'Our Work', key: 'work' },
    { href: 'gallery.html', label: 'Gallery', key: 'gallery' },
    { href: 'contact.html', label: 'Contact', key: 'contact' },
  ];

  const headerMarkup = `
    <div class="bg-primary text-on-primary py-2 text-xs font-semibold w-full border-b border-white/10">
      <div class="max-w-container-max mx-auto px-margin-mobile md:px-margin-desktop flex justify-end gap-6">
        <a class="hover:text-primary-container transition-colors opacity-90 hover:opacity-100" href="member_login.html">Members Login</a>
        <a class="hover:text-primary-container transition-colors opacity-90 hover:opacity-100" href="login.html">Staff Login</a>
        <a class="font-bold hover:text-primary-container transition-colors" href="get-involved.html">Get Involved</a>
      </div>
    </div>
    <header class="sticky top-0 z-50 w-full border-b border-outline-variant/30 bg-surface/95 backdrop-blur-md text-primary shadow-sm transition-all duration-300">
      <div class="max-w-container-max mx-auto px-margin-mobile md:px-margin-desktop">
        <div class="flex items-center justify-between h-16 gap-6">
          <a href="homepage.html" class="flex items-center gap-2.5 shrink-0 text-primary hover:opacity-80 transition-opacity">
            <img src="assets/images/logo.png" alt="VYBE Africa" class="h-8 w-auto object-contain" onerror="this.style.display='none'">
            <span class="font-display text-lg font-extrabold tracking-tight leading-none">Vybe Africa</span>
          </a>

          <nav class="hidden md:flex items-center gap-1 flex-1 justify-center">
            ${navLinks.map((link) => {
              const isActive = pageKey === link.key || (pageKey === 'homepage' && link.key === 'homepage');
              return `<a class="relative py-2 px-3 text-sm rounded whitespace-nowrap transition-all ${isActive ? 'font-bold text-primary bg-primary-container/10' : 'font-medium text-on-surface-variant hover:text-primary hover:bg-primary-container/10'}" href="${link.href}">${link.label}</a>`;
            }).join('')}
          </nav>

          <div class="flex items-center gap-2 shrink-0">
            <a href="impact_registry.html" title="Impact Map" class="hidden sm:flex items-center justify-center p-2 rounded-full text-on-surface-variant hover:text-primary hover:bg-primary-container/10 transition-colors">
              <span class="material-symbols-outlined text-[20px]">public</span>
            </a>
            <a href="gallery.html" title="Gallery" class="hidden sm:flex items-center justify-center p-2 rounded-full text-on-surface-variant hover:text-primary hover:bg-primary-container/10 transition-colors">
              <span class="material-symbols-outlined text-[20px]">photo_library</span>
            </a>
            <a href="get-involved.html" class="ml-1 bg-primary text-on-primary px-4 py-2 rounded-lg text-xs font-bold uppercase tracking-wider whitespace-nowrap hover:bg-primary-container hover:text-on-primary-container transition-colors shadow-sm">Donate Now</a>
            <button id="mobile-menu-toggle" aria-label="Toggle menu" class="md:hidden flex items-center justify-center p-2 rounded-lg text-primary hover:bg-primary-container/10 transition-colors">
              <span class="material-symbols-outlined text-[24px]">menu</span>
            </button>
          </div>
        </div>
      </div>

      <div id="mobile-menu" class="hidden md:hidden border-t border-outline-variant/30 bg-surface shadow-lg">
        <nav class="max-w-container-max mx-auto px-margin-mobile py-3 flex flex-col gap-1">
          ${navLinks.map((link) => `<a class="block py-2 px-3 rounded text-sm ${pageKey === link.key ? 'font-bold text-primary bg-primary-container/10' : 'font-medium text-on-surface-variant hover:text-primary hover:bg-primary-container/10 transition-colors'}" href="${link.href}">${link.label}</a>`).join('')}
        </nav>
        <div class="max-w-container-max mx-auto px-margin-mobile pb-4 flex flex-col gap-2 border-t border-outline-variant/20 pt-3">
          <a href="member_login.html" class="text-center text-xs px-4 py-2.5 rounded-lg font-semibold border border-outline-variant hover:border-primary hover:text-primary transition-colors">Member Login</a>
          <a href="login.html" class="text-center text-xs px-4 py-2.5 rounded-lg font-semibold border border-primary text-primary hover:bg-primary hover:text-on-primary transition-colors">Staff Login</a>
        </div>
      </div>
    </header>`;

  const footerMarkup = `
    <footer class="w-full bg-[#1a1a1a] text-surface-variant mt-auto border-t border-white/10">
      <div class="max-w-container-max mx-auto px-margin-mobile md:px-margin-desktop py-16">
        <div class="grid grid-cols-1 gap-10 md:grid-cols-12 lg:gap-8">
          <div class="md:col-span-12 lg:col-span-4 flex flex-col gap-4">
            <a class="font-display text-xl font-bold text-white tracking-tight flex items-center gap-2" href="homepage.html">
              <span class="w-8 h-8 rounded-lg bg-primary text-on-primary flex items-center justify-center font-bold text-lg leading-none">V</span>
              <span>VYBE Africa</span>
            </a>
            <p class="text-sm leading-relaxed text-surface-variant/70 max-w-xs">Empowering young people in West Pokot with practical solutions, strong networks, and visible impact.</p>
            <div class="flex gap-3 mt-2">
              <a class="w-10 h-10 rounded-full bg-white/5 flex items-center justify-center hover:bg-primary text-white transition-colors" href="https://www.facebook.com/vybeafrica" target="_blank" rel="noreferrer"><i class="fab fa-facebook-f text-xs"></i></a>
              <a class="w-10 h-10 rounded-full bg-white/5 flex items-center justify-center hover:bg-primary text-white transition-colors" href="https://x.com/VybeAfrica254" target="_blank" rel="noreferrer"><i class="fab fa-x-twitter text-xs"></i></a>
              <a class="w-10 h-10 rounded-full bg-white/5 flex items-center justify-center hover:bg-primary text-white transition-colors" href="https://www.instagram.com/vybeafrica254" target="_blank" rel="noreferrer"><i class="fab fa-instagram text-xs"></i></a>
            </div>
          </div>
          <div class="md:col-span-4 lg:col-span-2 flex flex-col gap-3">
            <h4 class="font-bold text-white uppercase tracking-wider text-xs">Our Work</h4>
            <a class="text-sm text-surface-variant/70 hover:text-primary transition-colors" href="srhr.html">SRHR &amp; Health</a>
            <a class="text-sm text-surface-variant/70 hover:text-primary transition-colors" href="climate.html">Climate Action</a>
            <a class="text-sm text-surface-variant/70 hover:text-primary transition-colors" href="child-protection.html">Child Protection</a>
            <a class="text-sm text-surface-variant/70 hover:text-primary transition-colors" href="inclusive-governance.html">Governance</a>
          </div>
          <div class="md:col-span-4 lg:col-span-2 flex flex-col gap-3">
            <h4 class="font-bold text-white uppercase tracking-wider text-xs">Organization</h4>
            <a class="text-sm text-surface-variant/70 hover:text-primary transition-colors" href="about.html">About Us</a>
            <a class="text-sm text-surface-variant/70 hover:text-primary transition-colors" href="work.html">Our Team</a>
            <a class="text-sm text-surface-variant/70 hover:text-primary transition-colors" href="get-involved.html">Get Involved</a>
            <a class="text-sm text-surface-variant/70 hover:text-primary transition-colors" href="contact.html">Contact</a>
          </div>
          <div class="md:col-span-4 lg:col-span-4 flex flex-col gap-3">
            <h4 class="font-bold text-white uppercase tracking-wider text-xs">Stay Updated</h4>
            <p class="text-sm text-surface-variant/70">Subscribe for project updates, field stories, and partner opportunities.</p>
            <form class="flex w-full mt-1" onsubmit="event.preventDefault();">
              <input class="w-full px-4 py-3 rounded-l-lg bg-white/5 border border-white/10 text-white focus:border-primary focus:ring-1 focus:ring-primary focus:outline-none placeholder-surface-variant/50 text-sm" placeholder="Email address" type="email" />
              <button class="bg-primary text-on-primary px-6 py-3 rounded-r-lg hover:bg-primary-container transition-colors font-bold text-sm" type="submit">Join</button>
            </form>
          </div>
        </div>
        <div class="border-t border-white/10 mt-10 pt-6 flex flex-col gap-3 md:flex-row md:justify-between md:items-center text-sm text-surface-variant/50">
          <div>© 2026 VYBE Africa. All rights reserved.</div>
          <div class="flex gap-4">
            <a class="hover:text-white transition-colors" href="#">Privacy</a>
            <a class="hover:text-white transition-colors" href="#">Terms</a>
          </div>
        </div>
      </div>
    </footer>`;

  const topUtilityBar = document.querySelector('body > div');
  if (topUtilityBar && /Members Login|Staff Login/.test(topUtilityBar.innerHTML)) {
    topUtilityBar.remove();
  }

  const existingHeader = document.querySelector('body > header');
  if (existingHeader) {
    existingHeader.outerHTML = headerMarkup;
  }

  const existingFooter = document.querySelector('body > footer');
  if (existingFooter) {
    existingFooter.outerHTML = footerMarkup;
  }

  const toggleBtn = document.getElementById('mobile-menu-toggle');
  const mobileMenu = document.getElementById('mobile-menu');
  if (toggleBtn && mobileMenu) {
    toggleBtn.addEventListener('click', () => mobileMenu.classList.toggle('hidden'));
  }
});
