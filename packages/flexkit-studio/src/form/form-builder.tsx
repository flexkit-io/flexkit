import { createElement, forwardRef, useEffect, useImperativeHandle } from 'react';
import type { ForwardedRef } from 'react';
import { useForm } from 'react-hook-form';
import type { FieldValues } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { equals, find, propEq } from 'ramda';
import { AlertTriangle } from 'lucide-react';
import { Alert, AlertDescription, AlertTitle } from '../ui/primitives/alert';
import { Form } from '../ui/primitives/form';
import type { Entity, Schema } from '../core/types';
import { useAppContext } from '../core/app-context';
import { useDrawerModalContext } from '../ui/drawer-modal-context';
// import NumberField from './fields/number';
// import DateTimeField from './fields/datetime';
// import EditorField from './fields/editor';
// import TextareaField from './fields/textarea';
import TextField from './fields/text';
// import RelationshipField from './fields/relationship';
// import SwitchField from './fields/switch';
// import SelectField from './fields/select';
import UndefinedFieldTypeError from './fields/undefined-field-type-error';
import Loading from './loading';
import type { FormFieldParams } from './types';

export type SubmitHandle = {
  submit: () => void;
  hasErrors: () => void;
  hasDataChanged: () => boolean;
};

type Props = {
  entityName: string;
  formData: { [key: string]: any };
  schema: Schema;
  onSubmit: (_previousData: any, _newData: any) => any;
};

type FieldComponentsMap = {
  [type: string]: (_props: FormFieldParams) => JSX.Element;
};

function FormBuilder({ entityName, formData, schema, onSubmit }: Props, ref: ForwardedRef<any>): JSX.Element {
  const entitySchema = find(propEq(entityName, 'name'))(schema) as Entity | undefined;
  const formSchema = entitySchema?.attributes ?? [];
  const validationSchema = formSchema.reduce((acc, fieldSchema) => {
    if (typeof fieldSchema.validation === 'undefined') return acc;

    return { ...acc, [fieldSchema.name]: z.object({ value: fieldSchema.validation(z) }) };
  }, {});

  const form = useForm({ resolver: zodResolver(z.object(validationSchema)) });
  const {
    control,
    formState: { errors },
    getValues,
    handleSubmit,
    setValue,
    watch,
  } = form;
  const { scope } = useAppContext();
  const { isDirty } = useDrawerModalContext();

  useImperativeHandle(ref, () => ({
    submit() {
      void handleSubmit((data) => {
        isDirty(false);

        return onSubmit(formData, data);
      })();
    },
    hasErrors() {
      isDirty(true);
    },
    hasDataChanged() {
      return hasDataChanged(formData, getValues());
    },
  }));

  useEffect(() => {
    const formChangesSubscription = watch((changedData) => {
      isDirty(hasDataChanged(formData, changedData));
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

  if (!formSchema || !formData) {
    return <Loading />;
  }

  return (
    <Form {...form}>
      <form className="fk-flex fk-flex-col fk-gap-y-5">
        {formSchema.map((field) => {
          if (field.name === '_id') {
            return null;
          }

          return formFieldComponentsMap[field.inputType] ? (
            createElement(formFieldComponentsMap[field.inputType], {
              key: field.name,
              control,
              defaultValue: formData[field.name],
              entityName,
              error: errors[field.name],
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
  // 'switch': SwitchField,
  // datetime: DateTimeField,
  // editor: EditorField,
  // number: NumberField,
  // select: SelectField,
  text: TextField,
  // textarea: TextareaField,
  // relationship: RelationshipField,
};

function hasDataChanged(originalFormData: unknown, changedData: unknown): boolean {
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
  console.log(originalData, newData);

  return !equals(originalData, newData);
}
