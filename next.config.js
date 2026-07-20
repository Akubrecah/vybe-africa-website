if (process.env.NODE_ENV && !['production', 'development', 'test'].includes(process.env.NODE_ENV)) {
  process.env.NODE_ENV = 'production';
}

/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  generateBuildId: async () => {
    return `build-${Date.now()}`;
  },
  async rewrites() {
    return [
      // ── 1. Staff Subdomain Rewrites (e.g. staff-vybe-africa.vercel.app, vybe-africa-staff.vercel.app, staff.vybeafrica.org) ──
      {
        source: '/',
        has: [{ type: 'host', value: '.*staff.*' }],
        destination: '/staff/login.html',
      },
      {
        source: '/login',
        has: [{ type: 'host', value: '.*staff.*' }],
        destination: '/staff/login.html',
      },
      {
        source: '/admin',
        has: [{ type: 'host', value: '.*staff.*' }],
        destination: '/staff/admin_dashboard.html',
      },
      {
        source: '/cms',
        has: [{ type: 'host', value: '.*staff.*' }],
        destination: '/staff/cms_dashboard.html',
      },
      {
        source: '/hr',
        has: [{ type: 'host', value: '.*staff.*' }],
        destination: '/staff/hr_dashboard.html',
      },
      {
        source: '/finance',
        has: [{ type: 'host', value: '.*staff.*' }],
        destination: '/staff/finance_dashboard.html',
      },
      {
        source: '/programs',
        has: [{ type: 'host', value: '.*staff.*' }],
        destination: '/staff/programs_dashboard.html',
      },
      {
        source: '/communications',
        has: [{ type: 'host', value: '.*staff.*' }],
        destination: '/staff/communications_dashboard.html',
      },
      {
        source: '/management',
        has: [{ type: 'host', value: '.*staff.*' }],
        destination: '/staff/staff_management.html',
      },
      {
        source: '/me',
        has: [{ type: 'host', value: '.*staff.*' }],
        destination: '/staff/me_dashboard.html',
      },
      {
        source: '/analytics',
        has: [{ type: 'host', value: '.*staff.*' }],
        destination: '/staff/impact_analytics.html',
      },

      // ── 2. Main Website Rewrites ──
      { source: '/', destination: '/homepage.html' },
      { source: '/index.html', destination: '/homepage.html' },
    ];
  },
  async redirects() {
    return [
      // ── Main Website Domain: block staff pages & redirect to staff portal ──
      {
        source: '/staff/:path*',
        has: [{ type: 'host', value: '(?!.*staff).*' }],
        destination: 'https://staff-vybe-africa.vercel.app/login',
        permanent: false,
      },
      {
        source: '/login',
        has: [{ type: 'host', value: '(?!.*staff).*' }],
        destination: 'https://staff-vybe-africa.vercel.app/login',
        permanent: false,
      },
      {
        source: '/login.html',
        has: [{ type: 'host', value: '(?!.*staff).*' }],
        destination: 'https://staff-vybe-africa.vercel.app/login',
        permanent: false,
      },
      {
        source: '/admin',
        has: [{ type: 'host', value: '(?!.*staff).*' }],
        destination: 'https://staff-vybe-africa.vercel.app/login',
        permanent: false,
      },
      {
        source: '/cms',
        has: [{ type: 'host', value: '(?!.*staff).*' }],
        destination: 'https://staff-vybe-africa.vercel.app/login',
        permanent: false,
      },

      // ── Staff Domain: block public website pages & redirect to main site ──
      {
        source: '/homepage.html',
        has: [{ type: 'host', value: '.*staff.*' }],
        destination: 'https://vybe-africa-website.vercel.app/homepage.html',
        permanent: false,
      },
      {
        source: '/about.html',
        has: [{ type: 'host', value: '.*staff.*' }],
        destination: 'https://vybe-africa-website.vercel.app/about.html',
        permanent: false,
      },
      {
        source: '/contact.html',
        has: [{ type: 'host', value: '.*staff.*' }],
        destination: 'https://vybe-africa-website.vercel.app/contact.html',
        permanent: false,
      },
      {
        source: '/srhr.html',
        has: [{ type: 'host', value: '.*staff.*' }],
        destination: 'https://vybe-africa-website.vercel.app/srhr.html',
        permanent: false,
      },
      {
        source: '/climate.html',
        has: [{ type: 'host', value: '.*staff.*' }],
        destination: 'https://vybe-africa-website.vercel.app/climate.html',
        permanent: false,
      },
      {
        source: '/child-protection.html',
        has: [{ type: 'host', value: '.*staff.*' }],
        destination: 'https://vybe-africa-website.vercel.app/child-protection.html',
        permanent: false,
      },
      {
        source: '/inclusive-governance.html',
        has: [{ type: 'host', value: '.*staff.*' }],
        destination: 'https://vybe-africa-website.vercel.app/inclusive-governance.html',
        permanent: false,
      },
      {
        source: '/work.html',
        has: [{ type: 'host', value: '.*staff.*' }],
        destination: 'https://vybe-africa-website.vercel.app/work.html',
        permanent: false,
      },
      {
        source: '/gallery.html',
        has: [{ type: 'host', value: '.*staff.*' }],
        destination: 'https://vybe-africa-website.vercel.app/gallery.html',
        permanent: false,
      },
      {
        source: '/get-involved.html',
        has: [{ type: 'host', value: '.*staff.*' }],
        destination: 'https://vybe-africa-website.vercel.app/get-involved.html',
        permanent: false,
      },
      {
        source: '/west_pokot.html',
        has: [{ type: 'host', value: '.*staff.*' }],
        destination: 'https://vybe-africa-website.vercel.app/west_pokot.html',
        permanent: false,
      },
      {
        source: '/west_pokot_detailed.html',
        has: [{ type: 'host', value: '.*staff.*' }],
        destination: 'https://vybe-africa-website.vercel.app/west_pokot_detailed.html',
        permanent: false,
      },
      {
        source: '/impact_registry.html',
        has: [{ type: 'host', value: '.*staff.*' }],
        destination: 'https://vybe-africa-website.vercel.app/impact_registry.html',
        permanent: false,
      },

      // ── General legacy shortcuts ──
      { source: '/homepage', destination: '/homepage.html', permanent: true },
    ];
  }
};

module.exports = nextConfig;
