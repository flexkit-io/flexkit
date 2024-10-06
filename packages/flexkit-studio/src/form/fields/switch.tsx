import type { FormFieldValue } from '../../graphql-client/types';
import { FormControl, FormDescription, FormField, FormLabel, FormMessage, FormItem } from '../../ui/primitives/form';
import { Switch as SwitchPrimitive } from '../../ui/primitives/switch';
import type { FormFieldParams } from '../types';
import { DefaultValueSwitch } from './default-value-switch';

export function Switch({ control, fieldSchema, setValue }: FormFieldParams): JSX.Element {
  const { name, label, isEditable, options } = fieldSchema;

  function handleInput(checked: boolean, previousValue: FormFieldValue | undefined): void {
    setValue(name, {
      ...previousValue,
      value: checked,
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
          <div className="fk-flex fk-flex-row fk-items-center fk-justify-between fk-rounded-lg fk-border fk-border-input fk-p-3 fk-ring-offset-background focus-within:fk-outline-none focus-within:fk-ring-2 focus-within:fk-ring-ring focus-within:fk-ring-offset-2 disabled:fk-cursor-not-allowed disabled:fk-opacity-50">
            <div className="fk-space-y-0.5">
              <FormLabel>{label}</FormLabel>
              {options?.comment ? <FormDescription>{options.comment}</FormDescription> : null}
            </div>
            <FormControl>
              <SwitchPrimitive
                checked={field.value?.value ? Boolean(field.value.value) : false}
                disabled={isEditable === false || field.value?.disabled}
                onCheckedChange={(checked) => {
                  handleInput(checked, field.value);
                }}
              />
            </FormControl>
          </div>
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
