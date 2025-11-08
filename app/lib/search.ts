/**
 * Search utilities for client-side and server-side search
 */

export interface SearchParams {
  query: string;
}

/**
 * Parse search params from URL search params
 */
export function parseSearchParams(searchParams: URLSearchParams): SearchParams {
  const query = searchParams.get('q') || searchParams.get('search') || '';
  return { query };
}

/**
 * Create URL with updated search query
 */
export function createSearchUrl(
  baseUrl: string,
  searchParams: URLSearchParams,
  query: string,
  preserveParams: string[] = []
): string {
  const params = new URLSearchParams();

  // Preserve specified params
  preserveParams.forEach((param) => {
    const value = searchParams.get(param);
    if (value) {
      params.set(param, value);
    }
  });

  // Set search query
  if (query.trim()) {
    params.set('q', query.trim());
  }

  // Reset to page 1 when searching
  if (params.has('page')) {
    params.set('page', '1');
  }

  const queryString = params.toString();
  return queryString ? `${baseUrl}?${queryString}` : baseUrl;
}

/**
 * Build Supabase search query for multiple fields
 * Returns an array of OR conditions for Supabase
 */
export function buildSupabaseSearchQuery(
  query: string,
  fields: string[]
): string {
  if (!query.trim() || fields.length === 0) {
    return '';
  }

  const searchTerm = `%${query.trim()}%`;

  // Build OR conditions for each field
  // Example: "field1.ilike.%search%,field2.ilike.%search%"
  return fields.map((field) => `${field}.ilike.${searchTerm}`).join(',');
}

/**
 * Highlight search term in text (for client-side rendering)
 */
export function highlightSearchTerm(
  text: string,
  searchTerm: string
): { before: string; match: string; after: string }[] {
  if (!searchTerm.trim() || !text) {
    return [{ before: text, match: '', after: '' }];
  }

  const regex = new RegExp(`(${escapeRegExp(searchTerm)})`, 'gi');
  const parts = text.split(regex);
  const results: { before: string; match: string; after: string }[] = [];

  for (let i = 0; i < parts.length; i++) {
    if (i % 2 === 0) {
      // Non-matching part
      if (parts[i]) {
        results.push({ before: parts[i], match: '', after: '' });
      }
    } else {
      // Matching part
      results.push({ before: '', match: parts[i], after: '' });
    }
  }

  return results;
}

/**
 * Escape special regex characters
 */
function escapeRegExp(string: string): string {
  return string.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

/**
 * Debounce function for search input
 */
export function debounce<T extends (...args: any[]) => any>(
  func: T,
  wait: number
): (...args: Parameters<T>) => void {
  let timeout: NodeJS.Timeout | null = null;

  return function executedFunction(...args: Parameters<T>) {
    const later = () => {
      timeout = null;
      func(...args);
    };

    if (timeout) {
      clearTimeout(timeout);
    }

    timeout = setTimeout(later, wait);
  };
}

/**
 * Normalize search query (lowercase, trim, remove extra spaces)
 */
export function normalizeQuery(query: string): string {
  return query.toLowerCase().trim().replace(/\s+/g, ' ');
}

/**
 * Check if a string matches a search query (case-insensitive)
 */
export function matchesSearch(text: string, query: string): boolean {
  if (!query.trim()) {
    return true;
  }

  const normalizedText = normalizeQuery(text);
  const normalizedQuery = normalizeQuery(query);

  return normalizedText.includes(normalizedQuery);
}

/**
 * Filter array of objects by search query across multiple fields
 */
export function filterBySearch<T extends Record<string, any>>(
  items: T[],
  query: string,
  fields: (keyof T)[]
): T[] {
  if (!query.trim()) {
    return items;
  }

  return items.filter((item) =>
    fields.some((field) => {
      const value = item[field];
      if (value === null || value === undefined) {
        return false;
      }
      return matchesSearch(String(value), query);
    })
  );
}

/**
 * Calculate search result score (0-1) based on relevance
 * Higher score = better match
 */
export function calculateSearchScore(
  text: string,
  query: string,
  options: {
    exactMatchBoost?: number;
    startsWithBoost?: number;
  } = {}
): number {
  const { exactMatchBoost = 2, startsWithBoost = 1.5 } = options;

  if (!query.trim() || !text) {
    return 0;
  }

  const normalizedText = normalizeQuery(text);
  const normalizedQuery = normalizeQuery(query);

  // Exact match
  if (normalizedText === normalizedQuery) {
    return 1 * exactMatchBoost;
  }

  // Starts with query
  if (normalizedText.startsWith(normalizedQuery)) {
    return 0.8 * startsWithBoost;
  }

  // Contains query
  if (normalizedText.includes(normalizedQuery)) {
    return 0.5;
  }

  // Word boundary match
  const words = normalizedText.split(' ');
  const queryWords = normalizedQuery.split(' ');

  let matchingWords = 0;
  for (const queryWord of queryWords) {
    if (words.some((word) => word.startsWith(queryWord))) {
      matchingWords++;
    }
  }

  if (matchingWords > 0) {
    return (matchingWords / queryWords.length) * 0.3;
  }

  return 0;
}

/**
 * Sort search results by relevance
 */
export function sortByRelevance<T extends Record<string, any>>(
  items: T[],
  query: string,
  fields: (keyof T)[],
  options?: {
    exactMatchBoost?: number;
    startsWithBoost?: number;
  }
): T[] {
  if (!query.trim()) {
    return items;
  }

  return items
    .map((item) => {
      // Calculate max score across all fields
      const score = Math.max(
        ...fields.map((field) => {
          const value = item[field];
          if (value === null || value === undefined) {
            return 0;
          }
          return calculateSearchScore(String(value), query, options);
        })
      );

      return { item, score };
    })
    .sort((a, b) => b.score - a.score)
    .map(({ item }) => item);
}
