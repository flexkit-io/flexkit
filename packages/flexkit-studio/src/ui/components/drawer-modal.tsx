'use client';

import { useCallback, useEffect, useState } from 'react';
import type { ReactNode } from 'react';
import { X as CloseIcon, Loader2 } from 'lucide-react';
import { DrawerModalContext } from '../drawer-modal-context';
import { Button } from '../primitives/button';
import { Drawer, DrawerContent, DrawerHeader, DrawerTitle } from '../primitives/drawer';
import { Separator } from '../primitives/separator';
import { Skeleton } from '../primitives/skeleton';

type Props = {
  actionButtonLabel?: string;
  beforeClose?: (hasFormChanged: boolean) => boolean;
  children: ReactNode;
  editMenu?: ReactNode;
  isActionButtonEnabledByDefault?: boolean;
  isFocused: boolean;
  isSaving?: boolean;
  onClose: () => void;
  onSave: () => void;
  title: string;
};

export default function DrawerModal({
  actionButtonLabel,
  beforeClose,
  children,
  editMenu,
  isActionButtonEnabledByDefault,
  isFocused,
  isSaving,
  onClose,
  onSave,
  title,
}: Props): JSX.Element {
  const [isOpen, setIsOpen] = useState(false);
  const [hasFormChanged, setHasFormChanged] = useState(false);
  const disabled = isActionButtonEnabledByDefault === true ? false : !hasFormChanged;

  const handleClose = useCallback(() => {
    const shouldClose = beforeClose ? beforeClose(hasFormChanged) : true;

    if (!shouldClose) return;

    setIsOpen(false);
    setTimeout(() => {
      onClose();
    }, 150);
  }, [beforeClose, hasFormChanged, onClose, setIsOpen]);

  const onEscapeKeyPressed = useCallback(
    (event: KeyboardEvent): void => {
      if (event.key === 'Escape' && isFocused) {
        handleClose();
      }
    },
    [handleClose, isFocused]
  );

  useEffect(() => {
    setIsOpen(true);
    // overwrite "background: black" set by Vaul in the body, and add missing bottom: 0 style
    globalThis.document.body.classList.add('fk-drawer-fix');
  }, []);

  useEffect(() => {
    globalThis.document.addEventListener('keydown', onEscapeKeyPressed, false);

    return () => {
      globalThis.document.removeEventListener('keydown', onEscapeKeyPressed, false);
    };
  }, [onEscapeKeyPressed]);

  const handleSave = useCallback(() => {
    onSave();
  }, [onSave]);

  const isDirty = useCallback((flag: boolean) => {
    setHasFormChanged(flag);
  }, []);

  return (
    <Drawer
      dismissible={false}
      onClose={() => {
        handleClose();
      }}
      open={isOpen}
      preventScrollRestoration={false}
    >
      <DrawerContent className={`${isFocused ? '' : 'fk-max-w-full'}`}>
        <DrawerHeader>
          <DrawerTitle className="fk-w-full">
            {title ? title : <Skeleton className="fk-h-5 fk-w-[120px]" />}
          </DrawerTitle>
          <Button
            className="fk-px-8"
            disabled={disabled}
            onClick={() => {
              handleSave();
            }}
            variant="default"
          >
            {isSaving ? <Loader2 className="fk-h-4 fk-w-4 fk-mr-2 fk-animate-spin" /> : null}
            {actionButtonLabel ?? 'Save'}
          </Button>
          <Button className="" onClick={handleClose} size="icon" variant="ghost">
            <CloseIcon className="fk-h-4 fk-w-4" />
            <span className="fk-sr-only">Close</span>
          </Button>
          {editMenu}
        </DrawerHeader>
        <Separator />
        <div className="fk-px-4 fk-pt-6 fk-h-full fk-min-h-full fk-overflow-y-auto fk-pb-16" data-vaul-no-drag>
          <DrawerModalContext.Provider value={{ isDirty }}>{children}</DrawerModalContext.Provider>
        </div>
      </DrawerContent>
    </Drawer>
  );
}
