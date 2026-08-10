import { createApplicantProfile, createOps001ActiveCheckpoint } from '../../profile/localProfile';
import { deriveTitleState, isValidResumableOperation } from './titleState';
import { navigateBrowser } from '../../simulations/browser/browserState';

const validResumableOperation = createOps001ActiveCheckpoint();

describe('title state', () => {
  it('derives the fresh-device and existing-profile states', () => {
    expect(deriveTitleState(null, null)).toEqual({ hasProfile: false, canContinue: false });
    expect(deriveTitleState(createApplicantProfile('Nova'), null)).toEqual({
      hasProfile: true,
      canContinue: false
    });
  });

  it('allows Continue Operation only for a profile with valid resumable state', () => {
    expect(deriveTitleState(null, validResumableOperation).canContinue).toBe(false);
    expect(
      deriveTitleState(createApplicantProfile('Nova'), validResumableOperation).canContinue
    ).toBe(true);
  });

  it.each([
    ['operation-active-locate-message', 'OBJ-001'],
    ['welcome-read-in-terminal', 'OBJ-002'],
    ['verification-route-recovered', 'OBJ-003'],
    ['verification-flag-recovered', 'OBJ-004'],
    ['operation-verified', 'OBJ-005'],
    ['debrief', 'OBJ-005']
  ] as const)('accepts the major resumable checkpoint %s', (progression, objectiveId) => {
    expect(
      isValidResumableOperation({ ...validResumableOperation, progression, objectiveId })
    ).toBe(true);
  });

  it('recognises a valid Stage 8 flag-recovered checkpoint', () => {
    const checkpoint = {
      ...validResumableOperation,
      progression: 'verification-flag-recovered' as const,
      objectiveId: 'OBJ-004' as const,
      completedMilestones: ['OBJ-001', 'OBJ-002', 'OBJ-003'] as const,
      activeEvidenceIds: ['EV-001', 'EV-002', 'EV-003'] as const,
      browser: navigateBrowser(validResumableOperation.browser, '/recruit-verification', true).state
    };
    expect(isValidResumableOperation(checkpoint)).toBe(true);
  });

  it('resumes the Stage 10 debrief but not post-return HQ states', () => {
    const debrief = {
      ...validResumableOperation,
      progression: 'debrief' as const,
      objectiveId: 'OBJ-005' as const,
      completedMilestones: ['OBJ-001', 'OBJ-002', 'OBJ-003', 'OBJ-004'] as const,
      activeEvidenceIds: ['EV-001', 'EV-002', 'EV-003', 'EV-004'] as const,
      verifiedEvidenceIds: ['EV-003'] as const,
      missionControl: {
        ...validResumableOperation.missionControl,
        validation: 'accepted' as const
      }
    };
    expect(isValidResumableOperation(debrief)).toBe(true);
    expect(isValidResumableOperation({ ...debrief, progression: 'recruit-operative' })).toBe(false);
    expect(isValidResumableOperation({ ...debrief, progression: 'incident-teaser-pending' })).toBe(
      false
    );
  });

  it.each(['welcome-read', 'ops001-available', 'briefing-read'] as const)(
    'does not treat %s as resumable operation progress',
    (progression) => {
      const profile = { ...createApplicantProfile('Nova'), progression };

      expect(deriveTitleState(profile, profile.activeCheckpoint).canContinue).toBe(false);
    }
  );

  it.each([
    null,
    {},
    { ...validResumableOperation, missionId: '' },
    { ...validResumableOperation, checkpointVersion: 0 },
    { ...validResumableOperation, checkpointVersion: 1.5 },
    { ...validResumableOperation, progression: 'briefing-read' },
    { ...validResumableOperation, objectiveId: '' },
    { ...validResumableOperation, activeTool: 'browserish' },
    { ...validResumableOperation, browser: null }
  ])('rejects invalid resumable input %#', (value) => {
    expect(isValidResumableOperation(value)).toBe(false);
  });
});
