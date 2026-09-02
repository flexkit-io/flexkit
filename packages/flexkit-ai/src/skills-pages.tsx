import type { FormEvent, JSX } from 'react';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { formatDistance } from 'date-fns';
import { ArrowLeft, Ellipsis, Eye, Info, LoaderCircle, Pencil, PenLine, Plus, Trash2 } from 'lucide-react';
import Markdown, { type Components } from 'react-markdown';
import { Link, useNavigate, useParams } from 'react-router-dom';
import {
  getCoreRowModel,
  useAuth,
  useCanMutate,
  useConfig,
  useReactTable,
  type ColumnDef,
  type ColumnFiltersState,
} from '@flexkit/studio';
import { MAX_SKILL_CONTENT_LENGTH } from '@flexkit/studio/tools';
import {
  Badge,
  Button,
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
  ExternalLink,
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
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
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
import { AutomationsDataTableToolbar } from './data-table-toolbar';
import { MarkdownEditor } from './markdown-editor';
import type { AutomationVisibility, ProjectSpace, Skill, SkillInput, SkillsList } from './types';

const SKILLS_PAGE_SIZE = 25;

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
        className="fk:rounded fk:bg-muted fk:px-1.5 fk:py-0.5 fk:font-mono fk:text-[0.875em] fk:font-medium fk:before:content-none fk:after:content-none"
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
    <div className="fk:rounded-md fk:border fk:border-dashed fk:p-8 fk:text-center fk:text-sm fk:text-muted-foreground">
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

function columnFilterValues(filters: ColumnFiltersState, columnId: string): string[] {
  const filter = filters.find((entry) => entry.id === columnId);
  const value = filter?.value;

  if (!Array.isArray(value)) {
    return [];
  }

  return value.filter((entry): entry is string => typeof entry === 'string');
}

function mapVisibilityFilter(values: string[]): AutomationVisibility[] | undefined {
  if (values.length === 0) {
    return undefined;
  }

  const visibility = values.filter(
    (value): value is AutomationVisibility => value === 'project' || value === 'space' || value === 'personal'
  );

  if (visibility.length === 0) {
    return undefined;
  }

  return visibility;
}

function SkillsTableSkeleton(): JSX.Element {
  return (
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead>Skill</TableHead>
          <TableHead>Description</TableHead>
          <TableHead>Visibility</TableHead>
          <TableHead>Updated</TableHead>
          <TableHead />
        </TableRow>
      </TableHeader>
      <TableBody>
        {Array.from({ length: 5 }, (_, index) => (
          <TableRow key={index}>
            <TableCell>
              <Skeleton className="fk:h-4 fk:w-36" />
            </TableCell>
            <TableCell>
              <Skeleton className="fk:h-4 fk:w-64" />
            </TableCell>
            <TableCell>
              <Skeleton className="fk:h-4.75 fk:w-16" />
            </TableCell>
            <TableCell>
              <Skeleton className="fk:h-4 fk:w-24" />
            </TableCell>
            <TableCell className="fk:text-right">
              <Skeleton className="fk:ml-auto fk:size-8" />
            </TableCell>
          </TableRow>
        ))}
      </TableBody>
    </Table>
  );
}

export function SkillsPage(): JSX.Element {
  const { api, projectId } = useProjectApi();
  const navigate = useNavigate();
  const [columnFilters, setColumnFilters] = useState<ColumnFiltersState>([]);
  const [search, setSearch] = useState('');
  const [message, setMessage] = useState('');
  const canMutate = useCanMutate();
  const visibilityFilter = mapVisibilityFilter(columnFilterValues(columnFilters, 'visibility'));
  const hasActiveFilters = columnFilters.length > 0 || search.trim().length > 0;

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
      visibility: visibilityFilter,
    });
  };
  const { data: skillPages, isLoading, mutate, setSize, size } = useSWRInfinite<SkillsList>(getSkillsKey, fetcher);
  const { data: spacesData } = useSWR<{ spaces: ProjectSpace[] }>(projectId ? paths(projectId).spaces : null, fetcher);
  const spaceLabelById = useMemo(
    () => new Map((spacesData?.spaces ?? []).map((space) => [space.id, space.label])),
    [spacesData?.spaces]
  );
  const skills = skillPages?.flatMap((page) => page.skills) ?? [];
  const lastPage = skillPages?.[skillPages.length - 1];
  const hasMore = lastPage?.hasMore ?? false;
  const isLoadingMore = skillPages !== undefined && size > skillPages.length;
  const skillsCount = skillPages?.[0]?.count;
  const isInitialLoading = isLoading && skills.length === 0;

  const filterColumns = useMemo<ColumnDef<Skill>[]>(() => [{ id: 'visibility', accessorKey: 'visibility' }], []);
  const table = useReactTable({
    columns: filterColumns,
    data: skills,
    getCoreRowModel: getCoreRowModel(),
    manualFiltering: true,
    onColumnFiltersChange: (updater) => {
      void setSize(1);
      setColumnFilters(updater);
    },
    state: { columnFilters },
  });

  const searchRef = useRef(search);
  searchRef.current = search;

  const handleSearchChange = useCallback(
    (nextSearch: string) => {
      if (nextSearch === searchRef.current) {
        return;
      }

      void setSize(1);
      setSearch(nextSearch);
    },
    [setSize]
  );

  if (!projectId || !api) {
    return <PageMessage>Select a project to view skills.</PageMessage>;
  }

  async function handleDelete(skill: Skill): Promise<void> {
    setMessage('');

    if (!api) {
      return;
    }

    const result = await api.deleteSkill(skill.id);

    if (!result.success) {
      setMessage(Array.isArray(result.errorMessage) ? result.errorMessage.join(', ') : result.errorMessage);

      return;
    }

    await mutate();
  }

  function handleLoadMore(): void {
    void setSize((currentSize) => currentSize + 1);
  }

  let content: JSX.Element;

  if (isInitialLoading) {
    content = <SkillsTableSkeleton />;
  } else if (skills.length === 0) {
    content = <PageMessage>{hasActiveFilters ? 'No results.' : 'No skills yet.'}</PageMessage>;
  } else {
    content = (
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Skill</TableHead>
            <TableHead>Description</TableHead>
            <TableHead>Visibility</TableHead>
            <TableHead>Updated</TableHead>
            <TableHead />
          </TableRow>
        </TableHeader>
        <TableBody>
          {skills.map((skill) => (
            <TableRow className="fk:cursor-pointer" key={skill.id} onClick={() => navigate(skill.id)}>
              <TableCell>
                <span className="fk:font-medium">{skill.name}</span>
              </TableCell>
              <TableCell className="fk:max-w-md fk:truncate fk:text-muted-foreground">{skill.description}</TableCell>
              <TableCell>
                <Badge
                  className="fk:h-4.75 fk:text-[0.6875rem] fk:leading-4.5 fk:tracking-wide"
                  variant={skill.visibility === 'personal' ? 'secondary' : 'outline'}
                >
                  {getSkillVisibilityLabel(skill, spaceLabelById)}
                </Badge>
              </TableCell>
              <TableCell className="fk:text-muted-foreground">
                {formatDistance(new Date(skill.updatedAt), new Date(), { addSuffix: true })}
              </TableCell>
              <TableCell className="fk:text-right">
                {skill.source !== 'code' ? (
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button
                        aria-label={`Actions for ${skill.name}`}
                        size="icon"
                        type="button"
                        variant="ghost"
                        onClick={(event) => {
                          event.stopPropagation();
                        }}
                      >
                        <Ellipsis className="fk:size-4" />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end" className="fk:w-40">
                      <DropdownMenuItem
                        onClick={(event) => {
                          event.stopPropagation();
                          navigate(skill.id);
                        }}
                      >
                        <Pencil />
                        Edit
                      </DropdownMenuItem>
                      <DropdownMenuSeparator />
                      <DropdownMenuItem
                        disabled={!canMutate}
                        variant="destructive"
                        onClick={(event) => {
                          event.stopPropagation();
                          void handleDelete(skill);
                        }}
                      >
                        <Trash2 />
                        Delete
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                ) : (
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <Button
                        aria-label={`About ${skill.name}`}
                        size="icon"
                        type="button"
                        variant="ghost"
                        onClick={(event) => {
                          event.stopPropagation();
                        }}
                      >
                        <Info className="fk:size-4 fk:text-muted-foreground" />
                      </Button>
                    </TooltipTrigger>
                    <TooltipContent>This skill can only be modified via code.</TooltipContent>
                  </Tooltip>
                )}
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    );
  }

  return (
    <div className="fk:flex fk:h-full fk:min-h-0 fk:min-w-0 fk:flex-col fk:gap-4">
      <div className="fk:flex fk:shrink-0 fk:items-start fk:gap-2">
        <Tooltip>
          <TooltipTrigger asChild>
            <SidebarTrigger className="fk:-ml-1 fk:h-4 fk:w-4" />
          </TooltipTrigger>
          <TooltipContent>Toggle Sidebar</TooltipContent>
        </Tooltip>
        <Separator orientation="vertical" className="fk:mt-1 fk:h-4" />
        <div className="fk:min-w-0 fk:flex-1">
          <div className="fk:flex fk:items-center fk:gap-2">
            <h1 className="fk:text-lg fk:font-semibold fk:leading-none fk:tracking-tight">Skills</h1>
            {!isInitialLoading && skillsCount !== undefined ? (
              <span className="fk:ml-auto fk:text-sm fk:font-normal fk:text-muted-foreground">
                {skillsCount.toLocaleString()} {skillsCount === 1 ? 'skill' : 'skills'}
              </span>
            ) : null}
          </div>
          <p className="fk:mt-1 fk:text-sm fk:text-muted-foreground">
            Reusable Markdown instructions that agents load when relevant, or always when attached to an automation.
            <ExternalLink href="https://flexkit.io/docs/automations/skills">Learn more</ExternalLink>
          </p>
        </div>
      </div>

      {message ? <div className="fk:text-sm fk:text-destructive">{message}</div> : null}

      <AutomationsDataTableToolbar
        actions={
          canMutate ? (
            <Button asChild className="fk:h-8" size="sm">
              <Link to="new">
                <Plus className="fk:mr-2 fk:size-4" />
                New Skill
              </Link>
            </Button>
          ) : (
            <PermissionTooltip disabled>
              <Button className="fk:h-8" disabled size="sm">
                <Plus className="fk:mr-2 fk:size-4" />
                New Skill
              </Button>
            </PermissionTooltip>
          )
        }
        isSearchLoading={isLoading && search.trim().length > 0}
        search={search}
        searchPlaceholder="Search skills..."
        table={table}
        onSearchChange={handleSearchChange}
      />

      <ScrollArea className="fk:h-0 fk:min-h-0 fk:flex-1">
        <div className="fk:pb-6 fk:pr-4">
          {content}
          {hasMore && !isLoadingMore ? <InfiniteScrollSentinel onVisible={handleLoadMore} /> : null}
          {isLoadingMore ? (
            <div className="fk:flex fk:items-center fk:justify-center fk:gap-2 fk:py-4 fk:text-sm fk:text-muted-foreground">
              <LoaderCircle className="fk:size-4 fk:animate-spin" />
              <span>Loading more skills...</span>
            </div>
          ) : null}
        </div>
      </ScrollArea>
    </div>
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
            className="fk:rounded-sm fk:text-muted-foreground hover:fk:text-foreground"
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

function SkillPageHeader({ actions, title }: { actions?: JSX.Element; title: string }): JSX.Element {
  return (
    <>
      <div className="fk:flex fk:shrink-0 fk:items-center fk:gap-2">
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
              className="fk:rounded-sm fk:text-muted-foreground hover:fk:text-foreground"
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
        className={`fk:flex fk:min-h-0 fk:min-w-0 fk:flex-1 fk:flex-col fk:ml-0.75 fk:overflow-hidden fk:rounded-md fk:border ${showContentError ? 'fk:border-destructive' : ''}`}
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
            placeholder={'# Product description guidelines\n\n## Tone\n\n- ...\n\n## Structure\n\n1. ...'}
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
  const [message, setMessage] = useState('');
  const [touched, setTouched] = useState({ content: false, description: false, name: false });
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
    if (!canMutate) {
      return;
    }

    if (!isValid) {
      setTouched({ content: true, description: true, name: true });

      return;
    }

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
      setIsSaving(false);
    }
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>): Promise<void> {
    event.preventDefault();
    await save();
  }

  return (
    <div className="fk:flex fk:h-full fk:min-h-0 fk:min-w-0 fk:flex-col fk:overflow-hidden fk:gap-3 fk:pb-3">
      <SkillPageHeader
        actions={
          <div className="fk:flex fk:items-center fk:gap-3">
            {!isValid ? (
              <span className="fk:text-xs fk:text-muted-foreground">Complete the required fields to save</span>
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
        <div className="fk:shrink-0 fk:rounded-md fk:border fk:border-destructive/30 fk:bg-destructive/5 fk:p-3 fk:text-sm fk:text-destructive">
          {message}
        </div>
      ) : null}
      <form
        className="fk:flex fk:min-h-0 fk:min-w-0 fk:flex-1 fk:flex-col fk:gap-6"
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
  skill,
  spaceLabelById,
}: {
  skill: Skill;
  spaceLabelById: Map<string, string>;
}): JSX.Element {
  return (
    <div className="fk:flex fk:h-full fk:min-h-0 fk:min-w-0 fk:flex-col fk:overflow-hidden fk:gap-3 fk:pb-3">
      <SkillPageHeader
        actions={
          <div className="fk:flex fk:items-center fk:gap-2">
            <Badge variant="secondary">Code</Badge>
          </div>
        }
        title={skill.name}
      />
      <div className="fk:shrink-0 fk:rounded-md fk:border fk:bg-muted/30 fk:px-3 fk:py-2">
        <p className="fk:text-sm fk:font-medium">Version-controlled skill</p>
        <p className="fk:text-sm fk:text-muted-foreground">
          Edit this skill in your repository and re-sync it from the Custom Tools settings.
        </p>
      </div>
      <div className="fk:grid fk:min-w-0 fk:shrink-0 fk:gap-3 fk:lg:grid-cols-[minmax(0,1fr)_minmax(0,1.6fr)_auto]">
        <div>
          <Label className="fk:mb-1">Name</Label>
          <p className="fk:truncate fk:text-sm">{skill.name}</p>
        </div>
        <div>
          <Label className="fk:mb-1">Description</Label>
          <p className="fk:line-clamp-2 fk:text-sm fk:text-muted-foreground">{skill.description}</p>
        </div>
        <div>
          <Label className="fk:mb-1">Visibility</Label>
          <Badge variant="outline">{getSkillVisibilityLabel(skill, spaceLabelById)}</Badge>
        </div>
      </div>
      <SkillContentPane content={skill.content} readOnly />
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
    return <PageMessage>Loading skill...</PageMessage>;
  }

  const spaceLabelById = new Map((spacesData?.spaces ?? []).map((space) => [space.id, space.label]));

  if (data.skill.source === 'code') {
    return <ReadOnlyCodeSkill skill={data.skill} spaceLabelById={spaceLabelById} />;
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
