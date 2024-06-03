'use client';

// Core
export { useAppContext } from './core/app-context';
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
export { ScrollArea, ScrollBar } from './ui/primitives/scroll-area';
export {
  Select,
  SelectGroup,
  SelectValue,
  SelectTrigger,
  SelectContent,
  SelectLabel,
  SelectItem,
  SelectSeparator,
  SelectScrollUpButton,
  SelectScrollDownButton,
} from './ui/primitives/select';
export {
  Sheet,
  SheetPortal,
  SheetOverlay,
  SheetTrigger,
  SheetClose,
  SheetContent,
  SheetHeader,
  SheetFooter,
  SheetTitle,
  SheetDescription,
} from './ui/primitives/sheet';
export { Skeleton } from './ui/primitives/skeleton';
export {
  Table,
  TableHeader,
  TableBody,
  TableFooter,
  TableHead,
  TableRow,
  TableCell,
  TableCaption,
} from './ui/primitives/table';
export { Tabs, TabsList, TabsTrigger, TabsContent } from './ui/primitives/tabs';
export { ToggleGroup, ToggleGroupItem } from './ui/primitives/toggle-group';
export { Toggle, toggleVariants } from './ui/primitives/toggle';
export { Tooltip, TooltipTrigger, TooltipContent, TooltipProvider } from './ui/primitives/tooltip';

// Components
export { Sidebar } from './ui/components/sidebar';

// GraphQL client
export { useEntityQuery } from './graphql-client/use-entity-query';

// Data Grid
export {
  flexRender,
  getCoreRowModel,
  getFacetedRowModel,
  getFacetedUniqueValues,
  getFilteredRowModel,
  getPaginationRowModel,
  getSortedRowModel,
  useReactTable,
} from '@tanstack/react-table';

// Entities
export { useDispatch } from './entities/actions-context';

export type {
  ColumnDef,
  ColumnFiltersState,
  Row,
  SortingState,
  Table as ReactTable,
  VisibilityState,
} from '@tanstack/react-table';

// Types
export type { AppOptions, LogoProps, PluginOptions, SingleProject } from './core/config/types';
export type { Attribute, Entity, DataType, Schema, ScopeType } from './core/types';
