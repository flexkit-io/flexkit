import type { JSX } from 'react';
import BoringAvatar from 'boring-avatars';
import { Monitor, Moon, Sun } from 'lucide-react';
import { useTheme } from '../theme-context';
import { Avatar, AvatarFallback, AvatarImage } from '../primitives/avatar';
import { Button } from '../primitives/button';
import { Skeleton } from '../primitives/skeleton';
import {
  DropdownMenu,
  DropdownMenuCheckboxItem,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuShortcut,
  DropdownMenuTrigger,
} from '../primitives/dropdown-menu';
import { useAuth } from '../../auth/auth-context';

const AVATAR_COLORS = ['#06d9b6', '#a4f479', '#d4d323', '#fb468f', '#0ec4f1'];

type Props = {
  projectId: string;
};

export function UserNav({ projectId }: Props): JSX.Element {
  const { theme, setTheme } = useTheme();
  const [isLoading, auth] = useAuth();

  if (isLoading) {
    return <Skeleton className="fk:h-8 fk:w-8 fk:rounded-full" />;
  }

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button className="fk:relative fk:h-8 fk:w-8 fk:rounded-full" variant="ghost">
          <Avatar className="fk:h-8 fk:w-8">
            {auth.user?.avatar_url ? <AvatarImage alt={auth.user.display_name} src={auth.user.avatar_url} /> : null}
            <AvatarFallback className="fk:bg-transparent">
              <BoringAvatar
                className="fk:size-8"
                colors={AVATAR_COLORS}
                name={auth.user?.id ?? 'user'}
                size={32}
                variant="marble"
              />
            </AvatarFallback>
          </Avatar>
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="fk:w-56" forceMount>
        <DropdownMenuLabel className="font-normal">
          <div className="fk:flex fk:flex-col fk:space-y-1">
            <p className="fk:text-sm fk:font-medium fk:leading-none">{auth.user?.display_name}</p>
            <p className="fk:text-xs fk:leading-none fk:text-muted-foreground">{auth.user?.email}</p>
          </div>
        </DropdownMenuLabel>
        <DropdownMenuSeparator />
        <DropdownMenuLabel>Theme</DropdownMenuLabel>
        <DropdownMenuCheckboxItem
          checked={theme === 'system'}
          onCheckedChange={() => {
            setTheme('system');
          }}
        >
          <Monitor className="fk:mr-2 fk:h-4 fk:w-4" />
          <span>System</span>
        </DropdownMenuCheckboxItem>
        <DropdownMenuCheckboxItem
          checked={theme === 'dark'}
          onCheckedChange={() => {
            setTheme('dark');
          }}
        >
          <Moon className="fk:mr-2 fk:h-4 fk:w-4" />
          <span>Dark</span>
        </DropdownMenuCheckboxItem>
        <DropdownMenuCheckboxItem
          checked={theme === 'light'}
          onCheckedChange={() => {
            setTheme('light');
          }}
        >
          <Sun className="fk:mr-2 fk:h-4 fk:w-4" />
          <span>Light</span>
        </DropdownMenuCheckboxItem>
        <DropdownMenuSeparator />
        <DropdownMenuItem
          onClick={() => {
            auth
              .logout(projectId)
              .then(() => {
                //
              })
              .catch(() => {
                //
              });
          }}
        >
          Log out
          <DropdownMenuShortcut>⇧⌘Q</DropdownMenuShortcut>
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
