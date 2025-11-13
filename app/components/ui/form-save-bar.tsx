import { Save, X } from 'lucide-react';
import { useEffect, useState, useRef } from 'react';
import { Button } from './button';
import type { Blocker } from '@remix-run/react';

interface FormSaveBarProps {
  isDirty: boolean;
  isSubmitting: boolean;
  onSave: () => void;
  onDiscard: () => void;
  blocker?: Blocker;
}

export function FormSaveBar({
  isDirty,
  isSubmitting,
  onSave,
  onDiscard,
  blocker,
}: FormSaveBarProps) {
  const [shouldShake, setShouldShake] = useState(false);
  const previousStateRef = useRef<string>('unblocked');

  // Trigger shake animation when navigation is blocked
  useEffect(() => {
    const currentState = blocker?.state || 'unblocked';

    // Detect transition from unblocked to blocked
    if (previousStateRef.current !== 'blocked' && currentState === 'blocked') {
      setShouldShake(true);
      const timer = setTimeout(() => {
        setShouldShake(false);
        // Automatically reset the blocker after shake completes
        blocker?.reset?.();
      }, 650);
      return () => clearTimeout(timer);
    }

    previousStateRef.current = currentState;
  }, [blocker?.state, blocker]);

  if (!isDirty) return null;

  return (
    <div
      className={`sticky top-0 z-40 animate-in slide-in-from-top duration-300`}
      role='alert'
      aria-live='polite'>
      <div
        className={`bg-gradient-to-r from-gray-900 to-gray-800 dark:from-gray-950 dark:to-gray-900 border-b-2 border-gray-700 dark:border-gray-600 shadow-lg ${
          shouldShake ? 'animate-flash' : ''
        }`}>
        <div className='container mx-auto px-4 py-3'>
          <div
            className={`flex items-center justify-between gap-4 ${
              shouldShake ? 'animate-shake' : ''
            }`}>
            <div className='flex items-center gap-2'>
              <div className='h-2 w-2 rounded-full bg-green-500 dark:bg-green-400 animate-pulse' />
              <p className='text-sm font-medium text-gray-100 dark:text-gray-50'>
                Unsaved changes
              </p>
            </div>

            <div className='flex items-center gap-2'>
              <Button
                type='button'
                variant='outline'
                size='sm'
                onClick={onDiscard}
                disabled={isSubmitting}
                className='bg-gray-800 hover:bg-gray-700 text-gray-100 hover:text-white border-gray-600'>
                <X className='mr-1 h-4 w-4' />
                Discard
              </Button>
              <Button
                type='button'
                size='sm'
                onClick={onSave}
                disabled={isSubmitting}
                className='bg-green-600 hover:bg-green-700 text-white'>
                <Save className='mr-1 h-4 w-4' />
                {isSubmitting ? 'Saving...' : 'Save'}
              </Button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
