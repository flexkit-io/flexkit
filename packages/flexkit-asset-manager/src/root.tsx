'use client';

import { ResizableHandle, ResizablePanel, ResizablePanelGroup } from '@flexkit/core/ui';
import { Sidebar } from './sidebar';
import { List } from './list';

export function Root(): JSX.Element {
  return (
    <ResizablePanelGroup direction="horizontal" className="fk-h-full">
      <ResizablePanel className="fk-p-3" defaultSize={82}>
        <div className="fk-flex fk-flex-col fk-h-full">
          <List />
        </div>
      </ResizablePanel>
      <ResizableHandle className="hover:fk-bg-blue-500 fk-transition-colors" withHandle />
      <ResizablePanel defaultSize={18} minSize={10}>
        <div className="sm:fk-hidden md:fk-block">
          <Sidebar />
        </div>
      </ResizablePanel>
    </ResizablePanelGroup>
  );
}
