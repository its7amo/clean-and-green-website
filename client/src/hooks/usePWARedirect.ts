import { useEffect } from 'react';
import { useLocation } from 'wouter';

export function usePWARedirect() {
  const [location, setLocation] = useLocation();

  useEffect(() => {
    // Only run on initial load
    const hasRedirected = sessionStorage.getItem('pwa-redirected');
    if (hasRedirected) return;

    // Check if running as PWA
    const isPWA = window.matchMedia('(display-mode: standalone)').matches ||
                  (window.navigator as any).standalone === true;

    if (!isPWA) return;

    // Mark as redirected for this session
    sessionStorage.setItem('pwa-redirected', 'true');

    // Get saved preference
    const savedMode = localStorage.getItem('pwa-mode');
    
    // Only redirect if we're at root and have a saved preference
    if (location === '/' && savedMode) {
      if (savedMode === 'admin') {
        setLocation('/login');
      } else if (savedMode === 'employee') {
        setLocation('/employee/login');
      }
      // If savedMode is 'customer', stay on homepage
    }
  }, [location, setLocation]);
}
