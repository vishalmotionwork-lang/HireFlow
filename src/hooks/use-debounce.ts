import { useState, useEffect } from "react";

/**
 * Debounce a value by a given delay (in ms).
 * Returns the debounced value — updates are delayed until the input
 * value stops changing for `delay` ms.
 *
 * Usage: const debouncedSearch = useDebounce(searchInput, 300)
 */
export function useDebounce<T>(value: T, delay: number): T {
  const [debouncedValue, setDebouncedValue] = useState<T>(value);

  useEffect(() => {
    const handler = setTimeout(() => {
      setDebouncedValue(value);
    }, delay);

    return () => {
      clearTimeout(handler);
    };
  }, [value, delay]);

  return debouncedValue;
}
