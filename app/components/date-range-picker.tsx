import { useState } from 'react';
import { useSearchParams, useNavigate } from '@remix-run/react';
import { Calendar, X } from 'lucide-react';
import { Button } from '~/components/ui/button';
import { Input } from '~/components/ui/input';
import { Label } from '~/components/ui/label';
import { Select } from '~/components/ui/select';
import {
  datePresetLabels,
  type DatePreset,
  type DateRangeFilter,
} from '~/lib/filtering';

interface DateRangePickerProps {
  dateRange?: DateRangeFilter;
  currentPreset?: string | null;
  onApply?: (from: string | null, to: string | null, preset?: string) => void;
  onClear?: () => void;
  inline?: boolean;
}

export function DateRangePicker({
  dateRange,
  currentPreset,
  onApply,
  onClear,
  inline = false,
}: DateRangePickerProps) {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const [isOpen, setIsOpen] = useState(false);
  const [fromDate, setFromDate] = useState(dateRange?.from || '');
  const [toDate, setToDate] = useState(dateRange?.to || '');
  const [preset, setPreset] = useState<string>(currentPreset || 'custom');

  const hasActiveFilter = dateRange?.from || dateRange?.to;

  const handlePresetChange = (value: string) => {
    setPreset(value);
    if (value === 'custom') {
      return;
    }
    if (onApply) {
      const params = new URLSearchParams(searchParams);
      params.set('date_preset', value);
      params.delete('date_from');
      params.delete('date_to');
      params.set('page', '1');
      navigate(`?${params.toString()}`);
    }
  };

  const handleApply = () => {
    if (onApply && preset === 'custom') {
      onApply(fromDate || null, toDate || null);
    }
    setIsOpen(false);
  };

  const handleClear = () => {
    setFromDate('');
    setToDate('');
    setPreset('custom');
    if (onClear) {
      onClear();
    }
    setIsOpen(false);
  };

  // Render the date picker controls
  const renderControls = () => (
    <>
      <div className='space-y-2'>
        <Label htmlFor='preset-select'>Preset</Label>
        <Select
          id='preset-select'
          value={preset}
          onChange={(e) => handlePresetChange(e.target.value)}>
          <option value='custom'>Custom Range</option>
          <option value='today'>{datePresetLabels.today}</option>
          <option value='yesterday'>{datePresetLabels.yesterday}</option>
          <option value='last_7_days'>{datePresetLabels.last_7_days}</option>
          <option value='last_30_days'>{datePresetLabels.last_30_days}</option>
          <option value='last_90_days'>{datePresetLabels.last_90_days}</option>
          <option value='this_month'>{datePresetLabels.this_month}</option>
          <option value='last_month'>{datePresetLabels.last_month}</option>
          <option value='this_quarter'>{datePresetLabels.this_quarter}</option>
          <option value='last_quarter'>{datePresetLabels.last_quarter}</option>
          <option value='this_year'>{datePresetLabels.this_year}</option>
          <option value='last_year'>{datePresetLabels.last_year}</option>
        </Select>
      </div>

      {preset === 'custom' && (
        <>
          <div className='space-y-2'>
            <Label htmlFor='from-date'>From</Label>
            <Input
              id='from-date'
              type='date'
              value={fromDate}
              onChange={(e) => setFromDate(e.target.value)}
            />
          </div>

          <div className='space-y-2'>
            <Label htmlFor='to-date'>To</Label>
            <Input
              id='to-date'
              type='date'
              value={toDate}
              onChange={(e) => setToDate(e.target.value)}
            />
          </div>

          <div className='flex gap-2 justify-end'>
            <Button
              type='button'
              variant='outline'
              size='sm'
              onClick={handleClear}>
              Clear
            </Button>
            <Button type='button' size='sm' onClick={handleApply}>
              Apply
            </Button>
          </div>
        </>
      )}
    </>
  );

  // Inline mode - render controls directly
  if (inline) {
    return <div className='space-y-4'>{renderControls()}</div>;
  }

  // Dropdown mode - render with button and popover
  return (
    <div className='relative w-full'>
      <Button
        type='button'
        variant={hasActiveFilter ? 'default' : 'outline'}
        size='sm'
        onClick={() => setIsOpen(!isOpen)}
        className='gap-2 w-full justify-start'>
        <Calendar className='h-4 w-4' />
        <span className='flex-1 text-left truncate text-sm'>
          {hasActiveFilter
            ? `${dateRange?.from || 'Start'} - ${dateRange?.to || 'End'}`
            : 'Select date range'}
        </span>
        {hasActiveFilter && (
          <X
            className='h-3.5 w-3.5'
            onClick={(e) => {
              e.stopPropagation();
              handleClear();
            }}
          />
        )}
      </Button>

      {isOpen && (
        <>
          <div className='fixed inset-0 z-40' onClick={() => setIsOpen(false)} />
          <div className='absolute right-0 top-full mt-2 z-50 w-80 rounded-md border bg-popover p-4 shadow-lg'>
            <div className='space-y-4'>{renderControls()}</div>
          </div>
        </>
      )}
    </div>
  );
}
