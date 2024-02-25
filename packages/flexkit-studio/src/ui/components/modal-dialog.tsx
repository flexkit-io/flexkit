'use client';

import { useState } from 'react';
import { Button } from '../primitives/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '../primitives/dialog';

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

export default function DialogModal({ options }: Props): JSX.Element {
  const [isOpen, setIsOpen] = useState(true);

  function handleClose(): void {
    setIsOpen(false);
    options.dialogActionCancel?.();
  }

  function handleAction(): void {
    setIsOpen(false);

    setTimeout(() => {
      options.dialogActionSubmit?.();
      handleClose();
    }, 300);
  }

  return (
    <Dialog onOpenChange={handleClose} open={isOpen}>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>{options.dialogTitle}</DialogTitle>
          <DialogDescription>{options.dialogMessage}</DialogDescription>
        </DialogHeader>
        <DialogFooter>
          <Button onClick={handleClose} variant="secondary">
            {options.dialogCancelTitle}
          </Button>
          <Button onClick={handleAction}>{options.dialogActionLabel}</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
