import type { Location } from 'react-router-dom';

/**
 * Which Studio apps have been opened for a project and where each one was
 * last left. Opened apps stay mounted while another app is in front, so a
 * chat, a grid or an explorer query survives a tab switch; the stored
 * location is what the hidden app keeps rendering and where its app bar
 * button leads back to.
 */
export interface AppSessions {
  /** Where each opened app was last left. */
  locations: { [appName: string]: Location };
  /** Opened apps in the order they were first opened; each stays mounted. */
  order: string[];
  projectId: string;
}

export function createAppSessions(projectId: string): AppSessions {
  return { locations: {}, order: [], projectId };
}

function decodeSegment(segment: string): string {
  try {
    return decodeURIComponent(segment);
  } catch {
    return segment;
  }
}

/**
 * The app segment that follows the project id in a Studio pathname, e.g.
 * `ai` for `/p1/ai/agent/chats/3`, or `undefined` for `/p1` and `/p1/`.
 */
export function getAppSegment(pathname: string, projectId: string): string | undefined {
  const [project, app] = pathname.split('/').filter(Boolean);

  if (project === undefined || decodeSegment(project) !== projectId) {
    return undefined;
  }

  return app === undefined ? undefined : decodeSegment(app);
}

/**
 * Records that `appName` is in front at `location`. Returns the same object
 * when nothing changed so callers can skip a state update, and starts over
 * when the project changed so a stored location never points into another
 * project.
 */
export function rememberAppLocation(
  sessions: AppSessions,
  projectId: string,
  appName: string,
  location: Location
): AppSessions {
  const base = sessions.projectId === projectId ? sessions : createAppSessions(projectId);

  if (base.locations[appName] === location) {
    return base;
  }

  return {
    locations: { ...base.locations, [appName]: location },
    order: base.order.includes(appName) ? base.order : [...base.order, appName],
    projectId,
  };
}
