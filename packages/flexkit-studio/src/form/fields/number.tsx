import { useId } from 'react';
import type { FormFieldValue } from '../../graphql-client/types';
import { FormControl, FormDescription, FormField, FormLabel, FormMessage, FormItem } from '../../ui/primitives/form';
import { Input } from '../../ui/primitives/input';
import type { FormFieldParams } from '../types';
import { DefaultValueSwitch } from './default-value-switch';

export function Number({ control, fieldSchema, setValue }: FormFieldParams<'number'>): JSX.Element {
  const { name, label, isEditable, options, dataType } = fieldSchema;
  const id = useId();

  function handleInput(
    event: React.ChangeEvent<HTMLTextAreaElement | HTMLInputElement>,
    previousValue: FormFieldValue | undefined
  ): void {
    const rawValue = event.currentTarget.value;
    let parsedValue: number | '';

    // Handle empty input
    if (rawValue === '') {
      parsedValue = '';
    } else {
      // Parse as float or integer based on dataType
      parsedValue = dataType === 'float' ? parseFloat(rawValue) : parseInt(rawValue, 10);

      // If parsing results in NaN, use empty string
      if (isNaN(parsedValue)) {
        parsedValue = '';
      }
    }

    setValue(name, {
      ...previousValue,
      value: parsedValue,
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
          <FormLabel htmlFor={id}>{label}</FormLabel>
          {options.comment ? <FormDescription>{options.comment}</FormDescription> : null}
          <FormControl>
            <Input
              className={`fk-w-full fk-mt-[0.1875rem] ${
                !field.value?.scope || field.value.scope === 'default' ? 'fk-mb-3' : ''
              }`}
              disabled={isEditable === false || field.value?.disabled}
              id={id}
              {...field}
              onChange={(event) => {
                handleInput(event, field.value);
              }}
              step={dataType === 'float' ? 'any' : '1'}
              type="number"
              value={(field.value?.value as string | number | undefined) ?? ''}
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
