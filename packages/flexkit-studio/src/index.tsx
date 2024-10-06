'use client';

// Core
export { useAppContext } from './core/app-context';
export { FlexkitStudio } from './core/flexkit-studio';
export { useConfig } from './core/config/config-context';
export type { ConfigContext } from './core/config/config-context';

// Auth
export { useAuth } from './auth/auth-context';

// Router
export { Outlet, useLocation, useParams } from 'react-router-dom';

// Components
export { Sidebar } from './ui/components/sidebar';

// Form
export { DefaultValueSwitch } from './form/fields/default-value-switch';
export type { FormFieldParams } from './form/types';

// GraphQL client
export { useEntityQuery } from './graphql-client/use-entity-query';
export type { FormFieldValue, MappedEntityItem } from './graphql-client/types';

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
export { useVirtualizer } from '@tanstack/react-virtual';

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

// Core types
export type { AppOptions, FormFieldProps, LogoProps, PluginOptions, SingleProject } from './core/config/types';
export type { Attribute, Entity, DataType, Schema, ScopeType } from './core/types';
