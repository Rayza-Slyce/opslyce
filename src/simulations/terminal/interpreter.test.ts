import {
  createInitialTerminalState,
  interpretTerminalCommand,
  materialiseTerminalOutput,
  TERMINAL_COMMAND_IDS,
  TERMINAL_HISTORY_LIMIT,
  TERMINAL_INPUT_LIMIT,
  TERMINAL_TRANSCRIPT_LIMIT,
  type TerminalExecution,
  type TerminalState
} from './interpreter';

function execute(input: string, state = createInitialTerminalState()) {
  return interpretTerminalCommand(input, state);
}

function executed(input: string, state = createInitialTerminalState()) {
  const result = execute(input, state);
  if (result.kind !== 'executed') throw new Error(`Expected ${input} to execute.`);
  return result;
}

function outputText(result: TerminalExecution): string {
  if (result.kind !== 'executed' || result.interaction === null) return '';
  const lines = materialiseTerminalOutput(result.interaction.output).map(({ text }) => text);
  if (result.interaction.suggestion !== undefined)
    lines.push(result.interaction.suggestion.display);
  return lines.join('\n');
}

describe('Field Terminal parser and registry', () => {
  it('registers exactly five commands', () => {
    expect(TERMINAL_COMMAND_IDS).toEqual(['help', 'ls', 'cd', 'cat', 'clear']);
  });

  it('treats whitespace-only input as a no-op', () => {
    const state = createInitialTerminalState();
    expect(execute('   \t ', state)).toEqual({ kind: 'no-op', state });
  });

  it('bounds oversized raw input before parsing or path resolution', () => {
    const oversized = `cat welcome.txt ${'x'.repeat(TERMINAL_INPUT_LIMIT)}`;
    const result = executed(oversized);
    expect(outputText(result)).toBe(
      'That command is too long for this operation.\nUse one short command at a time.'
    );
    expect(result.interaction).toMatchObject({
      commandId: null,
      resultKind: 'guidance'
    });
    expect(result.interaction?.submittedCommand).toHaveLength(TERMINAL_INPUT_LIMIT);
    expect(result.state.commandHistory[0]).toHaveLength(TERMINAL_INPUT_LIMIT);
    expect(result.state.currentDirectory).toBe('/home/recruit');
    expect(result.state.commandsUsed).toEqual([]);
    expect(result.state.openedFiles).toEqual([]);
    expect(result.events).toEqual([]);
  });

  it('normalises spacing and command-name case', () => {
    const result = executed('  LS    training/  ');
    expect(result.interaction?.submittedCommand).toBe('LS training/');
    expect(result.interaction?.commandId).toBe('ls');
    expect(outputText(result)).toBe('equipment.txt\ntrace-note.txt');
  });

  it.each([
    ['ls -la', 'Options are not used in this operation.\nTry: ls'],
    ['cat -n welcome.txt', 'Options are not used in this operation.\nTry: cat welcome.txt']
  ])('returns exact unsupported-option guidance for %s', (input, expected) => {
    expect(outputText(executed(input))).toBe(expected);
  });

  it.each([
    'ls | cat welcome.txt',
    'ls || cat welcome.txt',
    'cat welcome.txt > copy',
    'cat welcome.txt >> copy',
    'cat < welcome.txt',
    'cat << welcome.txt',
    'ls; cat welcome.txt',
    'ls && cat welcome.txt',
    '`ls`',
    'cat $(ls)'
  ])('rejects shell syntax without partially executing it: %s', (input) => {
    const result = executed(input);
    expect(outputText(result)).toBe(
      'That shell syntax is not available in this simulated Field Terminal.\nUse one supported command at a time.'
    );
    expect(result.state.currentDirectory).toBe('/home/recruit');
    expect(result.state.commandsUsed).toEqual([]);
    expect(result.state.openedFiles).toEqual([]);
  });

  it('returns exact unknown-command and conservative near-miss guidance', () => {
    expect(outputText(executed('grep welcome.txt'))).toBe(
      'Command not available in this operation: grep\nUse help to see the available commands.'
    );
    const nearMiss = executed('sl');
    expect(outputText(nearMiss)).toBe('Command not recognised: sl\nDid you mean ls?');
    expect(nearMiss.state.commandsUsed).toEqual([]);
    expect(nearMiss.state.currentDirectory).toBe('/home/recruit');
    expect(executed('xx').interaction?.suggestion).toBeUndefined();
  });

  it.each([
    ['ls one two', 'Use one path with ls.\nExample: ls training'],
    ['cd one two', 'Choose one folder to enter.\nExample: cd training'],
    ['cat one two', 'Choose one text file to read.\nExample: cat welcome.txt'],
    ['help now', 'Use help without a target.'],
    ['clear now', 'Use clear without a target.']
  ])('handles malformed arguments deterministically for %s', (input, expected) => {
    expect(outputText(executed(input))).toBe(expected);
  });
});

describe('Field Terminal commands', () => {
  it('returns the exact help output', () => {
    expect(outputText(executed('help'))).toBe(`FIELD TERMINAL COMMANDS

help
Show available commands.

ls [path]
List files and folders.

cd [folder]
Change the current folder.

cat <file>
Read a text file.

clear
Clear the visible terminal output.`);
  });

  it.each(['ls', 'ls .', 'ls /home/recruit', 'ls ..'])(
    'lists the root without changing the current directory: %s',
    (input) => {
      const result = executed(input);
      expect(outputText(result)).toBe('welcome.txt\ntraining/');
      expect(result.state.currentDirectory).toBe('/home/recruit');
      expect(
        materialiseTerminalOutput(result.interaction?.output ?? { kind: 'lines', lines: [] })
      ).toMatchObject([
        { type: 'file', canonicalTarget: '/home/recruit/welcome.txt' },
        { type: 'folder', canonicalTarget: '/home/recruit/training' }
      ]);
    }
  );

  it.each(['ls training', 'ls training/', 'ls /home/recruit/training'])(
    'lists training without changing the current directory: %s',
    (input) => {
      const result = executed(input);
      expect(outputText(result)).toBe('equipment.txt\ntrace-note.txt');
      expect(result.state.currentDirectory).toBe('/home/recruit');
    }
  );

  it('supports every accepted cd form and repeated navigation', () => {
    let state: TerminalState = createInitialTerminalState();
    for (const command of [
      'cd training',
      'cd .',
      'cd ..',
      'cd training/',
      'cd /home/recruit',
      'cd /home/recruit/training',
      'cd'
    ]) {
      const result = executed(command, state);
      expect(outputText(result)).toBe('');
      state = result.state;
    }
    expect(state.currentDirectory).toBe('/home/recruit');
    expect(state.commandHistory).toHaveLength(7);
    expect(state.commandsUsed).toEqual(['cd']);
  });

  it('returns exact missing, wrong-type, outside-root and filename guidance', () => {
    expect(outputText(executed('cat'))).toBe(
      'Choose a text file to read.\nExample: cat welcome.txt'
    );
    expect(outputText(executed('ls missing'))).toBe('No file or folder found at: missing');
    expect(outputText(executed('cd missing'))).toBe('No folder found at: missing');
    expect(outputText(executed('cat training'))).toBe(
      'training is a folder.\nUse ls training or cd training.'
    );
    expect(outputText(executed('cd welcome.txt'))).toBe('welcome.txt is a file, not a folder.');
    expect(outputText(executed('cd /'))).toBe(
      'That location is outside the OPS-001 workspace.\nWorkspace root: /home/recruit'
    );
    expect(outputText(executed('cat welcom.txt'))).toBe(
      'No file found at: welcom.txt\nDid you mean welcome.txt?'
    );
  });

  it('reads every exact file without changing directory and records first-open events once', () => {
    const welcome = executed('cat welcome.txt');
    expect(outputText(welcome)).toContain(
      'WELCOME TO OPSLYCE HQ\n\nRecruit Workspace status: READY'
    );
    expect(welcome.state.currentDirectory).toBe('/home/recruit');
    expect(welcome.state.openedFiles).toEqual(['/home/recruit/welcome.txt']);
    expect(welcome.events).toEqual([
      {
        type: 'terminal/command-succeeded',
        commandId: 'cat',
        firstQualifyingUse: true,
        directoryChanged: false
      },
      { type: 'terminal/file-opened', canonicalPath: '/home/recruit/welcome.txt', firstOpen: true },
      {
        type: 'terminal/objects-revealed',
        canonicalPaths: ['/home/recruit', '/home/recruit/welcome.txt']
      }
    ]);

    const repeated = executed('cat /home/recruit/welcome.txt', welcome.state);
    expect(repeated.state.openedFiles).toEqual(['/home/recruit/welcome.txt']);
    expect(repeated.events).toContainEqual({
      type: 'terminal/file-opened',
      canonicalPath: '/home/recruit/welcome.txt',
      firstOpen: false
    });

    const equipment = executed('cat training/equipment.txt', repeated.state);
    expect(outputText(equipment)).toContain('RECRUIT FIELD EQUIPMENT');
    const note = executed('cat training/trace-note.txt', equipment.state);
    expect(outputText(note)).toContain('HQ Training route:\n/recruit-verification');
    expect(note.state.openedFiles).toEqual([
      '/home/recruit/welcome.txt',
      '/home/recruit/training/equipment.txt',
      '/home/recruit/training/trace-note.txt'
    ]);
    expect(note.state.commandsUsed).toEqual(['cat']);
  });

  it('reads a file relative to training and keeps the training prompt', () => {
    const training = executed('cd training');
    const note = executed('cat trace-note.txt', training.state);
    expect(note.interaction?.prompt).toBe('recruit@opslyce-hq:~/training$');
    expect(note.state.currentDirectory).toBe('/home/recruit/training');
  });

  it('clear removes only visible interactions and retains durable Terminal state', () => {
    const listed = executed('ls');
    const training = executed('cd training', listed.state);
    const cleared = executed('clear', training.state);
    expect(cleared.interaction).toBeNull();
    expect(cleared.state).toMatchObject({
      currentDirectory: '/home/recruit/training',
      commandHistory: ['ls', 'cd training', 'clear'],
      visibleInteractions: [],
      commandsUsed: ['ls', 'cd', 'clear'],
      openedFiles: []
    });
  });

  it('bounds persisted command history and visible interactions', () => {
    let state = createInitialTerminalState();
    for (let index = 0; index < TERMINAL_HISTORY_LIMIT + 5; index += 1) {
      state = executed('ls', state).state;
    }
    expect(state.commandHistory).toHaveLength(TERMINAL_HISTORY_LIMIT);
    expect(state.visibleInteractions).toHaveLength(TERMINAL_TRANSCRIPT_LIMIT);
  });
});
