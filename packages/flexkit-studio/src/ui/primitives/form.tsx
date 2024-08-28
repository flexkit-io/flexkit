import * as React from 'react';
import type * as LabelPrimitive from '@radix-ui/react-label';
import { Slot } from '@radix-ui/react-slot';
import { Controller, FormProvider, useFormContext } from 'react-hook-form';
import type { ControllerProps, FieldPath, FieldError, FieldValues } from 'react-hook-form';
import { cn } from 'src/ui/lib/utils';
import { Label } from 'src/ui/primitives/label';

const Form = FormProvider;

type FormFieldContextValue<
  TFieldValues extends FieldValues = FieldValues,
  TName extends FieldPath<TFieldValues> = FieldPath<TFieldValues>,
> = {
  name: TName;
};

const FormFieldContext = React.createContext<FormFieldContextValue>({} as FormFieldContextValue);

function FormField<
  TFieldValues extends FieldValues = FieldValues,
  TName extends FieldPath<TFieldValues> = FieldPath<TFieldValues>,
>({ ...props }: ControllerProps<TFieldValues, TName>): JSX.Element {
  return (
    <FormFieldContext.Provider value={{ name: props.name }}>
      <Controller {...props} />
    </FormFieldContext.Provider>
  );
}

type FormFieldState = {
  invalid: boolean;
  isDirty: boolean;
  isTouched: boolean;
  error?: FieldError | undefined;
  id: string;
  name: string;
  formItemId: string;
  formDescriptionId: string;
  formMessageId: string;
};

const useFormField = (): FormFieldState => {
  const fieldContext = React.useContext(FormFieldContext);
  const itemContext = React.useContext(FormItemContext);
  const { getFieldState, formState } = useFormContext();

  const fieldState = getFieldState(fieldContext.name, formState);

  if (!fieldContext.name) {
    throw new Error('useFormField should be used within <FormField>');
  }

  const { id } = itemContext;

  return {
    id,
    name: fieldContext.name,
    formItemId: `${id}-form-item`,
    formDescriptionId: `${id}-form-item-description`,
    formMessageId: `${id}-form-item-message`,
    ...fieldState,
  };
};

type FormItemContextValue = {
  id: string;
};

const FormItemContext = React.createContext<FormItemContextValue>({} as FormItemContextValue);

const FormItem = React.forwardRef<HTMLDivElement, React.HTMLAttributes<HTMLDivElement>>(
  ({ className, ...props }, ref) => {
    const id = React.useId();

    return (
      <FormItemContext.Provider value={{ id }}>
        <div className={cn('fk-space-y-2', className)} ref={ref} {...props} />
      </FormItemContext.Provider>
    );
  }
);
FormItem.displayName = 'FormItem';

const FormLabel = React.forwardRef<
  React.ElementRef<typeof LabelPrimitive.Root>,
  React.ComponentPropsWithoutRef<typeof LabelPrimitive.Root>
>(({ className, ...props }, ref) => {
  const { error, formItemId } = useFormField();

  return <Label className={cn(error && 'fk-text-destructive', className)} htmlFor={formItemId} ref={ref} {...props} />;
});
FormLabel.displayName = 'FormLabel';

const FormControl = React.forwardRef<React.ElementRef<typeof Slot>, React.ComponentPropsWithoutRef<typeof Slot>>(
  ({ ...props }, ref) => {
    const { error, formItemId, formDescriptionId, formMessageId } = useFormField();

    return (
      <Slot
        aria-describedby={!error ? formDescriptionId : `${formDescriptionId} ${formMessageId}`}
        aria-invalid={Boolean(error)}
        id={formItemId}
        ref={ref}
        {...props}
      />
    );
  }
);
FormControl.displayName = 'FormControl';

const FormDescription = React.forwardRef<HTMLParagraphElement, React.HTMLAttributes<HTMLParagraphElement>>(
  ({ className, ...props }, ref) => {
    const { formDescriptionId } = useFormField();

    return (
      <p className={cn('fk-text-xs fk-text-muted-foreground', className)} id={formDescriptionId} ref={ref} {...props} />
    );
  }
);
FormDescription.displayName = 'FormDescription';

type ExtendedError = FieldError & {
  error?: {
    value: {
      message: string;
    };
  };
  formMessageId: string;
};

const FormMessage = React.forwardRef<HTMLParagraphElement, React.HTMLAttributes<HTMLParagraphElement>>(
  ({ className, children, ...props }, ref) => {
    const { error, formMessageId } = useFormField() as unknown as ExtendedError;
    let body = children;

    if (error && 'message' in error) {
      body = error.message as string;
    }

    if (error?.value) {
      body = error.value.message;
    }

    if (!body) {
      return null;
    }

    return (
      <p
        className={cn('fk-text-sm fk-font-medium fk-text-destructive', className)}
        id={formMessageId}
        ref={ref}
        {...props}
      >
        {body}
      </p>
    );
  }
);
FormMessage.displayName = 'FormMessage';

export { useFormField, Form, FormItem, FormLabel, FormControl, FormDescription, FormMessage, FormField };
