import { expect, test, type Page } from '@playwright/test';

function supported(projectName: string) {
  return (
    projectName === 'chromium-desktop-landscape' || projectName === 'chromium-tablet-landscape'
  );
}

async function registerAndDeploy(page: Page) {
  await page.goto('/');
  await page.getByRole('button', { name: 'Enter HQ' }).click();
  await page.getByRole('textbox', { name: 'Codename' }).fill('Agent_10');
  await page.getByRole('button', { name: 'Register codename' }).click();
  await page.getByRole('button', { name: 'Open transmission' }).click();
  await page.getByRole('button', { name: 'Return to HQ' }).click();
  await page.getByRole('button', { name: /Open OPS-001 — Recruitment Day/ }).click();
  await page.getByRole('button', { name: 'Deploy' }).click();
}

async function runCommand(page: Page, command: string) {
  const input = page.getByRole('textbox', { name: 'Command' });
  await input.fill(command);
  await page.getByRole('button', { name: 'Run' }).click();
}

const byteReaction =
  "That definitely wasn't one of ours. I've saved the mark before it could disappear.";
const patchReaction =
  'HQ has logged an unidentified signal event. We do not yet know its source or purpose. Keep the evidence; patterns matter.';

test('replaces a stale first-use command explanation in Byte’s live slot', async ({
  page
}, testInfo) => {
  test.skip(!supported(testInfo.project.name), 'Stage 10 controls are behind the viewport gate.');
  await registerAndDeploy(page);
  const byteDock = page.getByLabel('Byte assistant');

  await runCommand(page, 'ls');
  await expect(
    byteDock.getByText('ls lists the files and folders in your current location.')
  ).toBeVisible();
  await runCommand(page, 'cat welcome.txt');
  await expect(byteDock.getByText('cat displays the contents of a text file.')).toBeVisible();
  await expect(
    byteDock.getByText('ls lists the files and folders in your current location.')
  ).toHaveCount(0);
  await expect(byteDock.getByRole('button', { name: 'Dismiss' })).toHaveCount(1);

  await runCommand(page, 'cat missing.txt');
  await expect(byteDock.getByText('cat displays the contents of a text file.')).toBeVisible();
  await runCommand(page, 'ls');
  await expect(byteDock.getByText('cat displays the contents of a text file.')).toBeVisible();

  await runCommand(page, 'cat training/trace-note.txt');
  await expect(
    byteDock.getByText(
      'Route recovered. The verification page is now available in the Field Browser.'
    )
  ).toBeVisible();
  await expect(byteDock.getByText('cat displays the contents of a text file.')).toHaveCount(0);
  await page.getByRole('button', { name: 'Browser' }).click();
  await page.getByRole('textbox', { name: 'Route' }).fill('/recruit-verification');
  await page.getByRole('button', { name: 'Open Route' }).click();
  await page.getByRole('button', { name: 'Close Browser' }).click();
  await expect(
    byteDock.getByText('Verification flag recovered. I’ve logged it in Evidence for you.')
  ).toBeVisible();
  await expect(
    byteDock.getByText(
      'Route recovered. The verification page is now available in the Field Browser.'
    )
  ).toHaveCount(0);

  await byteDock.getByRole('button', { name: 'Dismiss' }).click();
  await expect(byteDock.getByText('Standing by.')).toBeVisible();
  await page.getByRole('button', { name: 'Field Manual' }).click();
  await expect(page.locator('[data-manual-entry="command-ls"]')).toBeVisible();
  await expect(page.locator('[data-manual-entry="command-cat"]')).toBeVisible();
  await page.getByRole('button', { name: 'Close' }).click();
  await expect(page.getByRole('button', { name: 'Ask Byte' })).toBeVisible();
});

test('completes the debrief, promotion and contained HQ signal sequence', async ({
  page
}, testInfo) => {
  test.skip(!supported(testInfo.project.name), 'Stage 10 controls are behind the viewport gate.');
  test.setTimeout(75_000);
  const baseURL = testInfo.project.use.baseURL;
  if (typeof baseURL !== 'string') throw new Error('Expected Playwright baseURL.');
  const allowedOrigin = new URL(baseURL).origin;
  const external: string[] = [];
  page.on('request', (request) => {
    if (new URL(request.url()).origin !== allowedOrigin) external.push(request.url());
  });

  await registerAndDeploy(page);
  await runCommand(page, 'ls');
  await runCommand(page, 'cat welcome.txt');
  await runCommand(page, 'cat training/trace-note.txt');
  await page.getByRole('button', { name: 'Browser' }).click();
  await page.getByRole('textbox', { name: 'Route' }).fill('/recruit-verification');
  await page.getByRole('button', { name: 'Open Route' }).click();
  await page.getByRole('button', { name: 'Close Browser' }).click();
  await page.getByRole('button', { name: 'Mission Control' }).click();
  await page.getByRole('textbox', { name: 'Verification flag' }).fill('FLAG{WELCOME_TO_HQ}');
  await page.getByRole('button', { name: 'Submit' }).click();

  await expect(page.getByText(/VERIFYING EVIDENCE|FLAG ACCEPTED/u)).toBeVisible();
  await expect(page.getByText('FLAG ACCEPTED')).toBeVisible();
  await expect(page.getByRole('heading', { name: 'Recruitment Day debrief' })).toBeVisible();
  await expect(
    page.getByText(
      'Recruit, your identity is verified. You recovered the missing note and followed its evidence to the correct result. Effective immediately, you are a Recruit Operative.'
    )
  ).toBeVisible();
  await expect(
    page.getByText("Officially recruited. I'll record the paperwork as my contribution.")
  ).toBeVisible();
  const fieldRecord = page.getByRole('heading', { name: 'Field record' }).locator('..');
  await expect(fieldRecord.getByText('ls', { exact: true })).toBeVisible();
  await expect(fieldRecord.getByText('cat', { exact: true })).toBeVisible();
  await expect(fieldRecord.getByText('cd', { exact: true })).toHaveCount(0);
  await expect(page.getByText('Rank: Recruit Operative')).toBeVisible();
  await expect(page.getByText('Badge: Ghost File')).toBeVisible();
  await expect(page.getByRole('heading', { name: 'HQ Dashboard' })).toHaveCount(0);

  await page.getByRole('button', { name: 'Return to HQ' }).click();
  await expect(page.getByRole('heading', { name: 'HQ Dashboard' })).toBeVisible();
  await expect(page.getByText('AGENT STATUS UPDATED')).toHaveCount(1);
  await expect(page.getByText('RECRUIT OPERATIVE', { exact: true })).toHaveCount(1);
  await expect(page.locator('img[alt="Ghost File badge"]')).toHaveCount(1);
  await expect(page.getByText('UNIDENTIFIED SIGNAL')).toHaveCount(0);
  await expect(page.getByText(byteReaction)).toHaveCount(0);
  await expect(page.getByText(patchReaction)).toHaveCount(0);
  await expect(page.getByText('NEW INCIDENT REPORTED')).toHaveCount(0);
  await expect(page.getByRole('button', { name: 'Review welcome' })).toBeVisible();

  const signal = page.locator('[data-contained-signal]');
  await expect(signal).toBeVisible({ timeout: 4500 });
  if (testInfo.project.name === 'chromium-desktop-landscape') {
    await page.setViewportSize({ width: 1366, height: 577 });
  }
  await expect(signal.getByText('UNIDENTIFIED SIGNAL')).toBeVisible();
  await expect(signal).toHaveAttribute('data-signal-presentation', 'transient');
  await expect(page.getByText(byteReaction)).toHaveCount(0);
  await expect(page.getByText(patchReaction)).toHaveCount(0);
  await expect(page.getByText('NEW INCIDENT REPORTED')).toHaveCount(0);
  await expect(signal.getByText('SOURCE: UNKNOWN')).toBeVisible({ timeout: 3000 });
  await expect(signal).toHaveAttribute('data-signal-phase', 'captured');
  await expect(
    signal.getByRole('img', { name: 'Captured unidentified signal mark' })
  ).toBeVisible();
  const liveSignalLayout = await signal.evaluate((element) => {
    const mark = element.querySelector('[data-signal-effect="contained"] img:first-child');
    const dashboard = element.closest('[data-hq-dashboard]');
    const lowerPanels = dashboard?.querySelector(':scope > div:last-child');
    if (!(mark instanceof HTMLImageElement) || !(dashboard instanceof HTMLElement)) {
      throw new Error('Expected live signal geometry.');
    }
    const signalBounds = element.getBoundingClientRect();
    const markBounds = mark.getBoundingClientRect();
    return {
      phase: element.getAttribute('data-signal-phase'),
      dashboardPriority: dashboard.getAttribute('data-dashboard-priority'),
      lowerPanelsDisplay:
        lowerPanels instanceof HTMLElement ? getComputedStyle(lowerPanels).display : null,
      markInside:
        markBounds.top >= signalBounds.top - 1 &&
        markBounds.left >= signalBounds.left - 1 &&
        markBounds.right <= signalBounds.right + 1 &&
        markBounds.bottom <= signalBounds.bottom + 1,
      signalFits: element.scrollHeight <= element.clientHeight + 1,
      horizontalFit: dashboard.scrollWidth <= dashboard.clientWidth + 1
    };
  });
  expect(liveSignalLayout).toEqual({
    phase: 'captured',
    dashboardPriority: 'signal',
    lowerPanelsDisplay: 'none',
    markInside: true,
    signalFits: true,
    horizontalFit: true
  });
  const focusedMarkHeight = await signal
    .getByRole('img', { name: 'Captured unidentified signal mark' })
    .evaluate((mark) => mark.getBoundingClientRect().height);
  await expect(signal.getByText('TRACE FAILED')).toBeVisible({ timeout: 3500 });
  await expect(signal.getByText('CAPTURED SIGNAL DATA')).toBeVisible();
  expect(focusedMarkHeight).toBeGreaterThan(130);
  await expect(page.getByRole('heading', { name: 'Communications' })).toBeVisible();
  await expect(page.getByRole('heading', { name: 'Agent Status' })).toBeHidden();
  await expect(page.getByRole('heading', { name: 'Evidence Summary' })).toBeHidden();

  const byteCard = page.locator('[data-live-reaction="byte"]');
  await expect(byteCard).toBeVisible({ timeout: 3500 });
  const hqResponse = page.getByRole('dialog', { name: 'HQ RESPONSE' });
  await expect(hqResponse).toBeVisible();
  await expect(hqResponse).toBeFocused();
  await expect(byteCard).toContainText(byteReaction);
  await expect(byteCard).toBeInViewport();
  const coveredDashboard = page.locator('[data-hq-dashboard]');
  await expect(coveredDashboard).toHaveAttribute('aria-hidden', 'true');
  await expect(coveredDashboard.locator('h2').filter({ hasText: 'Agent Status' })).toHaveCount(1);
  await expect(coveredDashboard.locator('h2').filter({ hasText: 'Evidence Summary' })).toHaveCount(
    1
  );
  await expect(coveredDashboard).toContainText('AGENT STATUS UPDATED');
  await expect(coveredDashboard).toContainText('RECRUIT OPERATIVE');
  await expect(coveredDashboard.locator('img[alt="Ghost File badge"]')).toHaveCount(1);
  await expect(byteCard.getByRole('img', { name: 'Byte portrait' })).toBeVisible();
  await expect(byteCard.locator('[data-reaction-segment]')).toHaveCount(2);
  expect(
    await byteCard
      .locator('[data-reaction-segment="2"]')
      .evaluate((segment) => getComputedStyle(segment).animationName)
  ).not.toBe('none');
  await expect(page.locator('[data-live-reaction="patch"]')).toHaveCount(0);
  expect(
    await page.locator('[aria-labelledby="communications-heading"] [data-live-reaction]').count()
  ).toBe(0);
  await expect(page.getByText('NEW INCIDENT REPORTED')).toHaveCount(0);
  const patchCard = page.locator('[data-live-reaction="patch"]');
  await expect(patchCard).toBeVisible({ timeout: 4000 });
  await expect(patchCard).toContainText(patchReaction);
  await expect(patchCard).toBeInViewport();
  await expect(patchCard.getByRole('img', { name: 'Director Patch portrait' })).toBeVisible();
  await expect(patchCard.locator('[data-reaction-segment]')).toHaveCount(3);
  expect(
    await patchCard
      .locator('[data-reaction-segment="3"]')
      .evaluate((segment) => getComputedStyle(segment).animationName)
  ).not.toBe('none');
  await expect(page.getByText('NEW INCIDENT REPORTED')).toHaveCount(0);
  const responseReview = hqResponse.getByRole('button', { name: 'Review captured evidence' });
  await expect(responseReview).toBeVisible({ timeout: 4500 });
  const responseBounds = await hqResponse.boundingBox();
  const communicationsBounds = await page
    .locator('[aria-labelledby="communications-heading"]')
    .boundingBox();
  expect(responseBounds).not.toBeNull();
  expect(communicationsBounds).not.toBeNull();
  if (responseBounds && communicationsBounds) {
    expect(responseBounds.width).toBeGreaterThan(communicationsBounds.width);
    expect(responseBounds.height).toBeGreaterThan(communicationsBounds.height);
  }
  expect(
    await hqResponse.evaluate(
      (element) =>
        element.scrollWidth <= element.clientWidth + 2 &&
        element.scrollHeight <= element.clientHeight + 2
    )
  ).toBe(true);
  await responseReview.click();
  const completionReview = page.getByRole('button', { name: 'Review captured evidence' });
  const evidenceDialog = page.getByRole('dialog', { name: 'UNIDENTIFIED INTRUSION MARK' });
  await expect(evidenceDialog).toBeVisible();
  await expect(page.getByRole('button', { name: 'Close evidence' })).toBeFocused();
  await expect(evidenceDialog.getByText('EV-005')).toBeVisible();
  await expect(evidenceDialog.getByText('Source and meaning unknown.')).toBeVisible();
  await expect(evidenceDialog.getByText('Status: Unresolved')).toBeVisible();
  await expect(
    evidenceDialog.getByRole('img', { name: 'Saved unidentified intrusion mark' })
  ).toBeVisible();
  const evidenceMarkHeight = await evidenceDialog
    .getByRole('img', { name: 'Saved unidentified intrusion mark' })
    .evaluate((mark) => mark.getBoundingClientRect().height);
  expect(evidenceMarkHeight).toBeGreaterThan(140);
  expect(await evidenceDialog.locator('[data-recorded-signal-effect]').count()).toBe(1);
  expect(
    await evidenceDialog.evaluate((element) => element.scrollWidth <= element.clientWidth + 2)
  ).toBe(true);
  await expect(evidenceDialog).not.toContainText(/Cipher Vane|Agent Trace/iu);

  await page.getByRole('button', { name: 'Close evidence' }).click();
  await expect(completionReview).toBeFocused();
  await expect(page.getByRole('heading', { name: 'OPS-001 COMPLETE' })).toBeVisible();
  await expect(page.getByRole('heading', { name: 'Completed Operation' })).toBeVisible();
  await expect(page.getByText('Further assignment pending.')).toHaveCount(1);
  await expect(page.getByText('Latest: Unidentified Intrusion Mark')).toBeVisible();
  const completionCard = page.locator('[data-ops001-complete]');
  const completionBounds = await completionCard.boundingBox();
  const completionCopyBounds = await completionCard.locator('div').boundingBox();
  const completionActionBounds = await completionReview.boundingBox();
  expect(completionBounds).not.toBeNull();
  expect(completionCopyBounds).not.toBeNull();
  expect(completionActionBounds).not.toBeNull();
  if (completionBounds && completionCopyBounds && completionActionBounds) {
    expect(completionCopyBounds.x + completionCopyBounds.width).toBeLessThanOrEqual(
      completionActionBounds.x + 1
    );
    expect(completionActionBounds.x + completionActionBounds.width).toBeLessThanOrEqual(
      completionBounds.x + completionBounds.width + 1
    );
  }
  await expect(page.locator('[data-contained-signal]')).toHaveCount(0);
  expect(await page.locator('[data-signal-effect]').count()).toBe(0);

  await expect(page.getByText('NEW INCIDENT REPORTED')).toBeVisible({ timeout: 3000 });
  await expect(
    page.getByText('An HQ website is displaying a page that “does not exist”.')
  ).toHaveCount(0);
  const openIncident = page.getByRole('button', { name: 'Open incident' });
  await expect(openIncident).toBeVisible();
  await openIncident.click();
  const incidentDialog = page.getByRole('dialog', { name: 'NEW INCIDENT REPORTED' });
  await expect(incidentDialog).toBeVisible();
  await expect(
    incidentDialog.getByText('An HQ website is displaying a page that “does not exist”.')
  ).toBeVisible();
  await expect(incidentDialog.getByText('Its records suggest otherwise.')).toBeVisible();
  await expect(incidentDialog.getByText('Further assignment pending.')).toBeVisible();
  await expect(incidentDialog.getByRole('button', { name: /start|accept/iu })).toHaveCount(0);
  expect(
    await incidentDialog.evaluate((element) => element.scrollWidth <= element.clientWidth + 2)
  ).toBe(true);
  await expect(page.locator('[data-hq-dashboard]')).toHaveAttribute('inert');
  await page.getByRole('button', { name: 'Close communication' }).click();
  const finalCompletion = page.getByRole('dialog', { name: 'OPS-001 COMPLETE' });
  await expect(finalCompletion).toBeVisible();
  await expect(finalCompletion.getByText('Recruitment Day')).toBeVisible();
  await expect(finalCompletion.getByText('Recruit Operative')).toBeVisible();
  await expect(finalCompletion.getByText('Ghost File earned')).toBeVisible();
  await expect(finalCompletion.getByText('EV-005 logged')).toBeVisible();
  await expect(finalCompletion.getByText('Status: Unresolved')).toBeVisible();
  await expect(finalCompletion.getByText('Further assignment pending.')).toBeVisible();
  await expect(
    finalCompletion.getByText('More operations are coming in a future update.')
  ).toBeVisible();
  await expect(finalCompletion.getByRole('button', { name: /OPS-002|start|accept/iu })).toHaveCount(
    0
  );
  expect(
    await finalCompletion.evaluate(
      (element) =>
        element.scrollWidth <= element.clientWidth + 2 &&
        element.scrollHeight <= element.clientHeight + 2
    )
  ).toBe(true);
  await expect(finalCompletion.getByRole('button', { name: 'Return to HQ' })).toBeInViewport();
  if (testInfo.project.name === 'chromium-desktop-landscape') {
    await page.setViewportSize({ width: 1280, height: 720 });
  }
  await page.reload();
  await page.getByRole('button', { name: 'Enter HQ' }).click();
  await expect(finalCompletion).toBeVisible();
  await finalCompletion.getByRole('button', { name: 'Return to HQ' }).click();
  await expect(finalCompletion).toHaveCount(0);
  await expect(page.getByRole('heading', { name: 'Completed Operation' })).toBeFocused();
  const communications = page
    .getByRole('heading', { name: 'Communications' })
    .locator('..')
    .locator('..');
  const incidentCard = page.locator('[data-incident-teaser]');
  const communicationPriority = await communications.evaluate((element) => {
    const incident = element.querySelector('[data-incident-teaser]');
    const updates = incident?.parentElement;
    if (!(incident instanceof HTMLElement) || !(updates instanceof HTMLElement)) {
      throw new Error('Expected current incident communication.');
    }
    const communicationBounds = element.getBoundingClientRect();
    const incidentBounds = incident.getBoundingClientRect();
    return {
      incidentInside:
        incidentBounds.top >= communicationBounds.top - 1 &&
        incidentBounds.bottom <= communicationBounds.bottom + 1,
      currentItemCount: updates.children.length
    };
  });
  expect(communicationPriority).toEqual({ incidentInside: true, currentItemCount: 1 });
  await expect(incidentCard).toBeInViewport();
  await expect(page.getByText('Review anomaly responses')).toBeVisible();

  await page.getByRole('button', { name: 'Inspect mark' }).click();
  await expect(evidenceDialog).toBeVisible();
  await page.emulateMedia({ reducedMotion: 'reduce' });
  expect(
    await evidenceDialog
      .locator('[data-recorded-signal-effect] img')
      .first()
      .evaluate((mark) => getComputedStyle(mark).animationName)
  ).toBe('none');
  await expect(evidenceDialog.getByText('Source and meaning unknown.')).toBeVisible();
  await page.getByRole('button', { name: 'Close evidence' }).click();
  await expect(page.getByRole('button', { name: 'Inspect mark' })).toBeFocused();
  await expect(page.getByRole('button', { name: /OPS-002/u })).toHaveCount(0);
  await expect(page.getByRole('link', { name: /OPS-002/u })).toHaveCount(0);
  await expect(page.getByText(/Cipher Vane|SYSTEM COMPROMISED/iu)).toHaveCount(0);

  const dashboard = page.locator('[data-hq-dashboard]');
  const dashboardDimensions = await dashboard.evaluate((element) => ({
    clientHeight: element.clientHeight,
    clientWidth: element.clientWidth,
    scrollHeight: element.scrollHeight,
    scrollWidth: element.scrollWidth
  }));
  expect(dashboardDimensions.scrollHeight).toBeLessThanOrEqual(
    dashboardDimensions.clientHeight + 2
  );
  expect(dashboardDimensions.scrollWidth).toBeLessThanOrEqual(dashboardDimensions.clientWidth + 2);
  const restingLayout = await dashboard.evaluate((element) => {
    const [communicationsPanel, operationPanel, lowerPanels] = Array.from(element.children);
    const [agentPanel, evidencePanel] = Array.from(lowerPanels?.children ?? []);
    if (
      !(communicationsPanel instanceof HTMLElement) ||
      !(operationPanel instanceof HTMLElement) ||
      !(agentPanel instanceof HTMLElement) ||
      !(evidencePanel instanceof HTMLElement)
    ) {
      throw new Error('Expected final Dashboard panels.');
    }
    const communicationsBounds = communicationsPanel.getBoundingClientRect();
    const operationBounds = operationPanel.getBoundingClientRect();
    const agentBounds = agentPanel.getBoundingClientRect();
    const evidenceBounds = evidencePanel.getBoundingClientRect();
    return {
      communicationsClearsLowerRow: communicationsBounds.bottom <= agentBounds.top,
      operationClearsLowerRow: operationBounds.bottom <= evidenceBounds.top,
      lowerPanelsDoNotOverlap: agentBounds.right <= evidenceBounds.left
    };
  });
  expect(restingLayout).toEqual({
    communicationsClearsLowerRow: true,
    operationClearsLowerRow: true,
    lowerPanelsDoNotOverlap: true
  });
  await page.reload();
  await page.getByRole('button', { name: 'Enter HQ' }).click();
  await expect(finalCompletion).toHaveCount(0);
  await expect(page.getByRole('heading', { name: 'Completed Operation' })).toBeVisible();
  await expect(page.getByRole('button', { name: 'Review incident' })).toBeVisible();
  expect(external).toEqual([]);
});
