import { render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { useState } from 'react';
import { vi } from 'vitest';
import {
  createApplicantProfile,
  createOps001ActiveCheckpoint,
  type ByteNoticeId,
  type LocalOperativeProfile,
  type WorkspaceTool
} from '../../profile/localProfile';
import { MissionWorkspace } from './MissionWorkspace';
import { applyHintAssist, revealHintLevel } from '../../engine/stage9Guidance';

function WorkspaceHarness({
  unlocked = false,
  flagRecovered = false,
  notices = []
}: Readonly<{
  unlocked?: boolean;
  flagRecovered?: boolean;
  notices?: readonly ByteNoticeId[];
}>) {
  const initialCheckpoint = createOps001ActiveCheckpoint();
  const [profile, setProfile] = useState<LocalOperativeProfile>({
    ...createApplicantProfile('Nova'),
    progression: flagRecovered
      ? 'verification-flag-recovered'
      : unlocked
        ? 'verification-route-recovered'
        : 'operation-active-locate-message',
    fieldManualEntries: flagRecovered
      ? ['command-cat', 'note-browser-routes', 'note-verification-flags']
      : unlocked
        ? ['command-cat', 'note-browser-routes']
        : [],
    activeCheckpoint:
      unlocked || flagRecovered
        ? {
            ...initialCheckpoint,
            progression: flagRecovered
              ? 'verification-flag-recovered'
              : 'verification-route-recovered',
            objectiveId: flagRecovered ? 'OBJ-004' : 'OBJ-003',
            completedMilestones: flagRecovered
              ? ['OBJ-001', 'OBJ-002', 'OBJ-003']
              : ['OBJ-001', 'OBJ-002'],
            activeEvidenceIds: flagRecovered
              ? ['EV-001', 'EV-002', 'EV-003']
              : ['EV-001', 'EV-002'],
            pendingByteNotices: notices
          }
        : { ...initialCheckpoint, pendingByteNotices: notices }
  });
  const [selectedTools, setSelectedTools] = useState<WorkspaceTool[]>([]);

  function selectTool(tool: WorkspaceTool) {
    setSelectedTools((current) => [...current, tool]);
    setProfile((current) => ({
      ...current,
      activeCheckpoint:
        current.activeCheckpoint === null ? null : { ...current.activeCheckpoint, activeTool: tool }
    }));
  }

  return (
    <>
      <MissionWorkspace
        profile={profile}
        commandAssistance={false}
        onSelectTool={selectTool}
        onSubmitCommand={() => undefined}
        onPrepareCommand={() => undefined}
        onClearPreparedCommand={() => undefined}
        onDismissByteNotice={() =>
          setProfile((current) => ({
            ...current,
            activeCheckpoint:
              current.activeCheckpoint === null
                ? null
                : {
                    ...current.activeCheckpoint,
                    pendingByteNotices: current.activeCheckpoint.pendingByteNotices.slice(1)
                  }
          }))
        }
        onRevealByteHint={(hintId, level) =>
          setProfile((current) => ({
            ...current,
            activeCheckpoint:
              current.activeCheckpoint === null
                ? null
                : revealHintLevel(current.activeCheckpoint, hintId, level)
          }))
        }
        onUseByteAssist={(hintId) =>
          setProfile((current) => ({
            ...current,
            activeCheckpoint:
              current.activeCheckpoint === null
                ? null
                : applyHintAssist(current.activeCheckpoint, hintId)
          }))
        }
        onPrepareMissionControlFlag={() =>
          setProfile((current) => ({
            ...current,
            activeCheckpoint:
              current.activeCheckpoint === null
                ? null
                : {
                    ...current.activeCheckpoint,
                    missionControl: {
                      input: 'FLAG{WELCOME_TO_HQ}',
                      validation: 'idle',
                      preparationSource: 'evidence',
                      revision: current.activeCheckpoint.missionControl.revision + 1
                    }
                  }
          }))
        }
        onClearPreparedBrowserRoute={() => undefined}
        onOpenBrowserRoute={() => undefined}
        onBrowserHome={() => undefined}
        onBrowserBack={() => undefined}
        onUpdateMissionControlInput={(value) =>
          setProfile((current) => ({
            ...current,
            activeCheckpoint:
              current.activeCheckpoint === null
                ? null
                : {
                    ...current.activeCheckpoint,
                    missionControl: {
                      ...current.activeCheckpoint.missionControl,
                      input: value,
                      validation: 'idle'
                    }
                  }
          }))
        }
        onSubmitMissionControlFlag={() => undefined}
        onOpenSettings={() => undefined}
        onReturnHq={() => undefined}
      />
      <output data-testid="selected-tools">{selectedTools.join(',')}</output>
    </>
  );
}

describe('MissionWorkspace tool tabs', () => {
  it('wraps between Terminal and Evidence while Browser uses button semantics', async () => {
    const user = userEvent.setup();
    render(<WorkspaceHarness />);

    const terminal = screen.getByRole('tab', { name: 'Terminal' });
    const evidence = screen.getByRole('tab', { name: 'Evidence' });
    const browser = screen.getByRole('button', { name: 'Browser' });

    terminal.focus();
    await user.keyboard('{ArrowRight}');
    expect(evidence).toHaveFocus();
    expect(evidence).toHaveAttribute('aria-selected', 'true');

    await user.keyboard('{ArrowRight}');
    expect(terminal).toHaveFocus();

    await user.keyboard('{ArrowLeft}');
    expect(evidence).toHaveFocus();

    await user.keyboard('{End}');
    expect(evidence).toHaveFocus();
    expect(evidence).toHaveAttribute('aria-selected', 'true');

    await user.keyboard('{Home}');
    expect(terminal).toHaveFocus();
    expect(terminal).toHaveAttribute('aria-selected', 'true');

    expect(browser).toHaveAttribute('aria-haspopup', 'dialog');
    expect(
      screen.queryByText('The Field Browser will activate when a route is recovered.')
    ).not.toBeInTheDocument();
    expect(screen.getByTestId('selected-tools')).toHaveTextContent(
      'evidence,terminal,evidence,evidence,terminal'
    );
  });

  it('opens a focused Browser, traps focus and restores the opener without changing tools', async () => {
    const user = userEvent.setup();
    render(<WorkspaceHarness />);

    const browser = screen.getByRole('button', { name: 'Browser' });
    await user.click(browser);
    const dialog = screen.getByRole('dialog', { name: 'Field Browser' });
    const close = screen.getByRole('button', { name: 'Close Browser' });
    expect(close).toHaveFocus();
    expect(screen.getByRole('heading', { name: 'Welcome to OpSlyce HQ' })).toBeVisible();
    expect(screen.getByText('OBJ-001')).toBeVisible();
    expect(screen.getByLabelText('Byte assistant')).toBeVisible();
    expect(screen.getByLabelText('Operation support')).toHaveAttribute('inert');
    expect(dialog).toContainElement(close);
    await user.keyboard('{Escape}');
    expect(screen.queryByRole('dialog', { name: 'Field Browser' })).not.toBeInTheDocument();
    expect(browser).toHaveFocus();
    expect(screen.getByRole('tab', { name: 'Terminal' })).toHaveAttribute('aria-selected', 'true');
  });

  it('keeps the two-tab keyboard contract after route recovery', async () => {
    const user = userEvent.setup();
    render(<WorkspaceHarness unlocked />);
    const terminal = screen.getByRole('tab', { name: 'Terminal' });
    const evidence = screen.getByRole('tab', { name: 'Evidence' });

    terminal.focus();
    await user.keyboard('{ArrowLeft}');
    expect(evidence).toHaveFocus();
    await user.keyboard('{ArrowRight}');
    expect(terminal).toHaveFocus();
    await user.keyboard('{ArrowRight}');
    expect(evidence).toHaveFocus();
    await user.keyboard('{End}');
    expect(evidence).toHaveFocus();
    await user.keyboard('{Home}');
    expect(terminal).toHaveFocus();
    expect(
      screen.queryByText('The Field Browser will activate when a route is recovered.')
    ).not.toBeInTheDocument();
  });

  it('renders compact Evidence with manual route copy and keeps Browser deliberate', async () => {
    const user = userEvent.setup();
    const writeText = vi.fn().mockResolvedValue(undefined);
    Object.defineProperty(navigator, 'clipboard', {
      configurable: true,
      value: { writeText }
    });
    render(<WorkspaceHarness unlocked />);
    await user.click(screen.getByRole('tab', { name: 'Evidence' }));
    expect(screen.getByRole('heading', { name: 'NOTE RECOVERED' })).toBeVisible();
    expect(
      screen.getByText('Agent Trace’s training message was located in the Recruit Workspace.')
    ).toBeVisible();
    expect(screen.getByRole('heading', { name: 'HQ TRAINING ROUTE' })).toBeVisible();
    expect(screen.queryByRole('heading', { name: 'Evidence' })).not.toBeInTheDocument();
    expect(screen.getByRole('textbox', { name: 'Verification route' })).toHaveValue(
      '/recruit-verification'
    );
    expect(screen.queryByRole('button', { name: 'Prepare in Browser' })).not.toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: 'Copy verification route' }));
    expect(writeText).toHaveBeenCalledWith('/recruit-verification');
    expect(screen.getByText('Copied')).toBeVisible();
    expect(screen.getByRole('tab', { name: 'Evidence' })).toHaveAttribute('aria-selected', 'true');
    expect(screen.queryByRole('dialog', { name: 'Field Browser' })).not.toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: 'Browser' }));
    expect(screen.getByRole('heading', { name: 'Welcome to OpSlyce HQ' })).toBeVisible();
    expect(screen.getByRole('textbox', { name: 'Route' })).toBeEnabled();
    expect(screen.getByRole('button', { name: 'Open Route' })).toBeVisible();
  });

  it('shows the same encountered Manual entry copy in the Workspace renderer', async () => {
    const user = userEvent.setup();
    render(<WorkspaceHarness unlocked />);
    await user.click(screen.getByRole('button', { name: 'Field Manual' }));
    expect(screen.getByText('cat')).toBeVisible();
    expect(screen.getByText('Read a text file')).toBeVisible();
    expect(screen.getByText('Browser routes')).toBeVisible();
    expect(
      screen.getByText('A route beginning with / identifies a page inside a site.')
    ).toBeVisible();
    expect(screen.queryByText(/fictional site/u)).not.toBeInTheDocument();
  });

  it('keeps the recovered route selectable when clipboard access is unavailable', async () => {
    const user = userEvent.setup();
    Object.defineProperty(navigator, 'clipboard', {
      configurable: true,
      value: { writeText: vi.fn().mockRejectedValue(new Error('unavailable')) }
    });
    render(<WorkspaceHarness unlocked />);
    await user.click(screen.getByRole('tab', { name: 'Evidence' }));
    const route = screen.getByRole('textbox', { name: 'Verification route' });
    await user.click(screen.getByRole('button', { name: 'Copy verification route' }));
    expect(
      await screen.findByText('Copy unavailable. Select the route and copy it manually.')
    ).toBeVisible();
    await waitFor(() => expect(route).toHaveFocus());
    expect(route).toHaveValue('/recruit-verification');
    expect(screen.queryByRole('dialog', { name: 'Field Browser' })).not.toBeInTheDocument();
  });

  it('moves focus into Mission Control and returns it to Evidence after EV-003 preparation', async () => {
    const user = userEvent.setup();
    render(<WorkspaceHarness flagRecovered />);
    await user.click(screen.getByRole('tab', { name: 'Evidence' }));
    expect(screen.getByRole('heading', { name: 'VERIFICATION FLAG' })).toBeVisible();
    expect(screen.getByText('Status: Awaiting verification')).toBeVisible();
    await user.click(screen.getByRole('button', { name: 'Prepare for Mission Control' }));
    const close = screen.getByRole('button', { name: 'Close' });
    expect(close).toHaveFocus();
    expect(screen.getByRole('textbox', { name: 'Verification flag' })).toHaveValue(
      'FLAG{WELCOME_TO_HQ}'
    );
    expect(screen.getByRole('button', { name: 'Submit' })).toBeEnabled();
    expect(screen.getByText('The recovered flag is ready for verification.')).toBeVisible();
    await user.click(close);
    const evidence = screen.getByRole('tab', { name: 'Evidence' });
    expect(evidence).toHaveFocus();
    expect(evidence).toHaveAttribute('aria-selected', 'true');
  });

  it('keeps the unrecovered helper accurate when a flag is typed before EV-003', async () => {
    const user = userEvent.setup();
    render(<WorkspaceHarness />);
    await user.click(screen.getByRole('button', { name: 'Mission Control' }));
    await user.type(
      screen.getByRole('textbox', { name: 'Verification flag' }),
      'FLAG{WELCOME_TO_HQ}'
    );
    expect(screen.getByText('No verification flag has been recovered.')).toBeVisible();
    expect(
      screen.queryByText('The recovered flag is ready for verification.')
    ).not.toBeInTheDocument();
  });

  it('shows the recovered helper after EV-003 even while the field is empty', async () => {
    const user = userEvent.setup();
    render(<WorkspaceHarness flagRecovered />);
    await user.click(screen.getByRole('button', { name: 'Mission Control' }));
    expect(screen.getByRole('textbox', { name: 'Verification flag' })).toHaveValue('');
    expect(screen.getByText('The recovered flag is ready for verification.')).toBeVisible();
    expect(screen.queryByText('No verification flag has been recovered.')).not.toBeInTheDocument();
  });

  it('keeps Byte in a stable assistant dock and dismisses the live notice to idle', async () => {
    const user = userEvent.setup();
    render(<WorkspaceHarness notices={['command-ls']} />);

    const dock = screen.getByLabelText('Byte assistant');
    const terminal = screen.getByRole('tabpanel', { name: 'Terminal' });
    expect(within(dock).getByRole('img', { name: 'Byte' })).toBeVisible();
    expect(
      within(dock).getByText('ls lists the files and folders in your current location.')
    ).toBeVisible();
    expect(within(terminal).queryByRole('img', { name: 'Byte' })).not.toBeInTheDocument();

    await user.click(within(dock).getByRole('button', { name: 'Dismiss' }));
    expect(within(dock).getByText('Standing by.')).toBeVisible();
  });

  it('removes the temporary Hints control and opens progressive guidance from Ask Byte', async () => {
    const user = userEvent.setup();
    render(<WorkspaceHarness />);
    expect(screen.queryByRole('button', { name: 'Hints' })).not.toBeInTheDocument();
    const askByte = screen.getByRole('button', { name: 'Ask Byte' });
    await user.click(askByte);
    expect(screen.getByRole('heading', { name: 'Ask Byte' })).toBeVisible();
    expect(screen.getByRole('button', { name: 'Close' })).toHaveFocus();
    expect(screen.queryByText('Hints carry no penalty.')).not.toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Show Nudge' })).toBeVisible();
    expect(
      screen.queryByText('Use ls to list the files and folders here.')
    ).not.toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: 'Show Nudge' }));
    expect(
      screen.getByText('Start by checking what is already available in the Recruit Workspace.')
    ).toBeVisible();
    await user.click(screen.getByRole('button', { name: 'Show Instruction' }));
    expect(screen.getByText('Use ls to list the files and folders here.')).toBeVisible();
    await user.click(screen.getByRole('button', { name: 'Use Byte Assist for H-001' }));
    expect(screen.getByRole('textbox', { name: 'Command' })).toHaveValue('ls');
    expect(screen.getByRole('textbox', { name: 'Command' })).toHaveFocus();
    await user.click(screen.getByRole('button', { name: 'Ask Byte' }));
    expect(screen.getByText("I've prepared ls. Press Run when you're ready.")).toBeVisible();
    expect(
      screen.getByRole('button', { name: 'Prepare Byte Assist again for H-001' })
    ).toBeVisible();
  });

  it('returns focus from Byte guidance to Ask Byte', async () => {
    const user = userEvent.setup();
    render(<WorkspaceHarness />);
    const askByte = screen.getByRole('button', { name: 'Ask Byte' });
    await user.click(askByte);
    await user.click(screen.getByRole('button', { name: 'Close' }));
    expect(askByte).toHaveFocus();
  });

  it('uses Browser Assist to prepare the route without navigating', async () => {
    const user = userEvent.setup();
    render(<WorkspaceHarness unlocked />);
    await user.click(screen.getByRole('button', { name: 'Ask Byte' }));
    await user.click(screen.getByRole('button', { name: 'Show Nudge' }));
    await user.click(screen.getByRole('button', { name: 'Show Instruction' }));
    await user.click(screen.getByRole('button', { name: 'Use Byte Assist for H-004' }));
    expect(screen.getByRole('dialog', { name: 'Field Browser' })).toBeVisible();
    expect(screen.getByRole('button', { name: 'Close Browser' })).toHaveFocus();
    expect(screen.getByRole('textbox', { name: 'Route' })).toHaveValue('/recruit-verification');
    expect(screen.getByRole('heading', { name: 'Welcome to OpSlyce HQ' })).toBeVisible();
    expect(screen.queryByText('FLAG{WELCOME_TO_HQ}')).not.toBeInTheDocument();
  });

  it('uses Mission Control Assist to prepare but not submit the flag', async () => {
    const user = userEvent.setup();
    render(<WorkspaceHarness flagRecovered />);
    await user.click(screen.getByRole('button', { name: 'Ask Byte' }));
    await user.click(screen.getByRole('button', { name: 'Show Nudge' }));
    await user.click(screen.getByRole('button', { name: 'Show Instruction' }));
    await user.click(screen.getByRole('button', { name: 'Use Byte Assist for H-005' }));
    expect(screen.getByRole('heading', { name: 'Mission Control' })).toBeVisible();
    expect(screen.getByRole('button', { name: 'Close' })).toHaveFocus();
    expect(screen.getByRole('textbox', { name: 'Verification flag' })).toHaveValue(
      'FLAG{WELCOME_TO_HQ}'
    );
    expect(screen.getByRole('button', { name: 'Submit' })).toBeEnabled();
    expect(screen.getByText('OBJ-004')).toBeVisible();
  });
});
