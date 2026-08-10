import { resolveVirtualPath, getTerminalPrompt } from './pathResolver';
import {
  TERMINAL_COMMAND_IDS,
  TERMINAL_COMMAND_REFERENCE,
  type TerminalCommandId
} from './commandReference';
import {
  getVirtualFile,
  listVirtualDirectory,
  OPS001_WORKSPACE_ROOT,
  type VirtualDirectoryPath,
  type VirtualFilePath,
  type VirtualPath
} from './virtualFilesystem';

export const TERMINAL_HISTORY_LIMIT = 50;
export const TERMINAL_TRANSCRIPT_LIMIT = 30;
export const TERMINAL_INPUT_LIMIT = 160;

export { TERMINAL_COMMAND_IDS, type TerminalCommandId } from './commandReference';
export type TerminalResultKind = 'success' | 'error' | 'guidance';
export type TerminalLineType = 'normal' | 'file' | 'folder' | 'path' | 'warning';
export type TerminalSubmissionProvenance = 'independent' | 'prepared';

export type TerminalOutputLine = Readonly<{
  type: TerminalLineType;
  text: string;
  canonicalTarget?: VirtualPath | undefined;
}>;

export type TerminalOutput =
  | Readonly<{ kind: 'lines'; lines: readonly TerminalOutputLine[] }>
  | Readonly<{ kind: 'file-content'; canonicalPath: VirtualFilePath }>;

export type TerminalSuggestion = Readonly<{
  display: string;
  command: string;
}>;

export type TerminalInteraction = Readonly<{
  prompt: string;
  submittedCommand: string;
  commandId: TerminalCommandId | null;
  provenance: TerminalSubmissionProvenance;
  resultKind: TerminalResultKind;
  output: TerminalOutput;
  suggestion?: TerminalSuggestion | undefined;
}>;

export type TerminalState = Readonly<{
  currentDirectory: VirtualDirectoryPath;
  commandHistory: readonly string[];
  visibleInteractions: readonly TerminalInteraction[];
  commandsUsed: readonly TerminalCommandId[];
  qualifyingCommandsUsed: readonly TerminalCommandId[];
  openedFiles: readonly VirtualFilePath[];
  revealedPaths: readonly VirtualPath[];
}>;

export type TerminalMissionEvent =
  | Readonly<{
      type: 'terminal/command-succeeded';
      commandId: TerminalCommandId;
      firstQualifyingUse: boolean;
      directoryChanged: boolean;
    }>
  | Readonly<{
      type: 'terminal/file-opened';
      canonicalPath: VirtualFilePath;
      firstOpen: boolean;
    }>
  | Readonly<{
      type: 'terminal/objects-revealed';
      canonicalPaths: readonly VirtualPath[];
    }>;

export type TerminalExecution =
  | Readonly<{ kind: 'no-op'; state: TerminalState }>
  | Readonly<{
      kind: 'executed';
      state: TerminalState;
      interaction: TerminalInteraction | null;
      events: readonly TerminalMissionEvent[];
    }>;

type ParsedCommand = Readonly<{
  submittedCommand: string;
  commandToken: string;
  commandId: TerminalCommandId | null;
  args: readonly string[];
  hasShellSyntax: boolean;
}>;

type CommandContext = Readonly<{
  state: TerminalState;
  parsed: ParsedCommand;
}>;

type CommandOutcome = Readonly<{
  resultKind: TerminalResultKind;
  output: TerminalOutput;
  nextDirectory?: VirtualDirectoryPath;
  openedFile?: VirtualFilePath;
  suggestion?: TerminalSuggestion;
  clearVisibleOutput?: boolean;
}>;

const shellSyntaxPattern = /(?:&&|\|\||[;|<>`]|\$\(|\r|\n)/u;
const normal = (text: string): TerminalOutputLine => ({ type: 'normal', text });
const warning = (text: string): TerminalOutputLine => ({ type: 'warning', text });
const lineOutput = (...lines: TerminalOutputLine[]): TerminalOutput => ({ kind: 'lines', lines });

const helpLines = [
  'FIELD TERMINAL COMMANDS',
  '',
  ...TERMINAL_COMMAND_IDS.flatMap((commandId, index) => {
    const command = TERMINAL_COMMAND_REFERENCE[commandId];
    return [
      command.syntax,
      'helpDescription' in command ? command.helpDescription : command.description,
      ...(index === TERMINAL_COMMAND_IDS.length - 1 ? [] : [''])
    ];
  })
].map(normal);

const commandRegistry: Readonly<
  Record<TerminalCommandId, (context: CommandContext) => CommandOutcome>
> = {
  help: ({ parsed }) =>
    parsed.args.length === 0
      ? { resultKind: 'success', output: { kind: 'lines', lines: helpLines } }
      : malformedArguments('help', 'Use help without a target.'),
  ls: ({ state, parsed }) => {
    const option = optionGuidance(parsed);
    if (option !== null) return option;
    if (parsed.args.length > 1)
      return malformedArguments('ls', 'Use one path with ls.', 'ls training');
    const target = parsed.args[0] ?? '.';
    const resolved = resolveVirtualPath(state.currentDirectory, target);
    if (resolved.kind === 'outside-workspace') return outsideWorkspace();
    if (resolved.kind === 'missing') {
      return errorLines(`No file or folder found at: ${target}`);
    }
    if (resolved.node.kind === 'file') {
      return errorLines(`${target} is a file, not a folder.`);
    }
    return {
      resultKind: 'success',
      output: {
        kind: 'lines',
        lines: listVirtualDirectory(resolved.node).map((node) => ({
          type: node.kind,
          text: node.kind === 'folder' ? `${node.name}/` : node.name,
          canonicalTarget: node.path
        }))
      }
    };
  },
  cd: ({ state, parsed }) => {
    const option = optionGuidance(parsed);
    if (option !== null) return option;
    if (parsed.args.length > 1)
      return malformedArguments('cd', 'Choose one folder to enter.', 'cd training');
    if (parsed.args.length === 0) {
      return {
        resultKind: 'success',
        output: lineOutput(),
        nextDirectory: OPS001_WORKSPACE_ROOT
      };
    }
    const target = parsed.args[0] ?? '';
    const resolved = resolveVirtualPath(state.currentDirectory, target);
    if (resolved.kind === 'outside-workspace') return outsideWorkspace();
    if (resolved.kind === 'missing') return errorLines(`No folder found at: ${target}`);
    if (resolved.node.kind === 'file') {
      return errorLines(`${target} is a file, not a folder.`);
    }
    return {
      resultKind: 'success',
      output: lineOutput(),
      nextDirectory: resolved.node.path
    };
  },
  cat: ({ state, parsed }) => {
    const option = optionGuidance(parsed);
    if (option !== null) return option;
    if (parsed.args.length === 0) {
      return guidanceLines('Choose a text file to read.', 'Example: cat welcome.txt');
    }
    if (parsed.args.length > 1) {
      return malformedArguments('cat', 'Choose one text file to read.', 'cat welcome.txt');
    }
    const target = parsed.args[0] ?? '';
    const resolved = resolveVirtualPath(state.currentDirectory, target);
    if (resolved.kind === 'outside-workspace') return outsideWorkspace();
    if (resolved.kind === 'missing') {
      const suggestion = filenameSuggestion(state.currentDirectory, target);
      return {
        resultKind: 'error',
        output: lineOutput(warning(`No file found at: ${target}`)),
        ...(suggestion === null ? {} : { suggestion })
      };
    }
    if (resolved.node.kind === 'folder') {
      return errorLines(`${target} is a folder.`, `Use ls ${target} or cd ${target}.`);
    }
    return {
      resultKind: 'success',
      output: { kind: 'file-content', canonicalPath: resolved.node.path },
      openedFile: resolved.node.path
    };
  },
  clear: ({ parsed }) =>
    parsed.args.length === 0
      ? { resultKind: 'success', output: lineOutput(), clearVisibleOutput: true }
      : malformedArguments('clear', 'Use clear without a target.')
};

export function createInitialTerminalState(): TerminalState {
  return {
    currentDirectory: OPS001_WORKSPACE_ROOT,
    commandHistory: [],
    visibleInteractions: [],
    commandsUsed: [],
    qualifyingCommandsUsed: [],
    openedFiles: [],
    revealedPaths: []
  };
}

export function interpretTerminalCommand(
  rawInput: string,
  state: TerminalState,
  provenance: TerminalSubmissionProvenance = 'independent'
): TerminalExecution {
  if (rawInput.length > TERMINAL_INPUT_LIMIT) {
    return oversizedInput(rawInput, state, provenance);
  }
  const parsed = parseCommand(rawInput);
  if (parsed === null) return { kind: 'no-op', state };

  const prompt = getTerminalPrompt(state.currentDirectory);
  const history = appendBounded(
    state.commandHistory,
    parsed.submittedCommand,
    TERMINAL_HISTORY_LIMIT
  );
  let outcome: CommandOutcome;

  if (parsed.hasShellSyntax) {
    outcome = guidanceLines(
      'That shell syntax is not available in this simulated Field Terminal.',
      'Use one supported command at a time.'
    );
  } else if (parsed.commandId === null) {
    outcome = unknownCommand(parsed.commandToken);
  } else {
    outcome = commandRegistry[parsed.commandId]({ state, parsed });
  }

  const interaction: TerminalInteraction = {
    prompt,
    submittedCommand: parsed.submittedCommand,
    commandId: parsed.commandId,
    provenance,
    resultKind: outcome.resultKind,
    output: outcome.output,
    ...(outcome.suggestion === undefined ? {} : { suggestion: outcome.suggestion })
  };
  const successfulCommand = outcome.resultKind === 'success' ? parsed.commandId : null;
  const commandsUsed =
    successfulCommand === null || state.commandsUsed.includes(successfulCommand)
      ? state.commandsUsed
      : [...state.commandsUsed, successfulCommand];
  const openedFiles =
    outcome.openedFile === undefined || state.openedFiles.includes(outcome.openedFile)
      ? state.openedFiles
      : [...state.openedFiles, outcome.openedFile];
  const directoryChanged =
    outcome.nextDirectory !== undefined && outcome.nextDirectory !== state.currentDirectory;
  const qualifiesForFirstUse =
    successfulCommand !== null && (successfulCommand !== 'cd' || directoryChanged);
  const qualifyingCommandsUsed =
    !qualifiesForFirstUse || state.qualifyingCommandsUsed.includes(successfulCommand)
      ? state.qualifyingCommandsUsed
      : [...state.qualifyingCommandsUsed, successfulCommand];
  const revealedByListing =
    successfulCommand === 'ls' && outcome.output.kind === 'lines'
      ? outcome.output.lines.flatMap((line) =>
          line.canonicalTarget === undefined ? [] : [line.canonicalTarget]
        )
      : [];
  const revealedByOpening =
    outcome.openedFile === undefined
      ? []
      : [parentDirectory(outcome.openedFile), outcome.openedFile];
  const newlyRevealed = uniquePaths([...revealedByListing, ...revealedByOpening]).filter(
    (path) => !state.revealedPaths.includes(path)
  );
  const events: readonly TerminalMissionEvent[] = [
    ...(successfulCommand === null
      ? []
      : [
          {
            type: 'terminal/command-succeeded' as const,
            commandId: successfulCommand,
            firstQualifyingUse:
              qualifiesForFirstUse && !state.qualifyingCommandsUsed.includes(successfulCommand),
            directoryChanged
          }
        ]),
    ...(outcome.openedFile === undefined
      ? []
      : [
          {
            type: 'terminal/file-opened' as const,
            canonicalPath: outcome.openedFile,
            firstOpen: !state.openedFiles.includes(outcome.openedFile)
          }
        ]),
    ...(newlyRevealed.length === 0
      ? []
      : [
          {
            type: 'terminal/objects-revealed' as const,
            canonicalPaths: newlyRevealed
          }
        ])
  ];

  return {
    kind: 'executed',
    interaction: outcome.clearVisibleOutput === true ? null : interaction,
    events,
    state: {
      currentDirectory: outcome.nextDirectory ?? state.currentDirectory,
      commandHistory: history,
      visibleInteractions:
        outcome.clearVisibleOutput === true
          ? []
          : appendBounded(state.visibleInteractions, interaction, TERMINAL_TRANSCRIPT_LIMIT),
      commandsUsed,
      qualifyingCommandsUsed,
      openedFiles,
      revealedPaths: uniquePaths([...state.revealedPaths, ...newlyRevealed])
    }
  };
}

function oversizedInput(
  rawInput: string,
  state: TerminalState,
  provenance: TerminalSubmissionProvenance
): TerminalExecution {
  const submittedCommand = rawInput.slice(0, TERMINAL_INPUT_LIMIT);
  const interaction: TerminalInteraction = {
    prompt: getTerminalPrompt(state.currentDirectory),
    submittedCommand,
    commandId: null,
    provenance,
    resultKind: 'guidance',
    output: lineOutput(
      warning('That command is too long for this operation.'),
      warning('Use one short command at a time.')
    )
  };
  return {
    kind: 'executed',
    interaction,
    events: [],
    state: {
      ...state,
      commandHistory: appendBounded(state.commandHistory, submittedCommand, TERMINAL_HISTORY_LIMIT),
      visibleInteractions: appendBounded(
        state.visibleInteractions,
        interaction,
        TERMINAL_TRANSCRIPT_LIMIT
      )
    }
  };
}

export function revealTerminalPaths(
  state: TerminalState,
  paths: readonly VirtualPath[]
): TerminalState {
  return { ...state, revealedPaths: uniquePaths([...state.revealedPaths, ...paths]) };
}

function uniquePaths(paths: readonly VirtualPath[]): readonly VirtualPath[] {
  return paths.filter((path, index) => paths.indexOf(path) === index);
}

function parentDirectory(path: VirtualFilePath): VirtualDirectoryPath {
  return path === '/home/recruit/welcome.txt' ? '/home/recruit' : '/home/recruit/training';
}

export function materialiseTerminalOutput(output: TerminalOutput): readonly TerminalOutputLine[] {
  if (output.kind === 'lines') return output.lines;
  return getVirtualFile(output.canonicalPath).content.split('\n').map(normal);
}

function parseCommand(rawInput: string): ParsedCommand | null {
  const trimmed = rawInput.trim();
  if (trimmed.length === 0) return null;
  const submittedCommand = trimmed.replace(/\s+/gu, ' ');
  const tokens = submittedCommand.split(' ');
  const commandToken = tokens[0]?.toLocaleLowerCase('en-GB') ?? '';
  return {
    submittedCommand,
    commandToken,
    commandId: isTerminalCommandId(commandToken) ? commandToken : null,
    args: tokens.slice(1),
    hasShellSyntax: shellSyntaxPattern.test(trimmed)
  };
}

function isTerminalCommandId(value: string): value is TerminalCommandId {
  return (TERMINAL_COMMAND_IDS as readonly string[]).includes(value);
}

function optionGuidance(parsed: ParsedCommand): CommandOutcome | null {
  if (!parsed.args.some((argument) => argument.startsWith('-'))) return null;
  const nonOptionTarget = parsed.args.find((argument) => !argument.startsWith('-'));
  const example =
    parsed.commandId === 'cat'
      ? `cat ${nonOptionTarget ?? 'welcome.txt'}`
      : (parsed.commandId ?? parsed.commandToken);
  return guidanceLines('Options are not used in this operation.', `Try: ${example}`);
}

function unknownCommand(command: string): CommandOutcome {
  if (command === 'sl') {
    return {
      resultKind: 'guidance',
      output: lineOutput(warning('Command not recognised: sl')),
      suggestion: { display: 'Did you mean ls?', command: 'ls' }
    };
  }
  return errorLines(
    `Command not available in this operation: ${command}`,
    'Use help to see the available commands.'
  );
}

function filenameSuggestion(
  currentDirectory: VirtualDirectoryPath,
  target: string
): TerminalSuggestion | null {
  if (currentDirectory === OPS001_WORKSPACE_ROOT && target === 'welcom.txt') {
    return { display: 'Did you mean welcome.txt?', command: 'cat welcome.txt' };
  }
  return null;
}

function outsideWorkspace(): CommandOutcome {
  return errorLines(
    'That location is outside the OPS-001 workspace.',
    `Workspace root: ${OPS001_WORKSPACE_ROOT}`
  );
}

function malformedArguments(
  _command: TerminalCommandId,
  message: string,
  example?: string
): CommandOutcome {
  return guidanceLines(message, ...(example === undefined ? [] : [`Example: ${example}`]));
}

function errorLines(...messages: string[]): CommandOutcome {
  return { resultKind: 'error', output: lineOutput(...messages.map(warning)) };
}

function guidanceLines(...messages: string[]): CommandOutcome {
  return { resultKind: 'guidance', output: lineOutput(...messages.map(warning)) };
}

function appendBounded<T>(values: readonly T[], value: T, limit: number): readonly T[] {
  return [...values, value].slice(-limit);
}
