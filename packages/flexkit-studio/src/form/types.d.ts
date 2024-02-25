import type { Control, FieldPathValue, FormState, TFieldValues, UseFormTrigger } from 'react-hook-form';
import type { FormEntityItem } from '../graphql-client/types';
import type { FormFieldSchema, Schema } from '../core/types';

export type FormFieldParams = {
  control: Control | undefined;
  defaultValue: FieldPathValue;
  entityName: string;
  error: FormState.errors;
  fieldSchema: FormFieldSchema;
  getValues: (_payload?: string | string[]) => FormEntityItem;
  schema: Schema;
  scope: string;
  setValue: UseFormTrigger<TFieldValues>;
};
