import { useEffect, useState } from 'react';
import { useNavigate, useSearchParams } from '@remix-run/react';
import { Search, X } from 'lucide-react';
import { Input } from '~/components/ui/input';
import { Button } from '~/components/ui/button';
import { debounce } from '~/lib/search';

export interface SearchInputProps {
  /**
   * Placeholder text for the search input
   */
  placeholder?: string;

  /**
   * Debounce delay in milliseconds (default: 300ms)
   * Set to 0 to disable debouncing
   */
  debounceMs?: number;

  /**
   * Additional search params to preserve when searching
   */
  preserveParams?: string[];

  /**
   * Custom class name for the container
   */
  className?: string;

  /**
   * Callback when search value changes (optional)
   */
  onSearchChange?: (query: string) => void;

  /**
   * Auto-focus the input on mount
   */
  autoFocus?: boolean;
}

export function SearchInput({
  placeholder = 'Search...',
  debounceMs = 300,
  preserveParams = [],
  className = '',
  onSearchChange,
  autoFocus = false,
}: SearchInputProps) {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const initialQuery = searchParams.get('q') || searchParams.get('search') || '';
  const [query, setQuery] = useState(initialQuery);

  // Update local state when URL changes (e.g., back/forward navigation)
  useEffect(() => {
    const urlQuery = searchParams.get('q') || searchParams.get('search') || '';
    if (urlQuery !== query) {
      setQuery(urlQuery);
    }
  }, [searchParams]);

  /**
   * Update the URL with the new search query
   */
  const updateSearchParams = (newQuery: string) => {
    const params = new URLSearchParams();

    // Preserve specified params
    preserveParams.forEach((param) => {
      const value = searchParams.get(param);
      if (value) {
        params.set(param, value);
      }
    });

    // Set search query
    if (newQuery.trim()) {
      params.set('q', newQuery.trim());
    }

    // Reset to page 1 when searching
    const hasPage = searchParams.has('page');
    if (hasPage) {
      params.set('page', '1');
    }

    // Preserve other params from preserveParams
    const queryString = params.toString();
    const path = window.location.pathname;
    const newUrl = queryString ? `${path}?${queryString}` : path;

    navigate(newUrl, { replace: true });

    // Call callback if provided
    if (onSearchChange) {
      onSearchChange(newQuery);
    }
  };

  // Create debounced version of update function
  const debouncedUpdate = debounceMs > 0
    ? debounce(updateSearchParams, debounceMs)
    : updateSearchParams;

  /**
   * Handle input change
   */
  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newQuery = e.target.value;
    setQuery(newQuery);
    debouncedUpdate(newQuery);
  };

  /**
   * Clear the search input
   */
  const handleClear = () => {
    setQuery('');
    updateSearchParams('');
  };

  /**
   * Handle form submit (prevent default and trigger search)
   */
  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    updateSearchParams(query);
  };

  return (
    <form onSubmit={handleSubmit} className={`relative ${className}`}>
      <Search className="absolute left-2.5 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground md:left-3" />
      <Input
        type="text"
        placeholder={placeholder}
        value={query}
        onChange={handleInputChange}
        autoFocus={autoFocus}
        className="pl-9 pr-9 md:pl-10 md:pr-10"
      />
      {query && (
        <Button
          type="button"
          variant="ghost"
          size="icon"
          onClick={handleClear}
          className="absolute right-0.5 top-1/2 h-8 w-8 -translate-y-1/2 md:right-1 md:h-8 md:w-8"
          aria-label="Clear search">
          <X className="h-3.5 w-3.5 md:h-4 md:w-4" />
        </Button>
      )}
    </form>
  );
}
