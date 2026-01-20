import React from 'react';
import { ScrollViewStyleReset } from 'expo-router/html';

/**
 * 🏰 WEB ROOT CONFIGURATION (Web Only)
 * Note: This file is ONLY used for the web version (PWA/Site).
 * It is completely ignored by the Android and iOS compilers.
 */
export default function Root({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <head>
        <meta charSet="utf-8" />
        <meta httpEquiv="X-UA-Compatible" content="IE=edge" />
        <meta name="viewport" content="width=device-width, initial-scale=1, shrink-to-fit=no" />

        {/* Standardizes scrolling behavior on web to match the native mobile experience.
          This ensures our ScrollView components behave consistently across all platforms.
        */}
        <ScrollViewStyleReset />

        {/* Raw CSS is used here to lock the background color immediately.
          This prevents the "white flash" effect when the app loads in dark mode.
        */}
        <style dangerouslySetInnerHTML={{ __html: responsiveBackground }} />
      </head>
      <body>{children}</body>
    </html>
  );
}

const responsiveBackground = `
body {
  background-color: #ffffff;
  /* 🛡️ Native Feel: Disables text selection and blue tap highlights on mobile web */
  -webkit-user-select: none;
  user-select: none;
  -webkit-tap-highlight-color: transparent;
  touch-action: manipulation;
}
@media (prefers-color-scheme: dark) {
  body {
    background-color: #000000;
  }
}`;