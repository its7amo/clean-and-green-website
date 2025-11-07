import { useEffect } from "react";
import { useLocation } from "wouter";

export function PWAModeSelector() {
  const [location] = useLocation();

  useEffect(() => {
    // Save the mode based on current route
    if (location.startsWith('/admin')) {
      localStorage.setItem('pwa-mode', 'admin');
    } else if (location.startsWith('/employee')) {
      localStorage.setItem('pwa-mode', 'employee');
    } else {
      localStorage.setItem('pwa-mode', 'customer');
    }
  }, [location]);

  return null;
}
