const React = require('react');

module.exports = function MyApp({ Component, pageProps }) {
  return React.createElement(Component, pageProps);
};
