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
        // ── Subdomain Rewrites for Staff Portal (e.g., staff.vybeafrica.org, staff.localhost, staff-*.vercel.app) ──
        {
          source: '/',
          has: [{ type: 'host', value: 'staff.(.*)' }],
          destination: '/staff/login.html',
        },
        {
          source: '/login',
          has: [{ type: 'host', value: 'staff.(.*)' }],
          destination: '/staff/login.html',
        },
        {
          source: '/admin',
          has: [{ type: 'host', value: 'staff.(.*)' }],
          destination: '/staff/admin_dashboard.html',
        },
        {
          source: '/cms',
          has: [{ type: 'host', value: 'staff.(.*)' }],
          destination: '/staff/cms_dashboard.html',
        },
        {
          source: '/hr',
          has: [{ type: 'host', value: 'staff.(.*)' }],
          destination: '/staff/hr_dashboard.html',
        },
        {
          source: '/finance',
          has: [{ type: 'host', value: 'staff.(.*)' }],
          destination: '/staff/finance_dashboard.html',
        },
        {
          source: '/programs',
          has: [{ type: 'host', value: 'staff.(.*)' }],
          destination: '/staff/programs_dashboard.html',
        },
        {
          source: '/communications',
          has: [{ type: 'host', value: 'staff.(.*)' }],
          destination: '/staff/communications_dashboard.html',
        },
        {
          source: '/management',
          has: [{ type: 'host', value: 'staff.(.*)' }],
          destination: '/staff/staff_management.html',
        },
        {
          source: '/me',
          has: [{ type: 'host', value: 'staff.(.*)' }],
          destination: '/staff/me_dashboard.html',
        },
        {
          source: '/analytics',
          has: [{ type: 'host', value: 'staff.(.*)' }],
          destination: '/staff/impact_analytics.html',
        },
      ],
      afterFiles: [
        // ── Main Website Path Mappings ──
        { source: '/', destination: '/homepage.html' },
        { source: '/index.html', destination: '/homepage.html' },
        
        // Clean staff URLs on main domain
        { source: '/staff', destination: '/staff/staff.html' },
        { source: '/staff/', destination: '/staff/staff.html' },
        { source: '/staff/admin', destination: '/staff/admin_dashboard.html' },
        { source: '/staff/admin/', destination: '/staff/admin_dashboard.html' },
        { source: '/staff/hr', destination: '/staff/hr_dashboard.html' },
        { source: '/staff/hr/', destination: '/staff/hr_dashboard.html' },
        { source: '/staff/programs', destination: '/staff/programs_dashboard.html' },
        { source: '/staff/programs/', destination: '/staff/programs_dashboard.html' },
        { source: '/staff/communications', destination: '/staff/communications_dashboard.html' },
        { source: '/staff/communications/', destination: '/staff/communications_dashboard.html' },
        { source: '/staff/me', destination: '/staff/me_dashboard.html' },
        { source: '/staff/me/', destination: '/staff/me_dashboard.html' },
        { source: '/staff/finance', destination: '/staff/finance_dashboard.html' },
        { source: '/staff/finance/', destination: '/staff/finance_dashboard.html' },
        { source: '/staff/cms', destination: '/staff/cms_dashboard.html' },
        { source: '/staff/cms/', destination: '/staff/cms_dashboard.html' },
        { source: '/staff/management', destination: '/staff/staff_management.html' },
        { source: '/staff/management/', destination: '/staff/staff_management.html' },
      ],
    };
  },
  async redirects() {
    return [
      { source: '/login', destination: '/staff/login.html', permanent: false },
      { source: '/homepage', destination: '/homepage.html', permanent: true },
      { source: '/login.html', destination: '/staff/login.html', permanent: true },
      { source: '/forgot-password.html', destination: '/staff/forgot-password.html', permanent: true },
      { source: '/reset-password.html', destination: '/staff/reset-password.html', permanent: true },
      { source: '/verify-email.html', destination: '/staff/verify-email.html', permanent: true },
      { source: '/onboarding.html', destination: '/staff/onboarding.html', permanent: true },
      { source: '/profile_setup.html', destination: '/staff/profile_setup.html', permanent: true },
      { source: '/edit_profile.html', destination: '/staff/edit_profile.html', permanent: true },
      { source: '/admin_dashboard.html', destination: '/staff/admin/', permanent: true },
      { source: '/hr_dashboard.html', destination: '/staff/hr/', permanent: true },
      { source: '/programs_dashboard.html', destination: '/staff/programs/', permanent: true },
      { source: '/finance_dashboard.html', destination: '/staff/finance/', permanent: true },
      { source: '/me_dashboard.html', destination: '/staff/me/', permanent: true },
      { source: '/communications_dashboard.html', destination: '/staff/communications/', permanent: true },
      { source: '/staff.html', destination: '/staff/', permanent: true },
      { source: '/staff_management.html', destination: '/staff/staff_management.html', permanent: true },
      { source: '/staff_register.html', destination: '/staff/staff_register.html', permanent: true },
      { source: '/team_directory.html', destination: '/staff/team_directory.html', permanent: true },
      { source: '/impact_analytics.html', destination: '/staff/impact_analytics.html', permanent: true },
      { source: '/cms_dashboard.html', destination: '/staff/cms_dashboard.html', permanent: true },
      { source: '/header_footer_editor.html', destination: '/staff/header_footer_editor.html', permanent: true },
      { source: '/admin_categories.html', destination: '/staff/admin_categories.html', permanent: true },
      { source: '/admin_images.html', destination: '/staff/admin_images.html', permanent: true },
      { source: '/admin.html', destination: '/staff/admin.html', permanent: true },
    ];
  }
};

module.exports = nextConfig;
