import { ScrollViewStyleReset } from 'expo-router/html';

// This file is web-only and used to configure the root HTML for every
// web page during static rendering.
// The contents of this function only run in Node.js environments and
// do not have access to the DOM or browser APIs.
export default function Root({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <head>
        <meta charSet="utf-8" />
        <meta httpEquiv="X-UA-Compatible" content="IE=edge" />
        <meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no, viewport-fit=cover, minimal-ui" />

        {/* PWA Meta Tags */}
        <meta name="application-name" content="Salvo" />
        <meta name="apple-mobile-web-app-capable" content="yes" />
        <meta name="apple-mobile-web-app-status-bar-style" content="black" />
        <meta name="apple-mobile-web-app-title" content="Salvo" />
        <meta name="apple-touch-fullscreen" content="yes" />
        <meta name="description" content="Your civic engagement command center for Maryland's 2026 Primary Election" />
        <meta name="format-detection" content="telephone=no" />
        <meta name="mobile-web-app-capable" content="yes" />
        <meta name="theme-color" content="#0f1419" />
        <meta name="theme-color" media="(prefers-color-scheme: dark)" content="#0f1419" />
        
        {/* Additional iOS PWA fixes */}
        <meta name="apple-itunes-app" content="app-id=NO_APP" />
        <meta name="apple-mobile-web-app-capable" content="yes" />

        {/* PWA Manifest */}
        <link rel="manifest" href="/manifest.json" />
        
        {/* Apple Touch Icons */}
        <link rel="apple-touch-icon" href="/icon-192.png" />
        <link rel="apple-touch-icon" sizes="192x192" href="/icon-192.png" />
        <link rel="apple-touch-icon" sizes="512x512" href="/icon-512.png" />

        {/* 
          Disable body scrolling on web. This makes ScrollView components work closer to how they do on native. 
          However, body scrolling is often nice to have for mobile web. If you want to enable it, remove this line.
        */}
        <ScrollViewStyleReset />

        {/* Using raw CSS styles as an escape-hatch to ensure the background color never flickers in dark-mode. */}
        <style dangerouslySetInnerHTML={{ __html: responsiveBackground }} />
        {/* Add any additional <head> elements that you want globally available on web... */}
      </head>
      <body>{children}</body>
    </html>
  );
}

const responsiveBackground = `
* {
  -webkit-tap-highlight-color: transparent;
  box-sizing: border-box;
}
html, body {
  margin: 0 !important;
  padding: 0 !important;
  width: 100%;
  height: 100%;
  background: #0f1419 !important;
  overflow: hidden;
  position: fixed;
  overscroll-behavior: none;
  -webkit-overflow-scrolling: touch;
}
html {
  height: 100%;
  min-height: 100vh;
  min-height: -webkit-fill-available;
}
body {
  min-height: 100vh;
  min-height: -webkit-fill-available;
  height: 100vh;
  height: -webkit-fill-available;
}
#root {
  width: 100%;
  height: 100%;
  min-height: 100vh;
  min-height: -webkit-fill-available;
  background-color: #0f1419;
  position: relative;
}
/* Aggressive iOS PWA fullscreen - hide ALL Safari UI */
@media (display-mode: standalone) {
  html {
    background: #0f1419 !important;
  }
  body {
    background: #0f1419 !important;
    position: fixed !important;
    overflow: hidden !important;
  }
}`;
