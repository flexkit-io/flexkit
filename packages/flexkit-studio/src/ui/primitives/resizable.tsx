import { GripVertical } from 'lucide-react';
import * as ResizablePrimitive from 'react-resizable-panels';
import { cn } from 'src/ui/lib/utils';

function ResizablePanelGroup({
  className,
  ...props
}: React.ComponentProps<typeof ResizablePrimitive.PanelGroup>): JSX.Element {
  return (
    <ResizablePrimitive.PanelGroup
      className={cn('fk-flex fk-h-full fk-w-full data-[panel-group-direction=vertical]:fk-flex-col', className)}
      {...props}
    />
  );
}

const ResizablePanel = ResizablePrimitive.Panel;

function ResizableHandle({
  withHandle,
  className,
  ...props
}: React.ComponentProps<typeof ResizablePrimitive.PanelResizeHandle> & {
  withHandle?: boolean;
}): JSX.Element {
  return (
    <ResizablePrimitive.PanelResizeHandle
      className={cn(
        'fk-relative fk-flex fk-w-px fk-items-center fk-justify-center fk-bg-border after:fk-absolute after:fk-inset-y-0 after:fk-left-1/2 after:fk-w-1 after:fk--translate-x-1/2 focus-visible:fk-outline-none focus-visible:fk-ring-1 focus-visible:fk-ring-ring focus-visible:fk-ring-offset-1 data-[panel-group-direction=vertical]:fk-h-px data-[panel-group-direction=vertical]:fk-w-full data-[panel-group-direction=vertical]:after:fk-left-0 data-[panel-group-direction=vertical]:after:fk-h-1 data-[panel-group-direction=vertical]:after:fk-w-full data-[panel-group-direction=vertical]:after:fk--translate-y-1/2 data-[panel-group-direction=vertical]:after:fk-translate-x-0 [&[data-panel-group-direction=vertical]>div]:fk-rotate-90',
        className
      )}
      {...props}
    >
      {Boolean(withHandle) && (
        <div className="fk-z-10 fk-flex fk-h-4 fk-w-3 fk-items-center fk-justify-center fk-rounded-sm fk-border fk-bg-border">
          <GripVertical className="fk-h-2.5 fk-w-2.5" />
        </div>
      )}
    </ResizablePrimitive.PanelResizeHandle>
  );
}

export { ResizablePanelGroup, ResizablePanel, ResizableHandle };
