import { useState, useCallback } from 'react';

export function useApi() {
  const [isLoading, setIsLoading] = useState(false);

  const request = useCallback(async <T>(
    apiFn: () => Promise<T>,
    onError?: () => void
  ): Promise<T | null> => {
    setIsLoading(true);
    try {
      return await apiFn();
    } catch (err) {
      onError?.();
      return null;
    } finally {
      setIsLoading(false);
    }
  }, []);

  return { isLoading, request };
}