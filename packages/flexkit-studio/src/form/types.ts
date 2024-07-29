import type { Control, FieldValues, UseFormSetValue } from 'react-hook-form';
import type { FormAttributeValue, FormEntityItem } from '../graphql-client/types';
import type { FormFieldSchema, Schema } from '../core/types';

export type FormFieldParams = {
  control: Control | undefined;
  defaultScope: string;
  defaultValue: FormAttributeValue;
  entityId?: string;
  entityName: string;
  entityNamePlural: string;
  fieldSchema: FormFieldSchema;
  getValues: (_payload?: string | string[]) => FormEntityItem;
  relationshipEntityName?: string;
  schema: Schema;
  scope: string;
  setValue: UseFormSetValue<FieldValues>;
};
