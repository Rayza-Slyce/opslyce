import { act, render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, beforeEach, vi } from 'vitest';
import { createApplicantProfile, createOps001ActiveCheckpoint } from '../../profile/localProfile';
import { MissionDebriefScreen, VerificationTransitionScreen } from './MissionDebriefScreen';

function debriefProfile(commandsUsed: readonly ('help' | 'ls' | 'cd' | 'cat' | 'clear')[]) {
  const checkpoint = createOps001ActiveCheckpoint();
  return {
    ...createApplicantProfile('Nova'),
    progression: 'debrief' as const,
    activeCheckpoint: {
      ...checkpoint,
      progression: 'debrief' as const,
      objectiveId: 'OBJ-005' as const,
      completedMilestones: ['OBJ-001', 'OBJ-002', 'OBJ-003', 'OBJ-004'] as const,
      activeEvidenceIds: ['EV-001', 'EV-002', 'EV-003', 'EV-004'] as const,
      verifiedEvidenceIds: ['EV-003'] as const,
      missionControl: { ...checkpoint.missionControl, validation: 'accepted' as const },
      terminal: { ...checkpoint.terminal, commandsUsed }
    }
  };
}

describe('Stage 10 debrief', () => {
  beforeEach(() => {
    vi.stubGlobal(
      'matchMedia',
      vi.fn(() => ({ matches: false }))
    );
  });

  afterEach(() => {
    vi.useRealTimers();
    vi.unstubAllGlobals();
  });

  it('shows the brief verification transition before requesting the debrief transition', async () => {
    vi.useFakeTimers();
    const onComplete = vi.fn();
    render(<VerificationTransitionScreen onComplete={onComplete} />);

    expect(screen.getByText('VERIFYING EVIDENCE')).toBeVisible();
    expect(onComplete).not.toHaveBeenCalled();
    await act(() => vi.advanceTimersByTime(400));
    expect(screen.getByText('FLAG ACCEPTED')).toBeVisible();
    expect(screen.getByText('OPERATION VERIFIED')).toBeVisible();
    expect(onComplete).not.toHaveBeenCalled();
    await act(() => vi.advanceTimersByTime(500));
    expect(onComplete).toHaveBeenCalledTimes(1);
  });

  it('renders exact Patch and Byte copy and only successfully used commands', async () => {
    const user = userEvent.setup();
    const onReturnToHq = vi.fn();
    render(
      <MissionDebriefScreen
        profile={debriefProfile(['ls', 'cat', 'help'])}
        onReturnToHq={onReturnToHq}
      />
    );

    expect(
      screen.getByText(
        'Recruit, your identity is verified. You recovered the missing note and followed its evidence to the correct result. Effective immediately, you are a Recruit Operative.'
      )
    ).toBeVisible();
    expect(
      screen.getByText("Officially recruited. I'll record the paperwork as my contribution.")
    ).toBeVisible();
    const record = screen.getByRole('heading', { name: 'Field record' }).closest('section');
    if (record === null) throw new Error('Expected the coded field record.');
    expect(within(record).getByText('ls')).toBeVisible();
    expect(within(record).getByText('cat')).toBeVisible();
    expect(within(record).getByText('help')).toBeVisible();
    expect(within(record).queryByText('cd')).not.toBeInTheDocument();
    expect(within(record).queryByText('clear')).not.toBeInTheDocument();
    expect(screen.getByText(/Rank:/)).toHaveTextContent('Rank: Recruit Operative');
    expect(screen.getByText(/Badge:/)).toHaveTextContent('Badge: Ghost File');
    expect(onReturnToHq).not.toHaveBeenCalled();
    await user.click(screen.getByRole('button', { name: 'Return to HQ' }));
    expect(onReturnToHq).toHaveBeenCalledTimes(1);
  });
});
