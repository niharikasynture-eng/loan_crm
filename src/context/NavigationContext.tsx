'use client';

import * as React from 'react';
import { usePathname, useSearchParams, useRouter } from 'next/navigation';

interface NavigationContextType {
  history: string[];
  previousPage: string | null;
  canGoBack: boolean;
  goBack: () => void;
}

const NavigationContext = React.createContext<NavigationContextType>({
  history: [],
  previousPage: null,
  canGoBack: false,
  goBack: () => {},
});

const STORAGE_KEY = 'dealbyte_nav_history';

function NavigationTracker({ onPathChange }: { onPathChange: (path: string) => void }) {
  const pathname = usePathname();
  const searchParams = useSearchParams();

  const searchStr = searchParams?.toString();
  const currentPath = React.useMemo(() => {
    if (!pathname) return '/';
    return searchStr ? `${pathname}?${searchStr}` : pathname;
  }, [pathname, searchStr]);

  React.useEffect(() => {
    onPathChange(currentPath);
  }, [currentPath, onPathChange]);

  return null;
}

export function NavigationProvider({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const [history, setHistory] = React.useState<string[]>([]);
  const isBackNavigationRef = React.useRef(false);

  // Load initial history from sessionStorage on mount
  React.useEffect(() => {
    try {
      const stored = sessionStorage.getItem(STORAGE_KEY);
      if (stored) {
        const parsed = JSON.parse(stored);
        if (Array.isArray(parsed) && parsed.length > 0) {
          setHistory(parsed);
        }
      }
    } catch (e) {
      console.warn('Could not read navigation history from sessionStorage:', e);
    }
  }, []);

  const handlePathChange = React.useCallback((currentPath: string) => {
    if (!currentPath) return;

    setHistory((prevStack) => {
      if (isBackNavigationRef.current) {
        isBackNavigationRef.current = false;
        if (prevStack[prevStack.length - 1] !== currentPath) {
          const updated = [...prevStack];
          if (updated.includes(currentPath)) {
            const index = updated.lastIndexOf(currentPath);
            return updated.slice(0, index + 1);
          }
          return [...updated, currentPath];
        }
        return prevStack;
      }

      const lastPath = prevStack[prevStack.length - 1];
      if (lastPath === currentPath) {
        return prevStack;
      }

      const updated = [...prevStack, currentPath];
      const trimmed = updated.slice(-50);
      try {
        sessionStorage.setItem(STORAGE_KEY, JSON.stringify(trimmed));
      } catch (e) {
        // ignore quota error
      }
      return trimmed;
    });
  }, []);

  const previousPage = React.useMemo(() => {
    if (history.length < 2) return null;
    return history[history.length - 2];
  }, [history]);

  const canGoBack = history.length > 1;

  const goBack = React.useCallback(() => {
    if (history.length > 1) {
      isBackNavigationRef.current = true;
      const targetPage = history[history.length - 2];
      const newStack = history.slice(0, -1);
      setHistory(newStack);
      try {
        sessionStorage.setItem(STORAGE_KEY, JSON.stringify(newStack));
      } catch (e) {
        // ignore
      }
      router.push(targetPage);
    } else {
      router.back();
    }
  }, [history, router]);

  return (
    <NavigationContext.Provider
      value={{
        history,
        previousPage,
        canGoBack,
        goBack,
      }}
    >
      <React.Suspense fallback={null}>
        <NavigationTracker onPathChange={handlePathChange} />
      </React.Suspense>
      {children}
    </NavigationContext.Provider>
  );
}

export function useNavigation() {
  return React.useContext(NavigationContext);
}
