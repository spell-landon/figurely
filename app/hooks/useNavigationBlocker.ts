import { useEffect } from 'react';
import { useBlocker } from '@remix-run/react';

/**
 * Hook to block navigation when form has unsaved changes
 * Blocks both in-app navigation (Remix) and browser navigation (beforeunload)
 *
 * @param isDirty - Whether the form has unsaved changes
 * @param message - Optional custom message for confirmation dialog
 */
export function useNavigationBlocker(
  isDirty: boolean,
  message: string = 'You have unsaved changes. Are you sure you want to leave?'
) {
  // Block in-app navigation (Remix/React Router)
  const blocker = useBlocker(
    ({ currentLocation, nextLocation }) =>
      isDirty && currentLocation.pathname !== nextLocation.pathname
  );

  // Block browser navigation (refresh, close tab, back button to external site)
  useEffect(() => {
    const handleBeforeUnload = (e: BeforeUnloadEvent) => {
      if (isDirty) {
        e.preventDefault();
        // Modern browsers ignore custom messages and show their own
        e.returnValue = message;
        return message;
      }
    };

    window.addEventListener('beforeunload', handleBeforeUnload);

    return () => {
      window.removeEventListener('beforeunload', handleBeforeUnload);
    };
  }, [isDirty, message]);

  return { blocker };
}
