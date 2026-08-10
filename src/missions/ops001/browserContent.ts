import type { BrowserRoute } from '../../simulations/browser/routeContract';

export const OPS001_BROWSER_CONTENT_VERSION = 7;

export const OPS001_BROWSER_PAGES = {
  '/': {
    route: '/',
    kind: 'home',
    eyebrow: 'OPSLYCE HQ TRAINING PORTAL',
    heading: 'Welcome to OpSlyce HQ',
    body: 'Secure access for applicants and recruit operatives. Explore HQ information, read current bulletins and review system reports.',
    statusLabel: 'HQ STATUS',
    status: 'All primary systems operational.',
    image: '/assets/browser/hq-intranet-hero.png',
    imageAlt: 'A calm interior view of OpSlyce HQ.',
    links: [
      {
        route: '/about',
        label: 'About OpSlyce',
        description: 'Who we are and what we protect.'
      },
      {
        route: '/bulletins',
        label: 'HQ Bulletins',
        description: 'Recent notices from across the organisation.'
      },
      {
        route: '/systems',
        label: 'Systems Desk',
        description: 'Current service and integrity reports.'
      }
    ]
  },
  '/about': {
    route: '/about',
    kind: 'about',
    heading: 'About OpSlyce',
    opening:
      'OpSlyce protects the connected systems people rely on. Our operatives investigate unusual activity, recover missing information and verify what really happened.',
    image: '/assets/browser/hq-global-operations-map.png',
    imageAlt: 'A global operations map showing connected OpSlyce locations.',
    principles: [
      {
        heading: 'Investigate',
        body: 'Follow clues across files, messages, websites and system records.'
      },
      {
        heading: 'Recover',
        body: 'Locate information that has been misplaced, hidden or altered.'
      },
      { heading: 'Verify', body: 'Compare the evidence and report only what it supports.' }
    ],
    protectedItems: [
      'Community services',
      'Research stations',
      'Museums and archives',
      'Transport networks',
      'Games and entertainment systems',
      'Communications infrastructure'
    ]
  },
  '/bulletins': {
    route: '/bulletins',
    kind: 'bulletins',
    heading: 'HQ Bulletins',
    bulletins: [
      {
        status: 'Resolved',
        heading: 'Archive map restored',
        body: 'A museum’s digital floor map briefly displayed an older gallery layout. The correct version has been restored and the archive team is checking how the records became unsynchronised.'
      },
      {
        status: 'Operational',
        heading: 'Research relay back online',
        body: 'A remote research station lost contact with one of its environmental sensors. Field Operations recovered the missing configuration and returned the relay to service.'
      },
      {
        status: 'HQ notice',
        heading: 'Recruit intake underway',
        body: 'New applicants are completing their first verification exercises. Director Patch reminds all teams that careful evidence matters more than speed.'
      },
      {
        status: 'Equipment',
        heading: 'Equipment notice',
        body: 'Byte has confirmed that the missing diagnostic cable was not missing. It was connected to Byte.'
      }
    ]
  },
  '/systems': {
    route: '/systems',
    kind: 'systems',
    heading: 'Systems Desk',
    opening: 'Current status of authorised OpSlyce HQ services.',
    image: '/assets/browser/hq-systems-wall.png',
    imageAlt: 'A glass systems wall displaying a network workflow.',
    services: [
      { label: 'Training Portal', status: 'Online' },
      { label: 'Communications Relay', status: 'Online' },
      { label: 'Evidence Archive', status: 'Online' },
      { label: 'Route Index', status: 'Monitoring', route: '/systems/route-index' }
    ]
  },
  '/systems/route-index': {
    route: '/systems/route-index',
    kind: 'report',
    heading: 'Route Index',
    status: 'Monitoring',
    reportHeading: 'WEB INDEX RECONCILIATION',
    metrics: [
      { label: 'Published routes', value: '42' },
      { label: 'Signed route records', value: '43' },
      { label: 'Unlisted routes found', value: '0' }
    ],
    report:
      'The route index and signed records do not currently agree. No service disruption has been detected. Automated reconciliation will continue.',
    loggedLabel: 'Previous operational cycle'
  },
  '/recruit-verification': {
    route: '/recruit-verification',
    kind: 'verification',
    eyebrow: 'RECRUIT VERIFICATION SERVICE',
    heading: 'IDENTITY CONFIRMED',
    welcome: 'Welcome to OpSlyce, Recruit.',
    flagLabel: 'VERIFICATION FLAG',
    flag: 'FLAG{WELCOME_TO_HQ}'
  }
} as const satisfies Readonly<Record<BrowserRoute, object>>;

export const OPS001_VERIFICATION_ROUTE = '/recruit-verification' as const;
export const OPS001_VERIFICATION_FLAG = 'FLAG{WELCOME_TO_HQ}' as const;
