import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { useState } from 'react';
import type { PreparedCommand, PreparationSource } from '../../profile/localProfile';
import {
  createInitialTerminalState,
  interpretTerminalCommand,
  TERMINAL_INPUT_LIMIT,
  type TerminalState
} from '../../simulations/terminal/interpreter';
import { FieldTerminal } from './FieldTerminal';

function TerminalHarness({ commandAssistance = false }: Readonly<{ commandAssistance?: boolean }>) {
  const [terminal, setTerminal] = useState<TerminalState>(createInitialTerminalState());
  const [preparedCommand, setPreparedCommand] = useState<PreparedCommand | null>(null);
  const [lastProvenance, setLastProvenance] = useState('');
  return (
    <>
      <FieldTerminal
        terminal={terminal}
        preparedCommand={preparedCommand}
        commandAssistance={commandAssistance}
        onSubmit={(input, provenance) => {
          const result = interpretTerminalCommand(input, terminal, provenance);
          if (result.kind === 'executed') setTerminal(result.state);
          setLastProvenance(provenance);
          setPreparedCommand(null);
        }}
        onPrepare={(value: string, source: PreparationSource) =>
          setPreparedCommand((current) => ({
            value,
            source,
            revision: (current?.revision ?? 0) + 1
          }))
        }
        onClearPrepared={() => setPreparedCommand(null)}
      />
      <output data-testid="last-provenance">{lastProvenance}</output>
    </>
  );
}

describe('FieldTerminal', () => {
  it('uses the tool tab as its label without redundant terminal chrome', () => {
    render(<TerminalHarness />);
    expect(screen.queryByRole('heading', { name: 'Field Terminal' })).not.toBeInTheDocument();
    expect(screen.queryByText('Recruit Workspace connected.')).not.toBeInTheDocument();
  });

  it('applies the domain input limit to the real command field', () => {
    render(<TerminalHarness />);
    expect(screen.getByRole('textbox', { name: 'Command' })).toHaveAttribute(
      'maxlength',
      String(TERMINAL_INPUT_LIMIT)
    );
  });

  it('submits with Run, clears input and renders semantic filesystem rows', async () => {
    const user = userEvent.setup();
    render(<TerminalHarness />);
    const input = screen.getByRole('textbox', { name: 'Command' });
    await user.type(input, 'ls');
    await user.click(screen.getByRole('button', { name: 'Run' }));
    expect(input).toHaveValue('');
    expect(screen.getByText('welcome.txt')).toHaveAttribute('data-terminal-line', 'file');
    expect(screen.getByText('training/')).toHaveAttribute('data-terminal-line', 'folder');
  });

  it('scrolls a new result inside the transcript without moving the composer', async () => {
    const user = userEvent.setup();
    render(<TerminalHarness />);
    const transcript = screen.getByRole('log', { name: 'Field Terminal transcript' });
    Object.defineProperty(transcript, 'scrollHeight', { configurable: true, value: 480 });
    const input = screen.getByRole('textbox', { name: 'Command' });
    await user.type(input, 'help{Enter}');

    expect(transcript.scrollTop).toBe(480);
    expect(screen.getByText('Clear the visible terminal output.')).toBeVisible();
    expect(input).toBeVisible();
    expect(screen.getByRole('button', { name: 'Run' })).toBeVisible();
  });

  it('submits with Enter and updates the canonical prompt after cd', async () => {
    const user = userEvent.setup();
    render(<TerminalHarness />);
    const input = screen.getByRole('textbox', { name: 'Command' });
    await user.type(input, 'cd training{Enter}');
    expect(input).toHaveValue('');
    expect(screen.getByText('recruit@opslyce-hq:~/training$')).toBeVisible();
  });

  it('navigates history without running and restores the unsent draft', async () => {
    const user = userEvent.setup();
    render(<TerminalHarness />);
    const input = screen.getByRole('textbox', { name: 'Command' });
    await user.type(input, 'help{Enter}ls{Enter}draft');
    await user.keyboard('{ArrowUp}');
    expect(input).toHaveValue('ls');
    await user.keyboard('{ArrowUp}');
    expect(input).toHaveValue('help');
    await user.keyboard('{ArrowDown}');
    expect(input).toHaveValue('ls');
    await user.keyboard('{ArrowDown}');
    expect(input).toHaveValue('draft');
    expect(screen.getAllByText(/recruit@opslyce-hq:~\$/u)).toHaveLength(3);
  });

  it('ignores whitespace-only submission', async () => {
    const user = userEvent.setup();
    render(<TerminalHarness />);
    const input = screen.getByRole('textbox', { name: 'Command' });
    await user.type(input, '   {Enter}');
    expect(screen.queryByRole('log')?.children).toHaveLength(0);
  });

  it('shows the canonical Command Guide and prepares syntax stems without executing them', async () => {
    const user = userEvent.setup();
    render(<TerminalHarness />);
    const disclosure = screen.getByText('Command Guide').closest('details');
    expect(disclosure).not.toBeNull();
    expect(disclosure).not.toHaveAttribute('open');

    await user.click(screen.getByText('Command Guide'));

    expect(disclosure).toHaveAttribute('open');
    expect(screen.getByText('help', { selector: 'code' })).toBeVisible();
    expect(screen.getByText('ls', { selector: 'code' })).toBeVisible();
    expect(screen.getByText('cd', { selector: 'code' })).toBeVisible();
    expect(screen.getByText('cat', { selector: 'code' })).toBeVisible();
    expect(screen.getByText('clear', { selector: 'code' })).toBeVisible();
    expect(screen.getByText('Show commands')).toBeVisible();
    expect(screen.getByText('List files and folders')).toBeVisible();
    expect(screen.getByText('Change folder')).toBeVisible();
    expect(screen.getByText('Read a text file')).toBeVisible();
    expect(screen.getByText('Clear terminal')).toBeVisible();
    expect(screen.queryByText('Prepare', { exact: true })).not.toBeInTheDocument();
    expect(screen.getAllByRole('button', { name: /^Prepare \w+ command$/u })).toHaveLength(5);
    expect(screen.queryByText(/welcome\.txt|recruit-verification/u)).not.toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: 'Prepare ls command' }));
    expect(screen.getByRole('textbox', { name: 'Command' })).toHaveValue('ls ');
    expect(screen.getByRole('log', { name: 'Field Terminal transcript' })).toBeEmptyDOMElement();
    await user.click(screen.getByRole('button', { name: 'Run' }));
    expect(screen.getByTestId('last-provenance')).toHaveTextContent('prepared');
  });

  it.each([
    ['help', 'help'],
    ['ls', 'ls '],
    ['cd', 'cd '],
    ['cat', 'cat '],
    ['clear', 'clear']
  ])('prepares only the approved %s guide value', async (command, expected) => {
    const user = userEvent.setup();
    render(<TerminalHarness />);
    await user.click(screen.getByText('Command Guide'));
    await user.click(screen.getByRole('button', { name: `Prepare ${command} command` }));
    expect(screen.getByRole('textbox', { name: 'Command' })).toHaveValue(expected);
    expect(screen.getByRole('log', { name: 'Field Terminal transcript' })).toBeEmptyDOMElement();
  });

  it('keeps structured output readable but non-interactive when assistance is off', async () => {
    const user = userEvent.setup();
    render(<TerminalHarness />);
    await user.type(screen.getByRole('textbox', { name: 'Command' }), 'ls{Enter}');
    expect(screen.getByText('welcome.txt')).toBeVisible();
    expect(screen.queryByRole('button', { name: 'File welcome.txt' })).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Read file' })).not.toBeInTheDocument();
    await user.click(screen.getByText('welcome.txt'));
    expect(screen.getByRole('textbox', { name: 'Command' })).toHaveValue('');
  });

  it('uses only visible structured file and folder targets for direct preparation', async () => {
    const user = userEvent.setup();
    render(<TerminalHarness commandAssistance />);
    const input = screen.getByRole('textbox', { name: 'Command' });
    await user.type(input, 'ls{Enter}');
    expect(screen.queryByText('trace-note.txt')).not.toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: 'Prepare cat welcome.txt' }));
    expect(input).toHaveValue('cat welcome.txt');
    await user.click(screen.getByRole('button', { name: 'Prepare cd training' }));
    expect(input).toHaveValue('cd training');
    expect(screen.getByRole('log', { name: 'Field Terminal transcript' })).toHaveTextContent(
      'welcome.txt'
    );
  });

  it('does not expose proactive completion or intercept Tab for completion', async () => {
    const user = userEvent.setup();
    render(<TerminalHarness />);
    const input = screen.getByRole('textbox', { name: 'Command' });
    await user.type(input, 'h');
    expect(screen.queryByRole('button', { name: /Complete:/u })).not.toBeInTheDocument();
    await user.keyboard('{Tab}');
    expect(input).toHaveValue('h');
    expect(input).not.toHaveFocus();
    expect(screen.getByRole('log', { name: 'Field Terminal transcript' })).toBeEmptyDOMElement();
  });

  it('renders interpreter guidance without an answer-preparation action', async () => {
    const user = userEvent.setup();
    render(<TerminalHarness commandAssistance />);
    const input = screen.getByRole('textbox', { name: 'Command' });
    await user.type(input, 'sl{Enter}');
    expect(screen.getByText('Did you mean ls?')).toBeVisible();
    expect(screen.queryByRole('button', { name: 'Prepare suggestion' })).not.toBeInTheDocument();
    expect(input).toHaveValue('');
    expect(screen.queryByText('welcome.txt')).not.toBeInTheDocument();
  });

  it('never turns interpreter guidance into proactive controls and clear removes it', async () => {
    const user = userEvent.setup();
    render(<TerminalHarness commandAssistance />);
    const input = screen.getByRole('textbox', { name: 'Command' });

    await user.type(input, 'sl{Enter}');
    expect(screen.getByText('Did you mean ls?')).toBeVisible();
    expect(screen.queryByRole('button', { name: 'Prepare suggestion' })).not.toBeInTheDocument();

    await user.type(input, 'help{Enter}');
    expect(screen.queryByRole('button', { name: 'Prepare suggestion' })).not.toBeInTheDocument();

    await user.type(input, 'cat welcom.txt{Enter}');
    expect(screen.getByText('Did you mean welcome.txt?')).toBeVisible();
    expect(input).toHaveValue('');
    await user.type(input, 'clear{Enter}');
    expect(screen.getByRole('log', { name: 'Field Terminal transcript' })).toBeEmptyDOMElement();
    expect(screen.queryByRole('button', { name: 'Prepare suggestion' })).not.toBeInTheDocument();
  });

  it('clears restored preparation provenance after an edit while keeping the draft', async () => {
    const user = userEvent.setup();
    render(<TerminalHarness />);
    const input = screen.getByRole('textbox', { name: 'Command' });
    await user.click(screen.getByText('Command Guide'));
    await user.click(screen.getByRole('button', { name: 'Prepare help command' }));
    await user.type(input, ' ');
    expect(input).toHaveValue('help ');
    await user.keyboard('{Enter}');
    expect(screen.getByTestId('last-provenance')).toHaveTextContent('independent');
  });
});
