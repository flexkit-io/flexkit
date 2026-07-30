import { useId, JSX } from 'react';
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
          <div className="flex items-center justify-between">
            <div className="grid gap-2">
              <FormLabel htmlFor={fieldId}>{label}</FormLabel>
              {options.comment ? <FormDescription>{options.comment}</FormDescription> : null}
            </div>
            <Badge className="ml-auto flex w-fit self-end text-xs font-light" variant="secondary">
              Characters: {((field.value?.value as string | undefined) ?? '').length}
            </Badge>
          </div>
          <FormControl>
            <Input
              className={`mt-[0.1875rem] w-full ${
                !field.value?.scope || field.value.scope === 'default' ? 'mb-3' : ''
              }`}
              disabled={isEditable === false || field.value?.disabled}
              id={fieldId}
              onChange={(event) => {
                handleInput(event, field.value);
              }}
              value={(field.value?.value as string) || ''}
            />
          </FormControl>
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
