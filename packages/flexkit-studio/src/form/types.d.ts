import type { Control, FieldValues, UseFormSetValue } from 'react-hook-form';
import type { FormEntityItem } from '../graphql-client/types';
import type { FormFieldSchema, Schema } from '../core/types';

export type FormFieldParams = {
  control: Control | undefined;
  defaultValue: {
    _id?: string;
    count?: number;
    value:
      | string
      | { [key: string]: string | number | readonly string[] | undefined }
      | { [key: string]: string | number | boolean | { [key: string]: string | number | boolean } }[];
  };
  entityId: string;
  entityName: string;
  fieldSchema: FormFieldSchema;
  getValues: (_payload?: string | string[]) => FormEntityItem;
  schema: Schema;
  scope: string;
  setValue: UseFormSetValue<FieldValues>;
};
