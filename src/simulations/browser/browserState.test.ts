import { describe, expect, it } from 'vitest';
import {
  BROWSER_HISTORY_LIMIT,
  createInitialBrowserState,
  getCurrentBrowserEntry,
  goBrowserBack,
  goBrowserHome,
  navigateBrowser
} from './browserState';

describe('fictional Browser history', () => {
  it('starts on home and appends accepted navigation', () => {
    const initial = createInitialBrowserState();
    expect(getCurrentBrowserEntry(initial)).toEqual({ kind: 'page', route: '/' });
    const next = navigateBrowser(initial, '/about', false);
    expect(next.changed).toBe(true);
    expect(next.state.history).toEqual([
      { kind: 'page', route: '/' },
      { kind: 'page', route: '/about' }
    ]);
  });

  it('moves Back without adding history and truncates forward navigation', () => {
    const about = navigateBrowser(createInitialBrowserState(), '/about', false).state;
    const systems = navigateBrowser(about, '/systems', false).state;
    const back = goBrowserBack(systems);
    expect(back.history).toHaveLength(3);
    expect(getCurrentBrowserEntry(back)).toEqual({ kind: 'page', route: '/about' });
    const bulletins = navigateBrowser(back, '/bulletins', false).state;
    expect(bulletins.history).toEqual([
      { kind: 'page', route: '/' },
      { kind: 'page', route: '/about' },
      { kind: 'page', route: '/bulletins' }
    ]);
  });

  it('uses normal history for Home and treats the current page as a no-op', () => {
    const about = navigateBrowser(createInitialBrowserState(), '/about', false).state;
    expect(goBrowserHome(about, false).state.history.at(-1)).toEqual({ kind: 'page', route: '/' });
    expect(navigateBrowser(about, '/about', false).changed).toBe(false);
  });

  it('retains bounded recoverable errors and history', () => {
    let state = createInitialBrowserState();
    for (let index = 0; index < BROWSER_HISTORY_LIMIT + 4; index += 1) {
      state = navigateBrowser(state, `/missing-${String(index)}`, false).state;
    }
    expect(state.history).toHaveLength(BROWSER_HISTORY_LIMIT);
    expect(state.historyIndex).toBe(BROWSER_HISTORY_LIMIT - 1);
    expect(getCurrentBrowserEntry(state)).toEqual({
      kind: 'error',
      error: 'route-not-found',
      enteredValue: `/missing-${String(BROWSER_HISTORY_LIMIT + 3)}`
    });
  });
});
