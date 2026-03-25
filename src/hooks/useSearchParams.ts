import { useState, useEffect, useRef } from 'react';

/**
 * Custom hook to track URL search parameters
 * Updates when the URL search string changes (including manual changes)
 */
export function useSearchParams(): URLSearchParams {
  const [searchParams, setSearchParams] = useState(() => {
    return new URLSearchParams(window.location.search);
  });
  const lastSearchRef = useRef(window.location.search);

  useEffect(() => {
    // Function to update search params from current URL
    const updateSearchParams = () => {
      const currentSearch = window.location.search;
      if (currentSearch !== lastSearchRef.current) {
        lastSearchRef.current = currentSearch;
        const newParams = new URLSearchParams(currentSearch);
        if (import.meta.env.DEV) {
          console.log('[useSearchParams] URL changed:', {
            old: lastSearchRef.current,
            new: currentSearch,
            hasAuthor: newParams.has('__author'),
          });
        }
        setSearchParams(newParams);
      }
    };

    // Listen to popstate (browser back/forward)
    window.addEventListener('popstate', updateSearchParams);

    // For manual URL changes (which don't trigger popstate),
    // we need to check periodically (only in dev mode)
    let intervalId: number | undefined;
    if (import.meta.env.DEV) {
      // Check every 50ms in dev mode for manual URL changes (more responsive)
      intervalId = window.setInterval(updateSearchParams, 50);
    }

    // Also intercept pushState/replaceState to catch programmatic changes
    const originalPushState = history.pushState;
    const originalReplaceState = history.replaceState;

    history.pushState = function (...args) {
      originalPushState.apply(history, args);
      // Small delay to ensure URL is updated
      setTimeout(updateSearchParams, 0);
    };

    history.replaceState = function (...args) {
      originalReplaceState.apply(history, args);
      setTimeout(updateSearchParams, 0);
    };

    return () => {
      window.removeEventListener('popstate', updateSearchParams);
      if (intervalId !== undefined) {
        clearInterval(intervalId);
      }
      // Restore original methods
      history.pushState = originalPushState;
      history.replaceState = originalReplaceState;
    };
  }, []); // Empty deps - setup once

  return searchParams;
}

