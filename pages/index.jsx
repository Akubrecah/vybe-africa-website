export async function getServerSideProps(context) {
  const host = (context.req && context.req.headers && context.req.headers.host) || '';

  if (host.includes('staff')) {
    return {
      redirect: {
        destination: '/staff/login.html',
        permanent: false,
      },
    };
  }

  return {
    redirect: {
      destination: '/homepage.html',
      permanent: false,
    },
  };
}

export default function IndexPage() {
  return null;
}
