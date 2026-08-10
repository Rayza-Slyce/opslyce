import { TERMINAL_COMMAND_REFERENCE } from '../../simulations/terminal/commandReference';
import { OPS001_BROWSER_CONTENT_VERSION, OPS001_BROWSER_PAGES } from './browserContent';

export const OPS001_CONTENT = {
  contentVersion: OPS001_BROWSER_CONTENT_VERSION,
  metadata: {
    missionId: 'OPS-001',
    title: 'Recruitment Day',
    operationCodename: 'Ghost File',
    difficulty: 'Recruit',
    targetDuration: '10–15 minutes',
    mainObjective: "Locate Agent Trace's missing message."
  },
  welcome: {
    speaker: 'Director Patch',
    template:
      'Welcome to OpSlyce HQ, {codename}. Your applicant workspace is ready. Byte, your operations assistant, will be standing by with guidance when you need it. Complete the assigned verification operation and HQ will review your field status.'
  },
  briefing: {
    speaker: 'Director Patch',
    transmission:
      'Agent Trace left a training message inside your recruit workspace. Locate it, follow the evidence and recover the verification flag.',
    availableSystems: ['Recruit Workspace', 'HQ Training Portal'],
    successCondition: 'Recover and submit the verification flag.',
    boundaryHeading: 'Authorised systems',
    boundary:
      'OPS-001 is authorised for the simulated Recruit Workspace and HQ Training Portal only. Stay within the assigned systems while completing the operation.'
  },
  workspace: {
    objectives: {
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
      'OBJ-005': {
        wording: 'Operation verified.'
      }
    },
    tools: {
      terminal: 'Terminal',
      browser: 'Browser',
      evidence: 'Evidence'
    },
    browser: {
      heading: 'HQ Training Portal',
      host: 'hq-training.ops',
      addressLabel: 'Route',
      openRoute: 'Open Route',
      home: 'Home',
      back: 'Back',
      history: 'History',
      pages: OPS001_BROWSER_PAGES,
      errors: {
        unknown: {
          heading: 'ROUTE NOT FOUND',
          body: 'That page is not available in the HQ Training Portal. Check the route and try again.'
        },
        unavailable: {
          heading: 'ROUTE NOT AVAILABLE',
          body: 'The Field Browser opens only the fictional routes included in this operation. No external request was made.'
        }
      }
    },
    evidence: {
      heading: 'Evidence',
      empty: 'No evidence has been confirmed.',
      entries: {
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
      }
    },
    resume: {
      noEvidence: 'No evidence has been confirmed.'
    },
    hints: {
      heading: 'Ask Byte',
      contexts: {
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
          instruction:
            'Use cat training/trace-note.txt, or enter the folder with cd training first.',
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
      }
    },
    missionControl: {
      heading: 'Mission Control',
      fieldLabel: 'Verification flag',
      unavailable: 'No verification flag has been recovered.',
      ready: 'The recovered flag is ready for verification.',
      feedback: {
        empty: ['Enter the verification flag recovered during the operation.'],
        malformed: [
          'That does not match the OpSlyce flag format.',
          'Look for a value shaped like FLAG{...}.'
        ],
        incorrect: [
          'That flag was not accepted for OPS-001.',
          'Check the verification page and try again.'
        ]
      },
      verifying: 'VERIFYING EVIDENCE',
      accepted: ['FLAG ACCEPTED', 'OPERATION VERIFIED']
    },
    fieldManual: {
      heading: 'No field entries yet',
      empty: 'Field Manual entries will be added when they are encountered during operations.',
      commandHeading: 'Command Reference',
      notesHeading: 'Field Notes',
      entries: {
        'command-help': {
          label: 'help',
          detail: TERMINAL_COMMAND_REFERENCE.help.manualDescription
        },
        'command-ls': { label: 'ls', detail: TERMINAL_COMMAND_REFERENCE.ls.manualDescription },
        'command-cd': { label: 'cd', detail: TERMINAL_COMMAND_REFERENCE.cd.manualDescription },
        'command-cat': { label: 'cat', detail: TERMINAL_COMMAND_REFERENCE.cat.manualDescription },
        'command-clear': {
          label: 'clear',
          detail: TERMINAL_COMMAND_REFERENCE.clear.manualDescription
        },
        'note-files-folders': {
          label: 'Files and folders',
          detail: 'Files contain information. Folders organise files and other folders.'
        },
        'note-paths': {
          label: 'Paths',
          detail: 'A path describes where a file, folder or Browser page is located.'
        },
        'note-browser-routes': {
          label: 'Browser routes',
          detail: 'A route beginning with / identifies a page inside a site.'
        },
        'note-verification-flags': {
          label: 'Verification flags',
          detail:
            'A verification flag is a value in the form FLAG{...}. It is submitted to Mission Control.'
        }
      }
    },
    byte: {
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
    }
  },
  debrief: {
    patch: {
      speaker: 'Director Patch',
      dialogue:
        'Recruit, your identity is verified. You recovered the missing note and followed its evidence to the correct result. Effective immediately, you are a Recruit Operative.'
    },
    byte: {
      speaker: 'Byte',
      dialogue: "Officially recruited. I'll record the paperwork as my contribution."
    },
    fieldRecord: {
      heading: 'Field record',
      order: ['ls', 'cd', 'cat', 'help', 'clear'],
      entries: {
        ls: 'list files and folders',
        cd: 'change the current folder',
        cat: 'read a text file',
        help: 'show available commands',
        clear: 'clear the visible terminal display'
      }
    },
    reward: {
      heading: 'Operation reward',
      rankLabel: 'Rank',
      rank: 'Recruit Operative',
      badgeLabel: 'Badge',
      badge: 'Ghost File'
    },
    returnAction: 'Return to HQ'
  },
  postMission: {
    promotion: {
      heading: 'AGENT STATUS UPDATED',
      rank: 'RECRUIT OPERATIVE'
    },
    signal: {
      heading: 'UNIDENTIFIED SIGNAL',
      source: 'SOURCE: UNKNOWN',
      trace: 'TRACE FAILED',
      capturedLabel: 'Captured signal data'
    },
    byte: {
      speaker: 'Byte',
      dialogue: "That definitely wasn't one of ours. I've saved the mark before it could disappear."
    },
    patch: {
      speaker: 'Director Patch',
      dialogue:
        'HQ has logged an unidentified signal event. We do not yet know its source or purpose. Keep the evidence; patterns matter.'
    },
    teaser: {
      heading: 'NEW INCIDENT REPORTED',
      openAction: 'Open incident',
      reviewAction: 'Review incident',
      closeAction: 'Close communication',
      lines: [
        'An HQ website is displaying a page that “does not exist”.',
        'Its records suggest otherwise.',
        'Further assignment pending.'
      ]
    },
    completion: {
      heading: 'OPS-001 COMPLETE',
      status: 'Further assignment pending.',
      reviewAction: 'Review captured evidence'
    },
    finalCompletion: {
      heading: 'OPS-001 COMPLETE',
      title: 'Recruitment Day',
      rank: 'Recruit Operative',
      badge: 'Ghost File earned',
      evidence: 'EV-005 logged',
      evidenceStatus: 'Status: Unresolved',
      assignmentStatus: 'Further assignment pending.',
      availability: 'More operations are coming in a future update.',
      returnAction: 'Return to HQ'
    },
    evidenceReview: {
      evidenceId: 'EV-005',
      closeAction: 'Close evidence'
    }
  },
  initialCheckpoint: {
    missionId: 'OPS-001',
    checkpointVersion: 10,
    progression: 'operation-active-locate-message',
    objectiveId: 'OBJ-001',
    activeTool: 'terminal'
  }
} as const;

export function getOps001Welcome(codename: string): string {
  return OPS001_CONTENT.welcome.template.replace('{codename}', codename);
}
