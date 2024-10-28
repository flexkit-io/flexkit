import { Children, Fragment, useCallback, useState, useEffect, useMemo, useRef } from 'react';
import type { ComponentType, MouseEventHandler, PropsWithChildren, ReactNode, ReactElement } from 'react';
import {
  Button as GraphiQLButton,
  ButtonGroup,
  ChevronDownIcon,
  ChevronUpIcon,
  CopyIcon,
  Dialog,
  ExecuteButton,
  GraphiQLProvider,
  HeaderEditor,
  KeyboardShortcutIcon,
  MergeIcon,
  PlusIcon,
  PrettifyIcon,
  QueryEditor,
  ReloadIcon,
  ResponseEditor,
  SettingsIcon,
  Spinner,
  Tabs as GraphiQlTabs,
  Tab as GraphiQlTab,
  ToolbarButton,
  Tooltip as GraphiQLTooltip,
  UnStyledButton,
  useCopyQuery,
  useDragResize,
  useEditorContext,
  useExecutionContext,
  useMergeQuery,
  usePluginContext,
  usePrettifyEditors,
  useSchemaContext,
  useStorageContext,
  useTheme,
  VariableEditor,
  isMacOs,
} from '@graphiql/react';
import type {
  GraphiQLProviderProps,
  Theme,
  UseHeaderEditorArgs,
  UseQueryEditorArgs,
  UseResponseEditorArgs,
  UseVariableEditorArgs,
  WriteableEditorProps,
} from '@graphiql/react';
import { ChevronsLeft, ChevronsRight } from 'lucide-react';
import {
  Button,
  ResizableHandle,
  ResizablePanel,
  ResizablePanelGroup,
  ScrollArea,
  ScrollBar,
  Separator,
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from '@flexkit/studio/ui';
import type { ImperativePanelHandle } from '@flexkit/studio/ui';
import type { TabState } from './types';

export type GraphiQLToolbarConfig = {
  /**
   * This content will be rendered after the built-in buttons of the toolbar.
   * Note that this will not apply if you provide a completely custom toolbar
   * (by passing `GraphiQL.Toolbar` as child to the `GraphiQL` component).
   */
  additionalContent?: React.ReactNode;

  /**
   * same as above, except a component with access to context
   */
  additionalComponent?: React.JSXElementConstructor<unknown>;
};

/**
 * API docs for this live here:
 *
 * https://graphiql-test.netlify.app/typedoc/modules/graphiql.html#graphiqlprops
 */
export type GraphiQLProps = Omit<GraphiQLProviderProps, 'children'> & GraphiQLInterfaceProps;

/**
 * The top-level React component for GraphiQL, intended to encompass the entire
 * browser viewport.
 *
 * @see https://github.com/graphql/graphiql#usage
 */
export function GraphiQL({
  dangerouslyAssumeSchemaIsValid,
  confirmCloseTab,
  defaultQuery,
  defaultTabs,
  externalFragments,
  fetcher,
  getDefaultFieldNames,
  headers,
  inputValueDeprecation,
  introspectionQueryName,
  maxHistoryLength,
  onEditOperationName,
  onSchemaChange,
  onTabChange,
  onTogglePluginVisibility,
  operationName,
  plugins,
  query,
  response,
  schema,
  schemaDescription,
  shouldPersistHeaders,
  storage,
  validationRules,
  variables,
  visiblePlugin,
  defaultHeaders,
  ...props
}: GraphiQLProps): ReactElement {
  // Ensure props are correct
  if (typeof fetcher !== 'function') {
    throw new TypeError('The `GraphiQL` component requires a `fetcher` function to be passed as prop.');
  }

  return (
    <GraphiQLProvider
      getDefaultFieldNames={getDefaultFieldNames}
      dangerouslyAssumeSchemaIsValid={dangerouslyAssumeSchemaIsValid}
      defaultQuery={defaultQuery}
      defaultHeaders={defaultHeaders}
      defaultTabs={defaultTabs}
      externalFragments={externalFragments}
      fetcher={fetcher}
      headers={headers}
      inputValueDeprecation={inputValueDeprecation}
      introspectionQueryName={introspectionQueryName}
      maxHistoryLength={maxHistoryLength}
      onEditOperationName={onEditOperationName}
      onSchemaChange={onSchemaChange}
      onTabChange={onTabChange}
      onTogglePluginVisibility={onTogglePluginVisibility}
      plugins={plugins}
      visiblePlugin={visiblePlugin}
      operationName={operationName}
      query={query}
      response={response}
      schema={schema}
      schemaDescription={schemaDescription}
      shouldPersistHeaders={shouldPersistHeaders}
      storage={storage}
      validationRules={validationRules}
      variables={variables}
    >
      <GraphiQLInterface
        confirmCloseTab={confirmCloseTab}
        showPersistHeadersSettings={shouldPersistHeaders !== false}
        disableTabs={props.disableTabs ?? false}
        forcedTheme={props.forcedTheme}
        {...props}
      />
    </GraphiQLProvider>
  );
}

// Export main windows/panes to be used separately if desired.
GraphiQL.Toolbar = GraphiQLToolbar;
GraphiQL.Footer = GraphiQLFooter;

type AddSuffix<Obj extends { [key: string]: unknown }, Suffix extends string> = {
  [Key in keyof Obj as `${string & Key}${Suffix}`]: Obj[Key];
};

export type GraphiQLInterfaceProps = WriteableEditorProps &
  AddSuffix<Pick<UseQueryEditorArgs, 'onEdit'>, 'Query'> &
  Pick<UseQueryEditorArgs, 'onCopyQuery'> &
  AddSuffix<Pick<UseVariableEditorArgs, 'onEdit'>, 'Variables'> &
  AddSuffix<Pick<UseHeaderEditorArgs, 'onEdit'>, 'Headers'> &
  Pick<UseResponseEditorArgs, 'responseTooltip'> & {
    children?: ReactNode;
    /**
     * Set the default state for the editor tools.
     * - `false` hides the editor tools
     * - `true` shows the editor tools
     * - `'variables'` specifically shows the variables editor
     * - `'headers'` specifically shows the headers editor
     * By default the editor tools are initially shown when at least one of the
     * editors has contents.
     */
    defaultEditorToolsVisibility?: boolean | 'variables' | 'headers';
    /**
     * Toggle if the headers editor should be shown inside the editor tools.
     */
    isHeadersEditorEnabled?: boolean;
    /**
     * An object that allows configuration of the toolbar next to the query
     * editor.
     */
    toolbar?: GraphiQLToolbarConfig;
    /**
     * Indicates if settings for persisting headers should appear in the
     * settings modal.
     */
    showPersistHeadersSettings?: boolean;
    defaultTheme?: Theme;
    disableTabs?: boolean;
    /**
     * `forcedTheme` allows enforcement of a specific theme for GraphiQL.
     * This is useful when you want to make sure that GraphiQL is always
     * rendered with a specific theme.
     */
    forcedTheme?: (typeof THEMES)[number];
    /**
     * Additional class names which will be appended to the container element.
     */
    className?: string;
    /**
     * When the user clicks a close tab button, this function is invoked with
     * the index of the tab that is about to be closed. It can return a promise
     * that should resolve to `true` (meaning the tab may be closed) or `false`
     * (meaning the tab may not be closed).
     */
    confirmCloseTab?: (index: number) => Promise<boolean> | boolean;
  };

const THEMES = ['light', 'dark', 'system'] as const;

const TAB_CLASS_PREFIX = 'graphiql-session-tab-';

export function GraphiQLInterface(props: GraphiQLInterfaceProps): ReactElement {
  const isHeadersEditorEnabled = props.isHeadersEditorEnabled ?? true;
  const editorContext = useEditorContext({ nonNull: true });
  const executionContext = useExecutionContext({ nonNull: true });
  const schemaContext = useSchemaContext({ nonNull: true });
  const storageContext = useStorageContext();
  const pluginContext = usePluginContext();
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(false);
  const sidebarPanel = useRef<ImperativePanelHandle>(null);
  const forcedTheme = useMemo(
    () => (props.forcedTheme && THEMES.includes(props.forcedTheme) ? props.forcedTheme : undefined),
    [props.forcedTheme]
  );

  const copy = useCopyQuery({ onCopyQuery: props.onCopyQuery });
  const merge = useMergeQuery();
  const prettify = usePrettifyEditors();

  const { theme, setTheme } = useTheme(props.defaultTheme);

  useEffect(() => {
    if (forcedTheme === 'system') {
      setTheme(null);
    } else if (forcedTheme === 'light' || forcedTheme === 'dark') {
      setTheme(forcedTheme);
    }
  }, [forcedTheme, setTheme]);

  useEffect(() => {
    pluginContext?.setVisiblePlugin(pluginContext.plugins[0]);
  }, [pluginContext]);

  const editorResize = useDragResize({
    direction: 'horizontal',
    storageKey: 'editorFlex',
  });
  const editorToolsResize = useDragResize({
    defaultSizeRelation: 3,
    direction: 'vertical',
    initiallyHidden: (() => {
      if (props.defaultEditorToolsVisibility === 'variables' || props.defaultEditorToolsVisibility === 'headers') {
        return;
      }

      if (typeof props.defaultEditorToolsVisibility === 'boolean') {
        return props.defaultEditorToolsVisibility ? undefined : 'second';
      }

      return editorContext.initialVariables || editorContext.initialHeaders ? undefined : 'second';
    })(),
    sizeThresholdSecond: 60,
    storageKey: 'secondaryEditorFlex',
  });

  const [activeSecondaryEditor, setActiveSecondaryEditor] = useState<'variables' | 'headers'>(() => {
    if (props.defaultEditorToolsVisibility === 'variables' || props.defaultEditorToolsVisibility === 'headers') {
      return props.defaultEditorToolsVisibility;
    }
    return !editorContext.initialVariables && editorContext.initialHeaders && isHeadersEditorEnabled
      ? 'headers'
      : 'variables';
  });
  const [showDialog, setShowDialog] = useState<'settings' | 'short-keys' | null>(null);
  const [clearStorageStatus, setClearStorageStatus] = useState<'success' | 'error' | null>(null);

  const children = Children.toArray(props.children);

  const toolbar = children.find((child) => isChildComponentType(child, GraphiQL.Toolbar)) ?? (
    <>
      <ToolbarButton onClick={prettify} label="Prettify query (Shift-Ctrl-P)">
        <PrettifyIcon className="fk-w-8 fk-h-8 fk-block" aria-hidden="true" />
      </ToolbarButton>
      <ToolbarButton onClick={merge} label="Merge fragments into query (Shift-Ctrl-M)">
        <MergeIcon className="graphiql-toolbar-icon" aria-hidden="true" />
      </ToolbarButton>
      <ToolbarButton onClick={copy} label="Copy query (Shift-Ctrl-C)">
        <CopyIcon className="graphiql-toolbar-icon" aria-hidden="true" />
      </ToolbarButton>
      {props.toolbar?.additionalContent}
      {props.toolbar?.additionalComponent && <props.toolbar.additionalComponent />}
    </>
  );

  const footer = children.find((child) => isChildComponentType(child, GraphiQL.Footer));

  const handleClearData = useCallback(() => {
    try {
      storageContext?.clear();
      setClearStorageStatus('success');
    } catch {
      setClearStorageStatus('error');
    }
  }, [storageContext]);

  const handlePersistHeaders: MouseEventHandler<HTMLButtonElement> = useCallback(
    (event) => {
      editorContext.setShouldPersistHeaders(event.currentTarget.dataset.value === 'true');
    },
    [editorContext]
  );

  const handleChangeTheme: MouseEventHandler<HTMLButtonElement> = useCallback(
    (event) => {
      const selectedTheme = event.currentTarget.dataset.theme as 'light' | 'dark' | undefined;
      setTheme(selectedTheme || null);
    },
    [setTheme]
  );

  const handleAddTab = (): void => {
    editorContext.addTab();
  };
  const handleRefetchSchema = (): void => {
    schemaContext.introspect();
  };
  const handleReorder = (newOrder: TabState[]): void => {
    editorContext.moveTab(newOrder);
  };

  const handleShowDialog: MouseEventHandler<HTMLButtonElement> = useCallback((event) => {
    setShowDialog(event.currentTarget.dataset.value as 'short-keys' | 'settings');
  }, []);

  const handlePluginClick: MouseEventHandler<HTMLButtonElement> = useCallback(
    (event) => {
      const context = pluginContext;
      const pluginIndex = Number(event.currentTarget.dataset.index);

      if (!context) return;

      const plugin = context.plugins.find((_, index) => pluginIndex === index) ?? null;
      const isVisible = plugin === context.visiblePlugin;

      if (isVisible) {
        context.setVisiblePlugin(null);

        return;
      }

      context.setVisiblePlugin(plugin);
    },
    [pluginContext]
  );

  const handleToolsTabClick: MouseEventHandler<HTMLButtonElement> = useCallback(
    (event) => {
      if (editorToolsResize.hiddenElement === 'second') {
        editorToolsResize.setHiddenElement(null);
      }
      setActiveSecondaryEditor(event.currentTarget.dataset.name as 'variables' | 'headers');
    },
    [editorToolsResize]
  );

  const toggleEditorTools: MouseEventHandler<HTMLButtonElement> = useCallback(() => {
    editorToolsResize.setHiddenElement(editorToolsResize.hiddenElement === 'second' ? null : 'second');
  }, [editorToolsResize]);

  const handleOpenShortKeysDialog = useCallback((isOpen: boolean) => {
    if (!isOpen) {
      setShowDialog(null);
    }
  }, []);

  const handleOpenSettingsDialog = useCallback((isOpen: boolean) => {
    if (!isOpen) {
      setShowDialog(null);
      setClearStorageStatus(null);
    }
  }, []);

  const addTab = (
    <GraphiQLTooltip label="Add tab">
      <UnStyledButton type="button" className="graphiql-tab-add" onClick={handleAddTab} aria-label="Add tab">
        <PlusIcon aria-hidden="true" />
      </UnStyledButton>
    </GraphiQLTooltip>
  );

  const className = props.className ? ` ${props.className}` : '';
  const confirmClose = props.confirmCloseTab;

  const handleTabClose: MouseEventHandler<HTMLButtonElement> = useCallback(
    async (event) => {
      const tabButton = event.currentTarget.previousSibling as HTMLButtonElement;
      const index = Number(tabButton.id.replace(TAB_CLASS_PREFIX, ''));

      /** TODO:
       * Move everything after into `editorContext.closeTab` once zustand will be used instead of
       * React context, since now we can't use execution context inside editor context, since editor
       * context is used in execution context.
       */
      const shouldCloseTab = confirmClose ? await confirmClose(index) : true;

      if (!shouldCloseTab) {
        return;
      }

      if (editorContext.activeTabIndex === index) {
        executionContext.stop();
      }
      editorContext.closeTab(index);
    },
    [confirmClose, editorContext, executionContext]
  );

  const handleTabClick: MouseEventHandler<HTMLButtonElement> = useCallback(
    (event) => {
      const index = Number(event.currentTarget.id.replace(TAB_CLASS_PREFIX, ''));
      /** TODO:
       * Move everything after into `editorContext.changeTab` once zustand will be used instead of
       * React context, since now we can't use execution context inside editor context, since editor
       * context is used in execution context.
       */
      executionContext.stop();
      editorContext.changeTab(index);
    },
    [editorContext, executionContext]
  );

  return (
    <GraphiQLTooltip.Provider>
      <div className={`graphiql-container${className}`}>
        <ResizablePanelGroup autoSaveId="explorer" direction="horizontal" className="fk-h-full fk-max-h-full">
          {/* TODO: Sidebar */}
          <ResizablePanel
            collapsible
            collapsedSize={3}
            minSize={10}
            onCollapse={() => {
              setIsSidebarCollapsed(true);
            }}
            onExpand={() => {
              setIsSidebarCollapsed(false);
            }}
            ref={sidebarPanel}
          >
            <div className="fk-flex fk-w-full fk-h-full fk-pb-6">
              <Tabs className="fk-w-full" defaultValue={pluginContext?.plugins[0].title}>
                <div className={`fk-flex fk-items-center fk-py-1 ${isSidebarCollapsed ? '' : 'fk-px-3'}`}>
                  <TabsList className={isSidebarCollapsed ? 'fk-hidden' : ''}>
                    {pluginContext?.plugins.map((plugin, index) => {
                      const isVisible = plugin === pluginContext.visiblePlugin;
                      const label = `${isVisible ? 'Hide' : 'Show'} ${plugin.title}`;
                      return (
                        <TabsTrigger
                          aria-label={label}
                          className="fk-text-muted-foreground"
                          data-index={index}
                          key={plugin.title}
                          onClick={handlePluginClick}
                          value={plugin.title}
                        >
                          <plugin.icon aria-hidden="true" />
                        </TabsTrigger>
                      );
                    })}
                  </TabsList>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <Button
                        className={isSidebarCollapsed ? 'fk-ml-1.5' : 'fk-ml-auto'}
                        onClick={() => {
                          const panel = sidebarPanel.current;

                          isSidebarCollapsed ? panel?.expand() : panel?.collapse();
                        }}
                        size="icon"
                        variant="ghost"
                      >
                        {isSidebarCollapsed ? (
                          <>
                            <ChevronsRight className="fk-w-4 fk-h-4" />
                            <span className="fk-sr-only">Expand</span>
                          </>
                        ) : (
                          <>
                            <ChevronsLeft className="fk-w-4 fk-h-4" />
                            <span className="fk-sr-only">Collapse</span>
                          </>
                        )}
                      </Button>
                    </TooltipTrigger>
                    <TooltipContent>{isSidebarCollapsed ? 'Expand' : 'Collapse'}</TooltipContent>
                  </Tooltip>
                </div>
                {isSidebarCollapsed ? null : <Separator />}
                {pluginContext?.plugins.map((plugin) => (
                  <TabsContent
                    className={`fk-flex fk-w-full fk-max-h-full fk-mt-0 ${isSidebarCollapsed ? 'fk-hidden' : ''}`}
                    key={plugin.title}
                    value={plugin.title}
                  >
                    <ScrollArea className="fk-flex fk-w-full fk-max-h-full fk-overflow-auto fk-px-6 fk-pt-3 fk-pb-6 fk-mb-3">
                      <plugin.content />
                      <ScrollBar orientation="horizontal" />
                    </ScrollArea>
                  </TabsContent>
                ))}
              </Tabs>
            </div>
            {/* <GraphiQLTooltip label="Re-fetch GraphQL schema">
                <UnStyledButton
                  type="button"
                  disabled={schemaContext.isFetching}
                  onClick={handleRefetchSchema}
                  aria-label="Re-fetch GraphQL schema"
                >
                  <ReloadIcon className={schemaContext.isFetching ? 'graphiql-spin' : ''} aria-hidden="true" />
                </UnStyledButton>
              </GraphiQLTooltip>
              <GraphiQLTooltip label="Open short keys dialog">
                <UnStyledButton
                  type="button"
                  data-value="short-keys"
                  onClick={handleShowDialog}
                  aria-label="Open short keys dialog"
                >
                  <KeyboardShortcutIcon aria-hidden="true" />
                </UnStyledButton>
              </GraphiQLTooltip>
              <GraphiQLTooltip label="Open settings dialog">
                <UnStyledButton
                  type="button"
                  data-value="settings"
                  onClick={handleShowDialog}
                  aria-label="Open settings dialog"
                >
                  <SettingsIcon aria-hidden="true" />
                </UnStyledButton>
              </GraphiQLTooltip> */}
          </ResizablePanel>

          <ResizableHandle className="hover:fk-bg-blue-500 fk-transition-colors" withHandle />
          {/* Center column */}
          <ResizablePanel className="fk-bg-muted" defaultSize={48}>
            <div className="fk-flex fk-flex-col fk-h-full">
              <div className="fk-flex fk-items-center fk-py-1 fk-px-4 fk-bg-background">
                {!props.disableTabs && (
                  <GraphiQlTabs
                    aria-label="Select active operation"
                    className="!fk-p-1 fk-bg-muted fk-rounded-md"
                    onReorder={handleReorder}
                    values={editorContext.tabs}
                  >
                    {editorContext.tabs.length > 0 && (
                      <>
                        {editorContext.tabs.map((tab, index) => (
                          <GraphiQlTab
                            className="fk-bg-background"
                            isActive={index === editorContext.activeTabIndex}
                            key={tab.id}
                            value={tab}
                          >
                            <GraphiQlTab.Button
                              aria-controls="graphiql-session"
                              id={`${TAB_CLASS_PREFIX}${index.toString()}`}
                              onClick={handleTabClick}
                            >
                              {tab.title}
                            </GraphiQlTab.Button>
                            <GraphiQlTab.Close onClick={handleTabClose} />
                          </GraphiQlTab>
                        ))}
                        {addTab}
                      </>
                    )}
                  </GraphiQlTabs>
                )}
              </div>

              {/* Query editor */}
              <div
                role="tabpanel"
                id="graphiql-session" // used by aria-controls="graphiql-session"
                className="graphiql-session"
                aria-labelledby={`${TAB_CLASS_PREFIX}${editorContext.activeTabIndex}`}
              >
                <div className={`graphiql-editors${editorContext.tabs.length === 1 ? ' full-height' : ''}`}>
                  <div ref={editorToolsResize.firstRef}>
                    <section className="graphiql-query-editor" aria-label="Query Editor">
                      <QueryEditor
                        editorTheme={props.editorTheme}
                        keyMap={props.keyMap}
                        onCopyQuery={props.onCopyQuery}
                        onEdit={props.onEditQuery}
                        readOnly={props.readOnly}
                      />
                      <div className="graphiql-toolbar" role="toolbar" aria-label="Editor Commands">
                        <ExecuteButton />
                        {toolbar}
                      </div>
                    </section>
                  </div>

                  <div ref={editorToolsResize.dragBarRef}>
                    <div className="graphiql-editor-tools">
                      <UnStyledButton
                        type="button"
                        className={
                          activeSecondaryEditor === 'variables' && editorToolsResize.hiddenElement !== 'second'
                            ? 'active'
                            : ''
                        }
                        onClick={handleToolsTabClick}
                        data-name="variables"
                      >
                        Variables
                      </UnStyledButton>
                      {isHeadersEditorEnabled && (
                        <UnStyledButton
                          type="button"
                          className={
                            activeSecondaryEditor === 'headers' && editorToolsResize.hiddenElement !== 'second'
                              ? 'active'
                              : ''
                          }
                          onClick={handleToolsTabClick}
                          data-name="headers"
                        >
                          Headers
                        </UnStyledButton>
                      )}

                      <GraphiQLTooltip
                        label={editorToolsResize.hiddenElement === 'second' ? 'Show editor tools' : 'Hide editor tools'}
                      >
                        <UnStyledButton
                          type="button"
                          onClick={toggleEditorTools}
                          aria-label={
                            editorToolsResize.hiddenElement === 'second' ? 'Show editor tools' : 'Hide editor tools'
                          }
                          className="graphiql-toggle-editor-tools"
                        >
                          {editorToolsResize.hiddenElement === 'second' ? (
                            <ChevronUpIcon className="graphiql-chevron-icon" aria-hidden="true" />
                          ) : (
                            <ChevronDownIcon className="graphiql-chevron-icon" aria-hidden="true" />
                          )}
                        </UnStyledButton>
                      </GraphiQLTooltip>
                    </div>
                  </div>

                  <section
                    className="graphiql-editor-tool"
                    aria-label={activeSecondaryEditor === 'variables' ? 'Variables' : 'Headers'}
                  >
                    <VariableEditor
                      editorTheme={props.editorTheme}
                      isHidden={activeSecondaryEditor !== 'variables'}
                      keyMap={props.keyMap}
                      onEdit={props.onEditVariables}
                      readOnly={props.readOnly}
                    />
                    {isHeadersEditorEnabled && (
                      <HeaderEditor
                        editorTheme={props.editorTheme}
                        isHidden={activeSecondaryEditor !== 'headers'}
                        keyMap={props.keyMap}
                        onEdit={props.onEditHeaders}
                        readOnly={props.readOnly}
                      />
                    )}
                  </section>
                </div>
              </div>
            </div>
          </ResizablePanel>
          <ResizableHandle className="hover:fk-bg-blue-500 fk-transition-colors" withHandle />
          <ResizablePanel className="fk-p-3 fk-relative fk-z-50" defaultSize={30}>
            {/* TODO: Este es el panel con la respuesta */}
            <div className="graphiql-response fk-h-full">
              {executionContext.isFetching ? <Spinner /> : null}
              <ResponseEditor
                editorTheme={props.editorTheme}
                responseTooltip={props.responseTooltip}
                keyMap={props.keyMap}
              />
              {footer}
            </div>
          </ResizablePanel>
        </ResizablePanelGroup>
        <Dialog open={showDialog === 'short-keys'} onOpenChange={handleOpenShortKeysDialog}>
          <div className="graphiql-dialog-header">
            <Dialog.Title className="graphiql-dialog-title">Short Keys</Dialog.Title>
            <Dialog.Close />
          </div>
          <div className="graphiql-dialog-section">
            <ShortKeys keyMap={props.keyMap || 'sublime'} />
          </div>
        </Dialog>
        <Dialog open={showDialog === 'settings'} onOpenChange={handleOpenSettingsDialog}>
          <div className="graphiql-dialog-header">
            <Dialog.Title className="graphiql-dialog-title">Settings</Dialog.Title>
            <Dialog.Close />
          </div>
          {props.showPersistHeadersSettings ? (
            <div className="graphiql-dialog-section">
              <div>
                <div className="graphiql-dialog-section-title">Persist headers</div>
                <div className="graphiql-dialog-section-caption">
                  Save headers upon reloading.{' '}
                  <span className="graphiql-warning-text">Only enable if you trust this device.</span>
                </div>
              </div>
              <ButtonGroup>
                <GraphiQLButton
                  type="button"
                  id="enable-persist-headers"
                  className={editorContext.shouldPersistHeaders ? 'active' : ''}
                  data-value="true"
                  onClick={handlePersistHeaders}
                >
                  On
                </GraphiQLButton>
                <GraphiQLButton
                  type="button"
                  id="disable-persist-headers"
                  className={editorContext.shouldPersistHeaders ? '' : 'active'}
                  onClick={handlePersistHeaders}
                >
                  Off
                </GraphiQLButton>
              </ButtonGroup>
            </div>
          ) : null}
          {!forcedTheme && (
            <div className="graphiql-dialog-section">
              <div>
                <div className="graphiql-dialog-section-title">Theme</div>
                <div className="graphiql-dialog-section-caption">Adjust how the interface appears.</div>
              </div>
              <ButtonGroup>
                <GraphiQLButton type="button" className={theme === null ? 'active' : ''} onClick={handleChangeTheme}>
                  System
                </GraphiQLButton>
                <GraphiQLButton
                  type="button"
                  className={theme === 'light' ? 'active' : ''}
                  data-theme="light"
                  onClick={handleChangeTheme}
                >
                  Light
                </GraphiQLButton>
                <GraphiQLButton
                  type="button"
                  className={theme === 'dark' ? 'active' : ''}
                  data-theme="dark"
                  onClick={handleChangeTheme}
                >
                  Dark
                </GraphiQLButton>
              </ButtonGroup>
            </div>
          )}
          {storageContext ? (
            <div className="graphiql-dialog-section">
              <div>
                <div className="graphiql-dialog-section-title">Clear storage</div>
                <div className="graphiql-dialog-section-caption">Remove all locally stored data and start fresh.</div>
              </div>
              <GraphiQLButton
                type="button"
                state={clearStorageStatus || undefined}
                disabled={clearStorageStatus === 'success'}
                onClick={handleClearData}
              >
                {{
                  success: 'Cleared data',
                  error: 'Failed',
                }[clearStorageStatus!] || 'Clear data'}
              </GraphiQLButton>
            </div>
          ) : null}
        </Dialog>
      </div>
    </GraphiQLTooltip.Provider>
  );
}

const modifier = isMacOs ? '⌘' : 'Ctrl';

const SHORT_KEYS = Object.entries({
  'Search in editor': [modifier, 'F'],
  'Search in documentation': [modifier, 'K'],
  'Execute query': [modifier, 'Enter'],
  'Prettify editors': ['Ctrl', 'Shift', 'P'],
  'Merge fragments definitions into operation definition': ['Ctrl', 'Shift', 'M'],
  'Copy query': ['Ctrl', 'Shift', 'C'],
  'Re-fetch schema using introspection': ['Ctrl', 'Shift', 'R'],
});

function ShortKeys({ keyMap }: { keyMap: string }): ReactElement {
  return (
    <div>
      <table className="graphiql-table">
        <thead>
          <tr>
            <th>Short Key</th>
            <th>Function</th>
          </tr>
        </thead>
        <tbody>
          {SHORT_KEYS.map(([title, keys]) => (
            <tr key={title}>
              <td>
                {keys.map((key, index, array) => (
                  <Fragment key={key}>
                    <code className="graphiql-key">{key}</code>
                    {index !== array.length - 1 && ' + '}
                  </Fragment>
                ))}
              </td>
              <td>{title}</td>
            </tr>
          ))}
        </tbody>
      </table>
      <p>
        The editors use{' '}
        <a href="https://codemirror.net/5/doc/manual.html#keymaps" target="_blank" rel="noopener noreferrer">
          CodeMirror Key Maps
        </a>{' '}
        that add more short keys. This instance of Graph<em>i</em>QL uses <code>{keyMap}</code>.
      </p>
    </div>
  );
}

// Configure the UI by providing this Component as a child of GraphiQL.
function GraphiQLToolbar<TProps>(props: PropsWithChildren<TProps>): ReactElement {
  return <>{props.children}</>;
}

GraphiQLToolbar.displayName = 'GraphiQLToolbar';

// Configure the UI by providing this Component as a child of GraphiQL.
function GraphiQLFooter<TProps>(props: PropsWithChildren<TProps>): ReactElement {
  return <div className="graphiql-footer">{props.children}</div>;
}

GraphiQLFooter.displayName = 'GraphiQLFooter';

// Determines if the React child is of the same type of the provided React component
function isChildComponentType<T extends ComponentType>(child: any, component: T): child is T {
  if (child?.type?.displayName && child.type.displayName === component.displayName) {
    return true;
  }

  return child.type === component;
}
