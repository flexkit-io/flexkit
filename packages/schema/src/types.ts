import type { z } from 'zod';

export type ScopeType = 'local' | 'global' | 'relationship';

export type DataType =
  | 'cartesianpoint'
  | 'bigint'
  | 'boolean'
  | 'date'
  | 'datetime'
  | 'duration'
  | 'float'
  | 'id'
  | 'int'
  | 'point'
  | 'string'
  | 'time'
  | 'asset';

export type DefaultValueByDataType = {
  asset: '';
  bigint: string;
  boolean: boolean | '';
  cartesianpoint: string;
  date: string;
  datetime: string;
  duration: string;
  float: number | '';
  id: string;
  int: number | '';
  point: string;
  string: string;
  time: string;
};

export type DefaultValue<T extends DataType = DataType> = DefaultValueByDataType[T];

export type InputType =
  | 'datetime'
  | 'editor'
  | 'asset'
  | 'number'
  | 'relationship'
  | 'select'
  | 'switch'
  | 'text'
  | 'textarea'
  | (string & NonNullable<unknown>);

export type PreviewType =
  | 'boolean'
  | 'text'
  | 'number'
  | 'date'
  | 'datetime'
  | 'editor'
  | 'select'
  | 'relationship'
  | 'switch'
  | 'textarea'
  /** Filled stars for a numeric value; `options.max` sets the star count (default 5). */
  | 'rating'
  | (string & NonNullable<unknown>);

export type SelectList = {
  label: string;
  value: string;
};

export type GroupedSelectList = {
  groupLabel: string;
  items: SelectList[];
};

export type CommonOptions = {
  comment?: string;
  size?: number;
  placeholder?: string;
};

export type SelectOptions = CommonOptions & {
  list: SelectList[] | GroupedSelectList[];
};

export type AssetOptions = CommonOptions & {
  accept?: string;
};

export type RelationshipOptions = CommonOptions & {
  accept?: string;
};

export type DateTimeOptions = CommonOptions & {
  format?: string;
};

export type NumberOptions = CommonOptions & {
  min?: number;
  /** Upper bound; also the number of stars when `previewType` is `'rating'`. */
  max?: number;
};

export type AttributeOptions = {
  select: SelectOptions;
  asset: AssetOptions;
  datetime: DateTimeOptions;
  number: NumberOptions;
  relationship: RelationshipOptions;
  text: CommonOptions;
  textarea: CommonOptions;
  switch: CommonOptions;
  [key: string]: CommonOptions;
};

/**
 * Authoring form of an attribute's validation: a function that receives the
 * Zod namespace and returns a schema. `flexkit deploy` compiles it to JSON
 * Schema; only what JSON Schema can express survives (no `refine`, no
 * `transform`, no async checks).
 */
export type ZodValidation = (zod: typeof z) => z.ZodType;

/** A JSON Schema (draft-07) fragment, as stored by the backend and read by the Studio. */
export type JsonSchemaObject = { [key: string]: unknown };

type AttributeBaseOf<TValidation> = {
  inputType: InputType;
  previewType?: PreviewType;
  /**
   * Hide the field in the form and the list column. Distinct from
   * `entity.menu.hidden`.
   */
  hidden?: boolean;
  /**
   * Make the field read-only in the form. Read-only attributes are omitted
   * from create/update mutations sent by the Studio and skipped during form
   * validation.
   */
  readOnly?: boolean;
  /**
   * Marks uniqueness intent. Enforced at deploy for global non-asset attributes.
   */
  unique?: boolean;
  /**
   * Require a value at the API level: the generated GraphQL field is non-null.
   * Applies to global scalar attributes.
   */
  isRequired?: boolean;
  /**
   * Include this attribute in search indexing and the global search UI.
   */
  searchable?: boolean;
  /**
   * Field group name(s) this attribute belongs to. Distinct from
   * `entity.menu.group`, which is the sidebar section.
   */
  group?: string | string[];
  label: string;
  name: string;
  options?: AttributeOptions[InputType];
  relationship?: {
    entity: string;
    mode: 'single' | 'multiple';
    field: string;
  };
  validation?: TValidation;
};

/**
 * Space codes that can read/write this attribute. Members of any listed
 * space have access; users outside all listed spaces cannot see the value.
 *
 * Not allowed on relationship attributes (`scope: 'relationship'`): bind the
 * related entity to the space instead.
 */
type AttributeSpaces = {
  spaces?: string[];
};

type AttributeScopeAndSpaces =
  | {
      scope: 'relationship';
      spaces?: never;
    }
  | ({
      scope: 'local' | 'global';
    } & AttributeSpaces);

type AttributeByDataTypeOf<T extends DataType, TValidation> = AttributeBaseOf<TValidation> & {
  dataType: T;
  defaultValue?: DefaultValueByDataType[T];
} & (T extends 'asset' ? { scope?: 'global' } & AttributeSpaces : AttributeScopeAndSpaces);

export type AttributeOf<TValidation> = {
  [T in DataType]: AttributeByDataTypeOf<T, TValidation>;
}[DataType];

/** Attribute as written in `flexkit.config.ts`. */
export type Attribute = AttributeOf<ZodValidation>;

/** Attribute as deployed and served by the backend (validation is JSON Schema). */
export type UiAttribute = AttributeOf<JsonSchemaObject>;

/**
 * Form-only tab that groups attributes in the edit/add drawer.
 * Distinct from `entity.menu.group` (sidebar section).
 */
export type FieldGroup = {
  name: string;
  /**
   * Tab label. Required for custom groups. Optional for the reserved
   * `all` tab; Studio uses `All fields` when it is omitted.
   */
  title?: string;
  /** Lucide icon name in PascalCase, e.g. `'Tag'`. */
  icon?: string;
  default?: boolean;
  hidden?: boolean;
};

/** Sidebar placement of an entity in the Studio. */
export type EntityMenu = {
  /** Leave the entity out of the sidebar. */
  hidden?: boolean;
  label?: string;
  /** Name of a `menuGroups` entry of the project. */
  group?: string;
  /** Lucide icon name in PascalCase, e.g. `'Tag'`. */
  icon?: string;
};

export type EntityOf<TAttribute> = {
  name: string;
  plural: string;
  /**
   * Attribute name used as the human-readable label in relationship previews,
   * search hits, and edit-drawer titles. Must match an attribute `name`.
   * Falls back to the first attribute when omitted. The effective display
   * attribute cannot be space-bound.
   */
  display?: string;
  menu?: EntityMenu;
  /**
   * Space codes that can access this entity. Members of any listed space have
   * access; users outside all listed spaces cannot see the entity at all.
   */
  spaces?: string[];
  /**
   * Form field groups rendered as tabs. Does not change storage.
   * Distinct from `menu.group` (sidebar section).
   */
  groups?: FieldGroup[];
  attributes: TAttribute[];
};

/** Entity as written in `flexkit.config.ts`. */
export type Entity = EntityOf<Attribute>;

/** Entity as deployed and served by the backend. */
export type UiEntity = EntityOf<UiAttribute>;

export type Schema = Entity[];

export type UiSchema = UiEntity[];

export type Scope = {
  name: string;
  label: string;
  isDefault?: boolean;
  sortOrder?: number;
};

export type Scopes = Scope[];

export type Space = {
  code: string;
  label: string;
};

export type Spaces = Space[];

export type MenuGroup = {
  name: string;
  title: string;
};

/** One project in `flexkit.config.ts`. */
export interface ProjectConfig {
  /** Studio title shown in the navbar. Falls back to the dashboard project name. */
  title?: string;
  projectId: string;
  /** Sidebar sections; entities join one through `menu.group`. */
  menuGroups?: MenuGroup[];
  scopes?: Scopes;
  /**
   * Permission spaces for this project. Spaces scope access to entities,
   * attributes and app resources (automations, skills, agents). Membership is
   * assigned to project members in the Flexkit Dashboard after deploy.
   */
  spaces?: Spaces;
  schema: Entity[];
}

export type Config = ProjectConfig | ProjectConfig[];

/** The deployable form of a project config: what `flexkit deploy` sends. */
export interface UiProjectSchema {
  title?: string;
  projectId: string;
  menuGroups?: MenuGroup[];
  scopes?: Scopes;
  spaces?: Spaces;
  schema: UiEntity[];
}

/** Response of `GET /<projectId>/api/schema`: what the Studio renders from. */
export interface ProjectSchemaResponse {
  projectId: string;
  title: string;
  menuGroups: MenuGroup[];
  scopes: Scopes;
  spaces: Spaces;
  schema: UiEntity[];
  schemaHash: string | null;
}
