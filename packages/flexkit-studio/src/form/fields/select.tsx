import type { JSX } from 'react';
import type { FormFieldValue } from '../../graphql-client/types';
import { FormControl, FormDescription, FormField, FormLabel, FormMessage, FormItem } from '../../ui/primitives/form';
import {
  Select as SelectPrimitive,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectLabel,
  SelectTrigger,
  SelectValue,
} from '../../ui/primitives/select';
import type { FormFieldParams } from '../types';
import { DefaultValueSwitch } from './default-value-switch';

const SELECT_OPTION_PREFIX = 'flexkit-select-option:';

function encodeOptionValue(value: string): string {
  return `${SELECT_OPTION_PREFIX}${encodeURIComponent(value)}`;
}

function decodeOptionValue(value: string): string {
  return decodeURIComponent(value.slice(SELECT_OPTION_PREFIX.length));
}

export function Select({ control, fieldSchema, setValue }: FormFieldParams<'select'>): JSX.Element {
  const { name, label, isEditable, options } = fieldSchema;

  function handleInput(value: string, previousValue: FormFieldValue | undefined): void {
    const shouldCastToNumber = fieldSchema.dataType === 'int' && !isNaN(Number(value));
    const castedValue = shouldCastToNumber ? Number(value) : value;

    setValue(name, {
      ...previousValue,
      value: castedValue,
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
          <FormLabel>{label}</FormLabel>
          {options?.comment ? <FormDescription>{options.comment}</FormDescription> : null}
          <SelectPrimitive
            defaultValue={
              field.value?.value === undefined || field.value.value === null
                ? undefined
                : encodeOptionValue(String(field.value.value))
            }
            disabled={isEditable === false || field.value?.disabled}
            onValueChange={(value) => {
              handleInput(decodeOptionValue(value), field.value);
            }}
          >
            <FormControl>
              <SelectTrigger>
                <SelectValue placeholder={options?.placeholder} />
              </SelectTrigger>
            </FormControl>
            <SelectContent>
              {options?.list?.map((option) => {
                if ('groupLabel' in option) {
                  return (
                    <SelectGroup key={option.groupLabel}>
                      <SelectLabel>{option.groupLabel}</SelectLabel>
                      {option.items.map((item) => {
                        return (
                          <SelectItem key={item.label} value={encodeOptionValue(item.value)}>
                            {item.label}
                          </SelectItem>
                        );
                      })}
                    </SelectGroup>
                  );
                }

                return (
                  <SelectItem key={option.label} value={encodeOptionValue(option.value)}>
                    {option.label}
                  </SelectItem>
                );
              })}
            </SelectContent>
          </SelectPrimitive>
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
