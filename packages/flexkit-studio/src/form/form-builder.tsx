import { createElement, forwardRef, memo, useEffect, useImperativeHandle, useMemo } from 'react';
import type { ComponentType, ForwardedRef } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { equals, find, propEq } from 'ramda';
import { AlertTriangle } from 'lucide-react';
import { Alert, AlertDescription, AlertTitle } from '../ui/primitives/alert';
import { Form } from '../ui/primitives/form';
import type { AttributeOptions, Entity, InputType, Schema } from '../core/types';
import type { EntityData, FormEntityItem } from '../graphql-client/types';
import { useConfig } from '../core/config/config-context';
import { Text as TextField } from './fields/text';
import { Switch as SwitchField } from './fields/switch';
import { Uploader as UploaderField } from './fields/uploader';
// import NumberField from './fields/number';
// import DateTimeField from './fields/datetime';
import EditorField from './fields/editor';
import { Textarea as TextareaField } from './fields/textarea';
import RelationshipField from './fields/relationship';
import { Select as SelectField } from './fields/select';
import UndefinedFieldTypeError from './fields/undefined-field-type-error';
import type { FormFieldParams } from './types';

export type SubmitHandle = {
  submit: () => void;
  hasErrors: () => void;
  hasDataChanged: () => boolean;
};

type Props = {
  currentScope: string;
  defaultScope: string;
  entityId?: string;
  entityName: string;
  entityNamePlural: string;
  formData?: FormEntityItem;
  schema: Schema;
  setIsDirty: (isDirty: boolean) => void;
  onSubmit: (newData: EntityData, previousData?: FormEntityItem) => void;
};

type FieldComponentsMap = {
  [type in keyof AttributeOptions]: ComponentType<FormFieldParams<type>>;
};

function FormBuilder(
  { currentScope, defaultScope, entityId, entityName, entityNamePlural, formData, schema, setIsDirty, onSubmit }: Props,
  ref: ForwardedRef<SubmitHandle>
): JSX.Element {
  const entitySchema = find(propEq(entityName, 'name'))(schema) as Entity | undefined;
  const formSchema = entitySchema?.attributes ?? [];
  const validationSchema = useMemo(() => {
    return z.object(
      formSchema.reduce((acc, fieldSchema) => {
        if (typeof fieldSchema.validation === 'undefined') return acc;

        return { ...acc, [fieldSchema.name]: z.object({ value: fieldSchema.validation(z) }) };
      }, {})
    );
  }, [formSchema]);
  type UserSchema = z.infer<typeof validationSchema>;

  const form = useForm<UserSchema>({ resolver: zodResolver(validationSchema), values: formData });
  const { control, getValues, handleSubmit, setValue, watch } = form;
  const { getContributionPointConfig } = useConfig();

  const formFieldComponentsMap = {
    datetime: TextField,
    editor: EditorField,
    image: UploaderField,
    number: TextField,
    relationship: RelationshipField,
    select: SelectField,
    'switch': SwitchField,
    text: TextField,
    textarea: TextareaField,
  };

  useImperativeHandle(ref, () => ({
    submit() {
      void handleSubmit(() => {
        setIsDirty(false);
        onSubmit(getValues(), formData);
      })();
    },
    hasErrors() {
      setIsDirty(true);
    },
    hasDataChanged() {
      return hasDataChanged(getValues(), formData);
    },
  }));

  useEffect(() => {
    const formChangesSubscription = watch((changedData) => {
      setIsDirty(hasDataChanged(changedData, formData));
    });

    return () => {
      formChangesSubscription.unsubscribe();
    };
  }, [formData, setIsDirty, watch]);

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

          const fieldComponent =
            (getContributionPointConfig('formFields', [field.inputType])?.[0]?.component as unknown as
              | ComponentType<FormFieldParams<typeof field.inputType>>
              | undefined) ?? formFieldComponentsMap[field.inputType as keyof typeof formFieldComponentsMap];

          return fieldComponent ? (
            createElement(
              fieldComponent as ComponentType<FormFieldParams<typeof field.inputType>>,
              {
                key: field.name,
                control,
                defaultScope,
                defaultValue: formData ? formData[field.name] : { value: '', disabled: false, scope: defaultScope },
                entityId,
                entityName,
                entityNamePlural,
                fieldSchema: field,
                getValues,
                schema,
                scope: currentScope,
                setValue,
              } as FormFieldParams<typeof field.inputType>
            )
          ) : (
            <UndefinedFieldTypeError inputType={field.inputType} key={field.name} label={field.label} />
          );
        })}
      </form>
    </Form>
  );
}

export default memo(forwardRef(FormBuilder));

function hasDataChanged(
  changedData: FormEntityItem | { [attribute: string]: undefined },
  originalFormData?: FormEntityItem
): boolean {
  if (!originalFormData) {
    // iterate over changedData and check if there are any values
    return Object.keys(changedData).some((field) => changedData[field]?.value !== '');
  }

  const sortAlphabetically = (a: string, b: string): 1 | -1 => (a < b ? -1 : 1);
  const originalData = Object.keys(originalFormData)
    .sort((a, b) => sortAlphabetically(a, b))
    .filter((field) => field !== 'updatedAt')
    .reduce(
      (acc, field) => ({
        ...acc,
        [field]: {
          value:
            typeof originalFormData[field].value === 'object'
              ? (originalFormData[field].value?._id ?? '')
              : (originalFormData[field].value ?? ''),
          disabled: originalFormData[field].disabled,
          relationships: originalFormData[field].relationships,
        },
      }),
      {}
    );
  const newData = Object.keys(changedData)
    .sort((a, b) => sortAlphabetically(a, b))
    .filter((field) => field !== 'updatedAt')
    .reduce(
      (acc, field) => ({
        ...acc,
        [field]: {
          value:
            typeof changedData[field]?.value === 'object'
              ? (changedData[field]?.value?._id ?? '')
              : (changedData[field]?.value ?? ''),
          disabled: changedData[field]?.disabled ?? false,
          relationships:
            Boolean(Object.keys(changedData[field]?.relationships?.connect ?? {}).length) ||
            Boolean(changedData[field]?.relationships?.disconnect?.length)
              ? changedData[field]?.relationships
              : undefined,
        },
      }),
      {}
    );

  return !equals(originalData, newData);
}
