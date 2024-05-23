import type { FormAttributeValue } from '../../graphql-client/types';
import { FormControl, FormDescription, FormField, FormLabel, FormMessage, FormItem } from '../../ui/primitives/form';
import { Textarea as TextareaPrimitive } from '../../ui/primitives/textarea';
import type { FormFieldParams } from '../types';
import UseDefault from './use-default';

export default function Textarea({ control, defaultValue, fieldSchema, setValue }: FormFieldParams): JSX.Element {
  const { name, label, isEditable, options } = fieldSchema;

  function handleInput(
    event: React.ChangeEvent<HTMLTextAreaElement | HTMLInputElement>,
    previousValue: FormAttributeValue | undefined
  ): void {
    setValue(name, {
      ...previousValue,
      value: event.currentTarget.value,
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
          <FormLabel>{label}</FormLabel>
          {options?.comment ? <FormDescription>{options.comment}</FormDescription> : null}
          <FormControl>
            <>
              <TextareaPrimitive
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
              <UseDefault
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
