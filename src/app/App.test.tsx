import { fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import {
  createApplicantProfile,
  createEmptyLocalSave,
  createOps001ActiveCheckpoint,
  type OperativeSettings
} from '../profile/localProfile';
import {
  createLocalSaveStorage,
  LOCAL_SAVE_STORAGE_KEY,
  type KeyValueStorage,
  type LocalSaveStorage
} from '../storage/localSaveStorage';
import { App } from './App';
import { GameEngineProvider } from './GameEngineProvider';

class MemoryStorage implements KeyValueStorage {
  readonly values = new Map<string, string>();

  getItem(key: string) {
    return this.values.get(key) ?? null;
  }

  setItem(key: string, value: string) {
    this.values.set(key, value);
  }
}

function renderAppAt(
  width: number,
  height: number,
  storage: LocalSaveStorage = createLocalSaveStorage(new MemoryStorage())
) {
  Object.defineProperties(window, {
    innerWidth: { configurable: true, value: width },
    innerHeight: { configurable: true, value: height }
  });

  return render(
    <GameEngineProvider storage={storage}>
      <App />
    </GameEngineProvider>
  );
}

function storageWithProfile(codename = 'Nova') {
  const storage = createLocalSaveStorage(new MemoryStorage());
  storage.save({
    profile: createApplicantProfile(codename),
    settings: createEmptyLocalSave().settings
  });
  return storage;
}

function createDeployedProfile(codename = 'Nova') {
  return {
    ...createApplicantProfile(codename),
    badges: ['training-badge'],
    completedMissions: ['training-record'],
    persistentEvidence: ['training-evidence'],
    fieldManualEntries: ['command-ls'] as const,
    progression: 'operation-active-locate-message' as const,
    activeCheckpoint: createOps001ActiveCheckpoint()
  };
}

function storageWithDeployedProfile(
  settings: OperativeSettings = {
    soundEffects: false,
    hqAmbience: true,
    commandAssistance: false
  }
) {
  const storage = createLocalSaveStorage(new MemoryStorage());
  storage.save({ profile: createDeployedProfile(), settings });
  return storage;
}

function storageWithFreshOperation(settings: OperativeSettings = createEmptyLocalSave().settings) {
  const storage = createLocalSaveStorage(new MemoryStorage());
  storage.save({
    profile: {
      ...createApplicantProfile('Nova'),
      progression: 'operation-active-locate-message',
      activeCheckpoint: createOps001ActiveCheckpoint()
    },
    settings
  });
  return storage;
}

async function enterDashboard(user: ReturnType<typeof userEvent.setup>) {
  await user.click(screen.getByRole('button', { name: 'Enter HQ' }));
  expect(screen.getByRole('heading', { name: 'HQ Dashboard' })).toBeVisible();
}

async function reviewWelcome(user: ReturnType<typeof userEvent.setup>) {
  await user.click(screen.getByRole('button', { name: 'Open transmission' }));
  await user.click(screen.getByRole('button', { name: 'Return to HQ' }));
}

describe('Stage 7 application flow', () => {
  it('creates an Applicant and enters the real Dashboard with genuine empty states', () => {
    renderAppAt(1024, 700);

    fireEvent.click(screen.getByRole('button', { name: 'Enter HQ' }));
    fireEvent.change(screen.getByRole('textbox', { name: 'Codename' }), {
      target: { value: '  Agent   Seven  ' }
    });
    fireEvent.click(screen.getByRole('button', { name: 'Register codename' }));

    expect(screen.getByRole('heading', { name: 'HQ Dashboard' })).toBeVisible();
    const dashboard = screen
      .getByRole('heading', { name: 'Communications' })
      .closest('[data-hq-dashboard]');
    if (!(dashboard instanceof HTMLElement)) {
      throw new Error('Dashboard areas must share the coded Dashboard layout root.');
    }
    expect(within(dashboard).getByRole('heading', { name: 'Active Operation' })).toBeVisible();
    expect(within(dashboard).getByRole('heading', { name: 'Agent Status' })).toBeVisible();
    expect(within(dashboard).getByRole('heading', { name: 'Evidence Summary' })).toBeVisible();
    expect(within(dashboard).getByRole('button', { name: 'Open transmission' })).toBeVisible();
    const agentStatus = screen.getByRole('heading', { name: 'Agent Status' }).closest('section');
    const evidence = screen.getByRole('heading', { name: 'Evidence Summary' }).closest('section');
    if (agentStatus === null || evidence === null) {
      throw new Error('Dashboard status panels must be rendered as sections.');
    }
    expect(within(agentStatus).getByText('Agent Seven')).toBeVisible();
    expect(within(agentStatus).getByText(/Applicant/)).toBeVisible();
    expect(within(evidence).getByText('No evidence recorded.')).toBeVisible();
    expect(screen.getByText('Incoming transmission from Director Patch.')).toBeVisible();
    expect(
      screen.queryByRole('heading', { name: 'Director Patch — Welcome' })
    ).not.toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'Settings' }));
    expect(screen.getByRole('checkbox', { name: /command assistance/i })).not.toBeChecked();
  });

  it('keeps OPS-001 unavailable until the welcome is explicitly opened', async () => {
    const user = userEvent.setup();
    renderAppAt(1024, 700, storageWithProfile());

    await enterDashboard(user);

    expect(
      screen.getByText('Review the incoming HQ transmission to receive your assigned operation.')
    ).toBeVisible();
    expect(
      screen.queryByRole('button', { name: /Open OPS-001 — Recruitment Day/ })
    ).not.toBeInTheDocument();
  });

  it('shows the exact welcome and persists its read state across reload', async () => {
    const user = userEvent.setup();
    const storage = storageWithProfile('Nova');
    const firstRender = renderAppAt(1024, 700, storage);

    await enterDashboard(user);
    await user.click(screen.getByRole('button', { name: 'Open transmission' }));

    expect(screen.getByRole('heading', { name: 'Director Patch — Welcome' })).toBeVisible();
    expect(screen.getByRole('img', { name: 'Director Patch' })).toBeVisible();
    expect(
      screen.getByText(
        'Welcome to OpSlyce HQ, Nova. Your applicant workspace is ready. Byte, your operations assistant, will be standing by with guidance when you need it. Complete the assigned verification operation and HQ will review your field status.'
      )
    ).toBeVisible();
    expect(storage.load().data.profile?.progression).toBe('welcome-read');

    firstRender.unmount();
    renderAppAt(1024, 700, storage);
    await enterDashboard(user);

    expect(
      screen.getByText('Director Patch’s welcome remains available for review.')
    ).toBeVisible();
    expect(screen.getByRole('button', { name: /Open OPS-001 — Recruitment Day/ })).toBeVisible();
  });

  it('activates only OPS-001 after welcome review and opens the exact briefing explicitly', async () => {
    const user = userEvent.setup();
    renderAppAt(1024, 700, storageWithProfile());

    await enterDashboard(user);
    await reviewWelcome(user);

    expect(screen.getByRole('heading', { name: 'HQ Dashboard' })).toBeVisible();
    expect(screen.queryByText(/Agent Trace left a training message/)).not.toBeInTheDocument();
    expect(screen.getByText('Operation codename: Ghost File')).toBeVisible();
    expect(screen.getByText('Difficulty: Recruit')).toBeVisible();
    expect(screen.getByText('Target: 10–15 minutes')).toBeVisible();
    expect(screen.getByText(/Main objective:/)).toHaveTextContent(
      "Main objective: Locate Agent Trace's missing message."
    );

    await user.click(screen.getByRole('button', { name: /Open OPS-001 — Recruitment Day/ }));

    expect(screen.getByRole('heading', { name: 'OPS-001 — Recruitment Day' })).toBeVisible();
    expect(
      screen.getByText(
        'Agent Trace left a training message inside your recruit workspace. Locate it, follow the evidence and recover the verification flag.'
      )
    ).toBeVisible();
    expect(screen.getByText("Locate Agent Trace's missing message.")).toBeVisible();
    expect(screen.getByText('Recruit Workspace')).toBeVisible();
    expect(screen.getByText('HQ Training Portal')).toBeVisible();
    expect(screen.getByText('Recover and submit the verification flag.')).toBeVisible();
    expect(screen.getByRole('heading', { name: 'Authorised systems' })).toBeVisible();
    expect(
      screen.getByText(
        'OPS-001 is authorised for the simulated Recruit Workspace and HQ Training Portal only. Stay within the assigned systems while completing the operation.'
      )
    ).toBeVisible();
  });

  it('persists briefing-read state and supports Back to HQ', async () => {
    const user = userEvent.setup();
    const storage = storageWithProfile();
    renderAppAt(1024, 700, storage);

    await enterDashboard(user);
    await reviewWelcome(user);
    await user.click(screen.getByRole('button', { name: /Open OPS-001 — Recruitment Day/ }));

    expect(storage.load().data.profile?.progression).toBe('briefing-read');
    await user.click(screen.getByRole('button', { name: 'Back to HQ' }));
    expect(screen.getByRole('heading', { name: 'HQ Dashboard' })).toBeVisible();
  });

  it('deploys by click, creates a genuine checkpoint and restores it from Continue Operation', async () => {
    const user = userEvent.setup();
    const storage = storageWithProfile();
    const firstRender = renderAppAt(1024, 700, storage);

    expect(screen.queryByRole('button', { name: 'Continue Operation' })).not.toBeInTheDocument();
    await enterDashboard(user);
    await reviewWelcome(user);
    await user.click(screen.getByRole('button', { name: /Open OPS-001 — Recruitment Day/ }));
    await user.click(screen.getByRole('button', { name: 'Deploy' }));

    expect(screen.getByRole('heading', { name: 'Current objective' })).toBeVisible();
    expect(storage.load().data.profile?.activeCheckpoint).toEqual(createOps001ActiveCheckpoint());

    firstRender.unmount();
    renderAppAt(1024, 700, storage);
    await user.click(screen.getByRole('button', { name: 'Continue Operation' }));
    expect(screen.getByRole('heading', { name: 'Resume operation' })).toBeVisible();
    expect(
      screen.getByText('Locate Agent Trace’s missing message in the Recruit Workspace.')
    ).toBeVisible();
    expect(screen.getByText('No evidence has been confirmed.')).toBeVisible();
    await user.click(screen.getByRole('button', { name: 'Continue Operation' }));
    expect(screen.getByRole('heading', { name: 'Current objective' })).toBeVisible();
  });

  it('shows the checkpoint objective at HQ without saving merely for the visit', async () => {
    const user = userEvent.setup();
    const memory = new MemoryStorage();
    createLocalSaveStorage(memory).save({
      profile: {
        ...createApplicantProfile('Nova'),
        progression: 'operation-active-locate-message',
        activeCheckpoint: createOps001ActiveCheckpoint()
      },
      settings: createEmptyLocalSave().settings
    });
    let writes = 0;
    const storage = createLocalSaveStorage({
      getItem: (key) => memory.getItem(key),
      setItem(key, value) {
        writes += 1;
        memory.setItem(key, value);
      }
    });

    renderAppAt(1024, 700, storage);
    await user.click(screen.getByRole('button', { name: 'Continue Operation' }));
    await user.click(screen.getByRole('button', { name: 'Continue Operation' }));
    await user.click(screen.getByRole('button', { name: 'HQ' }));

    const operation = screen.getByRole('button', {
      name: /Resume OPS-001 — Recruitment Day/
    });
    expect(operation).toHaveTextContent(
      'Current objective: Locate Agent Trace’s missing message in the Recruit Workspace.'
    );
    expect(operation).not.toHaveTextContent('Main objective:');
    expect(writes).toBe(0);
  });

  it('deploys through physical-keyboard activation', async () => {
    const user = userEvent.setup();
    renderAppAt(1024, 700, storageWithProfile());

    await enterDashboard(user);
    await reviewWelcome(user);
    await user.click(screen.getByRole('button', { name: /Open OPS-001 — Recruitment Day/ }));
    screen.getByRole('button', { name: 'Deploy' }).focus();
    await user.keyboard('{Enter}');

    expect(screen.getByRole('heading', { name: 'Current objective' })).toBeVisible();
  });

  it('preserves Dashboard and briefing state while Settings is opened and closed', async () => {
    const user = userEvent.setup();
    renderAppAt(1024, 700, storageWithProfile());

    await enterDashboard(user);
    await user.click(screen.getByRole('button', { name: 'Settings' }));
    await user.click(screen.getByRole('button', { name: 'Close Settings' }));
    expect(screen.getByRole('heading', { name: 'HQ Dashboard' })).toBeVisible();

    await user.click(screen.getByRole('button', { name: 'Open transmission' }));
    await user.click(screen.getByRole('button', { name: 'Settings' }));
    await user.click(screen.getByRole('button', { name: 'Close Settings' }));
    expect(screen.getByRole('heading', { name: 'Director Patch — Welcome' })).toBeVisible();
    await user.click(screen.getByRole('button', { name: 'Return to HQ' }));
    await user.click(screen.getByRole('button', { name: /Open OPS-001 — Recruitment Day/ }));
    await user.click(screen.getByRole('button', { name: 'Settings' }));
    await user.click(screen.getByRole('button', { name: 'Close Settings' }));
    expect(screen.getByRole('heading', { name: 'OPS-001 — Recruitment Day' })).toBeVisible();
  });

  it('opens the minimum Field Manual empty state and returns to HQ', async () => {
    const user = userEvent.setup();
    renderAppAt(1024, 700, storageWithProfile());

    await enterDashboard(user);
    await user.click(screen.getByRole('button', { name: 'Field Manual' }));
    expect(screen.getByRole('heading', { name: 'No field entries yet' })).toBeVisible();
    expect(screen.getByText(/will be added when they are encountered/)).toBeVisible();
    await user.click(screen.getByRole('button', { name: 'Back to HQ' }));
    expect(screen.getByRole('heading', { name: 'HQ Dashboard' })).toBeVisible();
  });

  it('retains current-session progression with calm feedback when a save fails', async () => {
    const user = userEvent.setup();
    const memory = new MemoryStorage();
    const initialStorage = createLocalSaveStorage(memory);
    initialStorage.save({
      profile: createApplicantProfile('Session_7'),
      settings: createEmptyLocalSave().settings
    });
    const unavailableStorage = createLocalSaveStorage({
      getItem: (key) => memory.getItem(key),
      setItem: () => {
        throw new Error('Storage is unavailable.');
      }
    });
    renderAppAt(1024, 700, unavailableStorage);

    await enterDashboard(user);
    await user.click(screen.getByRole('button', { name: 'Open transmission' }));

    expect(screen.getByRole('status')).toHaveTextContent(
      'Changes are active for this session but could not be saved on this device.'
    );
    await user.click(screen.getByRole('button', { name: 'Return to HQ' }));
    expect(screen.getByRole('button', { name: /Open OPS-001 — Recruitment Day/ })).toBeVisible();
    expect(initialStorage.load().data.profile?.progression).toBe('applicant-at-hq');
  });

  it('saves Settings and edits a codename without resetting progression', async () => {
    const user = userEvent.setup();
    const storage = storageWithProfile('Original');
    renderAppAt(1024, 700, storage);

    await enterDashboard(user);
    await reviewWelcome(user);
    await user.click(screen.getByRole('button', { name: 'Settings' }));
    await user.click(screen.getByRole('checkbox', { name: /sound effects/i }));
    fireEvent.change(screen.getByRole('textbox', { name: 'Codename' }), {
      target: { value: 'Updated_7' }
    });
    await user.click(screen.getByRole('button', { name: 'Save codename' }));

    expect(storage.load().data).toMatchObject({
      profile: { codename: 'Updated_7', progression: 'ops001-available' },
      settings: { soundEffects: false, hqAmbience: true }
    });
  });

  it('defaults Command assistance to Off and persists an enabled preference across reload', async () => {
    const user = userEvent.setup();
    const storage = storageWithFreshOperation();
    const first = renderAppAt(1024, 700, storage);

    await user.click(screen.getByRole('button', { name: 'Settings' }));
    const assistance = screen.getByRole('checkbox', { name: /command assistance/i });
    expect(assistance).not.toBeChecked();
    expect(
      screen.getByText('Make visible files and folders tappable for preparing commands.')
    ).toBeVisible();
    await user.click(assistance);
    expect(storage.load().data.settings.commandAssistance).toBe(true);

    first.unmount();
    renderAppAt(1024, 700, storage);
    await user.click(screen.getByRole('button', { name: 'Settings' }));
    expect(screen.getByRole('checkbox', { name: /command assistance/i })).toBeChecked();
  });

  it('retains a failed Command assistance update for the session with accurate feedback', async () => {
    const user = userEvent.setup();
    const memory = new MemoryStorage();
    createLocalSaveStorage(memory).save({
      profile: createDeployedProfile(),
      settings: createEmptyLocalSave().settings
    });
    const storage = createLocalSaveStorage({
      getItem: (key) => memory.getItem(key),
      setItem() {
        throw new Error('unavailable');
      }
    });
    renderAppAt(1024, 700, storage);

    await user.click(screen.getByRole('button', { name: 'Settings' }));
    await user.click(screen.getByRole('checkbox', { name: /command assistance/i }));
    expect(screen.getByRole('checkbox', { name: /command assistance/i })).toBeChecked();
    expect(screen.getByRole('status')).toHaveTextContent(
      'Changes are active for this session but could not be saved on this device.'
    );
    expect(createLocalSaveStorage(memory).load().data.settings.commandAssistance).toBe(false);
  });

  it('keeps a valid codename edit in session without claiming a failed write was saved', async () => {
    const user = userEvent.setup();
    const memory = new MemoryStorage();
    createLocalSaveStorage(memory).save({
      profile: createApplicantProfile('Original'),
      settings: createEmptyLocalSave().settings
    });
    const unavailableStorage = createLocalSaveStorage({
      getItem: (key) => memory.getItem(key),
      setItem: () => {
        throw new Error('Storage is unavailable.');
      }
    });
    renderAppAt(1024, 700, unavailableStorage);

    await enterDashboard(user);
    await user.click(screen.getByRole('button', { name: 'Settings' }));
    fireEvent.change(screen.getByRole('textbox', { name: 'Codename' }), {
      target: { value: 'Session_7' }
    });
    await user.click(screen.getByRole('button', { name: 'Save codename' }));

    expect(screen.getByRole('status')).toHaveTextContent(
      'Changes are active for this session but could not be saved on this device.'
    );
    expect(screen.queryByText('Codename saved.')).not.toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: 'Close Settings' }));
    expect(screen.getByText('Session_7')).toBeVisible();
  });

  it('shows Reset progress only when a local profile exists', async () => {
    const user = userEvent.setup();
    const fresh = renderAppAt(1024, 700);

    await user.click(screen.getByRole('button', { name: 'Settings' }));
    expect(
      screen.queryByRole('button', { name: 'Restart current operation' })
    ).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Reset progress' })).not.toBeInTheDocument();

    fresh.unmount();
    renderAppAt(1024, 700, storageWithDeployedProfile());
    await user.click(screen.getByRole('button', { name: 'Settings' }));
    expect(screen.getByRole('heading', { name: 'Progress' })).toBeVisible();
    expect(
      screen.getByText(
        'Remove this operative profile and all mission progress from this device. Sound and ambience settings will be kept.'
      )
    ).toBeVisible();
    expect(screen.getByRole('button', { name: 'Restart current operation' })).toBeVisible();
    expect(screen.getByRole('button', { name: 'Reset progress' })).toBeVisible();
  });

  it('restarts the current operation by confirmation and persists a clean checkpoint', async () => {
    const user = userEvent.setup();
    const storage = storageWithFreshOperation({
      soundEffects: false,
      hqAmbience: true,
      commandAssistance: true
    });
    renderAppAt(1024, 700, storage);

    await user.click(screen.getByRole('button', { name: 'Continue Operation' }));
    await user.click(screen.getByRole('button', { name: 'Continue Operation' }));
    const input = screen.getByRole('textbox', { name: 'Command' });
    await user.type(input, 'ls');
    await user.click(screen.getByRole('button', { name: 'Run' }));
    expect(storage.load().data.profile?.activeCheckpoint?.terminal.commandHistory).toEqual(['ls']);

    await user.click(screen.getByRole('button', { name: 'Settings' }));
    await user.click(screen.getByRole('button', { name: 'Restart current operation' }));
    expect(screen.getByRole('alertdialog', { name: 'Restart current operation?' })).toBeVisible();
    expect(screen.getByRole('button', { name: 'Cancel' })).toHaveFocus();
    await user.click(screen.getByRole('button', { name: 'Restart operation' }));

    expect(screen.getByRole('heading', { name: 'Current objective' })).toBeVisible();
    expect(
      screen.getByText('Locate Agent Trace’s missing message in the Recruit Workspace.')
    ).toBeVisible();
    expect(storage.load().data).toMatchObject({
      profile: {
        codename: 'Nova',
        progression: 'operation-active-locate-message',
        fieldManualEntries: [],
        activeCheckpoint: {
          objectiveId: 'OBJ-001',
          progression: 'operation-active-locate-message',
          activeEvidenceIds: [],
          completedMilestones: [],
          terminal: { commandHistory: [], visibleInteractions: [] }
        }
      },
      settings: { soundEffects: false, hqAmbience: true, commandAssistance: true }
    });
  });

  it('opens confirmation without changing progress and Cancel restores the Workspace', async () => {
    const user = userEvent.setup();
    const storage = storageWithDeployedProfile();
    const before = storage.load().data;
    renderAppAt(1024, 700, storage);

    await user.click(screen.getByRole('button', { name: 'Continue Operation' }));
    await user.click(screen.getByRole('button', { name: 'Continue Operation' }));
    await user.click(screen.getByRole('button', { name: 'Settings' }));
    await user.click(screen.getByRole('button', { name: 'Reset progress' }));

    expect(screen.getByRole('alertdialog', { name: 'Reset all progress?' })).toBeVisible();
    expect(
      screen.getByText(
        'Your codename, messages, mission progress and active operation will be removed. This cannot be undone.'
      )
    ).toBeVisible();
    expect(storage.load().data).toEqual(before);

    await user.click(screen.getByRole('button', { name: 'Cancel' }));
    expect(screen.getByRole('heading', { name: 'Settings' })).toBeVisible();
    expect(storage.load().data).toEqual(before);
    await user.click(screen.getByRole('button', { name: 'Close Settings' }));
    expect(screen.getByRole('heading', { name: 'Current objective' })).toBeVisible();
  });

  it('resets a deployed profile by click, preserves preferences and reloads fresh', async () => {
    const user = userEvent.setup();
    const storage = storageWithDeployedProfile({
      soundEffects: false,
      hqAmbience: true,
      commandAssistance: true
    });
    const firstRender = renderAppAt(1024, 700, storage);

    await user.click(screen.getByRole('button', { name: 'Settings' }));
    await user.click(screen.getByRole('button', { name: 'Reset progress' }));
    await user.click(screen.getByRole('button', { name: 'Reset progress' }));

    expect(screen.getByRole('heading', { name: 'Welcome to OpSlyce HQ' })).toBeVisible();
    expect(screen.queryByRole('button', { name: 'Continue Operation' })).not.toBeInTheDocument();
    expect(storage.load().data).toEqual({
      profile: null,
      settings: { soundEffects: false, hqAmbience: true, commandAssistance: true }
    });

    await user.click(screen.getByRole('button', { name: 'Enter HQ' }));
    expect(screen.getByRole('textbox', { name: 'Codename' })).toHaveValue('');

    firstRender.unmount();
    renderAppAt(1024, 700, storage);
    expect(screen.queryByRole('button', { name: 'Continue Operation' })).not.toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: 'Settings' }));
    expect(screen.getByRole('checkbox', { name: /sound effects/i })).not.toBeChecked();
    expect(screen.getByRole('checkbox', { name: /hq ambience/i })).toBeChecked();
    expect(screen.getByRole('checkbox', { name: /command assistance/i })).toBeChecked();
    expect(screen.queryByRole('button', { name: 'Reset progress' })).not.toBeInTheDocument();
  });

  it('supports keyboard opening, cancellation and confirmation with dependable focus', async () => {
    const user = userEvent.setup();
    renderAppAt(1024, 700, storageWithDeployedProfile());

    await user.click(screen.getByRole('button', { name: 'Settings' }));
    const openReset = screen.getByRole('button', { name: 'Reset progress' });
    openReset.focus();
    await user.keyboard('{Enter}');
    expect(screen.getByRole('button', { name: 'Cancel' })).toHaveFocus();

    await user.keyboard('{Enter}');
    expect(screen.getByRole('button', { name: 'Reset progress' })).toHaveFocus();
    await user.keyboard(' ');
    expect(screen.getByRole('button', { name: 'Cancel' })).toHaveFocus();
    await user.keyboard('{Tab}{Enter}');

    expect(screen.getByRole('heading', { name: 'Welcome to OpSlyce HQ' })).toBeVisible();
  });

  it('keeps the session reset and reports honestly when persistence fails', async () => {
    const user = userEvent.setup();
    const memory = new MemoryStorage();
    const persistedStorage = createLocalSaveStorage(memory);
    persistedStorage.save({
      profile: createDeployedProfile('Persisted_7'),
      settings: { soundEffects: false, hqAmbience: true, commandAssistance: true }
    });
    const unavailableStorage = createLocalSaveStorage({
      getItem: (key) => memory.getItem(key),
      setItem: () => {
        throw new Error('Storage is unavailable.');
      }
    });
    renderAppAt(1024, 700, unavailableStorage);

    await user.click(screen.getByRole('button', { name: 'Settings' }));
    await user.click(screen.getByRole('button', { name: 'Reset progress' }));
    await user.click(screen.getByRole('button', { name: 'Reset progress' }));

    expect(screen.getByRole('heading', { name: 'Welcome to OpSlyce HQ' })).toBeVisible();
    expect(screen.queryByRole('button', { name: 'Continue Operation' })).not.toBeInTheDocument();
    expect(screen.getByRole('status')).toHaveTextContent(
      'Changes are active for this session but could not be saved on this device.'
    );
    await user.click(screen.getByRole('button', { name: 'Enter HQ' }));
    expect(screen.getByRole('textbox', { name: 'Codename' })).toHaveValue('');
    await user.click(screen.getByRole('button', { name: 'Settings' }));
    expect(screen.getByRole('checkbox', { name: /sound effects/i })).not.toBeChecked();
    expect(screen.getByRole('checkbox', { name: /hq ambience/i })).toBeChecked();
    expect(screen.getByRole('checkbox', { name: /command assistance/i })).toBeChecked();
    expect(screen.queryByRole('button', { name: 'Reset progress' })).not.toBeInTheDocument();
    expect(persistedStorage.load().data.profile).toMatchObject({
      codename: 'Persisted_7',
      progression: 'operation-active-locate-message'
    });
    expect(persistedStorage.load().data.settings).toEqual({
      soundEffects: false,
      hqAmbience: true,
      commandAssistance: true
    });
  });

  it('cancels the resume summary and restores the persisted active tool', async () => {
    const user = userEvent.setup();
    const storage = storageWithDeployedProfile();
    storage.save({
      profile: {
        ...createDeployedProfile(),
        activeCheckpoint: createOps001ActiveCheckpoint('evidence')
      },
      settings: createEmptyLocalSave().settings
    });
    renderAppAt(1024, 700, storage);

    await user.click(screen.getByRole('button', { name: 'Continue Operation' }));
    expect(screen.getByRole('heading', { name: 'Resume operation' })).toBeVisible();
    await user.click(screen.getByRole('button', { name: 'Back to title' }));
    expect(screen.getByRole('heading', { name: 'Welcome to OpSlyce HQ' })).toBeVisible();
    await user.click(screen.getByRole('button', { name: 'Continue Operation' }));
    await user.click(screen.getByRole('button', { name: 'Continue Operation' }));
    expect(screen.getByRole('tab', { name: 'Evidence' })).toHaveAttribute('aria-selected', 'true');
  });

  it('keeps Browser available, persists tool selection and preserves it across support panels and HQ', async () => {
    const user = userEvent.setup();
    const storage = storageWithDeployedProfile();
    renderAppAt(1024, 700, storage);
    await user.click(screen.getByRole('button', { name: 'Continue Operation' }));
    await user.click(screen.getByRole('button', { name: 'Continue Operation' }));

    expect(screen.getByRole('tab', { name: 'Terminal' })).toHaveAttribute('aria-selected', 'true');
    expect(
      screen.queryByText('The Field Browser will activate when a route is recovered.')
    ).not.toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Browser' })).toBeEnabled();
    await user.click(screen.getByRole('button', { name: 'Browser' }));
    expect(screen.getByRole('heading', { name: 'Welcome to OpSlyce HQ' })).toBeVisible();
    await user.click(screen.getByRole('button', { name: 'Close Browser' }));
    await user.click(screen.getByRole('tab', { name: 'Evidence' }));
    expect(screen.getByText('No evidence has been confirmed.')).toBeVisible();
    expect(storage.load().data.profile?.activeCheckpoint?.activeTool).toBe('evidence');

    const briefing = screen.getByRole('button', { name: 'Briefing' });
    await user.click(briefing);
    expect(screen.getByText(/Agent Trace left a training message inside/)).toBeVisible();
    await user.click(screen.getByRole('button', { name: 'Close' }));
    expect(briefing).toHaveFocus();
    expect(screen.getByRole('tab', { name: 'Evidence' })).toHaveAttribute('aria-selected', 'true');
    await user.click(screen.getByRole('button', { name: 'HQ' }));
    expect(screen.getByText('Active')).toBeVisible();
    await user.click(screen.getByRole('button', { name: /Resume OPS-001/ }));
    expect(screen.getByRole('tab', { name: 'Evidence' })).toHaveAttribute('aria-selected', 'true');
  });

  it('retains a selected tool for the session and reports a failed write accurately', async () => {
    const user = userEvent.setup();
    const memory = new MemoryStorage();
    createLocalSaveStorage(memory).save({
      profile: createDeployedProfile(),
      settings: createEmptyLocalSave().settings
    });
    const storage = createLocalSaveStorage({
      getItem: (key) => memory.getItem(key),
      setItem: () => {
        throw new Error('unavailable');
      }
    });
    renderAppAt(1024, 700, storage);
    await user.click(screen.getByRole('button', { name: 'Continue Operation' }));
    await user.click(screen.getByRole('button', { name: 'Continue Operation' }));
    await user.click(screen.getByRole('tab', { name: 'Evidence' }));
    expect(screen.getByRole('tab', { name: 'Evidence' })).toHaveAttribute('aria-selected', 'true');
    expect(screen.getByRole('status')).toHaveTextContent(
      'Changes are active for this session but could not be saved on this device.'
    );
  });

  it('retains Browser navigation for the session after a failed write', async () => {
    const user = userEvent.setup();
    const memory = new MemoryStorage();
    createLocalSaveStorage(memory).save({
      profile: createDeployedProfile(),
      settings: createEmptyLocalSave().settings
    });
    const storage = createLocalSaveStorage({
      getItem: (key) => memory.getItem(key),
      setItem: () => {
        throw new Error('unavailable');
      }
    });
    renderAppAt(1024, 700, storage);
    await user.click(screen.getByRole('button', { name: 'Continue Operation' }));
    await user.click(screen.getByRole('button', { name: 'Continue Operation' }));
    await user.click(screen.getByRole('button', { name: 'Browser' }));
    const route = screen.getByRole('textbox', { name: 'Route' });
    await user.clear(route);
    await user.type(route, '/about');
    await user.click(screen.getByRole('button', { name: 'Open Route' }));
    expect(screen.getByRole('heading', { name: 'About OpSlyce' })).toBeVisible();
    expect(screen.getByRole('status')).toHaveTextContent(
      'Changes are active for this session but could not be saved on this device.'
    );
  });

  it('persists Terminal state across tool changes, HQ and reload', async () => {
    const user = userEvent.setup();
    const storage = storageWithDeployedProfile();
    const first = renderAppAt(1024, 700, storage);
    await user.click(screen.getByRole('button', { name: 'Continue Operation' }));
    await user.click(screen.getByRole('button', { name: 'Continue Operation' }));
    const command = screen.getByRole('textbox', { name: 'Command' });
    await user.type(command, 'cat welcome.txt{Enter}');
    expect(screen.getByText('WELCOME TO OPSLYCE HQ')).toBeVisible();
    expect(storage.load().data.profile?.activeCheckpoint?.terminal.openedFiles).toEqual([
      '/home/recruit/welcome.txt'
    ]);
    await user.click(screen.getByRole('tab', { name: 'Evidence' }));
    await user.click(screen.getByRole('tab', { name: 'Terminal' }));
    expect(screen.getByText('WELCOME TO OPSLYCE HQ')).toBeVisible();
    await user.click(screen.getByRole('button', { name: 'HQ' }));
    await user.click(screen.getByRole('button', { name: /Resume OPS-001/ }));
    expect(screen.getByText('WELCOME TO OPSLYCE HQ')).toBeVisible();

    first.unmount();
    renderAppAt(1024, 700, storage);
    await user.click(screen.getByRole('button', { name: 'Continue Operation' }));
    await user.click(screen.getByRole('button', { name: 'Continue Operation' }));
    expect(screen.getByText('WELCOME TO OPSLYCE HQ')).toBeVisible();
  });

  it('retains Terminal execution for the session and reports a failed write', async () => {
    const user = userEvent.setup();
    const memory = new MemoryStorage();
    createLocalSaveStorage(memory).save({
      profile: createDeployedProfile(),
      settings: createEmptyLocalSave().settings
    });
    let writes = 0;
    const storage = createLocalSaveStorage({
      getItem: (key) => memory.getItem(key),
      setItem: () => {
        writes += 1;
        throw new Error('unavailable');
      }
    });
    renderAppAt(1024, 700, storage);
    await user.click(screen.getByRole('button', { name: 'Continue Operation' }));
    await user.click(screen.getByRole('button', { name: 'Continue Operation' }));
    const command = screen.getByRole('textbox', { name: 'Command' });
    await user.type(command, 'cd training{Enter}');
    expect(screen.getByText('recruit@opslyce-hq:~/training$')).toBeVisible();
    expect(screen.getByRole('status')).toHaveTextContent(
      'Changes are active for this session but could not be saved on this device.'
    );
    expect(writes).toBe(1);
    await user.type(command, '   {Enter}');
    expect(writes).toBe(1);
  });

  it('uses Ask Byte and keeps Mission Control editable while showing encountered Manual entries', async () => {
    const user = userEvent.setup();
    renderAppAt(1024, 700, storageWithDeployedProfile());
    await user.click(screen.getByRole('button', { name: 'Continue Operation' }));
    await user.click(screen.getByRole('button', { name: 'Continue Operation' }));
    expect(screen.queryByRole('button', { name: 'Hints' })).not.toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: 'Ask Byte' }));
    expect(screen.queryByText('Hints carry no penalty.')).not.toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Show Nudge' })).toBeVisible();
    await user.click(screen.getByRole('button', { name: 'Close' }));
    await user.click(screen.getByRole('button', { name: 'Mission Control' }));
    expect(screen.getByRole('textbox', { name: 'Verification flag' })).toBeEnabled();
    expect(screen.getByRole('button', { name: 'Submit' })).toBeEnabled();
    await user.click(screen.getByRole('button', { name: 'Close' }));
    await user.click(screen.getByRole('button', { name: 'Field Manual' }));
    expect(screen.getByRole('heading', { name: 'Command Reference' })).toBeVisible();
    expect(screen.getByText('List files and folders')).toBeVisible();
  });

  it('progresses through OBJ-001 and OBJ-002, recovers Evidence and readies the Browser', async () => {
    const user = userEvent.setup();
    const storage = storageWithFreshOperation();
    const first = renderAppAt(1024, 700, storage);
    await user.click(screen.getByRole('button', { name: 'Continue Operation' }));
    await user.click(screen.getByRole('button', { name: 'Continue Operation' }));
    let command = screen.getByRole('textbox', { name: 'Command' });

    await user.type(command, 'cat welcome.txt{Enter}');
    expect(screen.getByText('OBJ-002')).toBeVisible();
    expect(screen.getByText('Recover training/trace-note.txt.')).toBeVisible();
    expect(screen.getByText('Completed: Recruit instructions recovered.')).toBeVisible();
    expect(screen.getByText('cat displays the contents of a text file.')).toBeVisible();
    await user.click(screen.getByRole('button', { name: 'Dismiss' }));

    await user.click(screen.getByRole('button', { name: 'HQ' }));
    const obj002Operation = screen.getByRole('button', {
      name: /Resume OPS-001 — Recruitment Day/
    });
    expect(obj002Operation).toHaveTextContent(
      'Current objective: Recover training/trace-note.txt.'
    );
    expect(obj002Operation).not.toHaveTextContent(
      'Locate Agent Trace’s missing message in the Recruit Workspace.'
    );
    await user.click(obj002Operation);
    command = screen.getByRole('textbox', { name: 'Command' });

    await user.type(command, 'cat training/trace-note.txt{Enter}');
    expect(screen.getByText('OBJ-003')).toBeVisible();
    expect(screen.getByText('Open /recruit-verification in the HQ Training Portal.')).toBeVisible();
    expect(
      screen.getByText(
        'Route recovered. The verification page is now available in the Field Browser.'
      )
    ).toBeVisible();
    expect(screen.getByRole('button', { name: 'Browser' })).toBeEnabled();
    await user.click(screen.getByRole('tab', { name: 'Evidence' }));
    expect(screen.getByRole('heading', { name: 'NOTE RECOVERED' })).toBeVisible();
    expect(screen.getByRole('heading', { name: 'HQ TRAINING ROUTE' })).toBeVisible();
    expect(screen.queryByRole('button', { name: 'Prepare in Browser' })).not.toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: 'Browser' }));
    expect(screen.getByRole('heading', { name: 'Welcome to OpSlyce HQ' })).toBeVisible();
    const route = screen.getByRole('textbox', { name: 'Route' });
    expect(route).toHaveValue('');
    expect(route).toHaveAttribute('placeholder', '/');
    await user.type(route, '/recruit-verification');
    expect(screen.getByRole('button', { name: 'Open Route' })).toBeEnabled();
    expect(screen.queryByText('FLAG{WELCOME_TO_HQ}')).not.toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: 'HQ' }));
    const obj003Operation = screen.getByRole('button', {
      name: /Resume OPS-001 — Recruitment Day/
    });
    expect(obj003Operation).toHaveTextContent(
      'Current objective: Open /recruit-verification in the HQ Training Portal.'
    );
    expect(obj003Operation).not.toHaveTextContent(
      'Locate Agent Trace’s missing message in the Recruit Workspace.'
    );
    expect(screen.getByText('2 recorded items')).toBeVisible();
    expect(screen.getByText('Latest: HQ Training Route')).toBeVisible();
    await user.click(screen.getByRole('button', { name: 'Field Manual' }));
    expect(screen.getByText('cat')).toBeVisible();
    expect(screen.getByText('Read a text file')).toBeVisible();
    expect(screen.getByText('Browser routes')).toBeVisible();
    expect(
      screen.getByText('A route beginning with / identifies a page inside a site.')
    ).toBeVisible();
    expect(screen.queryByText(/fictional site/u)).not.toBeInTheDocument();

    first.unmount();
    renderAppAt(1024, 700, storage);
    await user.click(screen.getByRole('button', { name: 'Continue Operation' }));
    expect(screen.getByText('Open /recruit-verification in the HQ Training Portal.')).toBeVisible();
    expect(screen.getByText('HQ TRAINING ROUTE')).toBeVisible();
  }, 10_000);

  it('persists a prepared editable command across reload without executing it', async () => {
    const user = userEvent.setup();
    const storage = storageWithFreshOperation();
    const first = renderAppAt(1024, 700, storage);
    await user.click(screen.getByRole('button', { name: 'Continue Operation' }));
    await user.click(screen.getByRole('button', { name: 'Continue Operation' }));
    await user.click(screen.getByText('Command Guide'));
    await user.click(screen.getByRole('button', { name: 'Prepare ls command' }));
    expect(screen.getByRole('textbox', { name: 'Command' })).toHaveValue('ls ');
    expect(screen.getByRole('log', { name: 'Field Terminal transcript' })).toBeEmptyDOMElement();

    first.unmount();
    renderAppAt(1024, 700, storage);
    await user.click(screen.getByRole('button', { name: 'Continue Operation' }));
    await user.click(screen.getByRole('button', { name: 'Continue Operation' }));
    expect(screen.getByRole('textbox', { name: 'Command' })).toHaveValue('ls ');
    expect(screen.getByRole('log', { name: 'Field Terminal transcript' })).toBeEmptyDOMElement();
  });

  it('persists interpreter guidance without restoring proactive answer controls', async () => {
    const user = userEvent.setup();
    const storage = storageWithFreshOperation({
      ...createEmptyLocalSave().settings,
      commandAssistance: true
    });
    const first = renderAppAt(1024, 700, storage);
    await user.click(screen.getByRole('button', { name: 'Continue Operation' }));
    await user.click(screen.getByRole('button', { name: 'Continue Operation' }));
    await user.type(screen.getByRole('textbox', { name: 'Command' }), 'sl{Enter}');
    expect(screen.getByText('Did you mean ls?')).toBeVisible();
    expect(screen.queryByRole('button', { name: 'Prepare suggestion' })).not.toBeInTheDocument();

    first.unmount();
    const second = renderAppAt(1024, 700, storage);
    await user.click(screen.getByRole('button', { name: 'Continue Operation' }));
    await user.click(screen.getByRole('button', { name: 'Continue Operation' }));
    expect(screen.getByText('Did you mean ls?')).toBeVisible();
    expect(screen.queryByRole('button', { name: 'Prepare suggestion' })).not.toBeInTheDocument();
    await user.type(screen.getByRole('textbox', { name: 'Command' }), 'help{Enter}');
    expect(screen.queryByRole('button', { name: 'Prepare suggestion' })).not.toBeInTheDocument();

    second.unmount();
    renderAppAt(1024, 700, storage);
    await user.click(screen.getByRole('button', { name: 'Continue Operation' }));
    await user.click(screen.getByRole('button', { name: 'Continue Operation' }));
    expect(screen.queryByRole('button', { name: 'Prepare suggestion' })).not.toBeInTheDocument();
  });

  it('retains prepared command state for the session after a failed write', async () => {
    const user = userEvent.setup();
    const memory = new MemoryStorage();
    createLocalSaveStorage(memory).save({
      profile: {
        ...createApplicantProfile('Nova'),
        progression: 'operation-active-locate-message',
        activeCheckpoint: createOps001ActiveCheckpoint()
      },
      settings: createEmptyLocalSave().settings
    });
    const storage = createLocalSaveStorage({
      getItem: (key) => memory.getItem(key),
      setItem() {
        throw new Error('unavailable');
      }
    });
    renderAppAt(1024, 700, storage);
    await user.click(screen.getByRole('button', { name: 'Continue Operation' }));
    await user.click(screen.getByRole('button', { name: 'Continue Operation' }));
    await user.click(screen.getByText('Command Guide'));
    await user.click(screen.getByRole('button', { name: 'Prepare help command' }));
    expect(screen.getByRole('textbox', { name: 'Command' })).toHaveValue('help');
    expect(screen.getByRole('log', { name: 'Field Terminal transcript' })).toBeEmptyDOMElement();
    expect(screen.getByRole('status')).toHaveTextContent(
      'Changes are active for this session but could not be saved on this device.'
    );
  });

  it('opens and closes the Command Guide disclosure without a persistence write', async () => {
    const user = userEvent.setup();
    const memory = new MemoryStorage();
    createLocalSaveStorage(memory).save({
      profile: createDeployedProfile(),
      settings: createEmptyLocalSave().settings
    });
    let writes = 0;
    const storage = createLocalSaveStorage({
      getItem: (key) => memory.getItem(key),
      setItem(key, value) {
        writes += 1;
        memory.setItem(key, value);
      }
    });
    renderAppAt(1024, 700, storage);
    await user.click(screen.getByRole('button', { name: 'Continue Operation' }));
    await user.click(screen.getByRole('button', { name: 'Continue Operation' }));

    const guide = screen.getByText('Command Guide');
    await user.click(guide);
    await user.click(guide);
    expect(writes).toBe(0);
  });

  it('enables contextual assistance without clearing Terminal or prepared state', async () => {
    const user = userEvent.setup();
    const storage = storageWithFreshOperation();
    renderAppAt(1024, 700, storage);
    await user.click(screen.getByRole('button', { name: 'Continue Operation' }));
    await user.click(screen.getByRole('button', { name: 'Continue Operation' }));
    await user.click(screen.getByText('Command Guide'));
    await user.click(screen.getByRole('button', { name: 'Prepare cat command' }));
    expect(screen.getByRole('textbox', { name: 'Command' })).toHaveValue('cat ');

    await user.click(screen.getByRole('button', { name: 'Settings' }));
    await user.click(screen.getByRole('checkbox', { name: /command assistance/i }));
    await user.click(screen.getByRole('button', { name: 'Close Settings' }));
    expect(screen.getByRole('textbox', { name: 'Command' })).toHaveValue('cat ');
    expect(screen.getByRole('log', { name: 'Field Terminal transcript' })).toBeEmptyDOMElement();

    const command = screen.getByRole('textbox', { name: 'Command' });
    await user.clear(command);
    await user.type(command, 'ls{Enter}');
    expect(screen.getByRole('button', { name: 'Prepare cat welcome.txt' })).toBeVisible();
    expect(storage.load().data.settings.commandAssistance).toBe(true);
  });

  it('does not save ordinary typing or expose proactive completion', async () => {
    const user = userEvent.setup();
    const memory = new MemoryStorage();
    createLocalSaveStorage(memory).save({
      profile: {
        ...createApplicantProfile('Nova'),
        progression: 'operation-active-locate-message',
        activeCheckpoint: createOps001ActiveCheckpoint()
      },
      settings: { ...createEmptyLocalSave().settings, commandAssistance: true }
    });
    let writes = 0;
    const storage = createLocalSaveStorage({
      getItem: (key) => memory.getItem(key),
      setItem(key, value) {
        writes += 1;
        memory.setItem(key, value);
      }
    });
    renderAppAt(1024, 700, storage);
    await user.click(screen.getByRole('button', { name: 'Continue Operation' }));
    await user.click(screen.getByRole('button', { name: 'Continue Operation' }));
    const command = screen.getByRole('textbox', { name: 'Command' });
    await user.type(command, 'ls{Enter}');
    expect(writes).toBe(1);
    await user.type(command, 'h');
    expect(screen.queryByRole('button', { name: /Complete:/u })).not.toBeInTheDocument();
    expect(writes).toBe(1);
  });

  it('retains complete Stage 7 progression in session after a failed write', async () => {
    const user = userEvent.setup();
    const memory = new MemoryStorage();
    createLocalSaveStorage(memory).save({
      profile: {
        ...createApplicantProfile('Nova'),
        progression: 'operation-active-locate-message',
        activeCheckpoint: createOps001ActiveCheckpoint()
      },
      settings: createEmptyLocalSave().settings
    });
    const storage = createLocalSaveStorage({
      getItem: (key) => memory.getItem(key),
      setItem() {
        throw new Error('unavailable');
      }
    });
    renderAppAt(1024, 700, storage);
    await user.click(screen.getByRole('button', { name: 'Continue Operation' }));
    await user.click(screen.getByRole('button', { name: 'Continue Operation' }));
    await user.type(
      screen.getByRole('textbox', { name: 'Command' }),
      'cat training/trace-note.txt{Enter}'
    );
    expect(screen.getByText('OBJ-003')).toBeVisible();
    expect(screen.getByRole('button', { name: 'Browser' })).toBeEnabled();
    expect(screen.getByRole('status')).toHaveTextContent(
      'Changes are active for this session but could not be saved on this device.'
    );
    await user.click(screen.getByRole('tab', { name: 'Evidence' }));
    expect(
      screen.getAllByRole('heading', { name: /NOTE RECOVERED|HQ TRAINING ROUTE/ })
    ).toHaveLength(2);
  });

  it('clears all Stage 7 state through Reset progress', async () => {
    const user = userEvent.setup();
    const storage = storageWithFreshOperation();
    renderAppAt(1024, 700, storage);
    await user.click(screen.getByRole('button', { name: 'Continue Operation' }));
    await user.click(screen.getByRole('button', { name: 'Continue Operation' }));
    await user.type(
      screen.getByRole('textbox', { name: 'Command' }),
      'cat training/trace-note.txt{Enter}'
    );
    expect(screen.getByText('OBJ-003')).toBeVisible();
    await user.click(screen.getByRole('button', { name: 'Settings' }));
    await user.click(screen.getByRole('button', { name: 'Reset progress' }));
    const confirmation = screen.getByRole('alertdialog', { name: 'Reset all progress?' });
    await user.click(within(confirmation).getByRole('button', { name: 'Reset progress' }));
    expect(screen.getByRole('heading', { name: 'Welcome to OpSlyce HQ' })).toBeVisible();
    expect(screen.queryByRole('button', { name: 'Continue Operation' })).not.toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: 'Enter HQ' }));
    expect(screen.getByRole('textbox', { name: 'Codename' })).toHaveValue('');
  });

  it('shows calm recovery guidance for invalid stored data', () => {
    const memory = new MemoryStorage();
    memory.values.set(LOCAL_SAVE_STORAGE_KEY, '{invalid-json');

    renderAppAt(1024, 700, createLocalSaveStorage(memory));

    expect(screen.getByRole('status')).toHaveTextContent(
      'Saved local data is invalid or incompatible.'
    );
    expect(screen.getByRole('heading', { name: 'Welcome to OpSlyce HQ' })).toBeVisible();
  });
});

describe('Stage 9 application flow', () => {
  it('offers Ask Byte quietly only after a second related error', async () => {
    const user = userEvent.setup();
    renderAppAt(1024, 700, storageWithFreshOperation());
    await user.click(screen.getByRole('button', { name: 'Continue Operation' }));
    await user.click(screen.getByRole('button', { name: 'Continue Operation' }));
    const input = screen.getByRole('textbox', { name: 'Command' });
    await user.type(input, 'cat missing.txt{Enter}');
    expect(screen.getByText('No file found at: missing.txt')).toBeVisible();
    expect(screen.queryByText('I have a suggestion for this step.')).not.toBeInTheDocument();
    await user.type(input, 'cat missing.txt{Enter}');
    expect(screen.getByText('I have a suggestion for this step.')).toBeVisible();
    expect(screen.queryByRole('heading', { name: 'Ask Byte' })).not.toBeInTheDocument();
  });

  it('validates recoverably, verifies Evidence and enters the debrief without returning to HQ', async () => {
    const user = userEvent.setup();
    const storage = storageWithFreshOperation();
    renderAppAt(1024, 700, storage);
    await user.click(screen.getByRole('button', { name: 'Continue Operation' }));
    await user.click(screen.getByRole('button', { name: 'Continue Operation' }));
    await user.type(
      screen.getByRole('textbox', { name: 'Command' }),
      'cat training/trace-note.txt{Enter}'
    );
    await user.click(screen.getByRole('button', { name: 'Browser' }));
    await user.type(screen.getByRole('textbox', { name: 'Route' }), '/recruit-verification');
    await user.click(screen.getByRole('button', { name: 'Open Route' }));
    await user.click(screen.getByRole('button', { name: 'Close Browser' }));
    await user.click(screen.getByRole('button', { name: 'Mission Control' }));
    const input = screen.getByRole('textbox', { name: 'Verification flag' });
    const submitButton = screen.getByRole('button', { name: 'Submit' });

    await user.click(submitButton);
    expect(
      screen.getByText('Enter the verification flag recovered during the operation.')
    ).toBeVisible();
    await user.type(input, 'WELCOME_TO_HQ');
    await user.keyboard('{Enter}');
    expect(screen.getByText('That does not match the OpSlyce flag format.')).toBeVisible();
    expect(screen.getByText('Look for a value shaped like FLAG{...}.')).toBeVisible();
    fireEvent.change(input, { target: { value: 'FLAG{WRONG}' } });
    await user.click(submitButton);
    expect(screen.getByText('That flag was not accepted for OPS-001.')).toBeVisible();
    expect(screen.getByText('Check the verification page and try again.')).toBeVisible();
    fireEvent.change(input, { target: { value: '  flag{welcome_to_hq}  ' } });
    await user.click(submitButton);

    expect(screen.getByText(/VERIFYING EVIDENCE|FLAG ACCEPTED/u)).toBeVisible();
    expect(await screen.findByText('FLAG ACCEPTED')).toBeVisible();
    expect(screen.getByText('OPERATION VERIFIED')).toBeVisible();
    expect(await screen.findByRole('heading', { name: 'Recruitment Day debrief' })).toBeVisible();
    expect(storage.load().data.profile?.activeCheckpoint).toMatchObject({
      progression: 'debrief',
      objectiveId: 'OBJ-005',
      verifiedEvidenceIds: ['EV-003'],
      activeEvidenceIds: ['EV-001', 'EV-002', 'EV-003', 'EV-004']
    });
    expect(screen.getByRole('button', { name: 'Return to HQ' })).toBeVisible();
    expect(screen.queryByRole('heading', { name: 'HQ Dashboard' })).not.toBeInTheDocument();
    expect(storage.load().data.profile?.rank).toBe('Applicant');
    expect(storage.load().data.profile?.badges).toEqual([]);
  }, 10_000);

  it('keeps accepted verification in the current session when its save fails', async () => {
    const user = userEvent.setup();
    const memory = new MemoryStorage();
    const initial = createOps001ActiveCheckpoint('evidence');
    createLocalSaveStorage(memory).save({
      profile: {
        ...createApplicantProfile('Nova'),
        progression: 'verification-flag-recovered',
        activeCheckpoint: {
          ...initial,
          progression: 'verification-flag-recovered',
          objectiveId: 'OBJ-004',
          completedMilestones: ['OBJ-001', 'OBJ-002', 'OBJ-003'],
          activeEvidenceIds: ['EV-001', 'EV-002', 'EV-003']
        }
      },
      settings: createEmptyLocalSave().settings
    });
    const storage = createLocalSaveStorage({
      getItem: (key) => memory.getItem(key),
      setItem() {
        throw new Error('unavailable');
      }
    });
    renderAppAt(1024, 700, storage);
    await user.click(screen.getByRole('button', { name: 'Continue Operation' }));
    await user.click(screen.getByRole('button', { name: 'Continue Operation' }));
    await user.click(screen.getByRole('button', { name: 'Mission Control' }));
    fireEvent.change(screen.getByRole('textbox', { name: 'Verification flag' }), {
      target: { value: 'FLAG{WELCOME_TO_HQ}' }
    });
    await user.click(screen.getByRole('button', { name: 'Submit' }));

    expect(await screen.findByRole('heading', { name: 'Recruitment Day debrief' })).toBeVisible();
    expect(
      screen.getByText('Changes are active for this session but could not be saved on this device.')
    ).toBeVisible();
  });
});

describe('Stage 10 application flow', () => {
  it('keeps Return to HQ player-controlled and gates the incoming teaser behind EV-005 review', async () => {
    const user = userEvent.setup();
    const memory = new MemoryStorage();
    const storage = createLocalSaveStorage(memory);
    const initial = createOps001ActiveCheckpoint('evidence');
    storage.save({
      profile: {
        ...createApplicantProfile('Nova'),
        progression: 'debrief',
        activeCheckpoint: {
          ...initial,
          progression: 'debrief',
          objectiveId: 'OBJ-005',
          completedMilestones: ['OBJ-001', 'OBJ-002', 'OBJ-003', 'OBJ-004'],
          activeEvidenceIds: ['EV-001', 'EV-002', 'EV-003', 'EV-004'],
          verifiedEvidenceIds: ['EV-003'],
          missionControl: {
            ...initial.missionControl,
            input: 'FLAG{WELCOME_TO_HQ}',
            validation: 'accepted'
          },
          terminal: { ...initial.terminal, commandsUsed: ['ls', 'cat'] }
        }
      },
      settings: createEmptyLocalSave().settings
    });
    renderAppAt(1024, 700, storage);
    await user.click(screen.getByRole('button', { name: 'Continue Operation' }));
    await user.click(screen.getByRole('button', { name: 'Continue Operation' }));

    expect(screen.getByRole('heading', { name: 'Recruitment Day debrief' })).toBeVisible();
    expect(screen.queryByRole('heading', { name: 'HQ Dashboard' })).not.toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: 'Return to HQ' }));

    expect(screen.getByRole('heading', { name: 'HQ Dashboard' })).toBeVisible();
    expect(screen.getByText('AGENT STATUS UPDATED')).toBeVisible();
    expect(screen.getByText('RECRUIT OPERATIVE')).toBeVisible();
    expect(screen.queryByText('UNIDENTIFIED SIGNAL')).not.toBeInTheDocument();
    expect(storage.load().data.profile).toMatchObject({
      rank: 'Recruit Operative',
      badges: ['ghost-file'],
      progression: 'recruit-operative'
    });

    expect(await screen.findByText('UNIDENTIFIED SIGNAL', {}, { timeout: 4000 })).toBeVisible();
    expect(screen.getByRole('heading', { name: 'Communications' })).toBeVisible();
    expect(screen.getByRole('heading', { name: 'Agent Status' })).toBeVisible();
    expect(screen.getByRole('heading', { name: 'Evidence Summary' })).toBeVisible();
    expect(
      screen.queryByText(
        "That definitely wasn't one of ours. I've saved the mark before it could disappear."
      )
    ).not.toBeInTheDocument();
    expect(screen.queryByText('NEW INCIDENT REPORTED')).not.toBeInTheDocument();
    await waitFor(
      () =>
        expect(document.querySelector('[data-live-reaction="byte"]')).toHaveTextContent(
          "That definitely wasn't one of ours. I've saved the mark before it could disappear."
        ),
      { timeout: 7000 }
    );
    expect(document.querySelector('[data-live-reaction="patch"]')).not.toBeInTheDocument();
    await waitFor(
      () =>
        expect(document.querySelector('[data-live-reaction="patch"]')).toHaveTextContent(
          'HQ has logged an unidentified signal event. We do not yet know its source or purpose. Keep the evidence; patterns matter.'
        ),
      { timeout: 5000 }
    );
    expect(screen.queryByText('NEW INCIDENT REPORTED')).not.toBeInTheDocument();
    const reviewEvidence = await screen.findByRole(
      'button',
      { name: 'Review captured evidence' },
      { timeout: 5000 }
    );
    expect(screen.getByRole('dialog', { name: 'HQ RESPONSE' })).toBeVisible();
    await user.click(reviewEvidence);
    expect(screen.getByRole('dialog', { name: 'UNIDENTIFIED INTRUSION MARK' })).toBeVisible();
    expect(screen.queryByText('NEW INCIDENT REPORTED')).not.toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: 'Close evidence' }));

    expect(await screen.findByText('NEW INCIDENT REPORTED', {}, { timeout: 3000 })).toBeVisible();
    expect(
      screen.queryByText('An HQ website is displaying a page that “does not exist”.')
    ).not.toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: 'Open incident' }));
    const incident = screen.getByRole('dialog', { name: 'NEW INCIDENT REPORTED' });
    expect(within(incident).getByText('Further assignment pending.')).toBeVisible();
    await user.click(within(incident).getByRole('button', { name: 'Close communication' }));
    const completion = screen.getByRole('dialog', { name: 'OPS-001 COMPLETE' });
    expect(within(completion).getByText('Recruitment Day')).toBeVisible();
    expect(
      within(completion).getByText('More operations are coming in a future update.')
    ).toBeVisible();
    expect(storage.load().data.profile).toMatchObject({
      progression: 'operation-completion',
      persistentEvidence: ['EV-005'],
      activeCheckpoint: {
        activeEvidenceIds: ['EV-001', 'EV-002', 'EV-003', 'EV-004', 'EV-005']
      }
    });
    await user.click(within(completion).getByRole('button', { name: 'Return to HQ' }));
    expect(storage.load().data.profile).toMatchObject({ progression: 'operation-complete' });
    expect(screen.queryByRole('dialog', { name: 'OPS-001 COMPLETE' })).not.toBeInTheDocument();
    expect(screen.getByRole('heading', { name: 'Completed Operation' })).toBeVisible();
    expect(screen.queryByRole('button', { name: /OPS-002/u })).not.toBeInTheDocument();
  }, 30_000);
});

describe('responsive gates', () => {
  it('keeps the tablet portrait gate intact', () => {
    renderAppAt(700, 1024);

    expect(screen.getByRole('heading', { name: 'Rotate your device' })).toBeVisible();
    expect(screen.queryByRole('heading', { name: 'HQ Dashboard' })).not.toBeInTheDocument();
  });

  it.each([
    { width: 844, height: 390 },
    { width: 390, height: 844 }
  ])('keeps the larger-screen gate at $width × $height', ({ width, height }) => {
    renderAppAt(width, height);

    expect(screen.getByRole('heading', { name: 'Use a larger screen' })).toBeVisible();
    expect(screen.queryByRole('heading', { name: 'HQ Dashboard' })).not.toBeInTheDocument();
  });
});
