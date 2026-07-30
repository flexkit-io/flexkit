import type { JSX } from 'react';
import type { SelectOptions } from '../../core/types';
import { CopyableTruncatedText } from './copyable-truncated-text';

type SelectListItem = {
  label: string;
  value: string;
};

type GroupedSelectList = {
  groupLabel: string;
  items: SelectListItem[];
};

function isGroupedSelectList(option: SelectListItem | GroupedSelectList): option is GroupedSelectList {
  return 'groupLabel' in option;
}

function flattenSelectList(list: SelectOptions['list']): SelectListItem[] {
  return list.flatMap((option) => {
    if (isGroupedSelectList(option)) {
      return option.items;
    }

    return [option];
  });
}

function resolveSelectLabel(value: string, list: SelectOptions['list'] | undefined): string {
  if (!list) {
    return value;
  }

  const match = flattenSelectList(list).find((item) => String(item.value) === value);

  if (!match) {
    return value;
  }

  return match.label;
}

export function Select({
  value,
  options,
}: {
  value: string | number | null | undefined;
  options?: SelectOptions;
}): JSX.Element {
  if (value === null || value === undefined) {
    return <CopyableTruncatedText value="" />;
  }

  const stringValue = String(value);
  const displayValue = resolveSelectLabel(stringValue, options?.list);

  return <CopyableTruncatedText value={displayValue} />;
}
