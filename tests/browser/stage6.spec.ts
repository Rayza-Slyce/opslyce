import { expect, test, type Locator, type Page } from '@playwright/test';

type ProjectExpectation = Readonly<{
  state: 'supported-landscape' | 'portrait-rotate-required' | 'small-screen-required';
  heading: string;
}>;

const projectExpectations: Readonly<Record<string, ProjectExpectation>> = {
  'chromium-desktop-landscape': {
    state: 'supported-landscape',
    heading: 'Welcome to OpSlyce HQ'
  },
  'chromium-tablet-landscape': {
    state: 'supported-landscape',
    heading: 'Welcome to OpSlyce HQ'
  },
  'chromium-tablet-portrait': {
    state: 'portrait-rotate-required',
    heading: 'Rotate your device'
  },
  'chromium-phone-landscape': {
    state: 'small-screen-required',
    heading: 'Use a larger screen'
  },
  'chromium-phone-portrait': {
    state: 'small-screen-required',
    heading: 'Use a larger screen'
  }
};

function expectationFor(projectName: string) {
  const expectation = projectExpectations[projectName];

  if (expectation === undefined) {
    throw new Error(`No Stage 6 expectation configured for ${projectName}.`);
  }

  return expectation;
}

function trackExternalRequests(page: Page, configuredBaseUrl: string) {
  const allowedOrigin = new URL(configuredBaseUrl).origin;
  const externalRequests: string[] = [];

  page.on('request', (request) => {
    const url = new URL(request.url());
    if (url.origin !== allowedOrigin) {
      externalRequests.push(request.url());
    }
  });

  return externalRequests;
}

async function expectVisibleFocus(control: Locator) {
  await expect(control).toBeFocused();

  const outline = await control.evaluate((element) => {
    const style = window.getComputedStyle(element);
    return { colour: style.outlineColor, style: style.outlineStyle, width: style.outlineWidth };
  });

  expect(outline.style).toBe('solid');
  expect(outline.width).toBe('3px');
  expect(outline.colour).not.toBe('rgba(0, 0, 0, 0)');
}

async function expectCommandGuideFitsSidebar(page: Page, requireExpandedRows = true) {
  const geometry = await page.locator('[data-command-rail]').evaluate((sidebar) => {
    const guide = sidebar.querySelector('[data-command-guide]');
    const rows = Array.from(sidebar.querySelectorAll('[data-command-guide-row]'));
    if (!(guide instanceof HTMLElement) || rows.some((row) => !(row instanceof HTMLElement))) {
      throw new Error('Expected Command Guide rows.');
    }

    const sidebarBounds = sidebar.getBoundingClientRect();
    const visibleRows = rows.filter((row) => row.getClientRects().length > 0);
    return {
      sidebarFits: sidebar.scrollWidth <= sidebar.clientWidth,
      guideFits: guide.scrollWidth <= guide.clientWidth,
      workspaceFits:
        document.querySelector('[data-mission-workspace]')?.scrollWidth ===
        document.querySelector('[data-mission-workspace]')?.clientWidth,
      overflowX: window.getComputedStyle(sidebar).overflowX,
      visibleRowCount: visibleRows.length,
      rowBounds: visibleRows.map((row) => {
        const bounds = row.getBoundingClientRect();
        return {
          left: bounds.left - sidebarBounds.left,
          right: bounds.right - sidebarBounds.right,
          leftFits: bounds.left >= sidebarBounds.left - 1,
          rightFits: bounds.right <= sidebarBounds.right + 1
        };
      }),
      rowContentFits: visibleRows.every((row) => row.scrollWidth <= row.clientWidth)
    };
  });

  if (requireExpandedRows) expect(geometry.visibleRowCount).toBe(5);
  expect(
    geometry.rowBounds.every((bounds) => bounds.leftFits && bounds.rightFits),
    JSON.stringify(geometry.rowBounds)
  ).toBe(true);
  expect({ ...geometry, visibleRowCount: undefined, rowBounds: undefined }).toEqual({
    sidebarFits: true,
    guideFits: true,
    workspaceFits: true,
    overflowX: 'hidden',
    visibleRowCount: undefined,
    rowBounds: undefined,
    rowContentFits: true
  });
}

async function registerApplicant(page: Page) {
  await page.getByRole('button', { name: 'Enter HQ' }).click();
  await page.getByRole('textbox', { name: 'Codename' }).fill('Agent_7');
  await page.getByRole('button', { name: 'Register codename' }).click();
  await expect(page.getByRole('heading', { name: 'HQ Dashboard' })).toBeVisible();
}

async function openBriefing(page: Page) {
  await page.getByRole('button', { name: 'Open transmission' }).click();
  await page.getByRole('button', { name: 'Return to HQ' }).click();
  await page.getByRole('button', { name: /Open OPS-001 — Recruitment Day/ }).click();
  await expect(page.getByRole('heading', { name: 'OPS-001 — Recruitment Day' })).toBeVisible();
}

test('renders the Stage 6 viewport state without external requests', async ({ page }, testInfo) => {
  const configuredBaseUrl = testInfo.project.use.baseURL;

  if (typeof configuredBaseUrl !== 'string') {
    throw new Error('Playwright baseURL must be configured for OpSlyce browser tests.');
  }

  const expectation = expectationFor(testInfo.project.name);
  const externalRequests = trackExternalRequests(page, configuredBaseUrl);

  await page.goto('/');

  await expect(page.locator('main')).toHaveAttribute('data-viewport-state', expectation.state);
  await expect(page.getByRole('heading', { name: expectation.heading })).toBeVisible();
  expect(externalRequests).toEqual([]);
});

test('keeps approved title art separate from functional controls', async ({ page }, testInfo) => {
  const expectation = expectationFor(testInfo.project.name);
  test.skip(
    expectation.state !== 'supported-landscape',
    'Title controls are intentionally absent behind this viewport gate.'
  );

  await page.goto('/');

  await expect(page.getByRole('img', { name: 'OpSlyce' })).toBeVisible();
  await expect(page.getByRole('button', { name: 'Enter HQ' })).toBeVisible();
  await expect(page.getByRole('button', { name: 'Settings' })).toBeVisible();
  await expect(page.getByRole('button', { name: 'Continue Operation' })).toHaveCount(0);
  const backgroundImage = await page
    .locator('[data-title-state="fresh"]')
    .evaluate((element) => window.getComputedStyle(element).backgroundImage);
  expect(backgroundImage).toContain('title-hq-threshold.png');
});

test('runs the player-controlled Dashboard, welcome and briefing flow with separate artwork', async ({
  page
}, testInfo) => {
  const expectation = expectationFor(testInfo.project.name);
  test.skip(
    expectation.state !== 'supported-landscape',
    'Dashboard controls are intentionally absent behind this viewport gate.'
  );
  const configuredBaseUrl = testInfo.project.use.baseURL;
  if (typeof configuredBaseUrl !== 'string') {
    throw new Error('Playwright baseURL must be configured for OpSlyce browser tests.');
  }
  const externalRequests = trackExternalRequests(page, configuredBaseUrl);

  await page.goto('/');
  await registerApplicant(page);

  await expect(page.getByText('No evidence recorded.')).toBeVisible();
  await expect(page.getByText('Incoming transmission from Director Patch.')).toBeVisible();
  await expect(page.getByRole('img', { name: 'Director Patch' })).toHaveCount(0);
  const stationBackground = await page
    .locator('section[aria-labelledby="station-heading"]')
    .evaluate((element) => window.getComputedStyle(element).backgroundImage);
  expect(stationBackground).toContain('operative-station-monitor.png');

  await page.getByRole('button', { name: 'Open transmission' }).click();
  await expect(page.getByRole('img', { name: 'Director Patch' })).toBeVisible();
  await expect(
    page.getByText(
      'Welcome to OpSlyce HQ, Agent_7. Your applicant workspace is ready. Byte, your operations assistant, will be standing by with guidance when you need it. Complete the assigned verification operation and HQ will review your field status.'
    )
  ).toBeVisible();

  await page.getByRole('button', { name: 'Return to HQ' }).click();
  await expect(page.getByText('Operation codename: Ghost File')).toBeVisible();
  await expect(page.getByText('Difficulty: Recruit')).toBeVisible();
  await openBriefingFromDashboard(page);
  await expect(
    page.getByText(
      'Agent Trace left a training message inside your recruit workspace. Locate it, follow the evidence and recover the verification flag.'
    )
  ).toBeVisible();
  await expect(page.getByRole('heading', { name: 'Authorised systems' })).toBeVisible();
  await expect(
    page.getByText(
      'OPS-001 is authorised for the simulated Recruit Workspace and HQ Training Portal only. Stay within the assigned systems while completing the operation.'
    )
  ).toBeVisible();
  expect(externalRequests).toEqual([]);
});

test('uses the HQ monitor height without Dashboard card overlap', async ({ page }, testInfo) => {
  const expectation = expectationFor(testInfo.project.name);
  test.skip(
    expectation.state !== 'supported-landscape',
    'Dashboard geometry is intentionally absent behind this viewport gate.'
  );

  await page.goto('/');
  await registerApplicant(page);
  await page.getByRole('button', { name: 'Open transmission' }).click();
  await page.getByRole('button', { name: 'Return to HQ' }).click();

  const monitorSurface = page.locator('[data-mode="hq"]');
  const dashboard = page.locator('[data-hq-dashboard]');
  const stationBody = dashboard.locator('..');

  const layout = await monitorSurface.evaluate((monitor) => {
    const station = monitor.parentElement;
    const dashboardElement = monitor.querySelector('[data-hq-dashboard]');
    const body = dashboardElement?.parentElement;
    const cards = Array.from(dashboardElement?.querySelectorAll('section') ?? []);
    if (
      !(station instanceof HTMLElement) ||
      !(body instanceof HTMLElement) ||
      !(dashboardElement instanceof HTMLElement) ||
      cards.length !== 4
    ) {
      throw new Error('Expected rendered HQ Dashboard geometry.');
    }
    const [communicationsCard, activeOperationCard, agentStatusCard, evidenceSummaryCard] = cards;
    if (
      !(communicationsCard instanceof HTMLElement) ||
      !(activeOperationCard instanceof HTMLElement) ||
      !(agentStatusCard instanceof HTMLElement) ||
      !(evidenceSummaryCard instanceof HTMLElement)
    ) {
      throw new Error('Expected all HQ Dashboard cards.');
    }
    const stationBounds = station.getBoundingClientRect();
    const monitorBounds = monitor.getBoundingClientRect();
    const dashboardBounds = dashboardElement.getBoundingClientRect();
    const communicationsBounds = communicationsCard.getBoundingClientRect();
    const operationBounds = activeOperationCard.getBoundingClientRect();
    const agentBounds = agentStatusCard.getBoundingClientRect();
    const evidenceBounds = evidenceSummaryCard.getBoundingClientRect();
    return {
      lowerInsetRatio: (stationBounds.bottom - monitorBounds.bottom) / stationBounds.height,
      dashboardBottomGapRatio:
        (monitorBounds.bottom - dashboardBounds.bottom) / monitorBounds.height,
      communicationsClearsLowerRow: communicationsBounds.bottom < agentBounds.top,
      operationClearsAgentStatus: operationBounds.bottom < agentBounds.top,
      operationClearsEvidence: operationBounds.bottom < evidenceBounds.top,
      lowerRowInsideMonitor:
        agentBounds.bottom < monitorBounds.bottom && evidenceBounds.bottom < monitorBounds.bottom,
      cardsContainContent: cards.every((card) => card.scrollHeight <= card.clientHeight + 1),
      cardControlsContained: [communicationsCard, activeOperationCard].every((card) => {
        const cardBounds = card.getBoundingClientRect();
        const button = card.querySelector('button');
        if (!(button instanceof HTMLButtonElement)) return false;
        const buttonBounds = button.getBoundingClientRect();
        return buttonBounds.top >= cardBounds.top && buttonBounds.bottom <= cardBounds.bottom;
      }),
      stationBodyFits: body.scrollHeight <= body.clientHeight,
      stationBodyScrollTop: body.scrollTop
    };
  });

  expect(layout.lowerInsetRatio).toBeGreaterThan(0.035);
  expect(layout.lowerInsetRatio).toBeLessThan(0.11);
  expect(layout.dashboardBottomGapRatio).toBeLessThan(0.05);
  expect(layout.communicationsClearsLowerRow).toBe(true);
  expect(layout.operationClearsAgentStatus).toBe(true);
  expect(layout.operationClearsEvidence).toBe(true);
  expect(layout.lowerRowInsideMonitor).toBe(true);
  expect(layout.cardsContainContent).toBe(true);
  expect(layout.cardControlsContained).toBe(true);
  expect(layout.stationBodyFits).toBe(true);
  expect(layout.stationBodyScrollTop).toBe(0);
  await expect(stationBody).toBeInViewport();

  for (const button of [
    page.getByRole('button', { name: 'Field Manual' }),
    page.getByRole('button', { name: 'Settings' }),
    page.getByRole('button', { name: 'Review welcome' }),
    page.getByRole('button', { name: /Open OPS-001 — Recruitment Day/ })
  ]) {
    await expect(button).toBeVisible();
    await expect(button).toBeInViewport();
  }
});

async function openBriefingFromDashboard(page: Page) {
  await page.getByRole('button', { name: /Open OPS-001 — Recruitment Day/ }).click();
  await expect(page.getByRole('heading', { name: 'OPS-001 — Recruitment Day' })).toBeVisible();
}

test('creates a genuine checkpoint and restores the Workspace through a resume summary', async ({
  page
}, testInfo) => {
  const expectation = expectationFor(testInfo.project.name);
  test.skip(
    expectation.state !== 'supported-landscape',
    'Deployment controls are intentionally absent behind this viewport gate.'
  );

  await page.goto('/');
  await expect(page.getByRole('button', { name: 'Continue Operation' })).toHaveCount(0);
  await registerApplicant(page);
  await openBriefing(page);
  await page.getByRole('button', { name: 'Deploy' }).click();
  await expect(page.getByRole('heading', { name: 'Current objective' })).toBeVisible();
  await expect(
    page.getByText('Locate Agent Trace’s missing message in the Recruit Workspace.').first()
  ).toBeVisible();

  await page.reload();
  await page.getByRole('button', { name: 'Continue Operation' }).click();
  await expect(page.getByRole('heading', { name: 'Resume operation' })).toBeVisible();
  await expect(page.getByText('No evidence has been confirmed.')).toBeVisible();
  await page.getByRole('button', { name: 'Continue Operation' }).click();
  await expect(page.getByRole('heading', { name: 'Current objective' })).toBeVisible();
});

test('shows visible focus and supports physical-keyboard Deploy', async ({ page }, testInfo) => {
  const expectation = expectationFor(testInfo.project.name);
  test.skip(
    expectation.state !== 'supported-landscape',
    'Interactive focus targets are intentionally absent behind this viewport gate.'
  );

  await page.goto('/');
  await page.keyboard.press('Tab');
  await expectVisibleFocus(page.getByRole('button', { name: 'Enter HQ' }));

  await registerApplicant(page);
  await openBriefing(page);
  const deploy = page.getByRole('button', { name: 'Deploy' });
  for (let step = 0; step < 5; step += 1) {
    if (await deploy.evaluate((element) => element === document.activeElement)) {
      break;
    }
    await page.keyboard.press('Tab');
  }
  await expectVisibleFocus(deploy);
  await page.keyboard.press('Enter');
  await expect(page.getByRole('heading', { name: 'Current objective' })).toBeVisible();
});

test('keeps essential Stage 6 controls inside supported viewports', async ({ page }, testInfo) => {
  const expectation = expectationFor(testInfo.project.name);
  test.skip(
    expectation.state !== 'supported-landscape',
    'Stage 6 controls are intentionally absent behind this viewport gate.'
  );

  await page.goto('/');
  await registerApplicant(page);
  await expect(page.getByRole('button', { name: 'Open transmission' })).toBeInViewport();
  await expect(page.getByRole('button', { name: 'Field Manual' })).toBeInViewport();
  await expect(page.getByRole('button', { name: 'Settings' })).toBeInViewport();

  await openBriefing(page);
  await expect(page.getByRole('button', { name: 'Back to HQ' })).toBeInViewport();
  await expect(page.getByRole('button', { name: 'Deploy' })).toBeInViewport();
});

test('keeps the Terminal composer fixed while only the transcript scrolls', async ({
  page
}, testInfo) => {
  const expectation = expectationFor(testInfo.project.name);
  test.skip(
    expectation.state !== 'supported-landscape',
    'Terminal controls are intentionally absent behind this viewport gate.'
  );
  await page.goto('/');
  await registerApplicant(page);
  await openBriefing(page);
  await page.getByRole('button', { name: 'Deploy' }).click();

  const workspace = page.locator('[data-mission-workspace]');
  const stationBody = workspace.locator('..');
  const monitorSurface = page.locator('[data-mode="mission"]');
  const transcript = page.locator('[data-terminal-transcript]');
  const byteDock = page.locator('[data-byte-dock]');
  const input = page.getByRole('textbox', { name: 'Command' });
  const run = page.getByRole('button', { name: 'Run' });
  await expect(page.getByRole('heading', { name: 'Field Terminal' })).toHaveCount(0);
  await expect(page.getByText('Recruit Workspace connected.')).toHaveCount(0);
  await expect(
    page.getByText('The Field Browser will activate when a route is recovered.')
  ).toHaveCount(0);
  await expect(input).toBeInViewport();
  await expect(run).toBeInViewport();
  await expect(page.getByText('Command Guide')).toBeVisible();
  await expect(page.getByRole('button', { name: 'Help', exact: true })).toHaveCount(0);
  await expect(page.getByRole('button', { name: 'List files', exact: true })).toHaveCount(0);
  await expect(page.getByRole('button', { name: 'Prepare help command' })).toHaveCount(0);
  await expect(page.getByRole('button', { name: 'Prepare suggestion' })).toHaveCount(0);
  const guideDisclosure = page.locator('summary').filter({ hasText: 'Command Guide' });
  await guideDisclosure.focus();
  await page.keyboard.press('Shift+Tab');
  await page.keyboard.press('Tab');
  await expectVisibleFocus(guideDisclosure);
  await guideDisclosure.press('Enter');
  await expect(page.getByText('Show commands', { exact: true })).toBeVisible();
  await expect(page.getByText('List files and folders', { exact: true })).toBeVisible();
  await expect(page.getByText('Change folder', { exact: true })).toBeVisible();
  await expect(page.getByText('Read a text file', { exact: true })).toBeVisible();
  await expect(page.getByText('Clear terminal', { exact: true })).toBeVisible();
  await expect(page.getByText('Prepare', { exact: true })).toHaveCount(0);
  const prepareClear = page.getByRole('button', { name: 'Prepare clear command' });
  await prepareClear.scrollIntoViewIfNeeded();
  await expect(prepareClear).toBeInViewport();
  await expectCommandGuideFitsSidebar(page);
  await expect(input).toBeInViewport();
  await expect(run).toBeInViewport();
  await expect(byteDock.getByText('Standing by.')).toBeVisible();
  await expect(page.locator('#terminal-panel').getByRole('img', { name: 'Byte' })).toHaveCount(0);
  const layout = await monitorSurface.evaluate((monitor) => {
    const workspaceElement = monitor.querySelector('[data-mission-workspace]');
    if (
      !(workspaceElement instanceof HTMLElement) ||
      !(monitor.parentElement instanceof HTMLElement)
    ) {
      throw new Error('Expected rendered mission Workspace geometry.');
    }
    const stationBounds = monitor.parentElement.getBoundingClientRect();
    const monitorBounds = monitor.getBoundingClientRect();
    const workspaceBounds = workspaceElement.getBoundingClientRect();
    const transcriptElement = monitor.querySelector('[data-terminal-transcript]');
    const terminalMainElement = monitor.querySelector('[data-terminal-main]');
    const tabsElement = monitor.querySelector('[role="tablist"]');
    const toolPanelElement = monitor.querySelector('#terminal-panel');
    const commandRailElement = monitor.querySelector('[data-command-rail]');
    const byteDockElement = monitor.querySelector('[data-byte-dock]');
    const objectiveElement = monitor.querySelector('[aria-labelledby="current-objective-heading"]');
    const bytePortrait = monitor.querySelector('[data-byte-portrait]');
    if (
      !(transcriptElement instanceof HTMLElement) ||
      !(terminalMainElement instanceof HTMLElement) ||
      !(tabsElement instanceof HTMLElement) ||
      !(toolPanelElement instanceof HTMLElement) ||
      !(commandRailElement instanceof HTMLElement) ||
      !(byteDockElement instanceof HTMLElement) ||
      !(objectiveElement instanceof HTMLElement) ||
      !(bytePortrait instanceof HTMLImageElement)
    ) {
      throw new Error('Expected rendered Terminal and assistant geometry.');
    }
    const transcriptBounds = transcriptElement.getBoundingClientRect();
    const terminalMainBounds = terminalMainElement.getBoundingClientRect();
    const tabsBounds = tabsElement.getBoundingClientRect();
    const toolPanelBounds = toolPanelElement.getBoundingClientRect();
    const commandRailBounds = commandRailElement.getBoundingClientRect();
    const byteDockBounds = byteDockElement.getBoundingClientRect();
    const objectiveBounds = objectiveElement.getBoundingClientRect();
    return {
      lowerInsetRatio: (stationBounds.bottom - monitorBounds.bottom) / stationBounds.height,
      workspaceBottomGapRatio:
        (monitorBounds.bottom - workspaceBounds.bottom) / monitorBounds.height,
      transcriptHeightRatio: transcriptBounds.height / monitorBounds.height,
      toolPanelDoesNotOverlapTabs: toolPanelBounds.top >= tabsBounds.bottom - 1,
      toolPanelFollowsTabs: toolPanelBounds.top <= tabsBounds.bottom + 2,
      terminalWidthRatio: terminalMainBounds.width / monitorBounds.width,
      railIsRightOfTerminal: commandRailBounds.left >= terminalMainBounds.right - 2,
      railIsBesideTranscript: commandRailBounds.top <= transcriptBounds.top + 4,
      byteIsLeftOfTerminal: byteDockBounds.right < terminalMainBounds.left,
      objectiveClearsByte: objectiveBounds.bottom <= byteDockBounds.top,
      bytePortraitTransform: window.getComputedStyle(bytePortrait).transform
    };
  });
  expect(layout.lowerInsetRatio).toBeGreaterThan(0.035);
  expect(layout.lowerInsetRatio).toBeLessThan(0.11);
  expect(layout.workspaceBottomGapRatio).toBeLessThan(0.05);
  expect(layout.transcriptHeightRatio).toBeGreaterThan(0.34);
  expect(layout.toolPanelDoesNotOverlapTabs).toBe(true);
  expect(layout.toolPanelFollowsTabs).toBe(true);
  expect(layout.terminalWidthRatio).toBeGreaterThan(0.35);
  expect(layout.railIsRightOfTerminal).toBe(true);
  expect(layout.railIsBesideTranscript).toBe(true);
  expect(layout.byteIsLeftOfTerminal).toBe(true);
  expect(layout.objectiveClearsByte).toBe(true);
  expect(layout.bytePortraitTransform).toMatch(/^matrix\(-1,/u);
  expect(
    await stationBody.evaluate((element) => ({
      scrollTop: element.scrollTop,
      fits: element.scrollHeight <= element.clientHeight
    }))
  ).toEqual({ scrollTop: 0, fits: true });

  for (let command = 0; command < 8; command += 1) {
    await input.fill('help');
    await input.press('Enter');
  }

  await expect(transcript.getByText('Clear the visible terminal output.').last()).toBeInViewport();
  await expect(input).toBeInViewport();
  await expect(run).toBeInViewport();
  expect(
    await transcript.evaluate((element) => ({
      overflowed: element.scrollHeight > element.clientHeight,
      scrolled: element.scrollTop > 0
    }))
  ).toEqual({ overflowed: true, scrolled: true });
  expect(
    await stationBody.evaluate((element) => ({
      scrollTop: element.scrollTop,
      fits: element.scrollHeight <= element.clientHeight
    }))
  ).toEqual({ scrollTop: 0, fits: true });
});

test('wraps inline tool tabs and opens Browser with correct button semantics', async ({
  page
}, testInfo) => {
  const expectation = expectationFor(testInfo.project.name);
  test.skip(
    expectation.state !== 'supported-landscape',
    'Workspace controls are intentionally absent behind this viewport gate.'
  );
  await page.goto('/');
  await registerApplicant(page);
  await openBriefing(page);
  await page.getByRole('button', { name: 'Deploy' }).click();

  const terminal = page.getByRole('tab', { name: 'Terminal' });
  const browser = page.getByRole('button', { name: 'Browser' });
  const evidence = page.getByRole('tab', { name: 'Evidence' });
  await expect(terminal).toHaveAttribute('aria-selected', 'true');
  await expect(browser).toBeEnabled();
  await expect(
    page.getByText('The Field Browser will activate when a route is recovered.')
  ).toHaveCount(0);
  await evidence.click();
  await expect(page.getByText('No evidence has been confirmed.')).toBeVisible();
  await evidence.focus();
  await page.keyboard.press('ArrowLeft');
  await expect(terminal).toBeFocused();
  await expect(terminal).toHaveAttribute('aria-selected', 'true');
  await page.keyboard.press('ArrowRight');
  await expect(evidence).toBeFocused();
  await expect(evidence).toHaveAttribute('aria-selected', 'true');
  await page.keyboard.press('Home');
  await expect(terminal).toBeFocused();
  await expect(terminal).toHaveAttribute('aria-selected', 'true');
  await page.keyboard.press('End');
  await expect(evidence).toBeFocused();
  await expect(evidence).toHaveAttribute('aria-selected', 'true');
  await expect(browser).toHaveAttribute('aria-haspopup', 'dialog');
  await browser.click();
  await expect(page.getByRole('button', { name: 'Close Browser' })).toBeFocused();
  await page.keyboard.press('Escape');
  await expect(browser).toBeFocused();
  await page.reload();
  await page.getByRole('button', { name: 'Continue Operation' }).click();
  await page.getByRole('button', { name: 'Continue Operation' }).click();
  await expect(page.getByRole('tab', { name: 'Evidence' })).toHaveAttribute(
    'aria-selected',
    'true'
  );
});

test('keeps an eligible tablet active during keyboard-height contraction', async ({
  page
}, testInfo) => {
  test.skip(
    testInfo.project.name !== 'chromium-tablet-landscape',
    'Keyboard contraction is tested only on the supported tablet project.'
  );
  await page.goto('/');
  await registerApplicant(page);
  await openBriefing(page);
  await page.getByRole('button', { name: 'Deploy' }).click();
  await page.getByRole('textbox', { name: 'Command' }).focus();
  await page.setViewportSize({ width: 1024, height: 420 });
  await expect(page.locator('main')).toHaveAttribute('data-viewport-state', 'supported-landscape');
  await expect(page.getByRole('textbox', { name: 'Command' })).toBeInViewport();
  await expect(page.getByRole('button', { name: 'Run' })).toBeInViewport();
  const commandGuide = page.getByText('Command Guide');
  await commandGuide.scrollIntoViewIfNeeded();
  await expect(commandGuide).toBeInViewport();
  await commandGuide.click();
  await expect(page.getByRole('button', { name: 'Prepare clear command' })).toBeVisible();
  await expectCommandGuideFitsSidebar(page);
  await expect(page.getByRole('textbox', { name: 'Command' })).toBeInViewport();
  await expect(page.getByRole('button', { name: 'Run' })).toBeInViewport();
  const contractedSeparation = await page.evaluate(() => {
    const dock = document.querySelector('[data-byte-dock]');
    const form = document.querySelector('[data-terminal-main] form');
    if (!(dock instanceof HTMLElement) || !(form instanceof HTMLElement)) {
      throw new Error('Expected Byte dock and Terminal composer.');
    }
    const dockBounds = dock.getBoundingClientRect();
    const formBounds = form.getBoundingClientRect();
    return dockBounds.right <= formBounds.left || dockBounds.bottom <= formBounds.top;
  });
  expect(contractedSeparation).toBe(true);
  await expect(page.getByRole('button', { name: 'HQ' })).toBeVisible();
  const contractedTranscriptHeight = await page
    .locator('[data-terminal-transcript]')
    .evaluate((element) => element.getBoundingClientRect().height);
  await page.setViewportSize({ width: 1024, height: 700 });
  await expect(page.getByRole('tab', { name: 'Terminal' })).toHaveAttribute(
    'aria-selected',
    'true'
  );
  await expect(page.getByRole('textbox', { name: 'Command' })).toBeInViewport();
  await expect(page.getByRole('button', { name: 'Run' })).toBeInViewport();
  const restoredTranscriptHeight = await page
    .locator('[data-terminal-transcript]')
    .evaluate((element) => element.getBoundingClientRect().height);
  expect(restoredTranscriptHeight).toBeGreaterThan(contractedTranscriptHeight);
});

test('runs the guided Terminal, recovers the Browser route and restores its checkpoint', async ({
  page
}, testInfo) => {
  const expectation = expectationFor(testInfo.project.name);
  test.skip(
    expectation.state !== 'supported-landscape',
    'Terminal controls are intentionally absent behind this viewport gate.'
  );
  const configuredBaseUrl = testInfo.project.use.baseURL;
  if (typeof configuredBaseUrl !== 'string') {
    throw new Error('Playwright baseURL must be configured for OpSlyce browser tests.');
  }
  const externalRequests = trackExternalRequests(page, configuredBaseUrl);
  await page.goto('/');
  await registerApplicant(page);
  await openBriefing(page);
  await page.getByRole('button', { name: 'Deploy' }).click();
  const input = page.getByRole('textbox', { name: 'Command' });

  await page.getByText('Command Guide').click();
  await page.getByRole('button', { name: 'Prepare help command' }).click();
  await expect(input).toHaveValue('help');
  await expect(page.getByRole('log', { name: 'Field Terminal transcript' })).toBeEmpty();
  await input.fill('h');
  await expect(page.getByRole('button', { name: /Complete:/u })).toHaveCount(0);
  await input.press('Tab');
  await expect(input).toHaveValue('h');
  await input.focus();
  await input.fill('sl');
  await input.press('Enter');
  await expect(page.getByRole('button', { name: 'Prepare suggestion' })).toHaveCount(0);
  await page.getByRole('button', { name: 'Settings' }).click();
  await page.getByRole('checkbox', { name: /command assistance/i }).check();
  await page.getByRole('button', { name: 'Close Settings' }).click();
  await expectCommandGuideFitsSidebar(page, false);
  await input.fill('ls');
  await expect(page.getByText('welcome.txt')).toHaveCount(0);
  await page.getByRole('button', { name: 'Run' }).click();
  await expect(page.getByText('welcome.txt')).toBeVisible();
  await expect(page.getByRole('button', { name: 'Prepare suggestion' })).toHaveCount(0);
  await input.fill('cat welcom.txt');
  await input.press('Enter');
  await expect(page.getByText('Did you mean welcome.txt?')).toBeVisible();
  await expect(page.getByRole('button', { name: 'Prepare suggestion' })).toHaveCount(0);
  await expect(
    page
      .locator('[data-byte-dock]')
      .getByText('ls lists the files and folders in your current location.')
  ).toBeVisible();
  await expect(page.locator('#terminal-panel').getByRole('img', { name: 'Byte' })).toHaveCount(0);
  await page.getByRole('button', { name: 'Prepare cat welcome.txt' }).click();
  await expectCommandGuideFitsSidebar(page, false);
  await expect(input).toHaveValue('cat welcome.txt');
  await input.press('Enter');
  await input.fill('cd training');
  await input.press('Enter');
  await expect(page.locator('form').getByText('recruit@opslyce-hq:~/training$')).toBeVisible();
  await input.fill('cat trace-note.txt');
  await input.press('Enter');
  await expect(page.getByText('/recruit-verification', { exact: true })).toBeVisible();
  await expect(page.getByText('OBJ-003')).toBeVisible();
  const objectiveAndByte = await page.evaluate(() => {
    const objective = document.querySelector('[aria-labelledby="current-objective-heading"]');
    const dock = document.querySelector('[data-byte-dock]');
    if (!(objective instanceof HTMLElement) || !(dock instanceof HTMLElement)) {
      throw new Error('Expected objective and Byte dock at OBJ-003.');
    }
    return {
      separated: objective.getBoundingClientRect().bottom <= dock.getBoundingClientRect().top,
      workspaceFits:
        document.querySelector('[data-mission-workspace]')?.scrollHeight ===
        document.querySelector('[data-mission-workspace]')?.clientHeight
    };
  });
  expect(objectiveAndByte).toEqual({ separated: true, workspaceFits: true });
  const terminal = page.getByRole('tab', { name: 'Terminal' });
  const evidence = page.getByRole('tab', { name: 'Evidence' });
  await terminal.focus();
  await page.keyboard.press('ArrowLeft');
  await expect(evidence).toBeFocused();
  await page.keyboard.press('ArrowRight');
  await expect(terminal).toBeFocused();
  await page.keyboard.press('ArrowRight');
  await expect(evidence).toBeFocused();
  await page.keyboard.press('End');
  await expect(evidence).toBeFocused();
  await evidence.click();
  await expect(page.getByRole('heading', { name: 'NOTE RECOVERED' })).toBeVisible();
  await expect(page.getByRole('heading', { name: 'HQ TRAINING ROUTE' })).toBeVisible();
  await page.getByRole('button', { name: 'Copy verification route' }).click();
  await expect(page.locator('[data-evidence-id="EV-002"] [role="status"]')).toContainText(
    /Copied|Copy unavailable\. Select the route and copy it manually\./u
  );
  await page.getByRole('button', { name: 'Browser' }).click();
  await expect(page.getByRole('heading', { name: 'Welcome to OpSlyce HQ' })).toBeVisible();
  const route = page.getByRole('textbox', { name: 'Route' });
  await route.fill('/recruit-verification');
  await expect(page.getByRole('button', { name: 'Open Route' })).toBeVisible();
  await expect(page.getByText('FLAG{WELCOME_TO_HQ}')).toHaveCount(0);
  await page.reload();
  await page.getByRole('button', { name: 'Continue Operation' }).click();
  await expect(page.getByText('HQ TRAINING ROUTE')).toBeVisible();
  await page.getByRole('button', { name: 'Continue Operation' }).click();
  await expect(page.getByRole('tab', { name: 'Evidence' })).toHaveAttribute(
    'aria-selected',
    'true'
  );
  await expect(page.getByRole('dialog', { name: 'Field Browser' })).toHaveCount(0);
  expect(externalRequests).toEqual([]);
});

test('resets deployed progress with keyboard focus and no external requests', async ({
  page
}, testInfo) => {
  const expectation = expectationFor(testInfo.project.name);
  test.skip(
    expectation.state !== 'supported-landscape',
    'Reset controls are intentionally absent behind this viewport gate.'
  );
  const configuredBaseUrl = testInfo.project.use.baseURL;
  if (typeof configuredBaseUrl !== 'string') {
    throw new Error('Playwright baseURL must be configured for OpSlyce browser tests.');
  }
  const externalRequests = trackExternalRequests(page, configuredBaseUrl);

  await page.goto('/');
  await registerApplicant(page);
  await openBriefing(page);
  await page.getByRole('button', { name: 'Deploy' }).click();
  await page.getByRole('button', { name: 'Settings' }).click();

  const reset = page.getByRole('button', { name: 'Reset progress' });
  for (let step = 0; step < 10; step += 1) {
    if (await reset.evaluate((element) => element === document.activeElement)) {
      break;
    }
    await page.keyboard.press('Tab');
  }
  await expectVisibleFocus(reset);
  await page.keyboard.press('Enter');

  const cancel = page.getByRole('button', { name: 'Cancel' });
  await expectVisibleFocus(cancel);
  await page.keyboard.press('Enter');
  await expectVisibleFocus(reset);
  await page.keyboard.press('Enter');
  await page.keyboard.press('Tab');

  const confirm = page.getByRole('button', { name: 'Reset progress' });
  await expectVisibleFocus(confirm);
  await page.keyboard.press('Enter');

  await expect(page.getByRole('heading', { name: 'Welcome to OpSlyce HQ' })).toBeVisible();
  await expect(page.getByRole('button', { name: 'Continue Operation' })).toHaveCount(0);
  await page.getByRole('button', { name: 'Enter HQ' }).click();
  await expect(page.getByRole('textbox', { name: 'Codename' })).toHaveValue('');
  expect(externalRequests).toEqual([]);
});

test('restarts an active OPS-001 checkpoint without deleting the operative profile', async ({
  page
}, testInfo) => {
  const expectation = expectationFor(testInfo.project.name);
  test.skip(
    expectation.state !== 'supported-landscape',
    'Restart controls are intentionally absent behind this viewport gate.'
  );
  const configuredBaseUrl = testInfo.project.use.baseURL;
  if (typeof configuredBaseUrl !== 'string') {
    throw new Error('Playwright baseURL must be configured for OpSlyce browser tests.');
  }
  const externalRequests = trackExternalRequests(page, configuredBaseUrl);

  await page.goto('/');
  await registerApplicant(page);
  await openBriefing(page);
  await page.getByRole('button', { name: 'Deploy' }).click();
  await page.getByRole('textbox', { name: 'Command' }).fill('ls');
  await page.getByRole('button', { name: 'Run' }).click();
  await page.getByRole('button', { name: 'Settings' }).click();
  await page.getByRole('button', { name: 'Restart current operation' }).click();
  await expect(page.getByRole('alertdialog', { name: 'Restart current operation?' })).toBeVisible();
  await page.getByRole('button', { name: 'Restart operation' }).click();

  await expect(page.getByRole('heading', { name: 'Current objective' })).toBeVisible();
  await expect(
    page.getByText('Locate Agent Trace’s missing message in the Recruit Workspace.')
  ).toBeVisible();
  const persisted = await page.evaluate(() => {
    const raw = window.localStorage.getItem('opslyce.local-save');
    if (raw === null) throw new Error('Expected persisted OpSlyce save.');
    const save = JSON.parse(raw) as {
      profile: {
        codename: string;
        progression: string;
        fieldManualEntries: string[];
        activeCheckpoint: {
          objectiveId: string;
          progression: string;
          activeEvidenceIds: string[];
          terminal: { commandHistory: string[]; visibleInteractions: unknown[] };
        };
      };
    };
    return save.profile;
  });

  expect(persisted).toMatchObject({
    codename: 'Agent_7',
    progression: 'operation-active-locate-message',
    fieldManualEntries: [],
    activeCheckpoint: {
      objectiveId: 'OBJ-001',
      progression: 'operation-active-locate-message',
      activeEvidenceIds: [],
      terminal: { commandHistory: [], visibleInteractions: [] }
    }
  });
  expect(externalRequests).toEqual([]);
});
