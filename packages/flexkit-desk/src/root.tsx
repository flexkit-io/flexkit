import { useAuth, Outlet, ResizableHandle, ResizablePanel, ResizablePanelGroup } from '@flexkit/studio';
import { Sidebar } from '@flexkit/studio';

export function Root() {
  const [, auth] = useAuth();

  return (
    <ResizablePanelGroup direction="horizontal" className="fk-h-full">
      <ResizablePanel defaultSize={18} minSize={10}>
        <div className="fk-flex fk-w-full fk-h-full">
          <Sidebar />
        </div>
      </ResizablePanel>
      <ResizableHandle className="hover:fk-bg-blue-500 transition-colors" withHandle />
      <ResizablePanel className="fk-p-3" defaultSize={82}>
        <Outlet />
      </ResizablePanel>
    </ResizablePanelGroup>
  );
}
