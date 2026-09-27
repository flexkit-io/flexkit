import type { FormEvent, JSX } from 'react';
import { useEffect, useMemo, useRef, useState } from 'react';
import { ArrowLeft, Eye, GraduationCapIcon, Info, LoaderCircle, PenLine, Plus, Trash2 } from 'lucide-react';
import Markdown, { type Components } from 'react-markdown';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { useAuth, useCanMutate, useConfig } from '@flexkit/studio';
import { MAX_SKILL_CONTENT_LENGTH } from '@flexkit/studio/tools';
import {
  Alert,
  AlertDescription,
  Badge,
  Button,
  Input,
  Label,
  PermissionTooltip,
  ScrollArea,
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
  Separator,
  SidebarTrigger,
  Skeleton,
  Tabs,
  TabsList,
  TabsTrigger,
  toast,
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from '@flexkit/studio/ui';
import useSWR from 'swr';
import useSWRInfinite from 'swr/infinite';
import { createApiClient, fetcher, paths, type ApiClient } from './api';
import { MarkdownEditor } from './markdown-editor';
import { CatalogHeader } from './plugin-pages';
import type { AutomationVisibility, ProjectSpace, Skill, SkillInput, SkillsList } from './types';

const SKILLS_PAGE_SIZE = 25;

const SKILL_SKELETON_ROWS: { descriptionWidth: string; id: string; nameWidth: string }[] = [
  { descriptionWidth: 'fk:w-44', id: 'skill-a', nameWidth: 'fk:w-28' },
  { descriptionWidth: 'fk:w-52', id: 'skill-b', nameWidth: 'fk:w-20' },
  { descriptionWidth: 'fk:w-40', id: 'skill-c', nameWidth: 'fk:w-36' },
  { descriptionWidth: 'fk:w-48', id: 'skill-d', nameWidth: 'fk:w-24' },
  { descriptionWidth: 'fk:w-36', id: 'skill-e', nameWidth: 'fk:w-32' },
  { descriptionWidth: 'fk:w-56', id: 'skill-f', nameWidth: 'fk:w-16' },
];

function SkillListSkeleton(): JSX.Element {
  return (
    <div aria-busy="true" className="fk:grid fk:grid-cols-1 fk:gap-x-16 fk:gap-y-1 fk:lg:grid-cols-2">
      <span className="fk:sr-only">Loading skills</span>
      {SKILL_SKELETON_ROWS.map((row) => (
        <div className="fk:-mx-3 fk:flex fk:min-w-0 fk:items-center fk:gap-3 fk:px-3 fk:py-2" key={row.id}>
          <Skeleton className="fk:size-10 fk:shrink-0 fk:rounded-lg" />
          <span className="fk:flex fk:min-w-0 fk:flex-1 fk:flex-col fk:gap-1.5">
            <Skeleton className={`fk:h-4 ${row.nameWidth}`} />
            <Skeleton className={`fk:h-4 ${row.descriptionWidth}`} />
          </span>
        </div>
      ))}
    </div>
  );
}

const skillMarkdownComponents: Components = {
  code({ children, className, node: _node, ...props }) {
    const isFenced = typeof className === 'string' && className.split(' ').some((part) => part.startsWith('language-'));

    if (isFenced) {
      return (
        <code className={className} {...props}>
          {children}
        </code>
      );
    }

    return (
      <code
        className="fk:rounded fk:bg-muted fk:px-1.5 fk:py-0.5 fk:font-mono fk:text-[0.875em] fk:font-medium fk:before:content-none fk:after:content-none fk:corner-squircle"
        {...props}
      >
        {children}
      </code>
    );
  },
};

function useProjectApi(): { api: ApiClient | null; projectId: string | undefined } {
  const { currentProjectId } = useConfig();
  const api = useMemo(() => (currentProjectId ? createApiClient(currentProjectId) : null), [currentProjectId]);

  return { api, projectId: currentProjectId };
}

function PageMessage({ children }: { children: string }): JSX.Element {
  return (
    <div className="fk:rounded-md fk:border fk:border-dashed fk:p-8 fk:text-center fk:text-sm fk:text-muted-foreground fk:corner-squircle">
      {children}
    </div>
  );
}

function InfiniteScrollSentinel({ onVisible }: { onVisible: () => void }): JSX.Element {
  const sentinelRef = useRef<HTMLDivElement>(null);
  const onVisibleRef = useRef(onVisible);

  onVisibleRef.current = onVisible;

  useEffect(() => {
    const node = sentinelRef.current;

    if (!node) {
      return;
    }

    const observer = new IntersectionObserver((entries) => {
      if (entries.some((entry) => entry.isIntersecting)) {
        onVisibleRef.current();
      }
    });

    observer.observe(node);

    return () => {
      observer.disconnect();
    };
  }, []);

  return <div aria-hidden className="fk:h-px" ref={sentinelRef} />;
}

function getSkillVisibilityLabel(skill: Skill, spaceLabelById: Map<string, string>): string {
  if (skill.visibility === 'space') {
    return (skill.spaceId ? spaceLabelById.get(skill.spaceId) : undefined) ?? 'Space';
  }

  if (skill.visibility === 'personal') {
    return 'Personal';
  }

  return 'Project';
}

function SkillLogo({ skill }: { skill: Skill }): JSX.Element {
  if (skill.logoUrl) {
    return <img alt="" className="fk:size-10 fk:shrink-0 fk:rounded-lg fk:corner-squircle" src={skill.logoUrl} />;
  }

  return (
    <span className="fk:flex fk:size-10 fk:shrink-0 fk:items-center fk:justify-center fk:rounded-lg fk:bg-muted fk:text-muted-foreground fk:corner-squircle">
      <GraduationCapIcon className="fk:size-5" />
    </span>
  );
}

export function SkillsPage(): JSX.Element {
  const { api, projectId } = useProjectApi();
  const navigate = useNavigate();
  const [search, setSearch] = useState('');
  const canMutate = useCanMutate();
  const hasActiveFilters = search.trim().length > 0;

  const getSkillsKey = (pageIndex: number, previousPage: SkillsList | null): string | null => {
    if (!projectId) {
      return null;
    }

    if (previousPage && !previousPage.hasMore) {
      return null;
    }

    return paths(projectId).skills({
      limit: SKILLS_PAGE_SIZE,
      offset: pageIndex * SKILLS_PAGE_SIZE,
      search: search.trim() || undefined,
    });
  };
  const { data: skillPages, isLoading, setSize, size } = useSWRInfinite<SkillsList>(getSkillsKey, fetcher);
  const skills = skillPages?.flatMap((page) => page.skills) ?? [];
  const lastPage = skillPages?.[skillPages.length - 1];
  const hasMore = lastPage?.hasMore ?? false;
  const isLoadingMore = skillPages !== undefined && size > skillPages.length;
  const isInitialLoading = isLoading && skills.length === 0;

  if (!projectId || !api) {
    return <PageMessage>Select a project to view skills.</PageMessage>;
  }

  function handleLoadMore(): void {
    void setSize((currentSize) => currentSize + 1);
  }

  let emptyMessage = 'No skills yet.';

  if (hasActiveFilters) {
    emptyMessage = 'No skills match your search.';
  }

  let content: JSX.Element = (
    <div className="fk:grid fk:grid-cols-1 fk:gap-x-16 fk:gap-y-1 fk:lg:grid-cols-2">
      {skills.map((skill) => (
        <button
          key={skill.id}
          type="button"
          onClick={() => navigate(skill.id)}
          className="fk:-mx-3 fk:flex fk:min-w-0 fk:items-center fk:gap-3 fk:rounded-lg fk:px-3 fk:py-2 fk:text-left fk:transition-colors fk:hover:bg-accent fk:focus-visible:bg-accent fk:focus-visible:outline-none fk:corner-squircle"
        >
          <SkillLogo skill={skill} />
          <span className="fk:min-w-0 fk:flex-1">
            <span className="fk:block fk:truncate fk:text-sm fk:font-medium">{skill.name}</span>
            <span className="fk:block fk:truncate fk:text-sm fk:text-muted-foreground">{skill.description}</span>
          </span>
        </button>
      ))}
    </div>
  );

  if (isInitialLoading) {
    content = <SkillListSkeleton />;
  } else if (skills.length === 0) {
    content = (
      <Alert>
        <AlertDescription>{emptyMessage}</AlertDescription>
      </Alert>
    );
  }

  return (
    <main className="fk:flex fk:min-h-0 fk:flex-1 fk:flex-col">
      <CatalogHeader />
      <div className="fk:min-h-0 fk:flex-1 fk:overflow-auto">
        <div className="fk:mx-auto fk:flex fk:w-full fk:max-w-4xl fk:flex-col fk:gap-8 fk:py-6 fk:pl-4 fk:pr-6">
          <div>
            <h2 className="fk:text-2xl fk:font-semibold">Skills for your agents</h2>
            <p className="fk:mt-2 fk:text-muted-foreground">
              Reusable Markdown instructions that agents load when relevant, or always when attached to an automation.
            </p>
          </div>
          <div className="fk:flex fk:flex-wrap fk:items-center fk:gap-3">
            <Input
              aria-label="Search skills"
              className="fk:w-full fk:max-w-xs"
              placeholder="Search skills…"
              value={search}
              onChange={(event) => {
                void setSize(1);
                setSearch(event.target.value);
              }}
            />
            {canMutate ? (
              <Button asChild className="fk:ml-auto" size="sm">
                <Link to="new">
                  <Plus />
                  New Skill
                </Link>
              </Button>
            ) : (
              <PermissionTooltip disabled>
                <Button className="fk:ml-auto" disabled size="sm">
                  <Plus />
                  New Skill
                </Button>
              </PermissionTooltip>
            )}
          </div>
          {content}
          {hasMore && !isLoadingMore ? <InfiniteScrollSentinel onVisible={handleLoadMore} /> : null}
          {isLoadingMore ? (
            <div className="fk:flex fk:items-center fk:justify-center fk:gap-2 fk:py-4 fk:text-sm fk:text-muted-foreground">
              <LoaderCircle className="fk:size-4 fk:animate-spin" />
              <span>Loading more skills...</span>
            </div>
          ) : null}
        </div>
      </div>
    </main>
  );
}

function FieldError({ className, id, message }: { className?: string; id?: string; message: string }): JSX.Element {
  return (
    <p className={`fk:text-sm fk:text-destructive ${className ?? ''}`} id={id}>
      {message}
    </p>
  );
}

function FieldHintLabel({
  children,
  hint,
  htmlFor,
  id,
}: {
  children: string;
  hint: string;
  htmlFor?: string;
  id?: string;
}): JSX.Element {
  return (
    <div className="fk:mb-1.5 fk:pl-2.5 fk:flex fk:items-center fk:gap-1">
      <Label htmlFor={htmlFor} id={id}>
        {children}
      </Label>
      <Tooltip>
        <TooltipTrigger asChild>
          <button
            aria-label={`About ${children.toLowerCase()}`}
            className="fk:rounded-sm fk:text-muted-foreground hover:fk:text-foreground fk:corner-squircle"
            type="button"
          >
            <Info className="fk:size-3.5" />
          </button>
        </TooltipTrigger>
        <TooltipContent className="fk:max-w-xs">{hint}</TooltipContent>
      </Tooltip>
    </div>
  );
}

function SkillPageHeader({ actions, title }: { actions?: JSX.Element; title: string | JSX.Element }): JSX.Element {
  return (
    <>
      <div className="fk:flex fk:shrink-0 fk:items-center fk:gap-2 fk:pr-4">
        <Tooltip>
          <TooltipTrigger asChild>
            <SidebarTrigger className="fk:-ml-1 fk:h-4 fk:w-4" />
          </TooltipTrigger>
          <TooltipContent>Toggle Sidebar</TooltipContent>
        </Tooltip>
        <Separator orientation="vertical" className="fk:h-4" />
        <h1 className="fk:min-w-0 fk:flex-1 fk:truncate fk:text-lg fk:font-semibold fk:leading-none fk:tracking-tight">
          {title}
        </h1>
        {actions}
      </div>
      <Button asChild className="fk:shrink-0 fk:w-fit" size="sm" variant="ghost">
        <Link relative="path" to="..">
          <ArrowLeft className="fk:mr-2 fk:size-4" />
          Skills
        </Link>
      </Button>
    </>
  );
}

function SkillDetailSkeleton(): JSX.Element {
  return (
    <div aria-busy="true" className="fk:flex fk:h-full fk:min-h-0 fk:min-w-0 fk:flex-col fk:gap-3 fk:overflow-hidden fk:pb-3">
      <span className="fk:sr-only">Loading skill</span>
      <SkillPageHeader actions={<Skeleton className="fk:h-8 fk:w-24" />} title={<Skeleton className="fk:h-5 fk:w-40" />} />
      <div className="fk:m-auto fk:flex fk:min-h-0 fk:w-full fk:max-w-6xl fk:flex-1 fk:flex-col fk:gap-8 fk:px-6">
        <div className="fk:grid fk:shrink-0 fk:gap-3 fk:lg:grid-cols-[minmax(0,1fr)_minmax(0,1.6fr)_auto]">
          {['name', 'description'].map((field) => (
            <div className="fk:flex fk:flex-col fk:gap-2" key={field}>
              <Skeleton className="fk:h-4 fk:w-20" />
              <Skeleton className="fk:h-9 fk:w-full" />
            </div>
          ))}
          <div className="fk:flex fk:flex-col fk:gap-2">
            <Skeleton className="fk:h-4 fk:w-20" />
            <Skeleton className="fk:h-9 fk:w-32" />
          </div>
        </div>
        <div className="fk:flex fk:min-h-0 fk:flex-1 fk:flex-col fk:gap-1.5">
          <Skeleton className="fk:h-4 fk:w-16" />
          <Skeleton className="fk:min-h-48 fk:flex-1 fk:rounded-md" />
        </div>
      </div>
    </div>
  );
}

function SkillContentPane({
  content,
  onBlur,
  onChange,
  onSave,
  readOnly = false,
  showContentError,
  validationMessage,
}: {
  content: string;
  onBlur?: () => void;
  onChange?: (_value: string) => void;
  onSave?: () => void;
  readOnly?: boolean;
  showContentError?: boolean;
  validationMessage?: string;
}): JSX.Element {
  const [viewMode, setViewMode] = useState<'preview' | 'write'>('write');
  const isOverLimit = content.length > MAX_SKILL_CONTENT_LENGTH;
  let preview: JSX.Element;

  if (content.trim()) {
    preview = <Markdown components={skillMarkdownComponents}>{content}</Markdown>;
  } else {
    preview = <p className="fk:text-muted-foreground">Nothing to preview.</p>;
  }

  return (
    <div className="fk:flex fk:min-h-0 fk:min-w-0 fk:flex-1 fk:flex-col fk:gap-1.5">
      <div className="fk:pl-3.25 fk:flex fk:shrink-0 fk:items-center fk:gap-1">
        <Label htmlFor="skill-content" id="skill-content-label">
          Content
        </Label>
        <Tooltip>
          <TooltipTrigger asChild>
            <button
              aria-label="About skill content"
              className="fk:rounded-sm fk:text-muted-foreground hover:fk:text-foreground fk:corner-squircle"
              type="button"
            >
              <Info className="fk:size-3.5" />
            </button>
          </TooltipTrigger>
          <TooltipContent className="fk:max-w-sm">
            The skill itself, in Markdown. Write it like instructions for a capable colleague: procedures, rules,
            examples, and edge cases. Attached skills are always loaded; other visible skills are loaded on demand.
          </TooltipContent>
        </Tooltip>
      </div>
      <div
        className={`fk:flex fk:min-h-0 fk:min-w-0 fk:flex-1 fk:flex-col fk:ml-0.75 fk:overflow-hidden fk:rounded-md fk:border ${showContentError ? 'fk:border-destructive' : ''} fk:corner-squircle`}
      >
        <div className="fk:flex fk:shrink-0 fk:items-center fk:justify-between fk:gap-2 fk:border-b fk:px-2.5 fk:py-1">
          <Tabs
            value={viewMode}
            onValueChange={(value) => {
              setViewMode(value === 'preview' ? 'preview' : 'write');
            }}
          >
            <TabsList>
              <Tooltip>
                <TooltipTrigger asChild>
                  <span className="fk:inline-flex">
                    <TabsTrigger aria-label="Write" className="fk:px-2.5" value="write">
                      <PenLine className="fk:size-3.5" />
                    </TabsTrigger>
                  </span>
                </TooltipTrigger>
                <TooltipContent>Write</TooltipContent>
              </Tooltip>
              <Tooltip>
                <TooltipTrigger asChild>
                  <span className="fk:inline-flex">
                    <TabsTrigger aria-label="Preview" className="fk:px-2.5" value="preview">
                      <Eye className="fk:size-3.5" />
                    </TabsTrigger>
                  </span>
                </TooltipTrigger>
                <TooltipContent>Preview</TooltipContent>
              </Tooltip>
            </TabsList>
          </Tabs>
          <span className={isOverLimit ? 'fk:text-xs fk:text-destructive' : 'fk:text-xs fk:text-muted-foreground'}>
            {content.length.toLocaleString()} / {MAX_SKILL_CONTENT_LENGTH.toLocaleString()}
          </span>
        </div>
        <div className="fk:min-h-0 fk:min-w-0 fk:flex-1 fk:overflow-hidden" hidden={viewMode !== 'write'}>
          <MarkdownEditor
            ariaDescribedBy={showContentError ? 'skill-content-error' : undefined}
            ariaInvalid={showContentError}
            ariaLabelledBy="skill-content-label"
            className="fk:h-full fk:min-h-0 fk:min-w-0 fk:w-full fk:overflow-hidden"
            readOnly={readOnly}
            value={content}
            onBlur={onBlur}
            onChange={onChange}
            onSave={onSave}
          />
        </div>
        {viewMode === 'preview' ? (
          <ScrollArea className="fk:min-h-0 fk:flex-1">
            <div className="fk:prose fk:prose-sm fk:dark:prose-invert fk:max-w-none fk:px-4 fk:py-3">{preview}</div>
          </ScrollArea>
        ) : null}
        {showContentError && validationMessage ? (
          <FieldError className="fk:border-t fk:px-3 fk:py-2" id="skill-content-error" message={validationMessage} />
        ) : null}
      </div>
    </div>
  );
}

interface SkillFormProps {
  api: ApiClient;
  mode: 'create' | 'edit';
  onSaved: (_skill?: Skill) => void;
  projectId: string;
  skill?: Skill;
}

export function SkillForm({ api, mode, onSaved, projectId, skill }: SkillFormProps): JSX.Element {
  const [name, setName] = useState(skill?.name ?? '');
  const [description, setDescription] = useState(skill?.description ?? '');
  const [content, setContent] = useState(skill?.content ?? '');
  const [visibility, setVisibility] = useState<AutomationVisibility>(skill?.visibility ?? 'project');
  const [spaceId, setSpaceId] = useState<string | null>(skill?.spaceId ?? null);
  const [isSaving, setIsSaving] = useState(false);
  const isSavingRef = useRef(false);
  const [message, setMessage] = useState('');
  const [touched, setTouched] = useState({ content: false, description: false, name: false });
  const navigate = useNavigate();
  const { data: spacesData } = useSWR<{ spaces: ProjectSpace[] }>(paths(projectId).spaces, fetcher);
  const [, auth] = useAuth();
  const canMutate = useCanMutate();
  const userSpaceCodes = auth.user?.spaces ?? [];
  // Only spaces the caller belongs to are offered; the server rejects
  // bindings to spaces outside the caller's membership anyway.
  const selectableSpaces = (spacesData?.spaces ?? []).filter((space) => userSpaceCodes.includes(space.code));
  let contentError = '';

  if (!content.trim()) {
    contentError = 'Content is required';
  } else if (content.length > MAX_SKILL_CONTENT_LENGTH) {
    contentError = `Content must be at most ${String(MAX_SKILL_CONTENT_LENGTH)} characters`;
  }

  const validation = {
    content: contentError,
    description: description.trim() ? '' : 'Description is required',
    name: name.trim() ? '' : 'Name is required',
    space: visibility === 'space' && !spaceId ? 'Select a space' : '',
  };
  const isValid = !validation.content && !validation.description && !validation.name && !validation.space;
  const showNameError = touched.name && Boolean(validation.name);
  const showDescriptionError = touched.description && Boolean(validation.description);
  const showContentError = touched.content && Boolean(validation.content);
  const title = mode === 'create' ? 'New Skill' : (skill?.name ?? 'Skill');
  let saveLabel = 'Update skill';

  if (isSaving) {
    saveLabel = 'Saving...';
  } else if (mode === 'create') {
    saveLabel = 'Create skill';
  }

  async function save(): Promise<void> {
    if (!canMutate || isSavingRef.current) {
      return;
    }

    if (!isValid) {
      setTouched({ content: true, description: true, name: true });

      return;
    }

    isSavingRef.current = true;
    setIsSaving(true);
    setMessage('');

    const input: SkillInput = {
      content,
      description,
      name,
      spaceId: visibility === 'space' ? spaceId : null,
      visibility,
    };

    try {
      const result =
        mode === 'create' || !skill ? await api.createSkill(input) : await api.updateSkill(skill.id, input);

      if (!result.success) {
        setMessage(Array.isArray(result.errorMessage) ? result.errorMessage.join(', ') : result.errorMessage);

        return;
      }

      toast.success(mode === 'create' || !skill ? 'Skill created.' : 'Skill saved.');
      onSaved(result.skill);
    } catch (error) {
      setMessage(error instanceof Error ? error.message : 'Failed to save skill.');
    } finally {
      isSavingRef.current = false;
      setIsSaving(false);
    }
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>): Promise<void> {
    event.preventDefault();
    await save();
  }

  async function deleteSkill(): Promise<void> {
    if (!skill || !canMutate || isSavingRef.current) {
      return;
    }

    isSavingRef.current = true;
    setIsSaving(true);
    setMessage('');
    const result = await api.deleteSkill(skill.id);
    isSavingRef.current = false;
    setIsSaving(false);

    if (!result.success) {
      setMessage(Array.isArray(result.errorMessage) ? result.errorMessage.join(', ') : result.errorMessage);

      return;
    }

    navigate('..', { relative: 'path' });
  }

  return (
    <div className="fk:flex fk:h-full fk:min-h-0 fk:min-w-0 fk:flex-col fk:gap-3 fk:pb-3">
      <SkillPageHeader
        actions={
          <div className="fk:flex fk:items-center fk:gap-3">
            {!isValid ? (
              <span className="fk:text-xs fk:text-muted-foreground">Complete the required fields to save</span>
            ) : null}
            {mode === 'edit' && skill ? (
              <Button disabled={isSaving || !canMutate} size="sm" type="button" variant="outline" onClick={() => void deleteSkill()}>
                <Trash2 />
                Delete
              </Button>
            ) : null}
            <PermissionTooltip disabled={!canMutate}>
              <Button disabled={isSaving || !isValid || !canMutate} form="skill-editor-form" size="sm" type="submit">
                {saveLabel}
              </Button>
            </PermissionTooltip>
          </div>
        }
        title={title}
      />
      {message ? (
        <div className="fk:shrink-0 fk:rounded-md fk:border fk:border-destructive/30 fk:bg-destructive/5 fk:p-3 fk:text-sm fk:text-destructive fk:corner-squircle">
          {message}
        </div>
      ) : null}
      <form
        className="fk:flex fk:min-h-0 fk:min-w-0 fk:flex-1 fk:flex-col fk:gap-6 fk:w-full fk:max-w-6xl fk:m-auto fk:gap-8 fk:px-4"
        id="skill-editor-form"
        onSubmit={(event) => void handleSubmit(event)}
      >
        <div className="fk:grid fk:min-w-0 fk:shrink-0 fk:gap-3 fk:px-0.75 fk:lg:grid-cols-[minmax(0,1fr)_minmax(0,1.6fr)_auto]">
          <div>
            <FieldHintLabel hint="Identifying label for this skill" htmlFor="skill-name">
              Name
            </FieldHintLabel>
            <Input
              aria-describedby={showNameError ? 'skill-name-error' : undefined}
              aria-invalid={showNameError}
              className={showNameError ? 'fk:border-destructive focus-visible:fk:ring-destructive' : ''}
              id="skill-name"
              value={name}
              onBlur={() => setTouched((current) => ({ ...current, name: true }))}
              onChange={(event) => setName(event.target.value)}
            />
            {showNameError ? <FieldError id="skill-name-error" message={validation.name} /> : null}
          </div>
          <div>
            <FieldHintLabel
              hint="One or two sentences describing when to use this skill. Agents rely on it to decide whether the skill applies to their current task."
              htmlFor="skill-description"
            >
              Description
            </FieldHintLabel>
            <Input
              aria-describedby={showDescriptionError ? 'skill-description-error' : undefined}
              aria-invalid={showDescriptionError}
              className={showDescriptionError ? 'fk:border-destructive focus-visible:fk:ring-destructive' : ''}
              id="skill-description"
              placeholder="e.g. Rules for writing product descriptions in our brand voice"
              value={description}
              onBlur={() => setTouched((current) => ({ ...current, description: true }))}
              onChange={(event) => setDescription(event.target.value)}
            />
            {showDescriptionError ? <FieldError id="skill-description-error" message={validation.description} /> : null}
          </div>
          <div>
            <FieldHintLabel
              hint="Who can see and use this skill. Space skills are only visible to members of the selected space and only usable by automations in that space; personal skills are private to you."
              htmlFor="skill-visibility"
            >
              Visibility
            </FieldHintLabel>
            <div className="fk:flex fk:items-center fk:gap-2">
              <Select
                value={visibility}
                onValueChange={(value) => {
                  setVisibility(value === 'space' || value === 'personal' ? value : 'project');

                  if (value !== 'space') {
                    setSpaceId(null);
                  }
                }}
              >
                <SelectTrigger aria-label="Visibility" className="fk:w-fit fk:min-w-26" id="skill-visibility">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent align="start">
                  <SelectItem value="project">Project</SelectItem>
                  <SelectItem disabled={selectableSpaces.length === 0} value="space">
                    Space
                  </SelectItem>
                  <SelectItem value="personal">Personal</SelectItem>
                </SelectContent>
              </Select>
              {visibility === 'space' ? (
                <Select
                  value={spaceId ?? ''}
                  onValueChange={(value) => {
                    setSpaceId(value || null);
                  }}
                >
                  <SelectTrigger aria-label="Space" className="fk:w-fit fk:min-w-34">
                    <SelectValue placeholder="Select a space" />
                  </SelectTrigger>
                  <SelectContent align="start">
                    {selectableSpaces.map((space) => (
                      <SelectItem key={space.id} value={space.id}>
                        {space.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              ) : null}
            </div>
            {visibility === 'space' && validation.space ? <FieldError message={validation.space} /> : null}
          </div>
        </div>
        <SkillContentPane
          content={content}
          showContentError={showContentError}
          validationMessage={validation.content}
          onBlur={() => setTouched((current) => ({ ...current, content: true }))}
          onChange={setContent}
          onSave={() => {
            void save();
          }}
        />
      </form>
    </div>
  );
}

function ReadOnlyCodeSkill({
  projectId,
  skill,
  spaceLabelById,
}: {
  skill: Skill;
  projectId: string;
  spaceLabelById: Map<string, string>;
}): JSX.Element {
  const canMutate = useCanMutate();
  const navigate = useNavigate();
  const [forking, setForking] = useState(false);
  const [forkError, setForkError] = useState('');

  async function fork(): Promise<void> {
    setForking(true);
    setForkError('');
    let response: Response;

    try {
      response = await fetch(`/api/flexkit/${projectId}/skills/${skill.id}/fork`, { method: 'POST', credentials: 'include' });
    } catch {
      setForkError('Unable to create a copy. Try again.');
      setForking(false);

      return;
    }

    setForking(false);

    if (!response.ok) {
      setForkError('Unable to create a copy. Check your permissions.');

      return;
    }

    navigate('..', { relative: 'path' });
  }

  return (
    <div className="fk:flex fk:h-full fk:min-h-0 fk:min-w-0 fk:flex-col fk:gap-3 fk:pb-3">
      <SkillPageHeader
        actions={
          <div className="fk:flex fk:items-center fk:gap-2">
            <Badge variant="secondary">{skill.source === 'plugin' ? 'Plugin' : 'Code'}</Badge>
            {skill.source === 'plugin' && <Button type="button" disabled={forking || !canMutate} onClick={() => void fork()} size="sm">Edit a copy</Button>}
          </div>
        }
        title={skill.name}
      />
      <div className="fk:flex fk:flex-col fk:h-full fk:px-4 fk:gap-3 fk:max-w-6xl fk:m-auto">
        <div className="fk:shrink-0 fk:rounded-md fk:border fk:bg-muted/30 fk:px-3 fk:py-2 fk:corner-squircle">
          <p className="fk:text-sm fk:font-medium">Version-controlled skill</p>
          <p className="fk:text-sm fk:text-muted-foreground">
            {skill.source === 'plugin' ? 'This skill is managed by its plugin. Edit a copy to create a personal Studio skill.' : 'Edit this skill in your repository and re-sync it from the Custom Tools settings.'}
          </p>
        </div>
        <div className="fk:grid fk:min-w-0 fk:shrink-0 fk:gap-3 fk:lg:grid-cols-[minmax(0,1fr)_minmax(0,1.6fr)_auto]">
          <div>
            <FieldHintLabel hint="Identifying label for this skill" htmlFor="skill-name">
              Name
            </FieldHintLabel>
            <Input
              className="fk:opacity-100!"
              disabled={true}
              id="skill-name"
              value={skill.name}
            />
          </div>
          <div>
            <FieldHintLabel
              hint="One or two sentences describing when to use this skill. Agents rely on it to decide whether the skill applies to their current task."
              htmlFor="skill-description"
            >
              Description
            </FieldHintLabel>
            <Input
              className="fk:opacity-100!"
              disabled={true}
              id="skill-description"
              placeholder="e.g. Rules for writing product descriptions in our brand voice"
              value={skill.description}
            />
          </div>
          <div>
            <FieldHintLabel
              hint="Who can see and use this skill. Space skills are only visible to members of the selected space and only usable by automations in that space; personal skills are private to you."
              htmlFor="skill-visibility"
            >
              Visibility
            </FieldHintLabel>
            <div className="fk:flex fk:items-center fk:gap-2">
              <Select
                disabled={true}
                value={skill.visibility}
              >
                <SelectTrigger aria-label="Visibility" className="fk:w-fit fk:min-w-26 fk:opacity-100!" id="skill-visibility">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent align="start">
                  <SelectItem value="project">Project</SelectItem>
                  <SelectItem disabled={!skill.spaceId} value="space">
                    Space
                  </SelectItem>
                  <SelectItem value="personal">Personal</SelectItem>
                </SelectContent>
              </Select>
              {skill.visibility === 'space' ? (
                <Select
                  disabled={true}
                  value={skill.spaceId ?? ''}
                >
                  <SelectTrigger aria-label="Space" className="fk:w-fit fk:min-w-34 fk:opacity-100!">
                    <SelectValue placeholder="Select a space" />
                  </SelectTrigger>
                  <SelectContent align="start">
                    <SelectItem>
                      {getSkillVisibilityLabel(skill, spaceLabelById)}
                    </SelectItem>
                  </SelectContent>
                </Select>
              ) : null}
            </div>
          </div>
        </div>
        {forkError && <p role="alert">{forkError}</p>}
        <SkillContentPane content={skill.content} readOnly />
      </div>
    </div>
  );
}

export function CreateSkillPage(): JSX.Element {
  const { api, projectId } = useProjectApi();
  const navigate = useNavigate();

  if (!projectId || !api) {
    return <PageMessage>Select a project to create skills.</PageMessage>;
  }

  return (
    <SkillForm api={api} mode="create" projectId={projectId} onSaved={() => navigate('..', { relative: 'path' })} />
  );
}

export function SkillDetailPage(): JSX.Element {
  const { api, projectId } = useProjectApi();
  const { skillId } = useParams<{ skillId: string }>();
  const { data, error, isLoading, mutate } = useSWR<{ skill: Skill }>(
    projectId && skillId ? paths(projectId).skill(skillId) : null,
    fetcher
  );
  const { data: spacesData } = useSWR<{ spaces: ProjectSpace[] }>(projectId ? paths(projectId).spaces : null, fetcher);

  if (!projectId || !api || !skillId) {
    return <PageMessage>Select a skill.</PageMessage>;
  }

  if (error) {
    return <PageMessage>Failed to load skill.</PageMessage>;
  }

  if (isLoading || !data?.skill) {
    return <SkillDetailSkeleton />;
  }

  const spaceLabelById = new Map((spacesData?.spaces ?? []).map((space) => [space.id, space.label]));

  if (data.skill.source !== 'studio') {
    return <ReadOnlyCodeSkill projectId={projectId} skill={data.skill} spaceLabelById={spaceLabelById} />;
  }

  return (
    <SkillForm
      api={api}
      mode="edit"
      projectId={projectId}
      skill={data.skill}
      onSaved={(skill) => {
        if (skill) {
          void mutate({ skill }, { revalidate: false });
        } else {
          void mutate();
        }
      }}
    />
  );
}
