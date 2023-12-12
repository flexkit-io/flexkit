import { Logo } from '../components/logo';
import { UserNav } from '../components/user-nav';
import { Search } from '../components/search';
import { WorkspaceSelector } from '../components/workspace-selector';

export function Navbar(): JSX.Element {
  return (
    <div className="flex basis-14 min-h-[3.5rem] px-3 border-b">
      <Logo />
      <div className="flex grow shrink items-center gap-x-4 px-4">
        <WorkspaceSelector />
        <Search />
      </div>
      <div className="flex items-center">
        <UserNav />
      </div>
    </div>
  );
}
