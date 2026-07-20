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
    return {
      beforeFiles: [
        // ── Subdomain Rewrites for Staff Portal (e.g., staff-vybe-africa.vercel.app, vybe-africa-staff.vercel.app, staff.vybeafrica.org) ──
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
      ],
      afterFiles: [
        // ── Main Website Path Mappings ──
        { source: '/', destination: '/homepage.html' },
        { source: '/index.html', destination: '/homepage.html' },
      ],
    };
  },
  async redirects() {
    return [
      // ── 1. On main domain (host WITHOUT "staff"), block /staff & /login and redirect to staff domain ──
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

      // ── 2. On Staff domain, clean up raw /staff/login.html URLs to clean /login ──
      {
        source: '/staff/login.html',
        has: [{ type: 'host', value: '.*staff.*' }],
        destination: '/login',
        permanent: false,
      },
      {
        source: '/staff/admin_dashboard.html',
        has: [{ type: 'host', value: '.*staff.*' }],
        destination: '/admin',
        permanent: false,
      },
      {
        source: '/staff/cms_dashboard.html',
        has: [{ type: 'host', value: '.*staff.*' }],
        destination: '/cms',
        permanent: false,
      },

      // ── General legacy shortcuts ──
      { source: '/homepage', destination: '/homepage.html', permanent: true },
      { source: '/admin_dashboard.html', destination: '/admin', permanent: true },
      { source: '/cms_dashboard.html', destination: '/cms', permanent: true },
    ];
  }
};

module.exports = nextConfig;
