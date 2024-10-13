import type { FormFieldValue } from '../../graphql-client/types';
import { FormControl, FormDescription, FormField, FormLabel, FormMessage, FormItem } from '../../ui/primitives/form';
import { Input } from '../../ui/primitives/input';
import type { FormFieldParams } from '../types';
import { DefaultValueSwitch } from './default-value-switch';

export function Text({ control, fieldSchema, setValue }: FormFieldParams<'text'>): JSX.Element {
  const { name, label, isEditable, options } = fieldSchema;

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
          <FormLabel>{label}</FormLabel>
          {options.comment ? <FormDescription>{options.comment}</FormDescription> : null}
          <FormControl>
            <>
              <Input
                className={`fk-w-full fk-mt-[0.1875rem] ${
                  !field.value?.scope || field.value.scope === 'default' ? 'fk-mb-3' : ''
                }`}
                disabled={isEditable === false || field.value?.disabled}
                {...field}
                onChange={(event) => {
                  handleInput(event, field.value);
                }}
                value={(field.value?.value as string) || ''}
              />
              <DefaultValueSwitch
                checked={field.value?.disabled ?? false}
                onChange={(checked) => {
                  handleCheckbox(checked, field.value);
                }}
                scope={field.value?.scope}
              />
            </>
          </FormControl>
          <FormMessage />
        </FormItem>
      )}
    />
  );
}
