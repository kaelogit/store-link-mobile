import { ScrollViewStyleReset } from 'expo-router/html';

/**
 * 🏰 WEB ROOT CONFIGURATION (Pure Build)
 * This file configures the root HTML for web-based static rendering.
 * It ensures theme consistency and prevents background flickering.
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
}
@media (prefers-color-scheme: dark) {
  body {
    background-color: #000000;
  }
}`;