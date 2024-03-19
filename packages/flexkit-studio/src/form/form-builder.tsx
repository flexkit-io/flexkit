import { createElement, forwardRef, useEffect, useImperativeHandle } from 'react';
import type { ForwardedRef } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { equals, find, propEq } from 'ramda';
import { AlertTriangle } from 'lucide-react';
import { Alert, AlertDescription, AlertTitle } from '../ui/primitives/alert';
import { Form } from '../ui/primitives/form';
import type { Entity, Schema } from '../core/types';
import { useAppContext } from '../core/app-context';
import { useDrawerModalContext } from '../ui/drawer-modal-context';
import type { EntityData, FormEntityItem } from '../graphql-client/types';
// import NumberField from './fields/number';
// import DateTimeField from './fields/datetime';
// import EditorField from './fields/editor';
import TextareaField from './fields/textarea';
import TextField from './fields/text';
// import RelationshipField from './fields/relationship';
import SwitchField from './fields/switch';
import SelectField from './fields/select';
import UndefinedFieldTypeError from './fields/undefined-field-type-error';
import type { FormFieldParams } from './types';

export type SubmitHandle = {
  submit: () => void;
  hasErrors: () => void;
  hasDataChanged: () => boolean;
};

type Props = {
  entityName: string;
  formData?: FormEntityItem;
  schema: Schema;
  onSubmit: (newData: EntityData, previousData?: FormEntityItem) => void;
};

type FieldComponentsMap = {
  [type: string]: (_props: FormFieldParams) => JSX.Element;
};

function FormBuilder({ entityName, formData, schema, onSubmit }: Props, ref: ForwardedRef<SubmitHandle>): JSX.Element {
  const entitySchema = find(propEq(entityName, 'name'))(schema) as Entity | undefined;
  const formSchema = entitySchema?.attributes ?? [];
  const validationSchema = z.object(
    formSchema.reduce((acc, fieldSchema) => {
      if (typeof fieldSchema.validation === 'undefined') return acc;

      return { ...acc, [fieldSchema.name]: z.object({ value: fieldSchema.validation(z) }) };
    }, {})
  );
  type UserSchema = z.infer<typeof validationSchema>;

  const form = useForm<UserSchema>({ resolver: zodResolver(validationSchema) });
  const { control, getValues, handleSubmit, setValue, watch } = form;
  const { scope } = useAppContext();
  const { isDirty } = useDrawerModalContext();

  useImperativeHandle(ref, () => ({
    submit() {
      void handleSubmit((data) => {
        isDirty(false);
        onSubmit(data, formData);
      })();
    },
    hasErrors() {
      isDirty(true);
    },
    hasDataChanged() {
      return hasDataChanged(getValues(), formData);
    },
  }));

  useEffect(() => {
    const formChangesSubscription = watch((changedData) => {
      isDirty(hasDataChanged(changedData, formData));
    });

    return () => {
      formChangesSubscription.unsubscribe();
    };
  }, [formData, isDirty, watch]);

  if (!entitySchema || entitySchema.attributes.length === 0) {
    return (
      <Alert variant="destructive">
        <AlertTriangle className="fk-h-4 fk-w-4" />
        <AlertTitle>Error</AlertTitle>
        <AlertDescription>
          No attributes found in the schema for entity <strong>{entityName}</strong>
        </AlertDescription>
      </Alert>
    );
  }

  return (
    <Form {...form}>
      <form className="fk-flex fk-flex-col fk-gap-y-5">
        {formSchema.map((field) => {
          if (field.name === '_id') {
            return null;
          }

          // eslint-disable-next-line @typescript-eslint/no-unnecessary-condition -- required if the user pass an invalid inputType
          return formFieldComponentsMap[field.inputType] ? (
            createElement(formFieldComponentsMap[field.inputType], {
              key: field.name,
              control,
              defaultValue: formData ? formData[field.name] : undefined,
              entityName,
              fieldSchema: field,
              getValues,
              schema,
              scope,
              setValue,
            })
          ) : (
            <UndefinedFieldTypeError inputType={field.inputType} key={field.name} label={field.label} />
          );
        })}
      </form>
    </Form>
  );
}

export default forwardRef(FormBuilder);

const formFieldComponentsMap: FieldComponentsMap = {
  'switch': SwitchField,
  datetime: TextField,
  editor: TextField,
  number: TextField,
  select: SelectField,
  text: TextField,
  textarea: TextareaField,
  relationship: TextField,
};

function hasDataChanged(
  changedData: FormEntityItem | { [attribute: string]: undefined },
  originalFormData?: FormEntityItem
): boolean {
  if (!originalFormData) {
    // iterate over changedData and check if there are any values
    return Object.keys(changedData).some((field) => changedData[field]?.value !== undefined);
  }

  const sortAlphabetically = (a: string, b: string): 1 | -1 => (a < b ? -1 : 1);
  const originalData = Object.keys(originalFormData)
    .sort((a, b) => sortAlphabetically(a, b))
    .filter((field) => field !== 'updatedAt')
    .reduce(
      (acc, field) => ({
        ...acc,
        [field]: { value: originalFormData[field].value, disabled: originalFormData[field].disabled },
      }),
      {}
    );
  const newData = Object.keys(changedData)
    .sort((a, b) => sortAlphabetically(a, b))
    .filter((field) => field !== 'updatedAt')
    .reduce(
      (acc, field) => ({
        ...acc,
        [field]: { value: changedData[field]?.value, disabled: changedData[field]?.disabled },
      }),
      {}
    );

  return !equals(originalData, newData);
}
