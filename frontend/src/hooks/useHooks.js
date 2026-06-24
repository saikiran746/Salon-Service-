import { useState, useEffect, useCallback } from 'react';

/**
 * Generic data fetching hook
 * @param {Function} fetchFn - async function that returns { data }
 * @param {Array} deps - dependency array
 */
export function useFetch(fetchFn, deps = []) {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const result = await fetchFn();
      setData(result?.data?.data ?? result?.data ?? result);
    } catch (err) {
      setError(err?.response?.data?.message || err?.message || 'An error occurred');
    } finally {
      setLoading(false);
    }
  }, deps);

  useEffect(() => { load(); }, [load]);

  return { data, loading, error, refetch: load };
}

/**
 * Debounce hook — delays updating a value
 */
export function useDebounce(value, delay = 400) {
  const [debounced, setDebounced] = useState(value);
  useEffect(() => {
    const timer = setTimeout(() => setDebounced(value), delay);
    return () => clearTimeout(timer);
  }, [value, delay]);
  return debounced;
}

/**
 * Local storage hook with JSON serialization
 */
export function useLocalStorage(key, defaultValue) {
  const [value, setValue] = useState(() => {
    try {
      const stored = localStorage.getItem(key);
      return stored !== null ? JSON.parse(stored) : defaultValue;
    } catch { return defaultValue; }
  });

  const set = useCallback((newValue) => {
    setValue(newValue);
    try { localStorage.setItem(key, JSON.stringify(newValue)); } catch {}
  }, [key]);

  const remove = useCallback(() => {
    setValue(defaultValue);
    try { localStorage.removeItem(key); } catch {}
  }, [key, defaultValue]);

  return [value, set, remove];
}

/**
 * Pagination hook
 */
export function usePagination(totalItems, itemsPerPage = 20) {
  const [page, setPage] = useState(1);
  const totalPages = Math.ceil(totalItems / itemsPerPage);

  const nextPage = () => setPage(p => Math.min(p + 1, totalPages));
  const prevPage = () => setPage(p => Math.max(p - 1, 1));
  const goToPage = (n) => setPage(Math.max(1, Math.min(n, totalPages)));

  return { page, totalPages, nextPage, prevPage, goToPage, setPage };
}

/**
 * Modal state hook
 */
export function useModal(initial = false) {
  const [isOpen, setIsOpen] = useState(initial);
  const open = () => setIsOpen(true);
  const close = () => setIsOpen(false);
  const toggle = () => setIsOpen(p => !p);
  return { isOpen, open, close, toggle };
}
