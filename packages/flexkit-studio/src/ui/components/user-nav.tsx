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
import { getAvatarInitial } from './avatar-initial';

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
            <AvatarFallback className="fk:relative fk:bg-transparent">
              <BoringAvatar
                className="fk:size-8"
                colors={AVATAR_COLORS}
                name={auth.user?.id ?? 'user'}
                size={32}
                variant="marble"
              />
              {/* The pattern alone looks the same for everyone at a glance; the initial says whose it is. */}
              <span
                aria-hidden="true"
                className="fk:absolute fk:inset-0 fk:flex fk:items-center fk:justify-center fk:text-sm fk:font-semibold fk:leading-none fk:text-white fk:[text-shadow:0_1px_2px_rgb(0_0_0/0.45)] fk:select-none"
              >
                {getAvatarInitial(auth.user?.display_name, auth.user?.email)}
              </span>
            </AvatarFallback>
          </Avatar>
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="fk:w-56" forceMount>
        <DropdownMenuLabel className="font-normal">
          {/* A long name or address is cut to the menu width; the tooltip shows it in full. */}
          <div className="fk:flex fk:min-w-0 fk:flex-col fk:space-y-1">
            <p className="fk:truncate fk:text-sm fk:font-medium fk:leading-tight" title={auth.user?.display_name}>
              {auth.user?.display_name}
            </p>
            <p className="fk:truncate fk:text-xs fk:leading-tight fk:text-muted-foreground" title={auth.user?.email}>
              {auth.user?.email}
            </p>
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
