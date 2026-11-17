import type { JSX } from 'react';
import { ExternalLink, Info } from 'lucide-react';
import { Alert, AlertDescription, AlertTitle } from '../../ui';
import { httpsLinkUrl, noticeMessageParts } from './plugin-setup-notice-parts';
import type { PluginSetupNotice as PluginSetupNoticeData } from './plugin-types';

/** The message as text, with URLs in it set as code so they are easy to read and copy. */
function MessageText({ message }: { message: string }): JSX.Element {
  return (
    <p>
      {noticeMessageParts(message).map((part, index) =>
        part.url ? (
          <code
            className="fk:break-all fk:rounded fk:bg-muted fk:px-1 fk:py-0.5 fk:font-mono fk:text-xs"
            key={`${String(index)}-${part.text}`}
          >
            {part.text}
          </code>
        ) : (
          part.text
        )
      )}
    </p>
  );
}

/**
 * A step to take on the provider's side before connecting a plugin, such as
 * an admin allowing Flexkit. Any plugin can declare one in its manifest.
 */
export function PluginSetupNotice({ notice }: { notice: PluginSetupNoticeData }): JSX.Element {
  const linkUrl = notice.link ? httpsLinkUrl(notice.link.url) : null;

  return (
    <Alert>
      <Info className="fk:h-4 fk:w-4" />
      {notice.title ? <AlertTitle>{notice.title}</AlertTitle> : null}
      <AlertDescription className="fk:text-muted-foreground">
        <MessageText message={notice.message} />
        {notice.link && linkUrl ? (
          <a
            className="fk:mt-1 fk:inline-flex fk:w-fit fk:items-center fk:gap-1 fk:text-foreground fk:underline-offset-4 fk:hover:underline"
            href={linkUrl}
            rel="noopener noreferrer"
            target="_blank"
          >
            {notice.link.label}
            <ExternalLink className="fk:size-3" />
          </a>
        ) : null}
      </AlertDescription>
    </Alert>
  );
}
