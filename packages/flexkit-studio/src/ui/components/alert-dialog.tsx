'use client';

import { useEffect, useState } from 'react';
import {
  AlertDialog as AlertModalDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogPortal,
  AlertDialogTitle,
} from '../primitives/alert-dialog';
import { buttonVariants } from '@ui/primitives/button';
import { Loader2 } from 'lucide-react';

type Props = {
  options: {
    dialogTitle: string;
    dialogMessage: string;
    dialogCancelTitle: string;
    dialogActionLabel: string;
    dialogActionCancel?: () => void;
    dialogActionSubmit?: () => void | Promise<void>;
    isDestructive?: boolean;
  };
};

export default function AlertDialog({ options }: Props): JSX.Element {
  const [isOpen, setIsOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isClosingFromSubmit, setIsClosingFromSubmit] = useState(false);

  useEffect(() => {
    setIsOpen(true);
  }, []);

  function handleClose(): void {
    setIsOpen(false);

    if (!isClosingFromSubmit) {
      options.dialogActionCancel?.();
    }

    if (isClosingFromSubmit) {
      setIsClosingFromSubmit(false);
    }
  }

  async function handleAction(): Promise<void> {
    setIsSubmitting(true);

    try {
      const maybePromise = options.dialogActionSubmit?.();

      if (maybePromise && typeof (maybePromise as Promise<void>).then === 'function') {
        await (maybePromise as Promise<void>);
      }
    } finally {
      setIsClosingFromSubmit(true);
      setIsOpen(false);
      setIsSubmitting(false);
    }
  }

  return (
    <AlertModalDialog onOpenChange={handleClose} open={isOpen}>
      <AlertDialogPortal>
        <AlertDialogContent className="sm:max-w-[425px]">
          <AlertDialogHeader>
            <AlertDialogTitle>{options.dialogTitle}</AlertDialogTitle>
            <AlertDialogDescription>{options.dialogMessage}</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isSubmitting} onClick={handleClose}>
              {options.dialogCancelTitle}
            </AlertDialogCancel>
            <AlertDialogAction
              className={buttonVariants({ variant: options.isDestructive ? 'destructive' : 'default' })}
              disabled={isSubmitting}
              onClick={handleAction}
            >
              {isSubmitting ? <Loader2 className="fk-h-4 fk-w-4 fk-mr-2 fk-animate-spin" /> : null}
              {options.dialogActionLabel}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialogPortal>
    </AlertModalDialog>
  );
}
