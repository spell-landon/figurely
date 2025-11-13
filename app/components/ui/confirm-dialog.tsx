import { AlertTriangle, Info, Trash2, Mail } from 'lucide-react';
import { Button } from './button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from './dialog';

export type ConfirmDialogVariant = 'danger' | 'warning' | 'info';

interface ConfirmDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onConfirm: () => void;
  title: string;
  description: string;
  confirmText?: string;
  cancelText?: string;
  variant?: ConfirmDialogVariant;
  isLoading?: boolean;
}

export function ConfirmDialog({
  open,
  onOpenChange,
  onConfirm,
  title,
  description,
  confirmText = 'Confirm',
  cancelText = 'Cancel',
  variant = 'danger',
  isLoading = false,
}: ConfirmDialogProps) {
  const handleConfirm = () => {
    onConfirm();
    // Don't close here - let the parent handle it after action completes
  };

  const handleCancel = () => {
    onOpenChange(false);
  };

  // Icon based on variant
  const Icon =
    variant === 'danger'
      ? Trash2
      : variant === 'warning'
      ? AlertTriangle
      : Info;

  // Colors based on variant
  const iconColor =
    variant === 'danger'
      ? 'text-red-600 dark:text-red-400'
      : variant === 'warning'
      ? 'text-yellow-600 dark:text-yellow-400'
      : 'text-blue-600 dark:text-blue-400';

  const confirmButtonColor =
    variant === 'danger'
      ? 'bg-red-600 hover:bg-red-700 text-white'
      : variant === 'warning'
      ? 'bg-yellow-600 hover:bg-yellow-700 text-white'
      : 'bg-blue-600 hover:bg-blue-700 text-white';

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className='sm:max-w-[425px]'>
        <DialogHeader>
          <div className='flex items-center gap-3'>
            <div className={`rounded-full bg-muted p-2 ${iconColor}`}>
              <Icon className='h-5 w-5' />
            </div>
            <DialogTitle>{title}</DialogTitle>
          </div>
          <DialogDescription className='pt-2'>{description}</DialogDescription>
        </DialogHeader>
        <DialogFooter className='gap-2'>
          <Button
            type='button'
            variant='outline'
            onClick={handleCancel}
            disabled={isLoading}>
            {cancelText}
          </Button>
          <Button
            type='button'
            onClick={handleConfirm}
            disabled={isLoading}
            className={confirmButtonColor}>
            {isLoading ? 'Processing...' : confirmText}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
