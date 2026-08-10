import {
  BROWSER_ADDRESS_LIMIT,
  createOpslyceRouteRegistry,
  inspectMissionRoute,
  OPSLYCE_BROWSER_HOST,
  type BrowserRoute,
  type RouteInspection
} from './routeContract';

export const BROWSER_HISTORY_LIMIT = 20;

export type BrowserPageHistoryEntry = Readonly<{
  kind: 'page';
  route: BrowserRoute;
}>;

export type BrowserErrorHistoryEntry = Readonly<{
  kind: 'error';
  error: 'route-not-found' | 'route-not-available';
  enteredValue: string;
}>;

export type BrowserHistoryEntry = BrowserPageHistoryEntry | BrowserErrorHistoryEntry;

export type BrowserState = Readonly<{
  history: readonly BrowserHistoryEntry[];
  historyIndex: number;
}>;

export type BrowserNavigationResult = Readonly<{
  state: BrowserState;
  inspection: RouteInspection;
  changed: boolean;
  openedRoute: BrowserRoute | null;
}>;

export function createInitialBrowserState(): BrowserState {
  return { history: [{ kind: 'page', route: '/' }], historyIndex: 0 };
}

export function getCurrentBrowserEntry(state: BrowserState): BrowserHistoryEntry {
  return state.history[state.historyIndex] ?? { kind: 'page', route: '/' };
}

export function getBrowserAddress(entry: BrowserHistoryEntry): string {
  return entry.kind === 'page' ? entry.route : entry.enteredValue;
}

export function navigateBrowser(
  state: BrowserState,
  rawInput: string,
  verificationRouteRecovered: boolean
): BrowserNavigationResult {
  const inspection = inspectBrowserInput(rawInput, verificationRouteRecovered);
  if (inspection.kind === 'empty') {
    return { state, inspection, changed: false, openedRoute: null };
  }

  const nextEntry: BrowserHistoryEntry =
    inspection.kind === 'accepted'
      ? { kind: 'page', route: inspection.route }
      : {
          kind: 'error',
          error: inspection.kind === 'unknown-route' ? 'route-not-found' : 'route-not-available',
          enteredValue: inspection.retainedInput.slice(0, BROWSER_ADDRESS_LIMIT)
        };
  const current = getCurrentBrowserEntry(state);
  if (entriesEqual(current, nextEntry)) {
    return {
      state,
      inspection,
      changed: false,
      openedRoute: inspection.kind === 'accepted' ? inspection.route : null
    };
  }

  const activeBranch = state.history.slice(0, state.historyIndex + 1);
  const appended = [...activeBranch, nextEntry];
  const history = appended.slice(-BROWSER_HISTORY_LIMIT);
  return {
    state: { history, historyIndex: history.length - 1 },
    inspection,
    changed: true,
    openedRoute: inspection.kind === 'accepted' ? inspection.route : null
  };
}

export function goBrowserHome(
  state: BrowserState,
  verificationRouteRecovered: boolean
): BrowserNavigationResult {
  return navigateBrowser(state, '/', verificationRouteRecovered);
}

export function goBrowserBack(state: BrowserState): BrowserState {
  return state.historyIndex === 0 ? state : { ...state, historyIndex: state.historyIndex - 1 };
}

export function formatBrowserHistoryEntry(entry: BrowserHistoryEntry): string {
  if (entry.kind === 'page') return `${OPSLYCE_BROWSER_HOST}${entry.route}`;
  return entry.enteredValue || 'Unavailable route';
}

function inspectBrowserInput(
  rawInput: string,
  verificationRouteRecovered: boolean
): RouteInspection {
  const registry = createOpslyceRouteRegistry(verificationRouteRecovered);
  return inspectMissionRoute(rawInput, registry);
}

function entriesEqual(left: BrowserHistoryEntry, right: BrowserHistoryEntry): boolean {
  return left.kind === 'page' && right.kind === 'page'
    ? left.route === right.route
    : left.kind === 'error' && right.kind === 'error'
      ? left.error === right.error && left.enteredValue === right.enteredValue
      : false;
}
