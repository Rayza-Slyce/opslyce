import { describe, expect, it } from 'vitest';
import {
  BROWSER_ADDRESS_LIMIT,
  createOpslyceRouteRegistry,
  inspectMissionRoute,
  PUBLIC_BROWSER_ROUTES
} from './routeContract';

describe('bounded OPS-001 Browser routes', () => {
  const publicOnly = createOpslyceRouteRegistry(false);

  it.each(PUBLIC_BROWSER_ROUTES)('accepts route, host and HTTPS forms for %s', (route) => {
    const suffix = route === '/' ? '' : route;
    expect(inspectMissionRoute(route, publicOnly)).toMatchObject({ kind: 'accepted', route });
    expect(inspectMissionRoute(`hq-training.ops${suffix}`, publicOnly)).toMatchObject({
      kind: 'accepted',
      route
    });
    expect(inspectMissionRoute(`https://hq-training.ops${suffix}`, publicOnly)).toMatchObject({
      kind: 'accepted',
      route
    });
  });

  it('normalises surrounding whitespace, home and trailing slashes', () => {
    expect(inspectMissionRoute(' https://hq-training.ops/about/ ', publicOnly)).toMatchObject({
      kind: 'accepted',
      route: '/about'
    });
    expect(inspectMissionRoute('https://hq-training.ops/', publicOnly)).toMatchObject({
      kind: 'accepted',
      route: '/'
    });
  });

  it.each([
    '/about?',
    '/about#',
    'hq-training.ops/about?',
    'hq-training.ops/about#',
    'https://hq-training.ops/about?',
    'https://hq-training.ops/about#',
    '/about?section=systems',
    '/about#systems',
    'hq-training.ops/about?section=systems',
    'hq-training.ops/about#systems',
    'https://hq-training.ops/about?section=systems',
    'https://hq-training.ops/about#systems'
  ])('rejects and retains query or fragment form %s', (input) => {
    expect(inspectMissionRoute(input, publicOnly)).toEqual({
      kind: 'not-available',
      retainedInput: input
    });
  });

  it.each([
    'https://example.com/about',
    'http://hq-training.ops/about',
    'https://user@hq-training.ops/about',
    'https://hq-training.ops:443/about',
    'https://hq-training.ops/about?q=1',
    'https://hq-training.ops/about#report',
    'javascript:alert(1)',
    'not a host',
    '//example.com/about',
    '/systems/../about',
    '/about\\outside'
  ])('rejects unavailable address %s locally', (input) => {
    expect(inspectMissionRoute(input, publicOnly).kind).toBe('not-available');
  });

  it('treats unknown and undiscovered mission routes identically', () => {
    expect(inspectMissionRoute('/missing', publicOnly).kind).toBe('unknown-route');
    expect(inspectMissionRoute('/recruit-verification', publicOnly).kind).toBe('unknown-route');
  });

  it('accepts the verification route only after genuine recovery', () => {
    expect(
      inspectMissionRoute('/recruit-verification', createOpslyceRouteRegistry(true))
    ).toMatchObject({ kind: 'accepted', route: '/recruit-verification' });
  });

  it('bounds oversized retained input without executing a prefix', () => {
    const oversized = `/about${'x'.repeat(BROWSER_ADDRESS_LIMIT)}`;
    const result = inspectMissionRoute(oversized, publicOnly);
    expect(result).toMatchObject({ kind: 'not-available' });
    expect('retainedInput' in result ? result.retainedInput.length : 0).toBe(BROWSER_ADDRESS_LIMIT);
  });
});
