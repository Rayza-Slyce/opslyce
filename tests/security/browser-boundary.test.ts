import { describe, expect, it, vi } from 'vitest';
import {
  createOpslyceRouteRegistry,
  inspectMissionRoute
} from '../../src/simulations/browser/routeContract';

describe('fictional Browser route contract', () => {
  it.each([
    ['/about', '/about'],
    ['hq-training.ops/about', '/about'],
    ['https://hq-training.ops/about', '/about']
  ])('accepts authored local route %s', (input, expectedRoute) => {
    expect(inspectMissionRoute(input, createOpslyceRouteRegistry(false))).toEqual({
      kind: 'accepted',
      host: 'hq-training.ops',
      route: expectedRoute
    });
  });

  it.each([
    'https://example.com/',
    'http://hq-training.ops/about',
    'https://user@hq-training.ops/about',
    'https://hq-training.ops:443/about',
    'https://hq-training.ops/about?next=https://example.com',
    'https://hq-training.ops/about#outside',
    'javascript:alert(1)'
  ])('rejects unsafe route form locally: %s', (input) => {
    expect(inspectMissionRoute(input, createOpslyceRouteRegistry(false)).kind).toBe(
      'not-available'
    );
  });

  it.each([
    '/about?',
    '/about#',
    'hq-training.ops/about?',
    'hq-training.ops/about#',
    'https://hq-training.ops/about?',
    'https://hq-training.ops/about#',
    '/about?next=/systems',
    '/about#systems'
  ])('rejects empty and populated query or fragment syntax without a request: %s', (input) => {
    const fetchSpy = vi.spyOn(globalThis, 'fetch');
    expect(inspectMissionRoute(input, createOpslyceRouteRegistry(false))).toEqual({
      kind: 'not-available',
      retainedInput: input
    });
    expect(fetchSpy).not.toHaveBeenCalled();
    fetchSpy.mockRestore();
  });

  it('does not expose a genuinely authored mission route before discovery', () => {
    const unknown = inspectMissionRoute('/not-defined', createOpslyceRouteRegistry(false));
    const undiscovered = inspectMissionRoute(
      '/recruit-verification',
      createOpslyceRouteRegistry(false)
    );
    expect(unknown.kind).toBe('unknown-route');
    expect(undiscovered.kind).toBe('unknown-route');
  });

  it('never calls a real request primitive', () => {
    const fetchSpy = vi.spyOn(globalThis, 'fetch');
    inspectMissionRoute('https://hq-training.ops/about', createOpslyceRouteRegistry(false));
    inspectMissionRoute('https://example.com/', createOpslyceRouteRegistry(false));
    expect(fetchSpy).not.toHaveBeenCalled();
    fetchSpy.mockRestore();
  });
});
