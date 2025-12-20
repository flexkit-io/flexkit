import { useId } from 'react';
import type { FormFieldParams, FormFieldValue } from '@flexkit/studio';
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

export function CustomTextField({ control, fieldSchema, setValue }: FormFieldParams<'text'>): JSX.Element {
  const { name, label, isEditable, options } = fieldSchema;
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
              className={`fk-w-full fk-mt-[0.1875rem] ${
                !field.value?.scope || field.value.scope === 'default' ? 'fk-mb-3' : ''
              }`}
              disabled={isEditable === false || field.value?.disabled}
              id={fieldId}
              onChange={(event) => {
                handleInput(event, field.value);
              }}
              value={(field.value?.value as string) || ''}
            />
          </FormControl>
          <Badge className="flex text-[0.6875rem] ml-auto mt-2 font-light" variant="secondary">
            Characters: {((field.value?.value as string | undefined) ?? '').length}
          </Badge>
          <DefaultValueSwitch
            checked={field.value?.disabled ?? false}
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
