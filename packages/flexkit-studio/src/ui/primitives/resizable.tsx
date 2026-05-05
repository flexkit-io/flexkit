import { GripVerticalIcon } from 'lucide-react';
import * as ResizablePrimitive from 'react-resizable-panels';
import { cn } from 'src/ui/lib/utils';

function ResizablePanelGroup({ className, ...props }: ResizablePrimitive.GroupProps) {
  return (
    <ResizablePrimitive.Group
      data-slot="resizable-panel-group"
      className={cn('fk:flex fk:h-full fk:w-full fk:aria-[orientation=vertical]:flex-col', className)}
      {...props}
    />
  );
}

function ResizablePanel({ ...props }: ResizablePrimitive.PanelProps) {
  return <ResizablePrimitive.Panel data-slot="resizable-panel" {...props} />;
}

function ResizableHandle({
  withHandle,
  className,
  ...props
}: ResizablePrimitive.SeparatorProps & {
  withHandle?: boolean;
}) {
  return (
    <ResizablePrimitive.Separator
      data-slot="resizable-handle"
      className={cn(
        'fk:relative fk:flex fk:w-px fk:items-center fk:justify-center fk:bg-border fk:after:absolute fk:after:inset-y-0 fk:after:left-1/2 fk:after:w-1 fk:after:-translate-x-1/2 fk:focus-visible:ring-1 fk:focus-visible:ring-ring fk:focus-visible:ring-offset-1 fk:focus-visible:outline-hidden fk:aria-[orientation=horizontal]:h-px fk:aria-[orientation=horizontal]:w-full fk:aria-[orientation=horizontal]:after:left-0 fk:aria-[orientation=horizontal]:after:h-1 fk:aria-[orientation=horizontal]:after:w-full fk:aria-[orientation=horizontal]:after:translate-x-0 fk:aria-[orientation=horizontal]:after:-translate-y-1/2 fk:[&[aria-orientation=horizontal]>div]:rotate-90',
        className
      )}
      {...props}
    >
      {withHandle && (
        <div className="fk:z-10 fk:flex fk:h-8 fk:w-3 fk:items-center fk:justify-center fk:rounded-xs fk:border fk:bg-border">
          <GripVerticalIcon className="fk:size-2.5" />
        </div>
      )}
    </ResizablePrimitive.Separator>
  );
}

export { ResizableHandle, ResizablePanel, ResizablePanelGroup };
