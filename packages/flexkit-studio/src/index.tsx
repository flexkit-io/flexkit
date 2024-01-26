'use client';

// Core
export { FlexkitStudio } from './core/flexkit-studio';
export { useConfig } from './core/config/config-context';

// Auth
export { useAuth } from './auth/auth-context';

// Router
export { Outlet, useLocation, useParams } from 'react-router-dom';

// UI Primitives
export { Avatar, AvatarImage, AvatarFallback } from './ui/primitives/avatar';
export { Badge, badgeVariants } from './ui/primitives/badge';
export { Button, buttonVariants } from './ui/primitives/button';
export {
  Dialog,
  DialogPortal,
  DialogOverlay,
  DialogClose,
  DialogTrigger,
  DialogContent,
  DialogHeader,
  DialogFooter,
  DialogTitle,
  DialogDescription,
} from './ui/primitives/dialog';
export {
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuCheckboxItem,
  DropdownMenuRadioItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuShortcut,
  DropdownMenuGroup,
  DropdownMenuPortal,
  DropdownMenuSub,
  DropdownMenuSubContent,
  DropdownMenuSubTrigger,
  DropdownMenuRadioGroup,
} from './ui/primitives/dropdown-menu';
export {
  useFormField,
  Form,
  FormItem,
  FormLabel,
  FormControl,
  FormDescription,
  FormMessage,
  FormField,
} from './ui/primitives/form';
export { Input } from './ui/primitives/input';
export { Label } from './ui/primitives/label';
export { ResizablePanelGroup, ResizablePanel, ResizableHandle } from './ui/primitives/resizable';
// TODO: add the rest of the primitives

// Components
export { Sidebar } from './ui/components/sidebar';

// GraphQL client
export { useEntityQuery } from './graphql-client/use-entity-query';

// Types
export type { AppOptions, PluginOptions, LogoProps } from './core/config/types';
