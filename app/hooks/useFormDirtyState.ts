import { useEffect, useRef, useState, type RefObject } from 'react';

/**
 * Hook to track if a form has unsaved changes (dirty state)
 * Works with both controlled and uncontrolled inputs
 *
 * @param formRef - Reference to the form element
 * @param dependencies - Optional array of dependencies for controlled state (e.g., line items)
 * @returns Object with isDirty flag and reset function
 */
export function useFormDirtyState(
  formRef: RefObject<HTMLFormElement>,
  dependencies: any[] = []
) {
  const [isDirty, setIsDirty] = useState(false);
  const initialValues = useRef<string>('');
  const initialDeps = useRef<string>('');

  // Capture initial form state
  useEffect(() => {
    if (formRef.current) {
      const formData = new FormData(formRef.current);
      const values: Record<string, any> = {};

      formData.forEach((value, key) => {
        // Handle multiple values for same key (like checkboxes)
        if (values[key]) {
          values[key] = Array.isArray(values[key])
            ? [...values[key], value]
            : [values[key], value];
        } else {
          values[key] = value;
        }
      });

      initialValues.current = JSON.stringify(values);
      initialDeps.current = JSON.stringify(dependencies);
    }
  }, []); // Only run on mount

  // Check for changes
  const checkDirty = () => {
    if (!formRef.current) return;

    const formData = new FormData(formRef.current);
    const currentValues: Record<string, any> = {};

    formData.forEach((value, key) => {
      if (currentValues[key]) {
        currentValues[key] = Array.isArray(currentValues[key])
          ? [...currentValues[key], value]
          : [currentValues[key], value];
      } else {
        currentValues[key] = value;
      }
    });

    const currentValuesStr = JSON.stringify(currentValues);
    const currentDepsStr = JSON.stringify(dependencies);

    const hasChanged =
      currentValuesStr !== initialValues.current ||
      currentDepsStr !== initialDeps.current;

    setIsDirty(hasChanged);
  };

  // Listen for form changes
  useEffect(() => {
    const form = formRef.current;
    if (!form) return;

    form.addEventListener('input', checkDirty);
    form.addEventListener('change', checkDirty);

    return () => {
      form.removeEventListener('input', checkDirty);
      form.removeEventListener('change', checkDirty);
    };
  }, [formRef.current]);

  // Check dependencies changes (for controlled inputs)
  useEffect(() => {
    if (dependencies.length > 0) {
      checkDirty();
    }
  }, dependencies);

  // Reset dirty state (call after successful save)
  const resetDirty = () => {
    if (formRef.current) {
      const formData = new FormData(formRef.current);
      const values: Record<string, any> = {};

      formData.forEach((value, key) => {
        if (values[key]) {
          values[key] = Array.isArray(values[key])
            ? [...values[key], value]
            : [values[key], value];
        } else {
          values[key] = value;
        }
      });

      initialValues.current = JSON.stringify(values);
      initialDeps.current = JSON.stringify(dependencies);
      setIsDirty(false);
    }
  };

  return { isDirty, resetDirty, checkDirty };
}
