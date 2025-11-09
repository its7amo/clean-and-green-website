import { createRoot } from "react-dom/client";
import App from "./App";
import "./index.css";

if ('serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('/sw.js')
      .then((registration) => {
        console.log('ServiceWorker registered successfully:', registration.scope);
        
        // Check for updates every time the page loads (fixes cache issues)
        registration.update();
        
        // If there's a waiting service worker, activate it immediately
        if (registration.waiting) {
          registration.waiting.postMessage({ type: 'SKIP_WAITING' });
        }
        
        // Listen for new service workers and activate them
        registration.addEventListener('updatefound', () => {
          const newWorker = registration.installing;
          if (newWorker) {
            newWorker.addEventListener('statechange', () => {
              if (newWorker.state === 'installed' && navigator.serviceWorker.controller) {
                // New service worker available, reload to activate
                console.log('New service worker available, reloading...');
                window.location.reload();
              }
            });
          }
        });
      })
      .catch((error) => {
        console.log('ServiceWorker registration failed:', error);
      });
  });
  
  // Reload page when new service worker takes control
  navigator.serviceWorker.addEventListener('controllerchange', () => {
    console.log('Service worker updated, reloading...');
    window.location.reload();
  });
}

createRoot(document.getElementById("root")!).render(<App />);
