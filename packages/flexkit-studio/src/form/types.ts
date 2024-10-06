import type { Control, FieldValues, UseFormSetValue } from 'react-hook-form';
import type { FormFieldValue } from '../graphql-client/types';
import type { FormFieldSchema, Schema } from '../core/types';

export type FormFieldParams = {
  control: Control | undefined;
  defaultScope: string;
  defaultValue: FormFieldValue;
  entityId?: string;
  entityName: string;
  entityNamePlural: string;
  fieldSchema: FormFieldSchema;
  getValues: (_payload?: string | string[]) => FormFieldValue | undefined;
  relationshipEntityName?: string;
  schema: Schema;
  scope: string;
  setValue: UseFormSetValue<FieldValues>;
};
