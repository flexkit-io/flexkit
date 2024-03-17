import type { FormScopedAttributeValue } from '../../graphql-client/types';
import { FormControl, FormDescription, FormField, FormLabel, FormMessage, FormItem } from '../../ui/primitives/form';
import {
  Select as SelectComponent,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectLabel,
  SelectTrigger,
  SelectValue,
} from '../../ui/primitives/select';
import type { FormFieldParams } from '../types';
import UseDefault from './use-default';

export default function Select({ control, defaultValue, fieldSchema, setValue }: FormFieldParams): JSX.Element {
  const { name, label, isEditable, options } = fieldSchema;

  function handleInput(value: string, previousValue: FormScopedAttributeValue | undefined): void {
    const shouldCastToNumber = fieldSchema.dataType === 'int' && !isNaN(Number(value));
    const castedValue = shouldCastToNumber ? Number(value) : value;

    setValue(name, {
      ...previousValue,
      value: castedValue,
    });
  }

  function handleCheckbox(
    event: React.ChangeEvent<HTMLInputElement>,
    value: FormScopedAttributeValue | undefined
  ): void {
    setValue(name, {
      ...value,
      disabled: event.target.checked,
    });
  }

  return (
    <FormField
      control={control}
      defaultValue={defaultValue}
      name={name}
      render={({ field }: { field: { value?: FormScopedAttributeValue } }) => (
        <FormItem>
          <FormLabel>{label}</FormLabel>
          {options?.comment ? <FormDescription>{options.comment}</FormDescription> : null}
          <SelectComponent
            defaultValue={field.value?.value ? String(field.value.value) : undefined}
            disabled={isEditable === false || field.value?.disabled}
            onValueChange={(value) => {
              handleInput(value, field.value);
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
                          <SelectItem key={item.label} value={item.value}>
                            {item.label}
                          </SelectItem>
                        );
                      })}
                    </SelectGroup>
                  );
                }

                return (
                  <SelectItem key={option.label} value={option.value}>
                    {option.label}
                  </SelectItem>
                );
              })}
            </SelectContent>
          </SelectComponent>
          <UseDefault
            checked={field.value?.disabled ?? false}
            onChange={(event) => {
              handleCheckbox(event, field.value);
            }}
            scope={field.value?.scope}
          />
          <FormMessage />
        </FormItem>
      )}
    />
  );
}
