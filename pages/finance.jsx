export async function getServerSideProps(context) {
  const host = (context.req && context.req.headers && context.req.headers.host) || '';

  if (!host.includes('staff')) {
    return {
      redirect: {
        destination: 'https://staff-vybe-africa.vercel.app/login',
        permanent: false,
      },
    };
  }

  return {
    redirect: {
      destination: '/staff/finance_dashboard.html',
      permanent: false,
    },
  };
}

export default function Page() {
  return null;
}
