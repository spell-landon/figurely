import { useState } from 'react';
import { useSearchParams, useNavigate } from '@remix-run/react';
import { X, Filter, Calendar, Tag, Check } from 'lucide-react';
import { Button } from '~/components/ui/button';
import { Badge } from '~/components/ui/badge';
import { Label } from '~/components/ui/label';
import { DateRangePicker } from '~/components/date-range-picker';
import {
  toggleFilterValue,
  buildFilterUrl,
  getActiveFilterCount,
  type FilterParams,
} from '~/lib/filtering';

interface FilterOption {
  value: string;
  label: string;
}

interface FilterBarProps {
  /**
   * Current filter state
   */
  filters: FilterParams;

  /**
   * Status filter options (if applicable)
   */
  statusOptions?: FilterOption[];

  /**
   * Category filter options (if applicable)
   */
  categoryOptions?: FilterOption[];

  /**
   * Whether to show date range picker
   */
  showDateRange?: boolean;

  /**
   * Whether to show search
   */
  showSearch?: boolean;

  /**
   * Placeholder for search input
   */
  searchPlaceholder?: string;
}

export function FilterBar({
  filters,
  statusOptions,
  categoryOptions,
  showDateRange = false,
}: FilterBarProps) {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const [isOpen, setIsOpen] = useState(false);
  const activeFilterCount = getActiveFilterCount(filters);

  const handleToggleStatus = (status: string) => {
    const currentStatus = filters.status || [];
    const newStatus = toggleFilterValue(currentStatus, status);
    const url = buildFilterUrl(
      searchParams,
      'status',
      newStatus.length > 0 ? newStatus : null
    );
    navigate(url);
  };

  const handleToggleCategory = (category: string) => {
    const currentCategory = filters.category || [];
    const newCategory = toggleFilterValue(currentCategory, category);
    const url = buildFilterUrl(
      searchParams,
      'category',
      newCategory.length > 0 ? newCategory : null
    );
    navigate(url);
  };

  const handleClearDateRange = () => {
    const params = new URLSearchParams(searchParams);
    params.delete('date_from');
    params.delete('date_to');
    params.delete('date_preset');
    params.set('page', '1');
    navigate(`?${params.toString()}`);
  };

  const handleApplyDateRange = (from: string | null, to: string | null) => {
    const params = new URLSearchParams(searchParams);
    params.delete('date_preset');
    if (from) {
      params.set('date_from', from);
    } else {
      params.delete('date_from');
    }
    if (to) {
      params.set('date_to', to);
    } else {
      params.delete('date_to');
    }
    params.set('page', '1');
    navigate(`?${params.toString()}`);
  };

  const handleClearAll = () => {
    const params = new URLSearchParams(searchParams);
    params.delete('status');
    params.delete('category');
    params.delete('date_from');
    params.delete('date_to');
    params.delete('date_preset');
    params.set('page', '1');
    navigate(`?${params.toString()}`);
    setIsOpen(false);
  };

  const currentPreset = searchParams.get('date_preset');

  return (
    <div className='relative'>
      {/* Filter Button */}
      <Button
        type='button'
        variant={activeFilterCount > 0 ? 'default' : 'outline'}
        size='sm'
        onClick={() => setIsOpen(!isOpen)}
        className='gap-2'>
        <Filter className='h-4 w-4' />
        <span className='hidden sm:inline'>Filters</span>
        {activeFilterCount > 0 && (
          <Badge
            variant='secondary'
            className='ml-0.5 rounded-full h-5 w-5 p-0 flex items-center justify-center text-xs bg-primary-foreground/20 text-primary-foreground'>
            {activeFilterCount}
          </Badge>
        )}
      </Button>

      {isOpen && (
        <>
          {/* Backdrop */}
          <div className='fixed inset-0 z-40' onClick={() => setIsOpen(false)} />

          {/* Filter Popover */}
          <div className='absolute right-0 top-full mt-2 z-50 w-80 max-w-[calc(100vw-2rem)] rounded-lg border bg-popover shadow-lg'>
            {/* Header */}
            <div className='p-4 border-b flex items-center justify-between'>
              <div className='flex items-center gap-2'>
                <Filter className='h-4 w-4 text-muted-foreground' />
                <h3 className='font-semibold text-sm'>Filters</h3>
              </div>
              {activeFilterCount > 0 && (
                <Button
                  type='button'
                  variant='ghost'
                  size='sm'
                  onClick={handleClearAll}
                  className='h-8 text-xs'>
                  Clear all
                </Button>
              )}
            </div>

            {/* Filter Options */}
            <div className='p-4 space-y-6 max-h-96 overflow-y-auto'>
              {/* Status Filter */}
              {statusOptions && statusOptions.length > 0 && (
                <div className='space-y-3'>
                  <div className='flex items-center gap-2'>
                    <Tag className='h-4 w-4 text-muted-foreground' />
                    <Label className='text-sm font-medium'>Status</Label>
                  </div>
                  <div className='grid grid-cols-2 gap-2'>
                    {statusOptions.map((option) => {
                      const isActive = filters.status?.includes(option.value);
                      return (
                        <button
                          key={option.value}
                          type='button'
                          onClick={() => handleToggleStatus(option.value)}
                          className={`flex items-center gap-2 px-3 py-2 rounded-md border text-sm transition-colors ${
                            isActive
                              ? 'bg-primary text-primary-foreground border-primary'
                              : 'bg-background hover:bg-accent border-input'
                          }`}>
                          <div
                            className={`h-4 w-4 rounded-sm border flex items-center justify-center ${
                              isActive
                                ? 'bg-primary-foreground/20 border-primary-foreground/30'
                                : 'border-input'
                            }`}>
                            {isActive && (
                              <Check className='h-3 w-3' />
                            )}
                          </div>
                          <span className='flex-1 text-left'>{option.label}</span>
                        </button>
                      );
                    })}
                  </div>
                </div>
              )}

              {/* Category Filter */}
              {categoryOptions && categoryOptions.length > 0 && (
                <div className='space-y-3'>
                  <div className='flex items-center gap-2'>
                    <Tag className='h-4 w-4 text-muted-foreground' />
                    <Label className='text-sm font-medium'>Category</Label>
                  </div>
                  <div className='grid grid-cols-2 gap-2'>
                    {categoryOptions.map((option) => {
                      const isActive = filters.category?.includes(option.value);
                      return (
                        <button
                          key={option.value}
                          type='button'
                          onClick={() => handleToggleCategory(option.value)}
                          className={`flex items-center gap-2 px-3 py-2 rounded-md border text-sm transition-colors ${
                            isActive
                              ? 'bg-primary text-primary-foreground border-primary'
                              : 'bg-background hover:bg-accent border-input'
                          }`}>
                          <div
                            className={`h-4 w-4 rounded-sm border flex items-center justify-center ${
                              isActive
                                ? 'bg-primary-foreground/20 border-primary-foreground/30'
                                : 'border-input'
                            }`}>
                            {isActive && (
                              <Check className='h-3 w-3' />
                            )}
                          </div>
                          <span className='flex-1 text-left'>{option.label}</span>
                        </button>
                      );
                    })}
                  </div>
                </div>
              )}

              {/* Date Range Filter */}
              {showDateRange && (
                <div className='space-y-3'>
                  <div className='flex items-center gap-2'>
                    <Calendar className='h-4 w-4 text-muted-foreground' />
                    <Label className='text-sm font-medium'>Date Range</Label>
                  </div>
                  <DateRangePicker
                    dateRange={filters.dateRange}
                    currentPreset={currentPreset}
                    onApply={handleApplyDateRange}
                    onClear={handleClearDateRange}
                    inline={true}
                  />
                </div>
              )}
            </div>
          </div>
        </>
      )}
    </div>
  );
}
