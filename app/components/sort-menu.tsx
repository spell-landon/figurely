import { useState } from 'react';
import { useSearchParams, useNavigate } from '@remix-run/react';
import { ArrowUpDown, ArrowUp, ArrowDown } from 'lucide-react';
import { Button } from '~/components/ui/button';
import { Label } from '~/components/ui/label';
import { buildSortUrl } from '~/lib/sorting';

interface SortOption {
  value: string;
  label: string;
}

interface SortMenuProps {
  /**
   * Sortable column options
   */
  sortableColumns: SortOption[];

  /**
   * Currently sorted column
   */
  currentSortBy: string | null;

  /**
   * Current sort order
   */
  currentSortOrder: 'asc' | 'desc';

  /**
   * Default sort column (to determine if sort is active)
   */
  defaultSortBy?: string;

  /**
   * Default sort order (to determine if sort is active)
   */
  defaultSortOrder?: 'asc' | 'desc';
}

export function SortMenu({
  sortableColumns,
  currentSortBy,
  currentSortOrder,
  defaultSortBy = 'created_at',
  defaultSortOrder = 'desc',
}: SortMenuProps) {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const [isOpen, setIsOpen] = useState(false);

  // Determine if sort is active (different from default)
  const isSortActive =
    currentSortBy !== defaultSortBy || currentSortOrder !== defaultSortOrder;

  return (
    <div className='relative'>
      {/* Sort Button */}
      <Button
        type='button'
        variant={isSortActive ? 'default' : 'outline'}
        size='sm'
        onClick={() => setIsOpen(!isOpen)}
        className='gap-2'>
        <ArrowUpDown className='h-4 w-4' />
        <span className='hidden sm:inline'>Sort by</span>
      </Button>

      {isOpen && (
        <>
          {/* Backdrop */}
          <div className='fixed inset-0 z-40' onClick={() => setIsOpen(false)} />

          {/* Sort Popover */}
          <div className='absolute right-0 top-full mt-2 z-50 w-64 max-w-[calc(100vw-2rem)] rounded-lg border bg-popover shadow-lg'>
            {/* Header */}
            <div className='p-4 border-b flex items-center gap-2'>
              <ArrowUpDown className='h-4 w-4 text-muted-foreground' />
              <h3 className='font-semibold text-sm'>Sort by</h3>
            </div>

            {/* Sort Options */}
            <div className='p-2'>
              {sortableColumns.map((option) => {
                const isActive = currentSortBy === option.value;
                const sortUrl = buildSortUrl(
                  searchParams,
                  option.value,
                  currentSortBy,
                  currentSortOrder
                );
                return (
                  <button
                    key={option.value}
                    type='button'
                    onClick={() => {
                      navigate(sortUrl);
                      setIsOpen(false);
                    }}
                    className={`flex items-center justify-between w-full px-3 py-2 rounded-md text-sm transition-colors ${
                      isActive
                        ? 'bg-primary text-primary-foreground'
                        : 'hover:bg-accent'
                    }`}>
                    <span>{option.label}</span>
                    {isActive && (
                      currentSortOrder === 'asc' ? (
                        <ArrowUp className='h-4 w-4' />
                      ) : (
                        <ArrowDown className='h-4 w-4' />
                      )
                    )}
                  </button>
                );
              })}
            </div>
          </div>
        </>
      )}
    </div>
  );
}
