import type { Control, FieldPathValue, FieldValues, UseFormSetValue } from 'react-hook-form';
import type { FormEntityItem } from '../graphql-client/types';
import type { FormFieldSchema, Schema } from '../core/types';

export type FormFieldParams = {
  control: Control | undefined;
  defaultValue: FieldPathValue;
  entityName: string;
  fieldSchema: FormFieldSchema;
  getValues: (_payload?: string | string[]) => FormEntityItem;
  schema: Schema;
  scope: string;
  setValue: UseFormSetValue<FieldValues>;
};
