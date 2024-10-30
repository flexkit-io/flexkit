import { useId } from 'react';
import type { SyntheticEvent } from 'react';
import { format } from 'date-fns';
import { Calendar as CalendarIcon, X as ClearIcon } from 'lucide-react';
import type { FormFieldValue } from '../../graphql-client/types';
import { FormControl, FormDescription, FormField, FormLabel, FormMessage, FormItem } from '../../ui/primitives/form';
import { Input } from '../../ui/primitives/input';
import { Popover, PopoverContent, PopoverTrigger } from '../../ui/primitives/popover';
import { Button } from '../../ui/primitives/button';
import { Calendar } from '../../ui/primitives/calendar';
import { cn } from '../../ui/lib/utils';
import type { FormFieldParams } from '../types';
import { DefaultValueSwitch } from './default-value-switch';

export function DateTime({ control, fieldSchema, getValues, setValue }: FormFieldParams<'datetime'>): JSX.Element {
  const { name, label, isEditable, options } = fieldSchema;
  const id = useId();

  function handleSelect(date: Date | undefined, previousValue: FormFieldValue | undefined): void {
    setValue(name, {
      ...previousValue,
      value: date ? date.toISOString() : '',
    });
  }

  function handleCheckbox(checked: boolean, value: FormFieldValue | undefined): void {
    setValue(name, {
      ...value,
      disabled: checked,
    });
  }

  function handleClearing(event: SyntheticEvent): void {
    event.preventDefault();
    setValue(name, { ...getValues(name), value: undefined });
  }

  return (
    <FormField
      control={control}
      name={name}
      render={({ field }: { field: { value?: FormFieldValue } }) => (
        <FormItem
          onKeyDown={(e) => {
            if (e.key === 'Escape') {
              e.preventDefault();
              e.stopPropagation();
            }
          }}
        >
          <FormLabel htmlFor={id}>{label}</FormLabel>
          {options.comment ? <FormDescription>{options.comment}</FormDescription> : null}
          <FormControl>
            <>
              <Popover>
                <PopoverTrigger asChild>
                  <Button
                    className={cn(
                      'fk-w-full fk-justify-start fk-h-10 fk-text-left fk-font-normal hover:fk-bg-transparent fk-relative',
                      !field.value?.value && 'fk-text-muted-foreground',
                      !field.value?.scope || field.value.scope === 'default' ? 'fk-mb-3' : ''
                    )}
                    disabled={isEditable === false || field.value?.disabled}
                    id={id}
                    variant="outline"
                  >
                    {field.value?.value ? (
                      format(new Date(field.value.value as string), 'PPP') +
                      ' at ' +
                      format(new Date(field.value.value as string), 'HH:mm')
                    ) : (
                      <span>Pick a date and time</span>
                    )}
                    <Button
                      className="fk-absolute fk-right-10 fk-h-8 fk-w-8 fk-rounded fk-text-muted-foreground"
                      onClick={handleClearing}
                      size="icon"
                      variant="ghost"
                    >
                      <ClearIcon className="fk-h-4 fk-w-4" />
                    </Button>
                    <CalendarIcon className="fk-absolute fk-right-3 fk-h-4 fk-w-4 fk-text-muted-foreground hover:fk-text-accent-foreground" />
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="fk-w-auto fk-p-0" align="start">
                  <Calendar
                    mode="single"
                    selected={field.value?.value ? new Date(field.value.value as string) : undefined}
                    onSelect={(date) => handleSelect(date, field.value)}
                    initialFocus
                  />
                  <div className="fk-p-3 fk-border-t fk-border-border">
                    <label htmlFor="time" className="fk-text-sm fk-font-medium">
                      Time
                    </label>
                    <Input
                      className="fk-mt-1 fk-w-[90px]"
                      id="time"
                      onChange={(e) => {
                        const timeValue = e.target.value;
                        const [hours, minutes] = timeValue.split(':');

                        let date = field.value?.value ? new Date(field.value.value as string) : new Date();
                        date.setHours(parseInt(hours));
                        date.setMinutes(parseInt(minutes));

                        setValue(name, {
                          ...field.value,
                          value: date.toISOString(),
                        });
                      }}
                      type="time"
                      value={field.value?.value ? format(new Date(field.value.value as string), 'HH:mm') : ''}
                    />
                  </div>
                </PopoverContent>
              </Popover>
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
