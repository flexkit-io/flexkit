'use client';

// Core
export { useAppContext, useAppDispatch } from './core/app-context';
export { FlexkitStudio } from './core/flexkit-studio';
export { useConfig } from './core/config/config-context';
export type { ConfigContext } from './core/config/config-context';
export { IMAGES_BASE_URL } from './core/api-paths';
export { useUploadAssets } from './core/upload';
export type { UploadedFileResult } from './core/upload';
export { ProjectDisabled } from './core/error/project-disabled';
export { SchemaError } from './core/error/schema-error';
export { useGraphQLError } from './graphql-client/graphql-context';

// Auth
export { useAuth } from './auth/auth-context';

// Router
export { Outlet, useLocation, useParams } from 'react-router-dom';

// Form
export { DefaultValueSwitch } from './form/fields/default-value-switch';
export type { FormFieldParams } from './form/types';

// GraphQL client
export { useEntityQuery } from './graphql-client/use-entity-query';
export { useEntityMutation } from './graphql-client/use-entity-mutation';
export type { AttributeValue, FormFieldValue, MappedEntityItem, FormEntityItem } from './graphql-client/types';
export { getEntityDeleteMutation } from './graphql-client/queries';
export { gql } from '@apollo/client';

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
export { DataTableFacetedFilter } from './data-grid/data-table-faceted-filter';

// Entities
export { useDispatch } from './entities/actions-context';
export { getEntitySchema } from './graphql-client/queries';
export { assetSchema } from './entities/assets-schema';

export type {
  ColumnDef,
  ColumnFiltersState,
  Row,
  RowSelectionState,
  SortingState,
  Table as ReactTable,
  TableMeta,
  Updater,
  VisibilityState,
} from '@tanstack/react-table';

// Core types
export type { AppOptions, FormFieldProps, LogoProps, PluginOptions, SingleProject } from './core/config/types';
export type { Attribute, Entity, DataType, Schema, ScopeType } from './core/types';
