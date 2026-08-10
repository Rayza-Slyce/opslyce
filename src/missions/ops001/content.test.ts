import { getOps001Welcome, OPS001_CONTENT } from './content';

describe('OPS-001 content', () => {
  it('uses Stage 10.6 content version 7', () => {
    expect(OPS001_CONTENT.contentVersion).toBe(7);
  });

  it('owns the exact Stage 9 objective, evidence, hint and Mission Control copy', () => {
    expect(OPS001_CONTENT.workspace.objectives['OBJ-005'].wording).toBe('Operation verified.');
    expect(OPS001_CONTENT.workspace.objectives['OBJ-004'].milestone).toBe(
      'Verification flag accepted.'
    );
    expect(OPS001_CONTENT.workspace.evidence.entries['EV-004']).toEqual({
      title: 'OPERATION VERIFIED',
      detail: 'Recruit identity confirmed through the HQ Training Portal.',
      status: 'Completed'
    });
    expect(OPS001_CONTENT.workspace.hints.contexts).toEqual({
      'H-001': {
        nudge: 'Start by checking what is already available in the Recruit Workspace.',
        instruction: 'Use ls to list the files and folders here.',
        assist: "I've prepared ls. Press Run when you're ready.",
        preparation: { kind: 'terminal-command', value: 'ls' }
      },
      'H-002': {
        nudge: 'One file looks as though it was written for a new recruit.',
        instruction: 'Read welcome.txt with cat welcome.txt.',
        assist: "I've prepared cat welcome.txt. Press Run to read it.",
        preparation: { kind: 'terminal-command', value: 'cat welcome.txt' }
      },
      'H-003A': {
        nudge: 'The recovered path points into the training folder.',
        instruction: 'Use cat training/trace-note.txt, or enter the folder with cd training first.',
        assist: "I've prepared cat training/trace-note.txt. Press Run when you're ready.",
        preparation: { kind: 'terminal-command', value: 'cat training/trace-note.txt' }
      },
      'H-003B': {
        nudge: "Agent Trace's note is one of the files in this folder.",
        instruction: 'Use cat trace-note.txt.',
        assist: "I've prepared cat trace-note.txt. Press Run when you're ready.",
        preparation: { kind: 'terminal-command', value: 'cat trace-note.txt' }
      },
      'H-004': {
        nudge: 'The note contains a route beginning with /.',
        instruction: 'Open the Field Browser and enter /recruit-verification.',
        assist:
          "I've prepared /recruit-verification in the Field Browser. Press Open Route when you're ready.",
        preparation: { kind: 'browser-route', value: '/recruit-verification' }
      },
      'H-005': {
        nudge: 'The verification page displays a value in OpSlyce flag format.',
        instruction: 'Send FLAG{WELCOME_TO_HQ} to Mission Control.',
        assist:
          "I've prepared the recovered flag in Mission Control. Press Submit when you're ready.",
        preparation: { kind: 'mission-control-flag', value: 'FLAG{WELCOME_TO_HQ}' }
      }
    });
    expect(OPS001_CONTENT.workspace.missionControl.feedback).toEqual({
      empty: ['Enter the verification flag recovered during the operation.'],
      malformed: [
        'That does not match the OpSlyce flag format.',
        'Look for a value shaped like FLAG{...}.'
      ],
      incorrect: [
        'That flag was not accepted for OPS-001.',
        'Check the verification page and try again.'
      ]
    });
  });
  it('keeps the exact welcome, metadata, briefing and operational summary together', () => {
    expect(getOps001Welcome('Nova')).toBe(
      'Welcome to OpSlyce HQ, Nova. Your applicant workspace is ready. Byte, your operations assistant, will be standing by with guidance when you need it. Complete the assigned verification operation and HQ will review your field status.'
    );
    expect(OPS001_CONTENT.metadata).toEqual({
      missionId: 'OPS-001',
      title: 'Recruitment Day',
      operationCodename: 'Ghost File',
      difficulty: 'Recruit',
      targetDuration: '10–15 minutes',
      mainObjective: "Locate Agent Trace's missing message."
    });
    expect(OPS001_CONTENT.briefing.transmission).toBe(
      'Agent Trace left a training message inside your recruit workspace. Locate it, follow the evidence and recover the verification flag.'
    );
    expect(OPS001_CONTENT.briefing.availableSystems).toEqual([
      'Recruit Workspace',
      'HQ Training Portal'
    ]);
    expect(OPS001_CONTENT.briefing.successCondition).toBe(
      'Recover and submit the verification flag.'
    );
  });

  it('owns the exact initial Workspace content and checkpoint reference', () => {
    expect(OPS001_CONTENT.workspace.objectives['OBJ-001'].wording).toBe(
      'Locate Agent Trace’s missing message in the Recruit Workspace.'
    );
    expect(OPS001_CONTENT.workspace.browser).not.toHaveProperty('lockedExplanation');
    expect(OPS001_CONTENT.initialCheckpoint).toEqual({
      missionId: 'OPS-001',
      checkpointVersion: 10,
      progression: 'operation-active-locate-message',
      objectiveId: 'OBJ-001',
      activeTool: 'terminal'
    });
  });

  it('owns the exact objective, Evidence, Byte and Manual copy through Stage 9', () => {
    expect(OPS001_CONTENT.workspace.objectives).toEqual({
      'OBJ-001': {
        wording: 'Locate Agent Trace’s missing message in the Recruit Workspace.',
        milestone: 'Recruit instructions recovered.'
      },
      'OBJ-002': {
        wording: 'Recover training/trace-note.txt.',
        milestone: 'Agent Trace’s note recovered.'
      },
      'OBJ-003': {
        wording: 'Open /recruit-verification in the HQ Training Portal.',
        milestone: 'Verification page located.'
      },
      'OBJ-004': {
        wording: 'Submit the verification flag to Mission Control.',
        milestone: 'Verification flag accepted.'
      },
      'OBJ-005': { wording: 'Operation verified.' }
    });
    expect(OPS001_CONTENT.workspace.evidence.entries).toEqual({
      'EV-001': {
        title: 'NOTE RECOVERED',
        detail: 'Agent Trace’s training message was located in the Recruit Workspace.',
        status: 'Confirmed'
      },
      'EV-002': {
        title: 'HQ TRAINING ROUTE',
        value: '/recruit-verification',
        detail: 'Recovered from Agent Trace’s training message.',
        status: 'Confirmed',
        action: 'Copy'
      },
      'EV-003': {
        title: 'VERIFICATION FLAG',
        value: 'FLAG{WELCOME_TO_HQ}',
        detail: 'Recovered from the HQ Training Portal.',
        status: 'Awaiting verification',
        action: 'Prepare for Mission Control'
      },
      'EV-004': {
        title: 'OPERATION VERIFIED',
        detail: 'Recruit identity confirmed through the HQ Training Portal.',
        status: 'Completed'
      },
      'EV-005': {
        title: 'UNIDENTIFIED INTRUSION MARK',
        detail: 'Detected during an anomalous signal event immediately after OPS-001.',
        secondaryDetail: 'Source and meaning unknown.',
        status: 'Unresolved'
      }
    });
    expect(OPS001_CONTENT.workspace.byte).toEqual({
      'command-help': 'help shows the commands available for this operation.',
      'command-ls': 'ls lists the files and folders in your current location.',
      'command-cat': 'cat displays the contents of a text file.',
      'command-cd': 'cd changes your current directory — the folder you are working inside.',
      'command-clear':
        'clear clears the terminal display. Your progress, history and current folder stay where they are.',
      'verification-route-recovered':
        'Route recovered. The verification page is now available in the Field Browser.',
      'verification-flag-recovered':
        'Verification flag recovered. I’ve logged it in Evidence for you.'
    });
    expect(
      Object.fromEntries(
        Object.entries(OPS001_CONTENT.workspace.fieldManual.entries).filter(([id]) =>
          id.startsWith('command-')
        )
      )
    ).toEqual({
      'command-help': { label: 'help', detail: 'Show available commands' },
      'command-ls': { label: 'ls', detail: 'List files and folders' },
      'command-cd': { label: 'cd', detail: 'Change current folder' },
      'command-cat': { label: 'cat', detail: 'Read a text file' },
      'command-clear': { label: 'clear', detail: 'Clear the visible terminal display' }
    });
    expect(OPS001_CONTENT.workspace.fieldManual.entries['note-files-folders'].detail).toBe(
      'Files contain information. Folders organise files and other folders.'
    );
    expect(OPS001_CONTENT.workspace.fieldManual.entries['note-paths'].detail).toBe(
      'A path describes where a file, folder or Browser page is located.'
    );
    expect(OPS001_CONTENT.workspace.fieldManual.entries['note-browser-routes'].detail).toBe(
      'A route beginning with / identifies a page inside a site.'
    );
    expect(OPS001_CONTENT.workspace.fieldManual.entries['note-verification-flags'].detail).toBe(
      'A verification flag is a value in the form FLAG{...}. It is submitted to Mission Control.'
    );
    expect(OPS001_CONTENT.workspace.hints).not.toHaveProperty('penalty');
  });

  it('owns the exact Stage 10 debrief, reward, contained signal and teaser copy', () => {
    expect(OPS001_CONTENT.debrief.patch.dialogue).toBe(
      'Recruit, your identity is verified. You recovered the missing note and followed its evidence to the correct result. Effective immediately, you are a Recruit Operative.'
    );
    expect(OPS001_CONTENT.debrief.byte.dialogue).toBe(
      "Officially recruited. I'll record the paperwork as my contribution."
    );
    expect(OPS001_CONTENT.debrief.reward).toMatchObject({
      rank: 'Recruit Operative',
      badge: 'Ghost File'
    });
    expect(OPS001_CONTENT.postMission.signal).toEqual({
      heading: 'UNIDENTIFIED SIGNAL',
      source: 'SOURCE: UNKNOWN',
      trace: 'TRACE FAILED',
      capturedLabel: 'Captured signal data'
    });
    expect(OPS001_CONTENT.postMission.byte.dialogue).toBe(
      "That definitely wasn't one of ours. I've saved the mark before it could disappear."
    );
    expect(OPS001_CONTENT.postMission.patch.dialogue).toBe(
      'HQ has logged an unidentified signal event. We do not yet know its source or purpose. Keep the evidence; patterns matter.'
    );
    expect(OPS001_CONTENT.postMission.teaser.lines).toEqual([
      'An HQ website is displaying a page that “does not exist”.',
      'Its records suggest otherwise.',
      'Further assignment pending.'
    ]);
    expect(OPS001_CONTENT.postMission.teaser.openAction).toBe('Open incident');
    expect(OPS001_CONTENT.postMission.teaser.reviewAction).toBe('Review incident');
    expect(OPS001_CONTENT.postMission.teaser.closeAction).toBe('Close communication');
    expect(OPS001_CONTENT.postMission.completion).toEqual({
      heading: 'OPS-001 COMPLETE',
      status: 'Further assignment pending.',
      reviewAction: 'Review captured evidence'
    });
    expect(OPS001_CONTENT.postMission.finalCompletion).toEqual({
      heading: 'OPS-001 COMPLETE',
      title: 'Recruitment Day',
      rank: 'Recruit Operative',
      badge: 'Ghost File earned',
      evidence: 'EV-005 logged',
      evidenceStatus: 'Status: Unresolved',
      assignmentStatus: 'Further assignment pending.',
      availability: 'More operations are coming in a future update.',
      returnAction: 'Return to HQ'
    });
    expect(OPS001_CONTENT.postMission.evidenceReview).toEqual({
      evidenceId: 'EV-005',
      closeAction: 'Close evidence'
    });
  });
});
