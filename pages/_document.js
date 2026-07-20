const React = require('react');
const { Html, Head, Main, NextScript } = require('next/document');

module.exports = function Document() {
  return React.createElement(
    Html,
    { lang: 'en' },
    React.createElement(Head, null),
    React.createElement(
      'body',
      null,
      React.createElement(Main, null),
      React.createElement(NextScript, null)
    )
  );
};
