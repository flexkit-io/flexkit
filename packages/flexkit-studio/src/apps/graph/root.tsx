'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import type { JSX } from 'react';
import { useLocation } from 'react-router-dom';
import { useAuth } from '../../auth/auth-context';
import { useAppContext } from '../../core/app-context';
import { useConfig } from '../../core/config/config-context';
import { filterEntitiesForSpaces } from '../../core/spaces';
import type { Attribute } from '../../core/types';
import { useDispatch } from '../../entities/actions-context';
import {
  readSidebarCookieState,
  SidebarInset,
  SidebarProvider,
  SidebarTrigger,
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from '../../ui';
import { useTheme } from '../../ui/theme-context';
import { GraphCanvas, type GraphCanvasApi } from './canvas';
import { GraphContextMenu, type GraphContextMenuState } from './context-menu';
import {
  EXPAND_HOP_MAX_RECORDS,
  getEntity,
  getEntityColors,
  getGraphEntities,
  getRelationshipAttributes,
  parseGraphParams,
  SAMPLE_LIMIT,
} from './graph';
import { GraphInspector } from './inspector';
import { countNodesByEntity, neighbourKeys } from './scene';
import { GraphSidebar } from './sidebar';
import { GraphToolbar } from './toolbar';
import { useScene } from './use-scene';

/**
 * The Graph app: explore records as nodes and relationships. The sidebar
 * adds records, the canvas draws them, the inspector details the selection.
 * Other apps open it with `?entity=<name>&ids=<id,id>` to show those records
 * expanded one hop.
 */
export function Root(): JSX.Element {
  const { currentProjectId, currentProject, currentProjectSchema } = useConfig();
  const [, auth] = useAuth();
  const { scope } = useAppContext();
  const { resolvedTheme } = useTheme();
  const location = useLocation();
  const dispatchAction = useDispatch();
  const theme = resolvedTheme === 'dark' ? 'dark' : 'light';
  const defaultScope = currentProject?.scopes?.find((item) => item.isDefault)?.name ?? 'default';
  const scopeField = scope || defaultScope;
  // Space-bound entities are hidden from non-members, as in Desk; the API
  // rejects their data either way.
  const userSpaces = auth.user?.spaces;
  const schema = useMemo(() => filterEntitiesForSpaces(currentProjectSchema, userSpaces), [currentProjectSchema, userSpaces]);
  const entities = useMemo(() => getGraphEntities(schema), [schema]);
  const colors = useMemo(() => getEntityColors(schema, theme), [schema, theme]);
  const scene = useScene({ schema, scope: scopeField });
  const { state, dispatch, isLoading, loadRecords, expandAll, expandAttribute } = scene;
  const canvasApi = useRef<GraphCanvasApi | null>(null);
  const [menu, setMenu] = useState<GraphContextMenuState | null>(null);
  const [isLayoutRunning, setIsLayoutRunning] = useState(false);
  const loadedSearchRef = useRef<string | null>(null);
  const onCanvas = useMemo(() => countNodesByEntity(state), [state]);
  const selectedNode = state.selected ? state.nodes[state.selected] : undefined;
  const menuNode = menu ? state.nodes[menu.key] : undefined;
  const menuEntity = menuNode ? getEntity(schema, menuNode.entity) : undefined;
  const nodeCount = Object.keys(state.nodes).length;
  const edgeCount = Object.keys(state.edges).length;
  const defaultOpen = readSidebarCookieState();

  const select = useCallback((key: string | null) => dispatch({ type: 'select', key }), [dispatch]);

  const openRecord = useCallback(
    (key: string) => {
      const node = state.nodes[key];
      const entity = node ? getEntity(schema, node.entity) : undefined;

      if (node && entity) {
        dispatchAction({ type: 'EditEntity', payload: { entityId: node.id, entityNamePlural: entity.plural } });
      }
    },
    [dispatchAction, schema, state.nodes]
  );

  const hide = useCallback((key: string) => dispatch({ type: 'remove', keys: [key] }), [dispatch]);

  const hideOthers = useCallback(
    (key: string) => dispatch({ type: 'keepOnly', keys: [key, ...neighbourKeys(state, key)] }),
    [dispatch, state]
  );

  const togglePin = useCallback((key: string) => dispatch({ type: 'togglePin', key }), [dispatch]);

  const pin = useCallback(
    (key: string) => {
      if (!state.pinned[key]) {
        dispatch({ type: 'togglePin', key });
      }
    },
    [dispatch, state.pinned]
  );

  const addRecord = useCallback(
    async (entityName: string, id: string) => {
      const entity = getEntity(schema, entityName);

      if (!entity) {
        return;
      }

      const [key] = await loadRecords(entity, { ids: [id], expand: true });

      if (key) {
        select(key);
      }
    },
    [loadRecords, schema, select]
  );

  const expandAttributeAndClose = useCallback(
    (key: string, attribute: Attribute) => {
      setMenu(null);
      void expandAttribute(key, attribute);
    },
    [expandAttribute]
  );

  // Records another app asked for: `?entity=product&ids=a,b` loads those
  // records, expanded one hop when they are few, `?entity=product` a sample.
  useEffect(() => {
    const params = parseGraphParams(location.search);

    // Keyed on the navigation, not the query string: opening the same
    // records again after a Clear must load them again.
    if (!params || loadedSearchRef.current === location.key) {
      return;
    }

    const entity = getEntity(schema, params.entity);

    if (!entity || schema.length === 0) {
      return;
    }

    loadedSearchRef.current = location.key;
    const selection =
      params.ids.length > 0
        ? { ids: params.ids, expand: params.ids.length <= EXPAND_HOP_MAX_RECORDS }
        : { limit: SAMPLE_LIMIT };
    void loadRecords(entity, selection).then((keys) => {
      if (params.ids.length === 1 && keys[0]) {
        select(keys[0]);
      }
    });
  }, [location.key, location.search, schema, loadRecords, select]);

  if (!currentProjectId) {
    return (
      <main className="fk:flex fk:h-full fk:flex-1 fk:items-center fk:justify-center fk:p-8 fk:text-sm fk:text-muted-foreground">
        Select a project to explore its graph.
      </main>
    );
  }

  return (
    <SidebarProvider className="fk:h-full" defaultOpen={defaultOpen}>
      <GraphSidebar
        colors={colors}
        entities={entities}
        hiddenEntities={state.hiddenEntities}
        onCanvas={onCanvas}
        onHit={(entityName, id) => void addRecord(entityName, id)}
        onStart={(entity) => void loadRecords(entity, { limit: SAMPLE_LIMIT })}
        onToggleEntity={(entityName) => dispatch({ type: 'toggleEntity', entity: entityName })}
        projectId={currentProjectId}
      />
      <SidebarInset className="fk:min-w-0">
        <div className="fk:flex fk:h-full fk:min-h-0 fk:min-w-0" data-testid="graph-app">
          <div className="fk:relative fk:min-w-0 fk:flex-1 fk:bg-background">
            <div className="fk:absolute fk:left-3 fk:top-3 fk:z-10 fk:flex fk:items-center fk:gap-2">
              <Tooltip>
                <TooltipTrigger asChild>
                  <SidebarTrigger className="fk:h-8 fk:w-8 fk:rounded-lg fk:border fk:bg-background fk:shadow-xs" />
                </TooltipTrigger>
                <TooltipContent>Toggle Sidebar</TooltipContent>
              </Tooltip>
              <div className="fk:relative fk:h-10 fk:w-72">
                <GraphToolbar
                  hasNodes={nodeCount > 0}
                  hasSelection={selectedNode !== undefined}
                  isLoading={isLoading}
                  onClear={() => dispatch({ type: 'clear' })}
                  onExpand={() => {
                    if (state.selected) {
                      void expandAll(state.selected);
                    }
                  }}
                  onFit={() => canvasApi.current?.fit()}
                  onHide={() => {
                    if (state.selected) {
                      hide(state.selected);
                    }
                  }}
                />
              </div>
            </div>
            {nodeCount > 0 ? null : (
              <div className="fk:pointer-events-none fk:absolute fk:inset-0 fk:flex fk:items-center fk:justify-center fk:p-8 fk:text-center fk:text-sm fk:text-muted-foreground">
                {isLoading ? 'Loading records…' : 'Search a record or start from an entity to draw its graph.'}
              </div>
            )}
            <GraphCanvas
              apiRef={canvasApi}
              colors={colors}
              onContextMenu={(key, position) => setMenu({ key, ...position })}
              onExpand={(key) => void expandAll(key)}
              onLayoutChange={setIsLayoutRunning}
              onPin={pin}
              onSelect={select}
              scene={state}
              theme={theme}
            />
            <div
              className="fk:absolute fk:bottom-3 fk:left-3 fk:flex fk:max-w-[calc(100%-1.5rem)] fk:items-center fk:gap-2 fk:rounded-lg fk:border fk:bg-background fk:px-2.5 fk:py-1.5 fk:text-xs fk:text-muted-foreground fk:shadow-xs"
              data-testid="graph-status"
            >
              <span>
                {nodeCount.toLocaleString()} {nodeCount === 1 ? 'node' : 'nodes'} · {edgeCount.toLocaleString()}{' '}
                {edgeCount === 1 ? 'relationship' : 'relationships'}
              </span>
              {isLayoutRunning ? <span>· laying out…</span> : null}
              {state.notice ? <span className="fk:truncate fk:text-foreground">· {state.notice}</span> : null}
            </div>
            <GraphContextMenu
              isPinned={menu ? state.pinned[menu.key] === true : false}
              menu={menu}
              onClose={() => setMenu(null)}
              onExpandAll={(key) => void expandAll(key)}
              onExpandAttribute={expandAttributeAndClose}
              onHide={hide}
              onHideOthers={hideOthers}
              onOpenRecord={openRecord}
              onTogglePin={togglePin}
              relationships={menuEntity ? getRelationshipAttributes(menuEntity) : []}
            />
          </div>
          {selectedNode ? (
            <GraphInspector
              colors={colors}
              isLoading={isLoading}
              node={selectedNode}
              onClose={() => select(null)}
              onExpandAll={(key) => void expandAll(key)}
              onExpandAttribute={(key, attribute) => void expandAttribute(key, attribute)}
              onHide={hide}
              onOpenRecord={openRecord}
              scene={state}
              schema={schema}
              scope={scopeField}
            />
          ) : null}
        </div>
      </SidebarInset>
    </SidebarProvider>
  );
}
