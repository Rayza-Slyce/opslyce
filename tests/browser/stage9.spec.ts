import { expect, test, type Page } from '@playwright/test';

async function registerAndDeploy(page: Page) {
  await page.goto('/');
  await page.getByRole('button', { name: 'Enter HQ' }).click();
  await page.getByRole('textbox', { name: 'Codename' }).fill('Agent_9');
  await page.getByRole('button', { name: 'Register codename' }).click();
  await page.getByRole('button', { name: 'Open transmission' }).click();
  await page.getByRole('button', { name: 'Return to HQ' }).click();
  await page.getByRole('button', { name: /Open OPS-001 — Recruitment Day/ }).click();
  await page.getByRole('button', { name: 'Deploy' }).click();
}

function supported(projectName: string) {
  return (
    projectName === 'chromium-desktop-landscape' || projectName === 'chromium-tablet-landscape'
  );
}

async function revealAndUseAssist(page: Page, hintId: string) {
  await page.getByRole('button', { name: 'Ask Byte' }).click();
  await page.getByRole('button', { name: 'Show Nudge' }).click();
  await page.getByRole('button', { name: 'Show Instruction' }).click();
  await page.getByRole('button', { name: `Use Byte Assist for ${hintId}` }).click();
}

test('offers progressive player-requested guidance and quiet repeated-error help', async ({
  page
}, testInfo) => {
  test.skip(!supported(testInfo.project.name), 'Mission controls are behind the viewport gate.');
  await registerAndDeploy(page);

  await page.getByRole('button', { name: 'Ask Byte' }).click();
  await expect(page.getByText('Hints carry no penalty.')).toHaveCount(0);
  await expect(page.getByRole('button', { name: 'Show Nudge' })).toBeVisible();
  await expect(page.getByText('Use ls to list the files and folders here.')).toHaveCount(0);
  if (testInfo.project.name === 'chromium-tablet-landscape') {
    await page.setViewportSize({ width: 1024, height: 420 });
    await expect(page.getByRole('button', { name: 'Close' })).toBeInViewport();
    await expect(page.getByRole('button', { name: 'Show Nudge' })).toBeInViewport();
    await expect(page.locator('[data-mission-workspace]')).toBeVisible();
    await page.setViewportSize({ width: 1024, height: 700 });
  }
  await page.getByRole('button', { name: 'Show Nudge' }).click();
  await expect(
    page.getByText('Start by checking what is already available in the Recruit Workspace.')
  ).toBeVisible();
  await page.getByRole('button', { name: 'Show Instruction' }).click();
  await page.getByRole('button', { name: 'Use Byte Assist for H-001' }).click();
  const command = page.getByRole('textbox', { name: 'Command' });
  await expect(command).toHaveValue('ls');
  await expect(page.getByText('welcome.txt')).toHaveCount(0);
  await page.getByRole('button', { name: 'Run' }).click();
  await expect(page.getByText('welcome.txt')).toBeVisible();

  await command.fill('cat missing.txt');
  await page.getByRole('button', { name: 'Run' }).click();
  await expect(page.getByText('I have a suggestion for this step.')).toHaveCount(0);
  await command.fill('cat missing.txt');
  await page.getByRole('button', { name: 'Run' }).click();
  await expect(page.getByText('I have a suggestion for this step.')).toBeVisible();
  await expect(page.getByRole('heading', { name: 'Ask Byte' })).toHaveCount(0);
  await expect(page.getByRole('button', { name: 'Hints' })).toHaveCount(0);
});

test('follows independent progress into the home and training Trace-note contexts', async ({
  page
}, testInfo) => {
  test.skip(!supported(testInfo.project.name), 'Mission controls are behind the viewport gate.');
  await registerAndDeploy(page);
  const command = page.getByRole('textbox', { name: 'Command' });

  await command.fill('ls');
  await page.getByRole('button', { name: 'Run' }).click();
  await page.getByRole('button', { name: 'Ask Byte' }).click();
  await page.getByRole('button', { name: 'Show Nudge' }).click();
  await expect(
    page.getByText('One file looks as though it was written for a new recruit.')
  ).toBeVisible();
  await page.getByRole('button', { name: 'Close' }).click();

  await command.fill('cat welcome.txt');
  await page.getByRole('button', { name: 'Run' }).click();
  await expect(page.getByText('OBJ-002')).toBeVisible();
  await page.getByRole('button', { name: 'Ask Byte' }).click();
  await page.getByRole('button', { name: 'Show Nudge' }).click();
  await expect(page.getByText('The recovered path points into the training folder.')).toBeVisible();
  await page.getByRole('button', { name: 'Close' }).click();

  await command.fill('cd training');
  await page.getByRole('button', { name: 'Run' }).click();
  await page.getByRole('button', { name: 'Ask Byte' }).click();
  await page.getByRole('button', { name: 'Show Nudge' }).click();
  await expect(
    page.getByText("Agent Trace's note is one of the files in this folder.")
  ).toBeVisible();
  await expect(page.getByText('The recovered path points into the training folder.')).toHaveCount(
    0
  );
});

test('Byte assists preparation while Mission Control performs local verification', async ({
  page
}, testInfo) => {
  test.skip(!supported(testInfo.project.name), 'Mission controls are behind the viewport gate.');
  const baseURL = testInfo.project.use.baseURL;
  if (typeof baseURL !== 'string') throw new Error('Expected Playwright baseURL.');
  const allowedOrigin = new URL(baseURL).origin;
  const external: string[] = [];
  page.on('request', (request) => {
    if (new URL(request.url()).origin !== allowedOrigin) external.push(request.url());
  });

  await registerAndDeploy(page);
  const command = page.getByRole('textbox', { name: 'Command' });
  await command.fill('cat training/trace-note.txt');
  await page.getByRole('button', { name: 'Run' }).click();
  await expect(page.getByText('OBJ-003')).toBeVisible();

  await revealAndUseAssist(page, 'H-004');
  await expect(page.getByRole('dialog', { name: 'Field Browser' })).toBeVisible();
  await expect(page.getByRole('button', { name: 'Close Browser' })).toBeFocused();
  await expect(page.getByRole('textbox', { name: 'Route' })).toHaveValue('/recruit-verification');
  await expect(page.getByText('FLAG{WELCOME_TO_HQ}')).toHaveCount(0);
  await page.getByRole('button', { name: 'Open Route' }).click();
  await expect(
    page.getByRole('dialog', { name: 'Field Browser' }).getByText('FLAG{WELCOME_TO_HQ}')
  ).toBeVisible();
  await expect(page.getByText('OBJ-004')).toBeVisible();

  await revealAndUseAssist(page, 'H-005');
  await expect(page.getByRole('dialog', { name: 'Field Browser' })).toHaveCount(0);
  const flag = page.getByRole('textbox', { name: 'Verification flag' });
  const submit = page.getByRole('button', { name: 'Submit' });
  await expect(flag).toHaveValue('FLAG{WELCOME_TO_HQ}');
  await expect(submit).toBeEnabled();

  if (testInfo.project.name === 'chromium-tablet-landscape') {
    await flag.focus();
    await page.setViewportSize({ width: 1024, height: 420 });
    await expect(flag).toBeInViewport();
    await expect(submit).toBeInViewport();
    await expect(page.getByRole('button', { name: 'Ask Byte' })).toBeInViewport();
    await expect(page.getByRole('heading', { name: 'Current objective' })).toBeInViewport();
    await expect(page.locator('[data-mission-workspace]')).toBeVisible();
    await page.setViewportSize({ width: 1024, height: 700 });
  }

  await flag.fill('FLAG{WRONG}');
  await submit.click();
  await expect(page.getByText('That flag was not accepted for OPS-001.')).toBeVisible();
  await expect(flag).toHaveValue('FLAG{WRONG}');
  await flag.fill('  flag{welcome_to_hq}  ');
  await submit.click();
  await expect(page.getByText(/VERIFYING EVIDENCE|FLAG ACCEPTED/u)).toBeVisible();
  await expect(page.getByText('FLAG ACCEPTED')).toBeVisible();
  await expect(page.getByText('OPERATION VERIFIED')).toBeVisible();
  await expect(page.getByRole('heading', { name: 'Recruitment Day debrief' })).toBeVisible();
  await expect(page.getByRole('button', { name: 'Return to HQ' })).toBeVisible();
  await expect(page.getByRole('heading', { name: 'HQ Dashboard' })).toHaveCount(0);

  await page.reload();
  await page.getByRole('button', { name: 'Continue Operation' }).click();
  await page.getByRole('button', { name: 'Continue Operation' }).click();
  await expect(page.getByRole('heading', { name: 'Recruitment Day debrief' })).toBeVisible();
  expect(external).toEqual([]);
});
