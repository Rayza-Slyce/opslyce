import { act, render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, beforeEach, vi } from 'vitest';
import { createApplicantProfile, createOps001ActiveCheckpoint } from '../../profile/localProfile';
import { DashboardScreen } from './DashboardScreen';

function stage10Profile(
  progression:
    | 'recruit-operative'
    | 'anomaly-recorded'
    | 'anomaly-review-pending'
    | 'incident-teaser-pending'
    | 'incident-teaser-received'
    | 'incident-teaser-read'
    | 'operation-completion'
    | 'operation-complete'
) {
  const checkpoint = createOps001ActiveCheckpoint();
  const anomaly = progression !== 'recruit-operative';
  return {
    ...createApplicantProfile('Nova'),
    rank: 'Recruit Operative' as const,
    badges: ['ghost-file'],
    completedMissions: ['OPS-001'],
    persistentEvidence: anomaly ? ['EV-005'] : [],
    progression,
    activeCheckpoint: {
      ...checkpoint,
      progression,
      objectiveId: 'OBJ-005' as const,
      completedMilestones: ['OBJ-001', 'OBJ-002', 'OBJ-003', 'OBJ-004'] as const,
      activeEvidenceIds: anomaly
        ? (['EV-001', 'EV-002', 'EV-003', 'EV-004', 'EV-005'] as const)
        : (['EV-001', 'EV-002', 'EV-003', 'EV-004'] as const),
      verifiedEvidenceIds: ['EV-003'] as const,
      missionControl: { ...checkpoint.missionControl, validation: 'accepted' as const }
    }
  };
}

function createActions() {
  return {
    onOpenWelcome: vi.fn(),
    onOpenOperation: vi.fn(),
    onOpenFieldManual: vi.fn(),
    onOpenSettings: vi.fn(),
    onPromotionSettled: vi.fn(),
    onAnomalyReactionsSettled: vi.fn(),
    onEvidenceReviewed: vi.fn(),
    onIncidentReady: vi.fn(),
    onReadIncident: vi.fn(),
    onIncidentClosed: vi.fn(),
    onReturnFromCompletion: vi.fn()
  };
}

async function advancePresentationBeat() {
  await act(() => vi.runOnlyPendingTimers());
}

describe('Stage 10 HQ presentation', () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.stubGlobal(
      'matchMedia',
      vi.fn(() => ({ matches: false }))
    );
  });

  afterEach(() => {
    vi.useRealTimers();
    vi.unstubAllGlobals();
  });

  it('shows a stable promotion beat before requesting anomaly recording', async () => {
    const actions = createActions();
    render(<DashboardScreen profile={stage10Profile('recruit-operative')} {...actions} />);

    expect(screen.getByText('AGENT STATUS UPDATED')).toBeVisible();
    expect(screen.getByText('RECRUIT OPERATIVE')).toBeVisible();
    expect(screen.getByRole('img', { name: 'Ghost File badge' })).toBeVisible();
    expect(screen.queryByText('UNIDENTIFIED SIGNAL')).not.toBeInTheDocument();
    expect(document.querySelector('[data-live-reaction="byte"]')).not.toBeInTheDocument();
    expect(screen.queryByText('NEW INCIDENT REPORTED')).not.toBeInTheDocument();
    expect(screen.queryByText('OPS-001 COMPLETE')).not.toBeInTheDocument();
    expect(screen.getByRole('heading', { name: 'Active Operation' })).toBeVisible();
    expect(actions.onPromotionSettled).not.toHaveBeenCalled();

    await advancePresentationBeat();
    expect(actions.onPromotionSettled).toHaveBeenCalledTimes(1);
  });

  it('stages detection, capture, Byte and Patch before allowing the teaser', async () => {
    const actions = createActions();
    const { rerender } = render(
      <DashboardScreen profile={stage10Profile('anomaly-recorded')} {...actions} />
    );

    const signal = screen.getByText('UNIDENTIFIED SIGNAL').closest('[data-contained-signal]');
    if (!(signal instanceof HTMLElement))
      throw new Error('Expected a contained signal-monitoring region.');
    expect(signal).toHaveAttribute('data-signal-phase', 'detecting');
    expect(signal).toHaveAttribute('data-signal-presentation', 'transient');
    expect(document.querySelector('[data-hq-dashboard]')).toHaveAttribute(
      'data-dashboard-priority',
      'signal'
    );
    expect(within(signal).queryByText('SOURCE: UNKNOWN')).not.toBeInTheDocument();
    expect(within(signal).queryByText('TRACE FAILED')).not.toBeInTheDocument();
    expect(within(signal).queryByRole('img')).not.toBeInTheDocument();
    expect(document.querySelector('[data-live-reaction="byte"]')).not.toBeInTheDocument();
    expect(document.querySelector('[data-live-reaction="patch"]')).not.toBeInTheDocument();
    expect(screen.queryByText('NEW INCIDENT REPORTED')).not.toBeInTheDocument();
    expect(
      screen.queryByRole('button', { name: 'Review EV-005 evidence' })
    ).not.toBeInTheDocument();

    await advancePresentationBeat();
    expect(signal).toHaveAttribute('data-signal-phase', 'captured');
    expect(document.querySelector('[data-hq-dashboard]')).toHaveAttribute(
      'data-dashboard-priority',
      'signal'
    );
    expect(within(signal).getByText('SOURCE: UNKNOWN')).toBeVisible();
    expect(within(signal).queryByText('TRACE FAILED')).not.toBeInTheDocument();
    expect(
      within(signal).getByRole('img', { name: 'Captured unidentified signal mark' })
    ).toBeVisible();
    expect(signal.querySelectorAll('[data-signal-effect="contained"] img')).toHaveLength(2);

    await advancePresentationBeat();
    expect(signal).toHaveAttribute('data-signal-phase', 'trace-failed');
    expect(document.querySelector('[data-hq-dashboard]')).toHaveAttribute(
      'data-dashboard-priority',
      'signal'
    );
    expect(within(signal).getByText('TRACE FAILED')).toBeVisible();
    expect(document.querySelector('[data-live-reaction="byte"]')).not.toBeInTheDocument();

    await advancePresentationBeat();
    expect(signal).toHaveAttribute('data-signal-phase', 'byte-reaction');
    expect(document.querySelector('[data-hq-dashboard]')).not.toHaveAttribute(
      'data-dashboard-priority'
    );
    const byteReaction = document.querySelector('[data-live-reaction="byte"]');
    if (!(byteReaction instanceof HTMLElement)) throw new Error('Expected Byte live reaction.');
    expect(byteReaction.querySelector('[data-reaction-copy]')).toHaveTextContent(
      postMissionByteCopy
    );
    expect(byteReaction).toHaveAttribute('data-reaction-state', 'revealing');
    expect(within(byteReaction).getByRole('img', { name: 'Byte portrait' })).toBeVisible();
    expect(byteReaction.querySelectorAll('[data-reaction-segment]')).toHaveLength(2);
    expect(screen.getByRole('dialog', { name: 'HQ RESPONSE' })).toHaveFocus();
    const communications = document.querySelector('[aria-labelledby="communications-heading"]');
    expect(communications?.querySelector('[data-live-reaction="byte"]')).toBeNull();
    expect(document.querySelector('[data-live-reaction="patch"]')).not.toBeInTheDocument();
    expect(screen.queryByText('NEW INCIDENT REPORTED')).not.toBeInTheDocument();

    await advancePresentationBeat();
    expect(signal).toHaveAttribute('data-signal-phase', 'patch-reaction');
    expect(byteReaction.querySelector('[data-reaction-copy]')).toHaveTextContent(
      postMissionByteCopy
    );
    const patchReaction = document.querySelector('[data-live-reaction="patch"]');
    if (!(patchReaction instanceof HTMLElement)) throw new Error('Expected Patch live reaction.');
    expect(patchReaction.querySelector('[data-reaction-copy]')).toHaveTextContent(
      postMissionPatchCopy
    );
    expect(patchReaction).toHaveAttribute('data-reaction-state', 'revealing');
    expect(
      within(patchReaction).getByRole('img', { name: 'Director Patch portrait' })
    ).toBeVisible();
    expect(patchReaction.querySelectorAll('[data-reaction-segment]')).toHaveLength(3);
    expect(screen.queryByText('NEW INCIDENT REPORTED')).not.toBeInTheDocument();
    expect(actions.onAnomalyReactionsSettled).not.toHaveBeenCalled();

    await advancePresentationBeat();
    expect(actions.onAnomalyReactionsSettled).toHaveBeenCalledTimes(1);
    rerender(<DashboardScreen profile={stage10Profile('anomaly-review-pending')} {...actions} />);
    expect(screen.queryByText('NEW INCIDENT REPORTED')).not.toBeInTheDocument();
    const response = screen.getByRole('dialog', { name: 'HQ RESPONSE' });
    expect(response).toHaveAttribute('data-response-complete', 'true');
    expect(
      within(response).getByRole('button', { name: 'Review captured evidence' })
    ).toBeVisible();
    expect(response.querySelector('[data-live-reaction="byte"]')).toHaveTextContent(
      postMissionByteCopy
    );
    expect(response.querySelector('[data-live-reaction="patch"]')).toHaveTextContent(
      postMissionPatchCopy
    );
    expect(document.querySelector('[data-contained-signal]')).not.toBeInTheDocument();
    expect(document.querySelector('[data-hq-dashboard]')).toHaveAttribute('inert');
  });

  it('delivers the incident as an inspectable incoming communication after evidence review', async () => {
    vi.useRealTimers();
    const user = userEvent.setup();
    const actions = createActions();
    const { rerender } = render(
      <DashboardScreen profile={stage10Profile('incident-teaser-pending')} {...actions} />
    );

    expect(screen.queryByText('NEW INCIDENT REPORTED')).not.toBeInTheDocument();

    await vi.waitFor(() => expect(actions.onIncidentReady).toHaveBeenCalledTimes(1));
    rerender(<DashboardScreen profile={stage10Profile('incident-teaser-received')} {...actions} />);

    const communications = screen
      .getByRole('heading', { name: 'Communications' })
      .closest('section');
    if (!(communications instanceof HTMLElement)) throw new Error('Expected Communications.');
    const teaser = within(communications)
      .getByText('NEW INCIDENT REPORTED')
      .closest('[data-incident-teaser]');
    if (!(teaser instanceof HTMLElement)) throw new Error('Expected the coded incident teaser.');
    expect(communications.querySelector('[data-live-reaction="byte"]')).not.toBeVisible();
    expect(communications.querySelector('[data-live-reaction="patch"]')).not.toBeVisible();
    expect(within(teaser).queryByText('Further assignment pending.')).not.toBeInTheDocument();
    const openIncident = within(teaser).getByRole('button', { name: 'Open incident' });
    await user.click(openIncident);
    expect(actions.onReadIncident).toHaveBeenCalledTimes(1);
    const dialog = screen.getByRole('dialog', { name: 'NEW INCIDENT REPORTED' });
    expect(within(dialog).getByText('Further assignment pending.')).toBeVisible();
    expect(within(dialog).queryByRole('link')).not.toBeInTheDocument();
    expect(
      within(dialog).queryByRole('button', { name: /start|accept/iu })
    ).not.toBeInTheDocument();
    rerender(<DashboardScreen profile={stage10Profile('incident-teaser-read')} {...actions} />);
    await user.click(within(dialog).getByRole('button', { name: 'Close communication' }));
    expect(actions.onIncidentClosed).toHaveBeenCalledTimes(1);
    expect(within(teaser).queryByRole('link')).not.toBeInTheDocument();
    rerender(<DashboardScreen profile={stage10Profile('operation-completion')} {...actions} />);
    const completion = screen.getByRole('dialog', { name: 'OPS-001 COMPLETE' });
    expect(completion).toHaveFocus();
    expect(within(completion).getByText('Recruitment Day')).toBeVisible();
    expect(within(completion).getByText('Recruit Operative')).toBeVisible();
    expect(within(completion).getByText('Ghost File earned')).toBeVisible();
    expect(within(completion).getByText('EV-005 logged')).toBeVisible();
    expect(within(completion).getByText('Status: Unresolved')).toBeVisible();
    expect(within(completion).getByText('Further assignment pending.')).toBeVisible();
    expect(
      within(completion).getByText('More operations are coming in a future update.')
    ).toBeVisible();
    expect(within(completion).queryByRole('button', { name: /OPS-002|start|accept/iu })).toBeNull();
    await user.click(within(completion).getByRole('button', { name: 'Return to HQ' }));
    expect(actions.onReturnFromCompletion).toHaveBeenCalledTimes(1);

    rerender(<DashboardScreen profile={stage10Profile('operation-complete')} {...actions} />);
    expect(screen.queryByRole('dialog', { name: 'OPS-001 COMPLETE' })).not.toBeInTheDocument();
    expect(screen.getByRole('heading', { name: 'Completed Operation' })).toBeVisible();
    await user.click(within(communications).getByText('Review anomaly responses'));
    expect(communications.querySelectorAll('[data-live-reaction="byte"]')).toHaveLength(1);
    expect(communications.querySelectorAll('[data-live-reaction="patch"]')).toHaveLength(1);
    expect(communications.querySelector('[data-live-reaction="byte"]')).toHaveTextContent(
      postMissionByteCopy
    );
    expect(communications.querySelector('[data-live-reaction="patch"]')).toHaveTextContent(
      postMissionPatchCopy
    );
    expect(within(communications).getByRole('img', { name: 'Byte portrait' })).toBeVisible();
    expect(
      within(communications).getByRole('img', { name: 'Director Patch portrait' })
    ).toBeVisible();
    const review = within(communications).getByRole('button', { name: 'Review welcome' });
    expect(review).toBeVisible();
    await user.click(review);
    expect(actions.onOpenWelcome).toHaveBeenCalledTimes(1);
  });

  it('opens the same focused EV-005 record from completion and Evidence Summary', async () => {
    vi.useRealTimers();
    const user = userEvent.setup();
    render(
      <DashboardScreen profile={stage10Profile('incident-teaser-read')} {...createActions()} />
    );

    const openers = [
      screen.getByRole('button', { name: 'Review captured evidence' }),
      screen.getByRole('button', { name: 'Inspect mark' })
    ];

    for (const opener of openers) {
      await user.click(opener);
      const dialog = screen.getByRole('dialog', { name: 'UNIDENTIFIED INTRUSION MARK' });
      expect(dialog).toBeVisible();
      expect(within(dialog).getByText('EV-005')).toBeVisible();
      expect(
        within(dialog).getByRole('img', { name: 'Saved unidentified intrusion mark' })
      ).toBeVisible();
      expect(
        within(dialog).getByText(
          'Detected during an anomalous signal event immediately after OPS-001.'
        )
      ).toBeVisible();
      expect(within(dialog).getByText('Source and meaning unknown.')).toBeVisible();
      expect(within(dialog).getByText('Unresolved').closest('p')).toHaveTextContent(
        'Status: Unresolved'
      );
      expect(dialog).not.toHaveTextContent(/Cipher Vane|Agent Trace/iu);
      expect(screen.getByRole('button', { name: 'Close evidence' })).toHaveFocus();
      expect(document.querySelector('[data-hq-dashboard]')).toHaveAttribute('inert');

      await user.keyboard('{Escape}');
      expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
      expect(opener).toHaveFocus();
      expect(screen.getAllByText('UNIDENTIFIED INTRUSION MARK')).toHaveLength(1);
    }
  });

  it('completes the evidence-review gate only when a shared EV-005 viewer is closed', async () => {
    vi.useRealTimers();
    const user = userEvent.setup();
    const actions = createActions();
    render(<DashboardScreen profile={stage10Profile('anomaly-review-pending')} {...actions} />);
    const response = screen.getByRole('dialog', { name: 'HQ RESPONSE' });
    await user.click(within(response).getByRole('button', { name: 'Review captured evidence' }));
    expect(actions.onEvidenceReviewed).not.toHaveBeenCalled();
    await user.keyboard('{Escape}');
    expect(actions.onEvidenceReviewed).toHaveBeenCalledTimes(1);
    expect(actions.onIncidentReady).not.toHaveBeenCalled();
  });

  it('keeps the captured EV-005 view readable when reduced motion is requested', async () => {
    vi.useRealTimers();
    vi.stubGlobal(
      'matchMedia',
      vi.fn(() => ({ matches: true }))
    );
    const user = userEvent.setup();
    render(
      <DashboardScreen profile={stage10Profile('incident-teaser-read')} {...createActions()} />
    );

    await user.click(screen.getByRole('button', { name: 'Review captured evidence' }));
    const dialog = screen.getByRole('dialog', { name: 'UNIDENTIFIED INTRUSION MARK' });
    expect(
      within(dialog).getByRole('img', { name: 'Saved unidentified intrusion mark' })
    ).toBeVisible();
    expect(within(dialog).getByText('Source and meaning unknown.')).toBeVisible();
  });

  it('preserves the semantic beat order with reduced motion', async () => {
    vi.stubGlobal(
      'matchMedia',
      vi.fn(() => ({ matches: true }))
    );
    const actions = createActions();
    render(<DashboardScreen profile={stage10Profile('anomaly-recorded')} {...actions} />);
    const signal = screen.getByText('UNIDENTIFIED SIGNAL').closest('[data-contained-signal]');
    if (!(signal instanceof HTMLElement)) throw new Error('Expected contained signal data.');

    expect(signal).toHaveAttribute('data-signal-phase', 'detecting');
    await advancePresentationBeat();
    expect(signal).toHaveAttribute('data-signal-phase', 'captured');
    await advancePresentationBeat();
    expect(signal).toHaveAttribute('data-signal-phase', 'trace-failed');
    await advancePresentationBeat();
    expect(document.querySelector('[data-live-reaction="byte"]')).toHaveTextContent(
      postMissionByteCopy
    );
    expect(document.querySelector('[data-live-reaction="byte"]')).toHaveAttribute(
      'data-reaction-state',
      'revealing'
    );
    expect(document.querySelector('[data-live-reaction="patch"]')).not.toBeInTheDocument();
    await advancePresentationBeat();
    expect(document.querySelector('[data-live-reaction="patch"]')).toHaveTextContent(
      postMissionPatchCopy
    );
    expect(screen.queryByText('NEW INCIDENT REPORTED')).not.toBeInTheDocument();
  });

  it('restarts only transient choreography after a remount without advancing mission truth', async () => {
    const actions = createActions();
    const first = render(
      <DashboardScreen profile={stage10Profile('anomaly-recorded')} {...actions} />
    );
    await advancePresentationBeat();
    await advancePresentationBeat();
    await advancePresentationBeat();
    expect(document.querySelector('[data-live-reaction="byte"]')).toBeInTheDocument();
    expect(actions.onAnomalyReactionsSettled).not.toHaveBeenCalled();

    first.unmount();
    render(<DashboardScreen profile={stage10Profile('anomaly-recorded')} {...actions} />);
    expect(
      screen.getByText('UNIDENTIFIED SIGNAL').closest('[data-contained-signal]')
    ).toHaveAttribute('data-signal-phase', 'detecting');
    expect(document.querySelector('[data-live-reaction="byte"]')).not.toBeInTheDocument();
    expect(document.querySelector('[data-live-reaction="patch"]')).not.toBeInTheDocument();
    expect(screen.queryByText('NEW INCIDENT REPORTED')).not.toBeInTheDocument();
    expect(actions.onAnomalyReactionsSettled).not.toHaveBeenCalled();
  });

  it('keeps EV-005 unresolved and ordinary Dashboard regions stable in the resting state', () => {
    render(
      <DashboardScreen profile={stage10Profile('incident-teaser-read')} {...createActions()} />
    );

    expect(screen.getByRole('heading', { name: 'Communications' })).toBeVisible();
    expect(screen.getByRole('heading', { name: 'Agent Status' })).toBeVisible();
    expect(screen.getByRole('heading', { name: 'Evidence Summary' })).toBeVisible();
    expect(screen.getByText('Latest: Unidentified Intrusion Mark')).toBeVisible();
    expect(screen.getByRole('heading', { name: 'UNIDENTIFIED INTRUSION MARK' })).toBeVisible();
    expect(screen.getByText('Unresolved').closest('p')).toHaveTextContent('Status: Unresolved');
    expect(document.querySelector('[data-contained-signal]')).not.toBeInTheDocument();
    expect(document.body).not.toHaveTextContent(
      /system compromised|cipher vane|agent trace.*intrusion mark/iu
    );
  });
});

const postMissionByteCopy =
  "That definitely wasn't one of ours. I've saved the mark before it could disappear.";
const postMissionPatchCopy =
  'HQ has logged an unidentified signal event. We do not yet know its source or purpose. Keep the evidence; patterns matter.';
