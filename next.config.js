if (process.env.NODE_ENV && !['production', 'development', 'test'].includes(process.env.NODE_ENV)) {
  process.env.NODE_ENV = 'production';
}

/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  generateBuildId: async () => {
    return `build-${Date.now()}`;
  },
  async redirects() {
    return [
      // ── Main Website Domain: block staff directories and redirect to staff portal ──
      {
        source: '/staff/:path*',
        has: [{ type: 'host', value: '(?!.*staff).*' }],
        destination: 'https://staff-vybe-africa.vercel.app/login',
        permanent: false,
      },

      // ── Staff Domain: block public website pages and redirect to main site ──
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

      // Legacy shortcuts
      { source: '/homepage', destination: '/homepage.html', permanent: true },
    ];
  }
};

module.exports = nextConfig;
