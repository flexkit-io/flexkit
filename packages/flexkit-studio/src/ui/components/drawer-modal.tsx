'use client';

import type { CSSProperties, JSX } from 'react';
import { createContext, useCallback, useContext, useEffect, useState } from 'react';
import type { Dispatch, ReactNode, SetStateAction } from 'react';
import { X as CloseIcon } from 'lucide-react';
import { Button } from '../primitives/button';
import { Drawer, DrawerContent, DrawerDescription, DrawerHeader, DrawerTitle } from '../primitives/drawer';
import { Separator } from '../primitives/separator';
import { Skeleton } from '../primitives/skeleton';

/**
 * How many drawers the current stack holds. The drawers behind the frontmost
 * one share the room beside it, so each slides out by less as the stack grows
 * and the bottom one never leaves the viewport.
 */
const DrawerStackContext = createContext(1);

export function DrawerStackProvider({ children, size }: { children: ReactNode; size: number }): JSX.Element {
  return <DrawerStackContext.Provider value={Math.max(1, size)}>{children}</DrawerStackContext.Provider>;
}

type Props = {
  actions: ReactNode;
  beforeClose?: () => boolean;
  children: ReactNode;
  /** @deprecated Stacking is handled by nesting (`nested`); kept for callers that still pass it. */
  depth?: number;
  /**
   * Close the drawer without running `beforeClose` (used after confirming discard).
   */
  forceClose?: boolean;
  /** @deprecated The frontmost nested drawer handles Escape by itself; kept for callers that still pass it. */
  isFocused?: boolean;
  /**
   * The drawer opened on top of this one. Rendering it inside this drawer's
   * tree makes it a nested drawer: this one stays mounted and slides aside.
   */
  nested?: ReactNode;
  onFormChange?: Dispatch<SetStateAction<boolean>>; // a callback executed everyt time the form changes its state
  onClose: () => void;
  /** Pinned under the scrollable body; the body shrinks to make room for it. */
  panel?: ReactNode;
  title: string;
};

export default function DrawerModal({
  actions,
  beforeClose,
  children,
  depth: _depth,
  forceClose = false,
  isFocused: _isFocused,
  nested,
  onFormChange: _onFormChange,
  onClose,
  panel,
  title,
}: Props): JSX.Element {
  const [isOpen, setIsOpen] = useState(false);
  const stackSize = useContext(DrawerStackContext);
  // Levels above the bottom drawer; the stack CSS splits the room by this.
  const stackStyle = { '--stack-levels': stackSize - 1 } as CSSProperties;

  const handleClose = useCallback(() => {
    if (forceClose) {
      return;
    }

    const shouldClose = beforeClose ? beforeClose() : true;

    if (!shouldClose) {
      return;
    }

    setIsOpen(false);
  }, [beforeClose, forceClose]);

  useEffect(() => {
    if (!forceClose) {
      return;
    }

    setIsOpen(false);
  }, [forceClose]);

  useEffect(() => {
    setIsOpen(true);
  }, []);

  return (
    <Drawer
      disablePointerDismissal
      onOpenChange={(open) => {
        if (!open) {
          handleClose();
        }
      }}
      onOpenChangeComplete={(open) => {
        if (!open) {
          onClose();
        }
      }}
      open={isOpen}
      swipeDirection="right"
    >
      <DrawerContent style={stackStyle}>
        <DrawerHeader className="fk:px-10">
          <DrawerTitle className="fk:w-full">
            {title ? title : <Skeleton className="fk:h-5 fk:w-[120px]" />}
          </DrawerTitle>
          <DrawerDescription className="fk:sr-only">{title ? title : 'Loading form'}</DrawerDescription>
          {actions}
          <Button className="" onClick={handleClose} size="icon" variant="ghost">
            <CloseIcon className="fk:h-4 fk:w-4" />
            <span className="fk:sr-only">Close</span>
          </Button>
        </DrawerHeader>
        <Separator />
        <div className="fk:min-h-0 fk:flex-1 fk:px-10 fk:pt-6 fk:overflow-y-auto fk:pb-16">{children}</div>
        {panel}
        {nested}
      </DrawerContent>
    </Drawer>
  );
}
