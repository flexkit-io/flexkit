import { useId, JSX } from 'react';
import type { FormFieldProps, FormFieldValue } from '@flexkit/studio';
import {
  Badge,
  FormControl,
  FormDescription,
  FormField,
  FormLabel,
  FormMessage,
  FormItem,
  Input,
} from '@flexkit/studio/ui';
import { DefaultValueSwitch } from '@flexkit/studio';

export function CustomTextField({ control, fieldSchema, readOnly, setValue }: FormFieldProps): JSX.Element {
  const { name, label, options } = fieldSchema;
  const fieldId = useId();

  function handleInput(
    event: React.ChangeEvent<HTMLTextAreaElement | HTMLInputElement>,
    previousValue: FormFieldValue | undefined
  ): void {
    setValue(name, {
      ...previousValue,
      value: event.currentTarget.value,
    });
  }

  function handleCheckbox(checked: boolean, value: FormFieldValue | undefined): void {
    setValue(name, {
      ...value,
      disabled: checked,
    });
  }

  return (
    <FormField
      control={control}
      name={name}
      render={({ field }: { field: { value?: FormFieldValue } }) => (
        <FormItem>
          <FormLabel htmlFor={fieldId}>{label}</FormLabel>
          {options.comment ? <FormDescription>{options.comment}</FormDescription> : null}
          <FormControl>
            <Input
              className={`mt-0.75 w-full ${!field.value?.scope || field.value.scope === 'default' ? 'mb-3' : ''}`}
              disabled={readOnly || field.value?.disabled}
              id={fieldId}
              onChange={(event) => {
                handleInput(event, field.value);
              }}
              value={(field.value?.value as string) || ''}
            />
          </FormControl>
          <Badge className="mt-2 ml-auto flex text-[0.6875rem] font-light" variant="secondary">
            Characters: {((field.value?.value as string | undefined) ?? '').length}
          </Badge>
          <DefaultValueSwitch
            checked={field.value?.disabled ?? false}
            disabled={readOnly}
            onChange={(checked) => {
              handleCheckbox(checked, field.value);
            }}
            scope={field.value?.scope}
          />
          <FormMessage />
        </FormItem>
      )}
    />
  );
}
