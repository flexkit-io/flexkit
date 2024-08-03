'use client';

import { useCallback, useEffect, useState } from 'react';
import type { Dispatch, ReactNode, SetStateAction } from 'react';
import { X as CloseIcon } from 'lucide-react';
import { DrawerModalContext } from '../drawer-modal-context';
import { Button } from '../primitives/button';
import { Drawer, DrawerContent, DrawerHeader, DrawerTitle } from '../primitives/drawer';
import { Separator } from '../primitives/separator';
import { Skeleton } from '../primitives/skeleton';

type Props = {
  actions: ReactNode;
  beforeClose?: (hasFormChanged: boolean) => boolean;
  children: ReactNode;
  depth: number; // how many drawers are open, to control the width of the drawers
  isFocused: boolean; // whether the drawer is the last one open
  onFormChange?: Dispatch<SetStateAction<boolean>>; // a callback executed everyt time the form changes its state
  onClose: () => void;
  title: string;
};

export default function DrawerModal({
  actions,
  beforeClose,
  children,
  depth,
  isFocused,
  onFormChange,
  onClose,
  title,
}: Props): JSX.Element {
  const [isOpen, setIsOpen] = useState(false);
  const [hasFormChanged, setHasFormChanged] = useState(false);
  const gutter = depth * (50 / depth);

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

  const isDirty = useCallback(
    (flag: boolean) => {
      setHasFormChanged(flag);
      onFormChange?.(flag);
    },
    [onFormChange]
  );

  return (
    <Drawer
      dismissible={false}
      onClose={() => {
        handleClose();
      }}
      open={isOpen}
      preventScrollRestoration={false}
    >
      <DrawerContent style={isFocused ? {} : { maxWidth: `calc(100% - ${gutter.toString()}px)` }}>
        <DrawerHeader>
          <DrawerTitle className="fk-w-full">
            {title ? title : <Skeleton className="fk-h-5 fk-w-[120px]" />}
          </DrawerTitle>
          {actions}
          <Button className="" onClick={handleClose} size="icon" variant="ghost">
            <CloseIcon className="fk-h-4 fk-w-4" />
            <span className="fk-sr-only">Close</span>
          </Button>
        </DrawerHeader>
        <Separator />
        <div className="fk-px-4 fk-pt-6 fk-h-full fk-min-h-full fk-overflow-y-auto fk-pb-16" data-vaul-no-drag>
          <DrawerModalContext.Provider value={{ isDirty }}>{children}</DrawerModalContext.Provider>
        </div>
      </DrawerContent>
    </Drawer>
  );
}
