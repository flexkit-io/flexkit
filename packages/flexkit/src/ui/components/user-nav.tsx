import { useTheme } from 'next-themes';
import { Monitor, Moon, Sun } from 'lucide-react';
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

export function UserNav(): JSX.Element {
  const { theme, setTheme } = useTheme();
  const [isLoading, auth] = useAuth();

  if (isLoading) {
    return <Skeleton className="fk-h-8 fk-w-8 fk-rounded-full" />;
  }

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button className="fk-relative fk-h-8 fk-w-8 fk-rounded-full" variant="ghost">
          <Avatar className="fk-h-8 fk-w-8">
            <AvatarImage
              alt="@shadcn"
              src="https://lh3.googleusercontent.com/a/AAcHTtdxfb6tIXPkNg6UqFwPT3Bvdr67jzrvzco0C5FDx9LBQw=s96-c"
            />
            <AvatarFallback>DK</AvatarFallback>
          </Avatar>
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="fk-w-56" forceMount>
        <DropdownMenuLabel className="font-normal">
          <div className="fk-flex fk-flex-col fk-space-y-1">
            <p className="fk-text-sm fk-font-medium fk-leading-none">Daniel Kratohvil</p>
            <p className="fk-text-xs fk-leading-none fk-text-muted-foreground">danielkratohvil@gmail.com</p>
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
          <Monitor className="fk-mr-2 fk-h-4 fk-w-4" />
          <span>System</span>
        </DropdownMenuCheckboxItem>
        <DropdownMenuCheckboxItem
          checked={theme === 'dark'}
          onCheckedChange={() => {
            setTheme('dark');
          }}
        >
          <Moon className="fk-mr-2 fk-h-4 fk-w-4" />
          <span>Dark</span>
        </DropdownMenuCheckboxItem>
        <DropdownMenuCheckboxItem
          checked={theme === 'light'}
          onCheckedChange={() => {
            setTheme('light');
          }}
        >
          <Sun className="fk-mr-2 fk-h-4 fk-w-4" />
          <span>Light</span>
        </DropdownMenuCheckboxItem>
        <DropdownMenuSeparator />
        <DropdownMenuItem
          onClick={() => {
            auth
              .logout()
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
