/** A run of a setup notice message: plain text, or a URL shown as code so it is easy to read and copy. */
export interface NoticeMessagePart {
  text: string;
  url: boolean;
}

const URL_PATTERN = /(https:\/\/[^\s]+?)(?=[.,;:!?)]*(?:\s|$))/;

export function noticeMessageParts(message: string): NoticeMessagePart[] {
  return message
    .split(URL_PATTERN)
    .map((text, index) => ({ text, url: index % 2 === 1 }))
    .filter((part) => part.text !== '');
}

/** Only https links: the notice comes from the plugin catalog, not from Studio. */
export function httpsLinkUrl(value: string): string | null {
  try {
    return new URL(value).protocol === 'https:' ? value : null;
  } catch {
    return null;
  }
}
