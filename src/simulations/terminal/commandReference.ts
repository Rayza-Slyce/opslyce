export const TERMINAL_COMMAND_IDS = ['help', 'ls', 'cd', 'cat', 'clear'] as const;
export type TerminalCommandId = (typeof TERMINAL_COMMAND_IDS)[number];

export const TERMINAL_COMMAND_REFERENCE = {
  help: {
    syntax: 'help',
    preparedValue: 'help',
    description: 'Show available commands.',
    guideDescription: 'Show commands',
    manualDescription: 'Show available commands'
  },
  ls: {
    syntax: 'ls [path]',
    preparedValue: 'ls ',
    description: 'List files and folders.',
    guideDescription: 'List files and folders',
    manualDescription: 'List files and folders'
  },
  cd: {
    syntax: 'cd [folder]',
    preparedValue: 'cd ',
    description: 'Change current folder.',
    guideDescription: 'Change folder',
    helpDescription: 'Change the current folder.',
    manualDescription: 'Change current folder'
  },
  cat: {
    syntax: 'cat <file>',
    preparedValue: 'cat ',
    description: 'Read a text file.',
    guideDescription: 'Read a text file',
    manualDescription: 'Read a text file'
  },
  clear: {
    syntax: 'clear',
    preparedValue: 'clear',
    description: 'Clear the visible terminal display.',
    guideDescription: 'Clear terminal',
    helpDescription: 'Clear the visible terminal output.',
    manualDescription: 'Clear the visible terminal display'
  }
} as const satisfies Readonly<
  Record<
    TerminalCommandId,
    Readonly<{
      syntax: string;
      preparedValue: string;
      description: string;
      guideDescription: string;
      helpDescription?: string;
      manualDescription: string;
    }>
  >
>;
