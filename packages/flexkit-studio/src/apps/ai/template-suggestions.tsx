import type { JSX } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import useSWR from 'swr';
import { ChevronRight, Zap } from 'lucide-react';
import { useConfig } from '../../core/config/config-context';
import { Button } from '../../ui';
import { fetcher } from './api';
import { aiSectionPath } from './section-path';
import type { Marketplace } from './plugin-types';
import type { TemplateCatalog, TemplateProvenance } from './template-types';
import { suggestedAutomationTemplates, TEMPLATES_SWR_OPTIONS } from './template-utils';

/**
 * The Automations empty state: a few automation templates to start from. Renders nothing while the
 * catalog loads, when it is empty, or on an older platform without templates.
 */
export function AutomationTemplateSuggestions(): JSX.Element | null {
  const { currentProjectId } = useConfig();
  const navigate = useNavigate();
  const { pathname } = useLocation();
  const base = currentProjectId ? `/api/flexkit/${currentProjectId}` : null;
  const { data: catalog } = useSWR<TemplateCatalog>(base ? `${base}/templates` : null, fetcher, TEMPLATES_SWR_OPTIONS);
  const { data: marketplace } = useSWR<Marketplace>(base ? `${base}/plugins` : null, fetcher);
  const suggestions = suggestedAutomationTemplates(catalog?.templates ?? [], marketplace?.plugins);

  if (suggestions.length === 0) {
    return null;
  }

  return (
    <section className="fk:flex fk:flex-col fk:gap-3">
      <div className="fk:flex fk:items-center fk:gap-2">
        <h3 className="fk:text-sm fk:font-medium">Start from a template</h3>
        <Button
          className="fk:ml-auto"
          size="sm"
          type="button"
          variant="ghost"
          onClick={() => navigate(aiSectionPath(pathname, 'templates'))}
        >
          All templates
          <ChevronRight />
        </Button>
      </div>
      <div className="fk:grid fk:grid-cols-1 fk:gap-3 fk:md:grid-cols-2">
        {suggestions.map((template) => (
          <button
            className="fk:flex fk:min-w-0 fk:items-start fk:gap-3 fk:rounded-lg fk:border fk:p-3 fk:text-left fk:transition-colors fk:hover:bg-accent fk:focus-visible:bg-accent fk:focus-visible:outline-none fk:corner-squircle"
            key={template.name}
            type="button"
            onClick={() => navigate(aiSectionPath(pathname, `templates/${encodeURIComponent(template.name)}`))}
          >
            <span
              aria-hidden
              className="fk:flex fk:size-8 fk:shrink-0 fk:items-center fk:justify-center fk:rounded-md fk:bg-muted fk:text-muted-foreground fk:corner-squircle"
            >
              <Zap className="fk:size-4" strokeWidth={1.5} />
            </span>
            <span className="fk:min-w-0">
              <span className="fk:block fk:text-sm fk:font-medium">{template.displayName}</span>
              <span className="fk:line-clamp-2 fk:text-sm fk:text-muted-foreground">{template.description}</span>
            </span>
          </button>
        ))}
      </div>
    </section>
  );
}

/** "From template: …" under an automation's or skill's name; nothing for one not made from a template. */
export function TemplateProvenanceLabel({
  className = '',
  template,
}: {
  className?: string;
  template: TemplateProvenance | null | undefined;
}): JSX.Element | null {
  const { currentProjectId } = useConfig();
  const { pathname } = useLocation();
  const base = currentProjectId ? `/api/flexkit/${currentProjectId}` : null;
  const { data: catalog } = useSWR<TemplateCatalog>(
    template && base ? `${base}/templates` : null,
    fetcher,
    TEMPLATES_SWR_OPTIONS
  );

  if (!template) {
    return null;
  }

  const inCatalog = catalog?.templates.find((item) => item.name === template.name);

  return (
    <p className={`fk:text-sm fk:text-muted-foreground ${className}`}>
      From template:{' '}
      {inCatalog ? (
        <Link
          className="fk:text-foreground fk:hover:underline"
          to={aiSectionPath(pathname, `templates/${encodeURIComponent(template.name)}`)}
        >
          {inCatalog.displayName}
        </Link>
      ) : (
        template.name
      )}
    </p>
  );
}
