import { useEffect, useRef } from 'react';
import { SNACK_ID } from './snackConfig';

declare global {
  interface Window {
    ExpoSnack?: {
      append: (container: HTMLElement, options: Record<string, string>) => void;
      remove: (container: HTMLElement) => void;
    };
  }
}

/**
 * Embeds the published Expo demo as an Expo Snack using the official embed
 * mechanism. The `data-snack-*` div carries the snack id; because the div is
 * rendered by React (after embed.js may have already auto-scanned the page),
 * we also call `ExpoSnack.append()` once on mount so it renders reliably.
 * The Snack embed itself provides platform switching, theme and links into
 * snack.expo.dev, so no extra toolbar/buttons are needed.
 */
export function SnackEmbed() {
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!SNACK_ID) return;

    const render = () => {
      if (window.ExpoSnack && containerRef.current) {
        window.ExpoSnack.append(containerRef.current, {
          id: SNACK_ID,
          platform: 'web',
          preview: 'true',
          theme: 'dark',
          supportedPlatforms: 'ios,android,web',
        });
      }
    };

    // Load the official embed script if not already present.
    if (window.ExpoSnack) {
      render();
      return;
    }
    const script = document.createElement('script');
    script.src = 'https://snack.expo.dev/embed.js';
    script.async = true;
    script.onload = render;
    script.onerror = render; // still try static data-snack-* path as fallback
    document.head.appendChild(script);

    return () => {
      if (window.ExpoSnack && containerRef.current) {
        window.ExpoSnack.remove(containerRef.current);
      }
    };
  }, []);

  if (!SNACK_ID) {
    return <SnackPending />;
  }

  return (
    <div
      ref={containerRef}
      className="snack-embed"
      data-snack-id={SNACK_ID}
      data-snack-platform="web"
      data-snack-preview="true"
      data-snack-theme="dark"
      data-snack-supported-platforms="ios,android,web"
    />
  );
}

function SnackPending() {
  return (
    <div className="snack-pending">
      <div className="snack-pending-icon"><i className="fa-solid fa-mobile-screen-button" /></div>
      <h3>Live demo — pending Snack id</h3>
      <p>
        This page embeds the published Expo demo as an <strong>Expo Snack</strong>. The snack hasn't
        been configured yet.
      </p>
      <ol className="snack-steps">
        <li>Publish the <code>apps/expo-demo/snack</code> project to{' '}
          <a href="https://snack.expo.dev" target="_blank" rel="noreferrer">snack.expo.dev</a>.</li>
        <li>
          Paste the resulting snack id into{' '}
          <code>src/demos/react-native/snackConfig.ts</code> (<code>SNACK_ID</code>) and rebuild the
          web app.
        </li>
      </ol>
    </div>
  );
}
