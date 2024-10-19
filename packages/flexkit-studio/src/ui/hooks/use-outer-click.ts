import { useEffect } from 'react';
import type { RefObject } from 'react';

export function useOuterClick(
  ref: RefObject<HTMLDivElement>,
  callback: React.Dispatch<React.SetStateAction<boolean>>,
  excludeSelectors?: string
): void {
  useEffect(() => {
    function handleClickOutside(event: MouseEvent): void {
      if (ref.current && !ref.current.contains(event.target as Node)) {
        if (excludeSelectors) {
          const excludedElements = Array.from(document.querySelectorAll(excludeSelectors));

          for (const element of excludedElements) {
            if (element.contains(event.target as Node)) {
              return;
            }
          }
        }
        callback(false);
      }
    }

    document.addEventListener('mousedown', handleClickOutside);

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [callback, ref, excludeSelectors]);

  useEffect(() => {
    function handleFocusOutside(event: FocusEvent): void {
      if (ref.current && !ref.current.contains(event.target as Node)) {
        if (excludeSelectors) {
          const excludedElements = Array.from(document.querySelectorAll(excludeSelectors));

          for (const element of excludedElements) {
            if (element.contains(event.target as Node)) {
              return;
            }
          }
        }
        callback(false);
      }
    }

    document.addEventListener('focusin', handleFocusOutside);

    return () => {
      document.removeEventListener('mousedown', handleFocusOutside);
    };
  }, [callback, ref]);
}
