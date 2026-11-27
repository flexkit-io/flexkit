import { useState, type JSX, type ReactNode } from 'react';
import { Link, useLocation, useNavigate, useParams } from 'react-router-dom';
import Markdown from 'react-markdown';
import useSWR from 'swr';
import {
  Alert,
  AlertDescription,
  Badge,
  Button,
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
  Input,
  PermissionTooltip,
  ScrollArea,
  SidebarTrigger,
  Skeleton,
  toast,
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from '../../ui';
import { ArrowLeft, BookText, CheckIcon, ChevronRight, Plus, Sparkles } from 'lucide-react';
import { useCapabilities } from '../../core/capabilities';
import type { OnboardingNavigationState } from '../../core/config/onboarding';
import { useCanMutate } from '../../core/permissions';
import { FetcherError, fetcher } from './api';
import {
  aiSectionPath,
  CatalogHeader,
  CatalogRowSkeleton,
  categoryLabel,
  isConnected,
  PluginConnectControl,
  pluginGridClassName,
  useMarketplaceApi,
} from './plugin-pages';
import { PluginLogo } from './plugin-logo';
import { connectPlugin } from './plugin-token';
import type { Marketplace, MarketplacePlugin } from './plugin-types';
import { TemplateAvatar } from './template-avatar';
import type { TemplateCatalog, TemplateDetail, TemplateKind, TemplateSummary } from './template-types';
import {
  groupTemplates,
  isTemplateReady,
  matchesTemplateSearch,
  missingRequiredPlugins,
  templateSetupPrompt,
  TEMPLATES_SWR_OPTIONS,
} from './template-utils';

type KindFilter = 'all' | TemplateKind;

const KIND_FILTERS: Array<{ label: string; value: KindFilter }> = [
  { label: 'All', value: 'all' },
  { label: 'Automations', value: 'automation' },
  { label: 'Skills', value: 'skill' },
];

function kindLabel(kind: TemplateKind): string {
  return kind === 'skill' ? 'Skill' : 'Automation';
}

/** Starts a new agent chat that sets the template up. */
export function useStartTemplateSetup(): (_template: Pick<TemplateSummary, 'displayName' | 'name'>) => void {
  const navigate = useNavigate();
  const { pathname } = useLocation();

  return (template) => {
    const state: OnboardingNavigationState = { onboardingPrompt: templateSetupPrompt(template) };

    navigate(aiSectionPath(pathname, 'agent'), { state });
  };
}

function TemplateRowStatus({
  plugins,
  template,
}: {
  plugins: MarketplacePlugin[] | undefined;
  template: TemplateSummary;
}): JSX.Element {
  const missing = plugins ? missingRequiredPlugins(template, plugins) : [];

  if (missing.length > 0) {
    const names = missing.map((plugin) => plugin.name).join(', ');

    return (
      <Tooltip>
        <TooltipTrigger asChild>
          <span className="fk:flex fk:shrink-0 fk:items-center fk:gap-1 fk:rounded-md fk:border fk:px-1.5 fk:py-0.5 fk:text-xs fk:text-muted-foreground">
            {missing.slice(0, 2).map((plugin) => (
              <PluginLogo className="fk:size-4 fk:rounded-sm" key={plugin.id} src={plugin.logoUrl} />
            ))}
            <Plus className="fk:size-3" />
            <span className="fk:sr-only">Needs {names}</span>
          </span>
        </TooltipTrigger>
        <TooltipContent>Needs {names}</TooltipContent>
      </Tooltip>
    );
  }

  if (template.usedBy > 0) {
    return (
      <span className="fk:flex fk:shrink-0 fk:items-center fk:gap-1 fk:text-xs fk:text-muted-foreground">
        <CheckIcon className="fk:size-3.5 fk:text-success" />
        Used {template.usedBy === 1 ? 'once' : `${template.usedBy.toString()} times`}
      </span>
    );
  }

  return <ChevronRight className="fk:size-4 fk:shrink-0 fk:text-muted-foreground" />;
}

function TemplateRow({
  onOpen,
  plugins,
  template,
}: {
  onOpen: () => void;
  plugins: MarketplacePlugin[] | undefined;
  template: TemplateSummary;
}): JSX.Element {
  return (
    <button
      type="button"
      onClick={onOpen}
      className="fk:-mx-3 fk:flex fk:min-w-0 fk:items-center fk:gap-3 fk:rounded-lg fk:px-3 fk:py-2 fk:text-left fk:transition-colors fk:hover:bg-accent fk:focus-visible:bg-accent fk:focus-visible:outline-none fk:corner-squircle"
    >
      <TemplateAvatar template={template} />
      <span className="fk:min-w-0 fk:flex-1">
        <span className="fk:flex fk:items-center fk:gap-2">
          <span className="fk:truncate fk:text-sm fk:font-medium">{template.displayName}</span>
          <Badge className="fk:px-1.5 fk:py-0 fk:text-[0.625rem] fk:font-normal fk:leading-4" variant="secondary">
            {kindLabel(template.kind)}
          </Badge>
        </span>
        <span className="fk:block fk:truncate fk:text-sm fk:text-muted-foreground">{template.description}</span>
      </span>
      <TemplateRowStatus plugins={plugins} template={template} />
    </button>
  );
}

function TemplateRows({
  onOpen,
  plugins,
  templates,
}: {
  onOpen: (_name: string) => void;
  plugins: MarketplacePlugin[] | undefined;
  templates: TemplateSummary[];
}): JSX.Element {
  return (
    <div className={pluginGridClassName}>
      {templates.map((template) => (
        <TemplateRow key={template.name} plugins={plugins} template={template} onOpen={() => onOpen(template.name)} />
      ))}
    </div>
  );
}

function TemplateListSkeleton(): JSX.Element {
  const rows = [
    { descriptionWidth: 'fk:w-48', id: 'a', nameWidth: 'fk:w-28' },
    { descriptionWidth: 'fk:w-40', id: 'b', nameWidth: 'fk:w-24' },
    { descriptionWidth: 'fk:w-52', id: 'c', nameWidth: 'fk:w-32' },
    { descriptionWidth: 'fk:w-44', id: 'd', nameWidth: 'fk:w-20' },
  ];

  return (
    <div aria-busy="true" className="fk:flex fk:flex-col fk:gap-1">
      <span className="fk:sr-only">Loading templates</span>
      <Skeleton className="fk:mb-1 fk:h-4 fk:w-28" />
      <div className={pluginGridClassName}>
        {rows.map((row) => (
          <CatalogRowSkeleton action key={row.id} row={row} />
        ))}
      </div>
    </div>
  );
}

function useTemplatesData() {
  const { base } = useMarketplaceApi();
  const templates = useSWR<TemplateCatalog>(base ? `${base}/templates` : null, fetcher, TEMPLATES_SWR_OPTIONS);
  const marketplace = useSWR<Marketplace>(base ? `${base}/plugins` : null, fetcher);

  return { base, marketplace, templates };
}

export function TemplatesPage(): JSX.Element {
  const { base, marketplace, templates } = useTemplatesData();
  const [search, setSearch] = useState('');
  const [kind, setKind] = useState<KindFilter>('all');
  const navigate = useNavigate();
  const { pathname } = useLocation();
  const plugins = marketplace.data?.plugins;
  const visible = (templates.data?.templates ?? []).filter(
    (template) => (kind === 'all' || template.kind === kind) && matchesTemplateSearch(template, search)
  );
  const { categories, ready } = groupTemplates(visible, plugins);
  const unsupported = templates.error instanceof FetcherError && templates.error.status === 404;

  function openTemplate(name: string): void {
    navigate(aiSectionPath(pathname, `templates/${encodeURIComponent(name)}`));
  }

  let content: JSX.Element | null = null;

  if (!base) {
    content = (
      <Alert>
        <AlertDescription>Select a project to see its templates.</AlertDescription>
      </Alert>
    );
  } else if (templates.isLoading) {
    content = <TemplateListSkeleton />;
  } else if (unsupported) {
    content = (
      <Alert>
        <AlertDescription>Templates are not available on this Flexkit platform yet.</AlertDescription>
      </Alert>
    );
  } else if (templates.error) {
    content = (
      <Alert variant="destructive">
        <AlertDescription>Unable to load templates. Please try again.</AlertDescription>
      </Alert>
    );
  } else if (visible.length === 0) {
    content = (
      <Alert>
        <AlertDescription>
          {(templates.data?.templates.length ?? 0) === 0
            ? 'Templates are being prepared. Check back soon.'
            : 'No templates match your search.'}
        </AlertDescription>
      </Alert>
    );
  } else {
    content = (
      <div className="fk:flex fk:flex-col fk:gap-8">
        {ready.length > 0 ? (
          <section>
            <h3 className="fk:mb-1 fk:flex fk:items-center fk:gap-1.5 fk:text-sm fk:font-medium">
              <Sparkles className="fk:size-3.5 fk:text-muted-foreground" />
              Ready to use
            </h3>
            <TemplateRows plugins={plugins} templates={ready} onOpen={openTemplate} />
          </section>
        ) : null}
        {categories.map((group) => (
          <section key={group.category}>
            <h3 className="fk:mb-1 fk:text-sm fk:font-medium">{categoryLabel(group.category)}</h3>
            <TemplateRows plugins={plugins} templates={group.templates} onOpen={openTemplate} />
          </section>
        ))}
      </div>
    );
  }

  return (
    <main className="fk:flex fk:min-h-0 fk:flex-1 fk:flex-col">
      <CatalogHeader />
      <ScrollArea className="fk:h-0 fk:min-h-0 fk:flex-1">
        <div className="fk:mx-auto fk:flex fk:w-full fk:max-w-4xl fk:flex-col fk:gap-8 fk:py-6 fk:pl-4 fk:pr-6">
          <div>
            <h2 className="fk:text-2xl fk:font-semibold">Templates</h2>
            <p className="fk:mt-2 fk:text-muted-foreground">
              Ready-made automations and skills to start from. The agent sets each one up for your project.
            </p>
          </div>
          <div className="fk:flex fk:flex-wrap fk:items-center fk:gap-3">
            <Input
              aria-label="Search templates"
              className="fk:mr-auto fk:w-full fk:max-w-xs"
              placeholder="Search templates…"
              value={search}
              onChange={(event) => setSearch(event.target.value)}
            />
            <div aria-label="Template kind" className="fk:flex fk:items-center fk:gap-1" role="group">
              {KIND_FILTERS.map((filter) => (
                <Button
                  aria-pressed={kind === filter.value}
                  key={filter.value}
                  size="sm"
                  type="button"
                  variant={kind === filter.value ? 'secondary' : 'ghost'}
                  onClick={() => setKind(filter.value)}
                >
                  {filter.label}
                </Button>
              ))}
            </div>
          </div>
          {content}
        </div>
      </ScrollArea>
    </main>
  );
}

function DetailHeader(): JSX.Element {
  const navigate = useNavigate();

  return (
    <div className="fk:mb-2 fk:flex fk:shrink-0 fk:items-center fk:gap-2">
      <Tooltip>
        <TooltipTrigger asChild>
          <SidebarTrigger className="fk:-ml-1 fk:h-4 fk:w-4" />
        </TooltipTrigger>
        <TooltipContent>Toggle Sidebar</TooltipContent>
      </Tooltip>
      <Button variant="ghost" size="sm" onClick={() => navigate('..', { relative: 'path' })}>
        <ArrowLeft />
        Templates
      </Button>
    </div>
  );
}

function formatDefault(value: boolean | number | string | null | undefined): string | null {
  if (value === undefined || value === null || value === '') {
    return null;
  }

  if (typeof value === 'boolean') {
    return value ? 'On' : 'Off';
  }

  return String(value);
}

function TemplatePluginsSection({
  marketplace,
  onChanged,
  template,
}: {
  marketplace: Marketplace | undefined;
  onChanged: () => Promise<unknown>;
  template: TemplateSummary;
}): JSX.Element | null {
  const { api } = useMarketplaceApi();
  const [busy, setBusy] = useState(false);

  if (template.plugins.length === 0) {
    return null;
  }

  async function connect(plugin: MarketplacePlugin, scope: MarketplacePlugin['scopes'][number]): Promise<void> {
    if (!api) {
      return;
    }

    setBusy(true);

    try {
      await connectPlugin(api, plugin, scope);
      await onChanged();
    } catch (failure) {
      toast.error(failure instanceof Error ? failure.message : 'Unable to connect this plugin.');
    } finally {
      setBusy(false);
    }
  }

  return (
    <ul className="fk:flex fk:flex-col fk:gap-3">
      {template.plugins.map((requirement) => {
        const plugin = marketplace?.plugins.find((item) => item.id === requirement.id);
        const connected = plugin ? isConnected(plugin) : false;

        return (
          <li className="fk:flex fk:items-center fk:gap-3" key={requirement.id}>
            {plugin ? (
              <PluginLogo className="fk:size-8 fk:rounded-md" src={plugin.logoUrl} />
            ) : (
              <Skeleton className="fk:size-8 fk:rounded-md" />
            )}
            <span className="fk:min-w-0 fk:flex-1">
              <span className="fk:block fk:text-sm fk:font-medium">
                {plugin?.name ?? requirement.id}
                {requirement.required ? null : (
                  <span className="fk:ml-1.5 fk:font-normal fk:text-muted-foreground">optional</span>
                )}
              </span>
              <span className="fk:block fk:text-sm fk:text-muted-foreground">{requirement.reason}</span>
            </span>
            {connected ? (
              <span className="fk:flex fk:items-center fk:gap-1 fk:text-sm fk:text-muted-foreground">
                <CheckIcon className="fk:size-4 fk:text-success" />
                Connected
              </span>
            ) : null}
            {!connected && plugin && marketplace ? (
              <PluginConnectControl
                busy={busy}
                canManage={marketplace.canManage}
                plugin={plugin}
                onConnect={(scope) => void connect(plugin, scope)}
              />
            ) : null}
          </li>
        );
      })}
    </ul>
  );
}

function DetailSection({ children, title }: { children: ReactNode; title: string }): JSX.Element {
  return (
    <section className="fk:flex fk:flex-col fk:gap-3">
      <h2 className="fk:text-lg fk:font-semibold">{title}</h2>
      {children}
    </section>
  );
}

export function TemplateDetailPage(): JSX.Element {
  const { templateName } = useParams<{ templateName: string }>();
  const { base, marketplace, templates } = useTemplatesData();
  const { pathname } = useLocation();
  const startSetup = useStartTemplateSetup();
  const canMutate = useCanMutate();
  const { canCreatePersonalAutomations } = useCapabilities();
  const { data, error } = useSWR<TemplateDetail>(
    base && templateName ? `${base}/templates/${encodeURIComponent(templateName)}` : null,
    fetcher,
    TEMPLATES_SWR_OPTIONS
  );

  if (error) {
    const message =
      error instanceof FetcherError && error.status === 404
        ? 'This template does not exist or is no longer in the catalog.'
        : 'Unable to load this template.';

    return (
      <main className="fk:flex fk:min-h-0 fk:flex-1 fk:flex-col">
        <DetailHeader />
        <div className="fk:mx-auto fk:w-full fk:max-w-4xl fk:py-6 fk:pl-4 fk:pr-6">
          <Alert variant="destructive">
            <AlertDescription>{message}</AlertDescription>
          </Alert>
        </div>
      </main>
    );
  }

  if (!base) {
    return (
      <main className="fk:flex fk:min-h-0 fk:flex-1 fk:flex-col">
        <DetailHeader />
        <p className="fk:mx-auto fk:w-full fk:max-w-4xl fk:py-6 fk:pl-4 fk:pr-6 fk:text-sm fk:text-muted-foreground">
          Select a project to see this template.
        </p>
      </main>
    );
  }

  if (!data) {
    return (
      <main className="fk:flex fk:min-h-0 fk:flex-1 fk:flex-col">
        <DetailHeader />
        <div
          aria-busy="true"
          className="fk:mx-auto fk:flex fk:w-full fk:max-w-4xl fk:flex-col fk:gap-3 fk:py-6 fk:pl-4 fk:pr-6"
        >
          <span className="fk:sr-only">Loading template</span>
          <div className="fk:flex fk:items-center fk:gap-4">
            <Skeleton className="fk:size-14 fk:shrink-0 fk:rounded-lg" />
            <Skeleton className="fk:h-7 fk:w-48" />
            <Skeleton className="fk:ml-auto fk:h-9 fk:w-32" />
          </div>
          <Skeleton className="fk:h-4 fk:w-full" />
          <Skeleton className="fk:h-4 fk:w-2/3" />
        </div>
      </main>
    );
  }

  const { template } = data;
  const catalog = templates.data?.templates ?? [];
  const recommended = (template.automation?.recommendedSkills ?? []).map(
    (name) => catalog.find((item) => item.name === name) ?? { displayName: name, name }
  );
  const ready = marketplace.data ? isTemplateReady(template, marketplace.data.plugins) : true;
  // Automations need the same rights as the New automation button; every member who can edit may add a skill.
  const canUse = canMutate && (template.kind === 'skill' || canCreatePersonalAutomations);
  const instructionsLabel = template.kind === 'skill' ? 'Show the skill outline' : 'Show the instructions';

  return (
    <main className="fk:flex fk:min-h-0 fk:flex-1 fk:flex-col">
      <DetailHeader />
      <ScrollArea className="fk:h-0 fk:min-h-0 fk:flex-1">
        <div className="fk:mx-auto fk:flex fk:w-full fk:max-w-4xl fk:flex-col fk:gap-8 fk:py-6 fk:pl-4 fk:pr-6">
          <section className="fk:flex fk:flex-col fk:gap-3">
            <div className="fk:flex fk:flex-wrap fk:items-center fk:gap-4">
              <TemplateAvatar className="fk:size-14" template={template} />
              <div className="fk:flex fk:min-w-0 fk:flex-col fk:gap-0.5">
                <h1 className="fk:text-xl fk:font-semibold">{template.displayName}</h1>
                <span className="fk:text-sm fk:text-muted-foreground">
                  {kindLabel(template.kind)} template · {categoryLabel(template.category)}
                </span>
              </div>
              <div className="fk:ml-auto fk:flex fk:shrink-0 fk:items-center fk:gap-2">
                <PermissionTooltip disabled={!canUse}>
                  <Button disabled={!canUse} type="button" onClick={() => startSetup(template)}>
                    <Sparkles />
                    Use template
                  </Button>
                </PermissionTooltip>
              </div>
            </div>
            <p className="fk:text-muted-foreground">{template.description}</p>
            {!ready ? (
              <p className="fk:text-sm fk:text-muted-foreground">
                Some plugins it needs aren&apos;t connected yet. Connect them below, or the agent will ask during setup.
              </p>
            ) : null}
            {template.usedBy > 0 ? (
              <p className="fk:text-sm fk:text-muted-foreground">
                Used {template.usedBy === 1 ? 'once' : `${template.usedBy.toString()} times`} in this project. Each use
                is a separate copy you can change freely.
              </p>
            ) : null}
          </section>

          {template.howItWorks.length > 0 ? (
            <DetailSection title="How it works">
              <dl className="fk:grid fk:grid-cols-[minmax(6rem,auto)_1fr] fk:gap-x-6 fk:gap-y-2 fk:text-sm">
                {template.howItWorks.flatMap((row, index) => [
                  <dt className="fk:text-muted-foreground" key={`label-${index.toString()}`}>
                    {row.label}
                  </dt>,
                  <dd key={`text-${index.toString()}`}>{row.text}</dd>,
                ])}
              </dl>
            </DetailSection>
          ) : null}

          {template.plugins.length > 0 || template.data.length > 0 ? (
            <DetailSection title="What it needs">
              <TemplatePluginsSection
                marketplace={marketplace.data}
                template={template}
                onChanged={() => marketplace.mutate()}
              />
              {template.data.length > 0 ? (
                <div className="fk:flex fk:flex-col fk:gap-1.5">
                  <p className="fk:text-sm fk:text-muted-foreground">
                    From your data. The agent finds the matching fields in your schema and confirms them with you.
                  </p>
                  <ul className="fk:flex fk:list-disc fk:flex-col fk:gap-1 fk:pl-5 fk:text-sm">
                    {template.data.map((item) => (
                      <li key={item.key}>
                        {item.description}
                        {item.required ? null : <span className="fk:text-muted-foreground"> (optional)</span>}
                      </li>
                    ))}
                  </ul>
                </div>
              ) : null}
            </DetailSection>
          ) : null}

          {template.parameters.length > 0 ? (
            <DetailSection title="You'll choose">
              <ul className="fk:flex fk:flex-col fk:gap-1.5 fk:text-sm">
                {template.parameters.map((parameter) => {
                  const fallback = formatDefault(parameter.default);

                  return (
                    <li key={parameter.key}>
                      <span className="fk:font-medium">{parameter.label}</span>
                      {fallback ? <span className="fk:text-muted-foreground"> · default {fallback}</span> : null}
                      {parameter.description ? (
                        <span className="fk:block fk:text-muted-foreground">{parameter.description}</span>
                      ) : null}
                    </li>
                  );
                })}
              </ul>
            </DetailSection>
          ) : null}

          {recommended.length > 0 ? (
            <DetailSection title="Works best with">
              <ul className="fk:flex fk:flex-col fk:gap-1">
                {recommended.map((skill) => (
                  <li key={skill.name}>
                    <Link
                      className="fk:inline-flex fk:items-center fk:gap-2 fk:text-sm fk:hover:underline"
                      to={aiSectionPath(pathname, `templates/${encodeURIComponent(skill.name)}`)}
                    >
                      <BookText className="fk:size-4 fk:text-muted-foreground" />
                      {skill.displayName}
                    </Link>
                  </li>
                ))}
              </ul>
              <p className="fk:text-sm fk:text-muted-foreground">
                The agent offers to set these skills up too, or to use ones you already have.
              </p>
            </DetailSection>
          ) : null}

          {data.example ? (
            <DetailSection title="Example output">
              <div className="fk:rounded-lg fk:border fk:bg-muted/30 fk:corner-squircle">
                <div className="fk:prose fk:prose-sm fk:dark:prose-invert fk:max-w-none fk:px-4 fk:py-3">
                  <Markdown>{data.example}</Markdown>
                </div>
              </div>
            </DetailSection>
          ) : null}

          <Collapsible className="fk:group">
            <CollapsibleTrigger asChild>
              <Button className="fk:w-fit fk:pl-0!" type="button" variant="link">
                <ChevronRight className="fk:transition-transform fk:group-data-[state=open]:rotate-90" />
                {instructionsLabel}
              </Button>
            </CollapsibleTrigger>
            <CollapsibleContent>
              <div className="fk:rounded-lg fk:border fk:corner-squircle">
                <div className="fk:prose fk:prose-sm fk:dark:prose-invert fk:max-w-none fk:px-4 fk:py-3">
                  <Markdown>{data.instructions}</Markdown>
                </div>
              </div>
            </CollapsibleContent>
          </Collapsible>
        </div>
      </ScrollArea>
    </main>
  );
}
