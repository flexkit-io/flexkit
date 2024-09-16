import type { FormAttributeValue } from '../../graphql-client/types';
import { FormControl, FormDescription, FormField, FormLabel, FormMessage, FormItem } from '../../ui/primitives/form';
import { Switch as SwitchPrimitive } from '../../ui/primitives/switch';
import type { FormFieldParams } from '../types';
import UseDefault from './use-default';

export default function Switch({ control, defaultValue, fieldSchema, setValue }: FormFieldParams): JSX.Element {
  const { name, label, isEditable, options } = fieldSchema;

  function handleInput(checked: boolean, previousValue: FormAttributeValue | undefined): void {
    setValue(name, {
      ...previousValue,
      value: checked,
    });
  }

  function handleCheckbox(checked: boolean, value: FormAttributeValue | undefined): void {
    setValue(name, {
      ...value,
      disabled: checked,
    });
  }

  return (
    <FormField
      control={control}
      defaultValue={defaultValue}
      name={name}
      render={({ field }: { field: { value?: FormAttributeValue } }) => (
        <FormItem>
          <div className="fk-flex fk-flex-row fk-items-center fk-justify-between fk-rounded-lg fk-border fk-p-3">
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
          <UseDefault
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
