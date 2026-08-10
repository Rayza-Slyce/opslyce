import {
  createInitialTerminalState,
  interpretTerminalCommand,
  materialiseTerminalOutput,
  TERMINAL_COMMAND_IDS,
  TERMINAL_INPUT_LIMIT,
  type TerminalExecution
} from '../../src/simulations/terminal/interpreter';

function execute(input: string) {
  const result = interpretTerminalCommand(input, createInitialTerminalState());
  if (result.kind !== 'executed') throw new Error(`Expected ${input} to be handled.`);
  return result;
}

function outputText(result: TerminalExecution): string {
  if (result.kind !== 'executed' || result.interaction === null) return '';
  const lines = materialiseTerminalOutput(result.interaction.output).map(({ text }) => text);
  if (result.interaction.suggestion !== undefined)
    lines.push(result.interaction.suggestion.display);
  return lines.join('\n');
}

function expectNoTerminalEffect(result: ReturnType<typeof execute>) {
  expect(result.state).toMatchObject({
    currentDirectory: '/home/recruit',
    commandsUsed: [],
    openedFiles: []
  });
  expect(result.events).toEqual([]);
}

describe('operational Field Terminal safety boundary', () => {
  it.each(['rm -rf /', 'whoami', 'grep secret'])(
    'keeps unsupported command %s inside the simulation',
    (input) => {
      const result = execute(input);
      const command = input.split(' ')[0] ?? '';
      expect(outputText(result)).toBe(
        `Command not available in this operation: ${command}\nUse help to see the available commands.`
      );
      expectNoTerminalEffect(result);
    }
  );

  it.each([
    'cd training | cat trace-note.txt',
    'cd training || cat trace-note.txt',
    'cd training > output',
    'cd training >> output',
    'cat < welcome.txt',
    'cat << welcome.txt',
    'cd training; cat trace-note.txt',
    'cd training && cat trace-note.txt',
    '`cd training`',
    'cat $(cd training)'
  ])('rejects shell syntax without partially executing it: %s', (input) => {
    const result = execute(input);
    expect(outputText(result)).toBe(
      'That shell syntax is not available in this simulated Field Terminal.\nUse one supported command at a time.'
    );
    expectNoTerminalEffect(result);
  });

  it('exposes exactly the bounded five-command registry', () => {
    expect(TERMINAL_COMMAND_IDS).toEqual(['help', 'ls', 'cd', 'cat', 'clear']);
  });

  it('keeps command names case-insensitive in the real interpreter', () => {
    const result = execute('LS training');
    expect(result.interaction?.commandId).toBe('ls');
    expect(result.state.commandsUsed).toEqual(['ls']);
    expect(outputText(result)).toBe('equipment.txt\ntrace-note.txt');
  });

  it('bounds oversized input without executing a truncated prefix or retaining it whole', () => {
    const oversized = `cd training ${'x'.repeat(TERMINAL_INPUT_LIMIT)}`;
    const result = execute(oversized);
    expect(outputText(result)).toBe(
      'That command is too long for this operation.\nUse one short command at a time.'
    );
    expectNoTerminalEffect(result);
    expect(result.interaction?.commandId).toBeNull();
    expect(result.interaction?.submittedCommand).toHaveLength(TERMINAL_INPUT_LIMIT);
    expect(result.state.commandHistory[0]).toHaveLength(TERMINAL_INPUT_LIMIT);
    expect(result.interaction?.submittedCommand).not.toBe(oversized);
    expect(result.state.commandHistory).not.toContain(oversized);
  });
});
