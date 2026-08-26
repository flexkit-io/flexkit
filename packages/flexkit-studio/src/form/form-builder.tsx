import { createElement, forwardRef, memo, useEffect, useImperativeHandle, useMemo, useRef, useState } from 'react';
import type { ComponentType, ForwardedRef, JSX } from 'react';
import { useForm } from 'react-hook-form';
import type { Resolver } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { equals, find, propEq } from 'ramda';
import { AlertTriangle } from 'lucide-react';
import { Alert, AlertDescription, AlertTitle } from '../ui/primitives/alert';
import { Form } from '../ui/primitives/form';
import { ScrollArea, ScrollBar } from '../ui/primitives/scroll-area';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../ui/primitives/tabs';
import type { Attribute, Entity, Schema } from '../core/types';
import type { FormEntityItem, FormFieldValue } from '../graphql-client/types';
import { useAuth } from '../auth/auth-context';
import { filterAttributesForSpaces } from '../core/spaces';
import { useConfig } from '../core/config/config-context';
import { Text as TextField } from './fields/text';
import { Switch as SwitchField } from './fields/switch';
import { Uploader as UploaderField } from './fields/uploader';
import { Number as NumberField } from './fields/number';
import { DateTime as DateTimeField } from './fields/datetime';
import EditorField from './fields/editor';
import { Textarea as TextareaField } from './fields/textarea';
import RelationshipField from './fields/relationship';
import { Select as SelectField } from './fields/select';
import UndefinedFieldTypeError from './fields/undefined-field-type-error';
import type { FormFieldParams } from './types';
import {
  attributeBelongsToGroup,
  getDefaultFieldGroupName,
  isAttributeVisibleInGroups,
  resolveVisibleFieldGroups,
} from './field-groups';
import { resolveConditionalFlag, unwrapFormRecord } from './resolve-conditional-flag';

export type SubmitHandle = {
  submit: () => void;
  hasErrors: () => void;
  hasDataChanged: () => boolean;
  markAsSaved: () => void;
  /**
   * Patches local-attribute _ids returned by an update mutation into the live
   * form values without replacing the whole formData snapshot (avoids dirtying).
   */
  applyLocalAttributeIds: (ids: { [attributeName: string]: string }) => void;
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
  onSubmit: (newData: FormEntityItem, previousData?: FormEntityItem) => void;
};

function getInitialFieldValue(field: Attribute, defaultScope: string): FormFieldValue {
  const value = field.dataType === 'asset' || field.scope === 'relationship' ? '' : (field.defaultValue ?? '');

  return {
    disabled: false,
    scope: defaultScope,
    value,
  };
}

function FormBuilder(
  { currentScope, defaultScope, entityId, entityName, entityNamePlural, formData, schema, setIsDirty, onSubmit }: Props,
  ref: ForwardedRef<SubmitHandle>
): JSX.Element {
  const entitySchema = find(propEq(entityName, 'name'))(schema) as Entity | undefined;
  const [, auth] = useAuth();
  const userSpaces = auth.user?.spaces;
  // Hide space-bound attributes from non-members; the server rejects writes
  // and nulls reads for them regardless.
  const formSchema = useMemo(
    () => filterAttributesForSpaces(entitySchema?.attributes ?? [], userSpaces),
    [entitySchema, userSpaces]
  );
  const initialFormValues = useMemo(() => {
    if (formData) {
      return formData;
    }

    return formSchema.reduce<FormEntityItem>(
      (values, field) => ({
        ...values,
        [field.name]: getInitialFieldValue(field, defaultScope),
      }),
      {}
    );
  }, [defaultScope, formData, formSchema]);
  const resolver: Resolver<FormEntityItem> = async (values, context, options) => {
    const record = unwrapFormRecord(values);
    const visibleGroupsForValidation = resolveVisibleFieldGroups(entitySchema?.groups, {
      record,
      value: record,
      currentUser: auth.user,
    });
    const shape: { [fieldName: string]: z.ZodType } = {};

    for (const fieldSchema of formSchema) {
      if (typeof fieldSchema.validation === 'undefined') {
        continue;
      }

      const fieldContext = {
        record,
        value: record[fieldSchema.name],
        currentUser: auth.user,
      };

      if (resolveConditionalFlag(fieldSchema.hidden, fieldContext)) {
        continue;
      }

      if (resolveConditionalFlag(fieldSchema.readOnly, fieldContext)) {
        continue;
      }

      if (!isAttributeVisibleInGroups(fieldSchema, visibleGroupsForValidation)) {
        continue;
      }

      shape[fieldSchema.name] = z.object({
        value: fieldSchema.validation(z).or(
          z.any().refine(() => false, {
            error: fieldSchema.label ? `${fieldSchema.label} is required` : 'Required field',
          })
        ),
      });
    }

    const validate = zodResolver(z.object(shape)) as Resolver<FormEntityItem>;

    return validate(values, context, options);
  };

  const form = useForm<FormEntityItem>({
    defaultValues: initialFormValues,
    resolver,
    values: formData,
    mode: 'onBlur',
    criteriaMode: 'all',
  });

  const { control, getValues, handleSubmit, setValue, watch, trigger } = form;
  const formValues = watch();
  const record = unwrapFormRecord(formValues);
  const visibleGroups = useMemo(
    () =>
      resolveVisibleFieldGroups(entitySchema?.groups, {
        record,
        value: record,
        currentUser: auth.user,
      }),
    [auth.user, entitySchema?.groups, record]
  );
  const [activeGroup, setActiveGroup] = useState(() => getDefaultFieldGroupName(visibleGroups));
  const { getContributionPointConfig } = useConfig();
  // Baseline for dirty checks. Updated on successful save so relationship-field
  // noise / stale formData props cannot keep reporting dirty after Save.
  const baselineRef = useRef<FormEntityItem | undefined>(formData);
  const hasMarkedSavedRef = useRef(false);

  useEffect(() => {
    if (hasMarkedSavedRef.current) {
      return;
    }

    baselineRef.current = formData;
  }, [formData]);

  const formFieldComponentsMap = {
    datetime: DateTimeField,
    editor: EditorField,
    asset: UploaderField,
    number: NumberField,
    relationship: RelationshipField,
    select: SelectField,
    'switch': SwitchField,
    text: TextField,
    textarea: TextareaField,
  };

  useImperativeHandle(ref, () => ({
    submit() {
      // Force validate all fields
      void trigger().then(() => {
        void handleSubmit(() => {
          const values = getValues() as FormEntityItem;
          // Commit baseline immediately so close matches the disabled Save button
          // even before the mutation onCompleted handler runs.
          hasMarkedSavedRef.current = true;
          baselineRef.current = values;
          setIsDirty(false);
          onSubmit(values, formData);
        })();
      });
    },
    hasErrors() {
      hasMarkedSavedRef.current = false;
      baselineRef.current = formData;
      setIsDirty(true);
    },
    hasDataChanged() {
      return hasDataChanged(getValues(), baselineRef.current);
    },
    markAsSaved() {
      hasMarkedSavedRef.current = true;
      baselineRef.current = getValues() as FormEntityItem;
      setIsDirty(false);
    },
    applyLocalAttributeIds(ids: { [attributeName: string]: string }) {
      const values = getValues() as FormEntityItem;
      const nextValues: FormEntityItem = { ...values };

      for (const [attributeName, id] of Object.entries(ids)) {
        const field = values[attributeName];

        if (!field || field._id || !id) {
          continue;
        }

        nextValues[attributeName] = {
          ...field,
          _id: id,
        };
      }

      // Baseline first so any watch fired by setValue still compares clean.
      hasMarkedSavedRef.current = true;
      baselineRef.current = nextValues;

      for (const [attributeName, field] of Object.entries(nextValues)) {
        if (field === values[attributeName]) {
          continue;
        }

        setValue(attributeName, field, {
          shouldDirty: false,
          shouldTouch: false,
          shouldValidate: false,
        });
      }

      setIsDirty(false);
    },
  }));

  useEffect(() => {
    const formChangesSubscription = watch(() => {
      // Always compare the full form snapshot. The watch callback payload can be
      // partial and falsely report dirty against the baseline.
      setIsDirty(hasDataChanged(getValues(), baselineRef.current));
    });

    return () => {
      formChangesSubscription.unsubscribe();
    };
  }, [formData, getValues, setIsDirty, watch]);

  useEffect(() => {
    if (visibleGroups.length === 0) {
      return;
    }

    if (visibleGroups.some((group) => group.name === activeGroup)) {
      return;
    }

    setActiveGroup(getDefaultFieldGroupName(visibleGroups));
  }, [activeGroup, visibleGroups]);

  if (!entitySchema || entitySchema.attributes.length === 0) {
    return (
      <Alert variant="destructive">
        <AlertTriangle className="fk:h-4 fk:w-4" />
        <AlertTitle>Error</AlertTitle>
        <AlertDescription>
          No attributes found in the schema for entity <strong>{entityName}</strong>
        </AlertDescription>
      </Alert>
    );
  }

  const renderField = (field: Attribute) => {
    if (field.name === '_id') {
      return null;
    }

    const fieldContext = {
      record,
      value: record[field.name],
      currentUser: auth.user,
    };

    if (resolveConditionalFlag(field.hidden, fieldContext)) {
      return null;
    }

    const readOnly = resolveConditionalFlag(field.readOnly, fieldContext);
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
          defaultValue: initialFormValues[field.name],
          entityId,
          entityName,
          entityNamePlural,
          fieldSchema: field,
          getValues,
          readOnly,
          schema,
          scope: currentScope,
          setValue,
        } as FormFieldParams<typeof field.inputType>
      )
    ) : (
      <UndefinedFieldTypeError inputType={field.inputType} key={field.name} label={field.label} />
    );
  };

  return (
    <Form {...form}>
      <form
        className="fk:flex fk:flex-col fk:gap-5"
        onSubmit={(event) => {
          event.preventDefault();
        }}
      >
        {visibleGroups.length > 0 ? (
          <Tabs onValueChange={setActiveGroup} value={activeGroup}>
            <div className="fk:sticky fk:top-0 fk:z-10 fk:bg-background fk:py-1 fk:mb-6">
              <ScrollArea className="fk:w-full fk:**:data-[slot=scroll-area-viewport]:h-auto fk:[&_[data-slot=scroll-area-scrollbar][data-orientation=vertical]]:hidden">
                <TabsList className="fk:h-9 fk:w-max fk:flex-nowrap fk:justify-start fk:border fk:border-border">
                  {visibleGroups.map((group) => (
                    <TabsTrigger
                      className="fk:shrink-0 fk:px-4 fk:dark:data-[state=active]:border-transparent! fk:dark:data-[state=active]:bg-background"
                      key={group.name}
                      value={group.name}
                    >
                      {group.icon}
                      {group.title}
                    </TabsTrigger>
                  ))}
                </TabsList>
                <ScrollBar orientation="horizontal" />
              </ScrollArea>
            </div>
            <TabsContent className="fk:gap-8" value={activeGroup}>
              {formSchema.map((field) => {
                if (!isAttributeVisibleInGroups(field, visibleGroups)) {
                  return null;
                }

                const isVisible = attributeBelongsToGroup(field, activeGroup);
                const fieldElement = renderField(field);

                if (!fieldElement) {
                  return null;
                }

                return (
                  <div className={isVisible ? undefined : 'fk:hidden'} key={field.name}>
                    {fieldElement}
                  </div>
                );
              })}
            </TabsContent>
          </Tabs>
        ) : (
          formSchema.map((field) => renderField(field))
        )}
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
    return Object.keys(changedData).some(
      (field) => changedData[field]?.value !== '' && changedData[field]?.value !== undefined
    );
  }

  /**
   * Normalize the value for comparison.
   * This is necessary because the value might be an object, so we need to either
   * compare by the _id or or other keys depending on the type of field.
   */
  const normalizeComparisonValue = (value: unknown) => {
    if (typeof value === 'object' && value !== null) {
      if ('path' in value) {
        // for image attributes
        return value.path;
      }

      return '_id' in value ? (value as { _id: string })._id : '';
    }

    return value ?? '';
  };

  const sortAlphabetically = (a: string, b: string): 1 | -1 => (a < b ? -1 : 1);
  const originalData = Object.keys(originalFormData)
    .sort((a, b) => sortAlphabetically(a, b))
    .filter((field) => field !== '_updatedAt')
    .reduce(
      (acc, field) => ({
        ...acc,
        [field]: {
          value: normalizeComparisonValue(originalFormData[field].value),
          disabled: originalFormData[field].disabled,
          relationships: originalFormData[field].relationships,
        },
      }),
      {}
    );
  const newData = Object.keys(changedData)
    .sort((a, b) => sortAlphabetically(a, b))
    .filter((field) => field !== '_updatedAt')
    .reduce(
      (acc, field) => ({
        ...acc,
        [field]: {
          value: normalizeComparisonValue(changedData[field]?.value),
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
