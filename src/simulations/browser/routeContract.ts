export const BROWSER_ADDRESS_LIMIT = 160;
export const OPSLYCE_BROWSER_HOST = 'hq-training.ops';

export const PUBLIC_BROWSER_ROUTES = [
  '/',
  '/about',
  '/bulletins',
  '/systems',
  '/systems/route-index'
] as const;
export const MISSION_BROWSER_ROUTES = ['/recruit-verification'] as const;
export const BROWSER_ROUTES = [...PUBLIC_BROWSER_ROUTES, ...MISSION_BROWSER_ROUTES] as const;

export type PublicBrowserRoute = (typeof PUBLIC_BROWSER_ROUTES)[number];
export type MissionBrowserRoute = (typeof MISSION_BROWSER_ROUTES)[number];
export type BrowserRoute = (typeof BROWSER_ROUTES)[number];

export type MissionRouteRegistry = Readonly<{
  host: typeof OPSLYCE_BROWSER_HOST;
  availableRoutes: ReadonlySet<BrowserRoute>;
}>;

export type RouteInspection =
  | Readonly<{ kind: 'accepted'; host: typeof OPSLYCE_BROWSER_HOST; route: BrowserRoute }>
  | Readonly<{ kind: 'empty'; retainedInput: '' }>
  | Readonly<{ kind: 'not-available'; retainedInput: string }>
  | Readonly<{ kind: 'unknown-route'; retainedInput: string }>;

export function createOpslyceRouteRegistry(
  verificationRouteRecovered: boolean
): MissionRouteRegistry {
  return {
    host: OPSLYCE_BROWSER_HOST,
    availableRoutes: new Set<BrowserRoute>([
      ...PUBLIC_BROWSER_ROUTES,
      ...(verificationRouteRecovered ? MISSION_BROWSER_ROUTES : [])
    ])
  };
}

export function inspectMissionRoute(
  rawInput: string,
  registry: MissionRouteRegistry
): RouteInspection {
  if (rawInput.length > BROWSER_ADDRESS_LIMIT) {
    return { kind: 'not-available', retainedInput: rawInput.slice(0, BROWSER_ADDRESS_LIMIT) };
  }

  const trimmed = rawInput.trim();
  if (trimmed.length === 0) return { kind: 'empty', retainedInput: '' };
  if (
    trimmed.includes('?') ||
    trimmed.includes('#') ||
    trimmed.startsWith('//') ||
    trimmed.includes('\\') ||
    /(?:^|\/)\.\.?(?:\/|$)/u.test(trimmed)
  ) {
    return { kind: 'not-available', retainedInput: trimmed };
  }

  const candidate = toUrlCandidate(trimmed, registry.host);
  const authority = /^https:\/\/([^/]+)/iu.exec(candidate)?.[1] ?? '';
  if (authority.includes('@') || /:\d+$/u.test(authority)) {
    return { kind: 'not-available', retainedInput: trimmed };
  }
  let parsed: URL;
  try {
    parsed = new URL(candidate);
  } catch {
    return { kind: 'not-available', retainedInput: trimmed };
  }

  if (
    parsed.protocol !== 'https:' ||
    parsed.username.length > 0 ||
    parsed.password.length > 0 ||
    parsed.port.length > 0 ||
    parsed.search.length > 0 ||
    parsed.hash.length > 0 ||
    parsed.pathname.includes('%')
  ) {
    return { kind: 'not-available', retainedInput: trimmed };
  }

  if (parsed.hostname !== registry.host) {
    return { kind: 'not-available', retainedInput: trimmed };
  }

  const route = normalisePathname(parsed.pathname);
  if (!isBrowserRoute(route) || !registry.availableRoutes.has(route)) {
    return { kind: 'unknown-route', retainedInput: trimmed };
  }

  return { kind: 'accepted', host: registry.host, route };
}

export function isBrowserRoute(value: string): value is BrowserRoute {
  return (BROWSER_ROUTES as readonly string[]).includes(value);
}

function toUrlCandidate(input: string, host: string): string {
  if (input.startsWith('/')) return `https://${host}${input}`;
  if (/^[a-z][a-z\d+.-]*:/iu.test(input)) return input;
  return `https://${input}`;
}

function normalisePathname(pathname: string): string {
  return pathname === '/' ? '/' : pathname.replace(/\/+$/u, '');
}
