'use client';

import { JSX } from 'react';
import { ResizableHandle, ResizablePanel, ResizablePanelGroup } from '@flexkit/studio/ui';
import { Sidebar } from './sidebar';
import { List } from './list';

export function Root(): JSX.Element {
  return (
    <ResizablePanelGroup orientation="horizontal" className="fk:h-full">
      <ResizablePanel className="fk:p-3" defaultSize="82%">
        <div className="fk:flex fk:flex-col fk:h-full">
          <List />
        </div>
      </ResizablePanel>
      <ResizableHandle className="fk:hover:bg-blue-500 fk:transition-colors" withHandle />
      <ResizablePanel defaultSize="18%" minSize="10%">
        <div className="fk:sm:hidden fk:md:block">
          <Sidebar />
        </div>
      </ResizablePanel>
    </ResizablePanelGroup>
  );
}
