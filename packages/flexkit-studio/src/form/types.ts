import type { Control, FieldValues, UseFormSetValue } from 'react-hook-form';
import type { FormFieldValue } from '../graphql-client/types';
import type { Attribute, AttributeOptions, Schema } from '../core/types';

export type FormFieldParams<T extends keyof AttributeOptions> = {
  control: Control | undefined;
  defaultScope: string;
  defaultValue: FormFieldValue;
  entityId?: string;
  entityName: string;
  entityNamePlural: string;
  fieldSchema: Omit<Attribute, 'options'> & { options: AttributeOptions[T] };
  getValues: (_payload?: string | string[]) => FormFieldValue | undefined;
  relationshipEntityName?: string;
  schema: Schema;
  scope: string;
  setValue: UseFormSetValue<FieldValues>;
};
