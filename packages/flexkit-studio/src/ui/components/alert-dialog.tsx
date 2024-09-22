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

type Props = {
  options: {
    dialogTitle: string;
    dialogMessage: string;
    dialogCancelTitle: string;
    dialogActionLabel: string;
    dialogActionCancel?: () => void;
    dialogActionSubmit?: () => void;
  };
};

export default function AlertDialog({ options }: Props): JSX.Element {
  const [isOpen, setIsOpen] = useState(false);

  useEffect(() => {
    setIsOpen(true);
  }, []);

  function handleClose(): void {
    setIsOpen(false);
    options.dialogActionCancel?.();
  }

  function handleAction(): void {
    setIsOpen(false);

    setTimeout(() => {
      options.dialogActionSubmit?.();
      // handleClose();
    }, 300);
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
            <AlertDialogCancel onClick={handleClose}>{options.dialogCancelTitle}</AlertDialogCancel>
            <AlertDialogAction onClick={handleAction}>{options.dialogActionLabel}</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialogPortal>
    </AlertModalDialog>
  );
}
