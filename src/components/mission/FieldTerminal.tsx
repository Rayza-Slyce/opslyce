import { useEffect, useRef, useState, type KeyboardEvent, type SyntheticEvent } from 'react';
import type { PreparedCommand, PreparationSource } from '../../profile/localProfile';
import { prepareTerminalObjectCommand } from '../../simulations/terminal/assistance';
import {
  materialiseTerminalOutput,
  TERMINAL_INPUT_LIMIT,
  type TerminalState
} from '../../simulations/terminal/interpreter';
import { getTerminalPrompt } from '../../simulations/terminal/pathResolver';
import { getVirtualNode } from '../../simulations/terminal/virtualFilesystem';
import {
  TERMINAL_COMMAND_IDS,
  TERMINAL_COMMAND_REFERENCE
} from '../../simulations/terminal/commandReference';
import styles from './FieldTerminal.module.css';

type Props = Readonly<{
  terminal: TerminalState;
  preparedCommand: PreparedCommand | null;
  commandAssistance: boolean;
  onSubmit(input: string, provenance: 'independent' | 'prepared'): void;
  onPrepare(value: string, source: PreparationSource): void;
  onClearPrepared(): void;
}>;

export function FieldTerminal({
  terminal,
  preparedCommand,
  commandAssistance,
  onSubmit,
  onPrepare,
  onClearPrepared
}: Props) {
  const [draft, setDraft] = useState(preparedCommand?.value ?? '');
  const [historyIndex, setHistoryIndex] = useState<number | null>(null);
  const [observedPreparation, setObservedPreparation] = useState(preparedCommand);
  const [clearedPreparation, setClearedPreparation] = useState<PreparedCommand | null>(null);
  const unsentDraft = useRef('');
  const transcript = useRef<HTMLDivElement>(null);
  const commandInput = useRef<HTMLInputElement>(null);

  if (preparedCommand !== observedPreparation) {
    setObservedPreparation(preparedCommand);
    if (preparedCommand !== null) {
      setDraft(preparedCommand.value);
      setHistoryIndex(null);
      setClearedPreparation(null);
    }
  }

  useEffect(() => {
    const region = transcript.current;
    if (region !== null) region.scrollTop = region.scrollHeight;
  }, [terminal.visibleInteractions]);

  useEffect(() => {
    if (preparedCommand === null) return;
    commandInput.current?.focus();
  }, [preparedCommand]);

  useEffect(() => {
    function keepFocusedCommandVisible() {
      const input = commandInput.current;
      if (input !== null && document.activeElement === input) {
        input.scrollIntoView({ block: 'nearest', inline: 'nearest' });
      }
    }
    window.addEventListener('resize', keepFocusedCommandVisible);
    return () => window.removeEventListener('resize', keepFocusedCommandVisible);
  }, []);

  function submit(event: SyntheticEvent<HTMLFormElement>) {
    event.preventDefault();
    if (draft.trim() === '') return;
    onSubmit(
      draft,
      preparedCommand !== null && draft === preparedCommand.value ? 'prepared' : 'independent'
    );
    setDraft('');
    setHistoryIndex(null);
    unsentDraft.current = '';
  }

  function handleInputKey(event: KeyboardEvent<HTMLInputElement>) {
    navigateHistory(event);
  }

  function navigateHistory(event: KeyboardEvent<HTMLInputElement>) {
    if (event.key !== 'ArrowUp' && event.key !== 'ArrowDown') return;
    const history = terminal.commandHistory;
    if (history.length === 0) return;
    event.preventDefault();

    if (event.key === 'ArrowUp') {
      if (historyIndex === null) unsentDraft.current = draft;
      const next = historyIndex === null ? history.length - 1 : Math.max(0, historyIndex - 1);
      setHistoryIndex(next);
      setDraft(history[next] ?? '');
      return;
    }

    if (historyIndex === null) return;
    if (historyIndex < history.length - 1) {
      const next = historyIndex + 1;
      setHistoryIndex(next);
      setDraft(history[next] ?? '');
    } else {
      setHistoryIndex(null);
      setDraft(unsentDraft.current);
    }
  }

  return (
    <div className={styles['terminal']}>
      <div className={styles['terminalMain']} data-terminal-main>
        <div
          ref={transcript}
          className={styles['transcript']}
          role="log"
          aria-label="Field Terminal transcript"
          aria-live="polite"
          data-terminal-transcript
        >
          {terminal.visibleInteractions.map((interaction, interactionIndex) => (
            <div
              className={styles['interaction']}
              key={`${String(interactionIndex)}-${interaction.submittedCommand}`}
            >
              <p className={styles['submitted']}>
                <span aria-hidden="true">{interaction.prompt} </span>
                {interaction.submittedCommand}
              </p>
              {materialiseTerminalOutput(interaction.output).map((line, lineIndex) => {
                const node =
                  line.canonicalTarget === undefined ? null : getVirtualNode(line.canonicalTarget);
                if (node === null || !commandAssistance) {
                  return (
                    <p
                      className={styles[line.type]}
                      data-terminal-line={line.type}
                      key={`${String(lineIndex)}-${line.text}`}
                    >
                      {line.text || '\u00a0'}
                    </p>
                  );
                }
                const preparedValue = prepareTerminalObjectCommand(
                  node.kind === 'file' ? 'read-file' : 'enter-folder',
                  terminal.currentDirectory,
                  node.path
                );
                return (
                  <button
                    className={styles['terminalObject']}
                    type="button"
                    aria-label={`Prepare ${preparedValue}`}
                    data-terminal-line={line.type}
                    key={`${String(lineIndex)}-${line.text}`}
                    onClick={() => onPrepare(preparedValue, 'terminal-object')}
                  >
                    {line.text}
                  </button>
                );
              })}
              {interaction.suggestion === undefined ? null : (
                <p className={styles['guidance']}>{interaction.suggestion.display}</p>
              )}
            </div>
          ))}
        </div>
        <form className={styles['commandForm']} onSubmit={submit}>
          <span className={styles['prompt']} aria-hidden="true">
            {getTerminalPrompt(terminal.currentDirectory)}
          </span>
          <label className={styles['label']} htmlFor="field-terminal-command">
            Command
          </label>
          <input
            ref={commandInput}
            id="field-terminal-command"
            value={draft}
            onChange={(event) => {
              setDraft(event.currentTarget.value);
              if (historyIndex !== null) setHistoryIndex(null);
              if (
                preparedCommand !== null &&
                clearedPreparation !== preparedCommand &&
                event.currentTarget.value !== preparedCommand.value
              ) {
                setClearedPreparation(preparedCommand);
                onClearPrepared();
              }
            }}
            onKeyDown={handleInputKey}
            autoComplete="off"
            autoCapitalize="none"
            spellCheck={false}
            maxLength={TERMINAL_INPUT_LIMIT}
          />
          <button type="submit">Run</button>
        </form>
      </div>
      <aside className={styles['commandRail']} aria-label="Command Guide" data-command-rail>
        <CommandGuide onPrepare={onPrepare} />
      </aside>
    </div>
  );
}

function CommandGuide({
  onPrepare
}: Readonly<{ onPrepare(value: string, source: PreparationSource): void }>) {
  return (
    <details className={styles['commandGuide']} data-command-guide>
      <summary>
        <strong>Command Guide</strong>
      </summary>
      <ul className={styles['guideList']}>
        {TERMINAL_COMMAND_IDS.map((commandId) => {
          const command = TERMINAL_COMMAND_REFERENCE[commandId];
          return (
            <li key={commandId}>
              <button
                className={styles['guideRow']}
                type="button"
                onClick={() => onPrepare(command.preparedValue, 'command-guide')}
                aria-label={`Prepare ${commandId} command`}
                data-command-guide-row={commandId}
              >
                <code>{commandId}</code>
                <span>{command.guideDescription}</span>
              </button>
            </li>
          );
        })}
      </ul>
    </details>
  );
}
