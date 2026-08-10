import type { LocalOperativeProfile, Ops001ActiveCheckpoint } from '../profile/localProfile';
import {
  goBrowserBack,
  goBrowserHome,
  navigateBrowser,
  type BrowserNavigationResult
} from '../simulations/browser/browserState';
import { OPS001_VERIFICATION_ROUTE } from '../missions/ops001/browserContent';
import { appendUnique, replaceByteNotice } from './stage7Progression';

export type BrowserNavigationAction =
  | Readonly<{ kind: 'open'; input: string }>
  | Readonly<{ kind: 'home' }>
  | Readonly<{ kind: 'back' }>;

export function applyBrowserNavigation(
  profile: LocalOperativeProfile,
  action: BrowserNavigationAction
): LocalOperativeProfile {
  const existing = profile.activeCheckpoint;
  if (existing === null) return profile;
  const routeRecovered = existing.activeEvidenceIds.includes('EV-002');

  if (action.kind === 'back') {
    const browser = goBrowserBack(existing.browser);
    return browser === existing.browser
      ? profile
      : { ...profile, activeCheckpoint: { ...existing, browser } };
  }

  const navigation =
    action.kind === 'home'
      ? goBrowserHome(existing.browser, routeRecovered)
      : navigateBrowser(existing.browser, action.input, routeRecovered);
  if (!navigation.changed && navigation.openedRoute !== OPS001_VERIFICATION_ROUTE) return profile;

  let checkpoint: Ops001ActiveCheckpoint = {
    ...existing,
    browser: navigation.state
  };
  let manualEntries = profile.fieldManualEntries;
  if (
    navigation.openedRoute === OPS001_VERIFICATION_ROUTE &&
    routeRecovered &&
    checkpoint.objectiveId === 'OBJ-003'
  ) {
    checkpoint = {
      ...checkpoint,
      progression: 'verification-flag-recovered',
      objectiveId: 'OBJ-004',
      completedMilestones: appendUnique(checkpoint.completedMilestones, 'OBJ-003'),
      activeEvidenceIds: appendUnique(checkpoint.activeEvidenceIds, 'EV-003')
    };
    checkpoint = replaceByteNotice(checkpoint, 'verification-flag-recovered');
    manualEntries = appendUnique(manualEntries, 'note-verification-flags');
  }

  return {
    ...profile,
    progression: checkpoint.progression,
    activeCheckpoint: checkpoint,
    fieldManualEntries: manualEntries
  };
}

export function browserNavigationResultFor(
  checkpoint: Ops001ActiveCheckpoint,
  input: string
): BrowserNavigationResult {
  return navigateBrowser(
    checkpoint.browser,
    input,
    checkpoint.activeEvidenceIds.includes('EV-002')
  );
}
