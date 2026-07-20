import React from 'react';

export default function Custom404() {
  return (
    <div style={{
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      justifyContent: 'center',
      minHeight: '100vh',
      fontFamily: 'Inter, system-ui, sans-serif',
      textAlign: 'center',
      padding: '20px',
      backgroundColor: '#fcf9f8',
      color: '#1c1b1b'
    }}>
      <h1 style={{ fontSize: '64px', fontWeight: '800', margin: '0 0 10px', color: '#9f402d' }}>404</h1>
      <h2 style={{ fontSize: '24px', margin: '0 0 20px', fontWeight: '600' }}>Page Not Found</h2>
      <p style={{ fontSize: '16px', color: '#56423e', maxWidth: '400px', marginBottom: '30px' }}>
        The page you are looking for does not exist or has been moved.
      </p>
      <a href="/index.html" style={{
        padding: '12px 24px',
        backgroundColor: '#9f402d',
        color: '#ffffff',
        borderRadius: '8px',
        textDecoration: 'none',
        fontWeight: '600',
        fontSize: '14px'
      }}>
        Return to Homepage
      </a>
    </div>
  );
}
