import { useRef, useState, type JSX, type ReactNode } from 'react';
import { CheckIcon, ChevronDownIcon, LockIcon } from 'lucide-react';
import {
  Badge,
  Button,
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@flexkit/studio/ui';

/** Matches the visible name only; the default fuzzy scoring also matched hidden ids. */
export function matchLabel(_value: string, search: string, keywords?: string[]): number {
  return (keywords ?? []).some((keyword) => keyword.toLowerCase().includes(search.trim().toLowerCase())) ? 1 : 0;
}

export interface AttachComboboxItem {
  id: string;
  label: string;
  attached: boolean;
  /** Shown as a small badge after the label, e.g. "Code". */
  badge?: string;
  /** Locked items are listed so users know they exist, but cannot be attached. */
  lockedHint?: string;
}

/** "Attach" button that opens a searchable multi-select list; it stays open while items are toggled. */
export function AttachCombobox({
  disabled,
  emptyText,
  footer,
  items,
  searchPlaceholder,
  onToggle,
}: {
  disabled: boolean;
  emptyText: string;
  footer?: ReactNode;
  items: AttachComboboxItem[];
  searchPlaceholder: string;
  onToggle: (_id: string, _attached: boolean) => void;
}): JSX.Element {
  const [open, setOpen] = useState(false);
  const searchRef = useRef<HTMLInputElement | null>(null);

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button disabled={disabled} size="sm" type="button" variant="outline">
          Attach
          <ChevronDownIcon className="fk:ml-1 fk:size-4" />
        </Button>
      </PopoverTrigger>
      <PopoverContent
        align="end"
        className="fk:w-72 fk:p-0"
        // Default autofocus runs before the popover is positioned and scrolls the form to the top.
        onOpenAutoFocus={(event) => {
          event.preventDefault();
          searchRef.current?.focus({ preventScroll: true });
        }}
      >
        <Command filter={matchLabel}>
          <CommandInput placeholder={searchPlaceholder} ref={searchRef} />
          <CommandList className="fk:max-h-72">
            <CommandEmpty>{emptyText}</CommandEmpty>
            <CommandGroup>
              {items.map((item) => (
                <CommandItem
                  disabled={Boolean(item.lockedHint)}
                  key={item.id}
                  title={item.lockedHint}
                  value={item.id}
                  keywords={[item.label]}
                  onSelect={() => onToggle(item.id, !item.attached)}
                >
                  {item.lockedHint ? (
                    <LockIcon className="fk:size-4" />
                  ) : (
                    <CheckIcon className={item.attached ? 'fk:size-4' : 'fk:size-4 fk:opacity-0'} />
                  )}
                  <span className="fk:truncate">{item.label}</span>
                  {item.badge ? (
                    <Badge className="fk:ml-auto fk:py-0 fk:text-[10px]" variant="secondary">
                      {item.badge}
                    </Badge>
                  ) : null}
                </CommandItem>
              ))}
            </CommandGroup>
          </CommandList>
          {footer}
        </Command>
      </PopoverContent>
    </Popover>
  );
}
