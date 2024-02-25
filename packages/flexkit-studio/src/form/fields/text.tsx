import type { FormScopedAttributeValue } from '../../graphql-client/types';
import { FormControl, FormDescription, FormField, FormLabel, FormMessage, FormItem } from '../../ui/primitives/form';
import { Input } from '../../ui/primitives/input';
import type { FormFieldParams } from '../types';
import UseDefault from './use-default';

export default function Text({ control, defaultValue, fieldSchema, setValue }: FormFieldParams): JSX.Element {
  const { name, label, isEditable, options } = fieldSchema;

  function handleInput(
    event: React.ChangeEvent<HTMLTextAreaElement | HTMLInputElement>,
    previousValue: FormScopedAttributeValue
  ): void {
    void setValue(name, {
      ...previousValue,
      value: event.currentTarget.value,
    });
  }

  function handleCheckbox(event: React.ChangeEvent<HTMLInputElement>, value: FormScopedAttributeValue): void {
    void setValue(name, {
      ...value,
      disabled: event.target.checked,
    });
  }

  return (
    <FormField
      control={control}
      defaultValue={defaultValue}
      name={name}
      render={({ field }) => (
        <FormItem>
          <FormLabel>{label}</FormLabel>
          <FormControl>
            <>
              <Input
                className={`fk-w-full fk-mt-[0.1875rem] ${
                  !field?.value?.scope || field?.value?.scope === 'default' ? 'fk-mb-3' : ''
                }`}
                disabled={isEditable === false || field?.value?.disabled}
                {...field}
                onChange={(event) => {
                  handleInput(event, field?.value);
                }}
                value={field?.value?.value || ''}
              />
              <UseDefault
                checked={field?.value?.disabled}
                onChange={(event) => {
                  handleCheckbox(event, field?.value);
                }}
                scope={field?.value?.scope}
              />
            </>
          </FormControl>
          {options?.comment ? <FormDescription>{options.comment}</FormDescription> : null}
          <FormMessage />
        </FormItem>
      )}
    />
  );
}
