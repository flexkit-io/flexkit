import { useEffect, useId, useState } from 'react';
import type { SyntheticEvent } from 'react';
import { find, propEq } from 'ramda';
import { ChevronsUpDown, X as ClearIcon } from 'lucide-react';
import { Button } from '../../../ui/primitives/button';
import { FormControl, FormDescription, FormField, FormLabel, FormMessage, FormItem } from '../../../ui/primitives/form';
import { Input } from '../../../ui/primitives/input';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '../../../ui/primitives/tooltip';
import type { ActionSetRelationship, Attribute, Entity } from '../../../core/types';
import { useDispatch } from '../../../entities/actions-context';
import { useAppContext, useAppDispatch } from '../../../core/app-context';
import type { FormFieldParams } from '../../types';
import type { AttributeValue, EntityItem, MappedEntityItem } from '../../../graphql-client/types';

export default function SingleRelationship({
  control,
  defaultScope,
  defaultValue,
  entityId,
  fieldSchema,
  getValues,
  schema,
  scope,
  setValue,
}: FormFieldParams<'relationship'>): JSX.Element {
  const [hasFocus, setHasFocus] = useState(false);
  const { name, label, options, relationship } = fieldSchema;
  const relationshipEntity: string = relationship?.entity ?? name;
  const actionDispatch = useDispatch();
  const appDispatch = useAppDispatch();
  const fieldId = useId();
  const { relationships } = useAppContext();
  const relationshipId = useId();
  const relationshipEntitySchema = find(propEq(relationshipEntity, 'name'))(schema) as Entity | undefined;
  const primaryAttribute = getPrimaryAttribute(relationshipEntitySchema?.attributes ?? []);
  const primaryAttributeName = primaryAttribute.name;

  useEffect(() => {
    if (defaultValue.value === '') {
      return;
    }

    // set the initial state of the relationship
    appDispatch({
      type: 'setRelationship',
      payload: {
        [relationshipId]: {
          connect: { _id: String(defaultValue._id), value: defaultValue.value },
          disconnect: [],
        },
      },
    });
  }, [appDispatch, relationshipId, defaultValue, scope]);

  /**
   * Update the value of the relationship attribute when the relationshp context value changes
   * The relationshp context value changes when the user selects a row from the datagrid in the EditRelationship modal
   */
  useEffect(() => {
    setValue(name, { ...getValues(name), ...(relationships[relationshipId]?.connect ?? '') });
  }, [defaultValue, name, relationships, relationshipId, setValue]);

  function handleSelection(event: SyntheticEvent): void {
    event.preventDefault();
    actionDispatch({
      type: 'EditRelationship',
      payload: {
        connectedEntitiesCount: 0,
        entityName: relationshipEntity,
        entityId,
        relationshipId,
        mode: relationship?.mode ?? 'single',
      },
    });
  }

  function handleClearing(event: SyntheticEvent): void {
    const action: ActionSetRelationship = {
      type: 'setRelationship',
      payload: {
        [relationshipId]: {
          connect: [],
          disconnect: [],
        },
      },
    };

    event.preventDefault();
    appDispatch(action);
    setValue(name, { ...getValues(name), _id: '', value: undefined });
  }

  return (
    <FormField
      control={control}
      defaultValue={defaultValue}
      name={name}
      render={({
        field,
      }: {
        field: {
          value?: {
            value: string | MappedEntityItem | EntityItem | AttributeValue | undefined | null;
          };
        };
      }) => {
        const value = field.value?.value;
        let displayValue = '';

        if (value && typeof value === 'object' && !Array.isArray(value) && value[primaryAttributeName]) {
          displayValue =
            ((value[primaryAttributeName] as AttributeValue)?.[scope] as string) ??
            (value[primaryAttributeName] as AttributeValue)?.[defaultScope] ??
            value[primaryAttributeName];
        }

        return (
          <FormItem>
            <FormLabel htmlFor={fieldId}>{label}</FormLabel>
            {options?.comment ? <FormDescription>{options.comment}</FormDescription> : null}
            <FormControl className="fk-flex fk-w-full fk-items-center fk-space-x-2">
              <div
                className={`fk-relative fk-flex fk-w-full fk-items-start fk-space-x-2 fk-rounded-md fk-border fk-border-input fk-bg-background ${
                  hasFocus ? 'fk-outline-none fk-ring-2 fk-ring-ring fk-ring-offset-2' : ''
                }`}
              >
                <Input
                  className="fk-h-[2.375rem] fk-py-[0.4375rem] fk-caret-transparent fk-border-0 focus-visible:fk-ring-0 focus-visible:fk-ring-offset-0"
                  id={fieldId}
                  onBlur={() => {
                    setHasFocus(false);
                  }}
                  onClick={handleSelection}
                  onFocus={() => {
                    setHasFocus(true);
                  }}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') {
                      handleSelection(e);
                    }
                  }}
                  readOnly
                  type="text"
                  value={displayValue}
                />
                {displayValue ? (
                  <TooltipProvider>
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <Button
                          className="fk-absolute fk-right-10 fk-top-[0.1875rem] fk-h-8 fk-w-8 fk-rounded fk-text-muted-foreground"
                          onClick={handleClearing}
                          size="icon"
                          variant="ghost"
                        >
                          <ClearIcon className="fk-h-4 fk-w-4" />
                        </Button>
                      </TooltipTrigger>
                      <TooltipContent>
                        <p>Clear</p>
                      </TooltipContent>
                    </Tooltip>
                  </TooltipProvider>
                ) : null}
                <TooltipProvider>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <Button
                        className="fk-absolute fk-right-[0.1875rem] fk-top-[0.1875rem] fk-h-8 fk-w-8 fk-rounded fk-text-muted-foreground"
                        onClick={handleSelection}
                        size="icon"
                        variant="ghost"
                      >
                        <ChevronsUpDown className="fk-h-4 fk-w-4" />
                      </Button>
                    </TooltipTrigger>
                    <TooltipContent>
                      <p>Open</p>
                    </TooltipContent>
                  </Tooltip>
                </TooltipProvider>
              </div>
            </FormControl>
            <FormMessage />
          </FormItem>
        );
      }}
    />
  );
}

/**
 * Find the attribute of an entity with isPrimary === true.
 * if none is found, return the first attribute.
 */
function getPrimaryAttribute(schemaAttributes: Attribute[]): Attribute {
  return schemaAttributes.find((attr) => attr.isPrimary) ?? schemaAttributes[0];
}
