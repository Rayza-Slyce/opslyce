import { expect, test, type Page } from '@playwright/test';

async function registerAndDeploy(page: Page) {
  await page.goto('/');
  await page.getByRole('button', { name: 'Enter HQ' }).click();
  await page.getByRole('textbox', { name: 'Codename' }).fill('Agent_8');
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

test('explores the bounded HQ intranet without changing the mission', async ({
  page
}, testInfo) => {
  test.skip(!supported(testInfo.project.name), 'Browser controls are behind the viewport gate.');
  const baseURL = testInfo.project.use.baseURL;
  if (typeof baseURL !== 'string') throw new Error('Expected Playwright baseURL.');
  const allowedOrigin = new URL(baseURL).origin;
  const external: string[] = [];
  page.on('request', (request) => {
    if (new URL(request.url()).origin !== allowedOrigin) external.push(request.url());
  });
  const assetResponses: string[] = [];
  page.on('response', (response) => {
    if (response.url().includes('/assets/browser/') && response.ok())
      assetResponses.push(response.url());
  });

  await registerAndDeploy(page);
  const browserOpener = page.getByRole('button', { name: 'Browser' });
  await browserOpener.click();
  await expect(page.getByRole('button', { name: 'Close Browser' })).toBeFocused();
  await expect(page.getByRole('heading', { name: 'Welcome to OpSlyce HQ' })).toBeVisible();
  const homeRoute = page.getByRole('textbox', { name: 'Route' });
  await expect(homeRoute).toHaveValue('');
  await expect(homeRoute).toHaveAttribute('placeholder', '/');
  await expect(page.getByText('OBJ-001')).toBeVisible();
  await expect(page.getByLabel('Byte assistant')).toBeVisible();
  await page.getByRole('button', { name: /About OpSlyce/u }).click();
  await expect(page.getByRole('heading', { name: 'About OpSlyce' })).toBeVisible();
  await page.getByRole('button', { name: 'Home' }).click();
  await page.getByRole('button', { name: /HQ Bulletins/u }).click();
  await expect(page.getByRole('heading', { name: 'HQ Bulletins' })).toBeVisible();
  await page.getByRole('button', { name: 'Home' }).click();
  await page.getByRole('button', { name: /Systems Desk/u }).click();
  await page.getByRole('button', { name: 'Route Index' }).click();
  await expect(page.getByText('WEB INDEX RECONCILIATION')).toBeVisible();
  await page.getByRole('button', { name: 'Close Browser' }).click();
  await expect(browserOpener).toBeFocused();
  await page.getByRole('tab', { name: 'Evidence' }).click();
  await expect(page.getByText('No evidence has been confirmed.')).toBeVisible();

  await browserOpener.click();
  await expect(page.getByRole('heading', { name: 'Route Index' })).toBeVisible();
  const route = page.getByRole('textbox', { name: 'Route' });
  await expect(route).toHaveValue('/systems/route-index');
  await route.fill('/recruit-verification');
  await page.getByRole('button', { name: 'Open Route' }).click();
  await expect(page.getByRole('heading', { name: 'ROUTE NOT FOUND' })).toBeVisible();
  await route.fill('https://example.com/about');
  await page.getByRole('button', { name: 'Open Route' }).click();
  await expect(page.getByRole('heading', { name: 'ROUTE NOT AVAILABLE' })).toBeVisible();
  await expect(route).toHaveValue('https://example.com/about');

  const geometry = await page.locator('[data-field-browser]').evaluate((browser) => ({
    browserFits: browser.scrollWidth <= browser.clientWidth,
    workspaceFits:
      document.querySelector('[data-mission-workspace]')?.scrollHeight ===
      document.querySelector('[data-mission-workspace]')?.clientHeight,
    toolbarVisible: browser.querySelector('form')?.getBoundingClientRect().bottom ?? 0,
    viewportTop:
      browser.querySelector('[data-browser-viewport]')?.getBoundingClientRect().top ??
      Number.MAX_VALUE,
    focusedWidth: browser.getBoundingClientRect().width,
    coveredWidth:
      document.querySelector('[data-browser-covered]')?.getBoundingClientRect().width ?? 0,
    focusedTop: browser.getBoundingClientRect().top,
    focusedBottom: browser.getBoundingClientRect().bottom,
    coveredTop: document.querySelector('[data-browser-covered]')?.getBoundingClientRect().top ?? 0,
    coveredBottom:
      document.querySelector('[data-browser-covered]')?.getBoundingClientRect().bottom ?? 0
  }));
  expect(geometry.browserFits).toBe(true);
  expect(geometry.workspaceFits).toBe(true);
  expect(geometry.toolbarVisible).toBeLessThanOrEqual(geometry.viewportTop + 1);
  expect(geometry.focusedWidth).toBeGreaterThanOrEqual(geometry.coveredWidth);
  expect(geometry.focusedTop).toBeLessThan(geometry.coveredTop);
  expect(geometry.focusedBottom).toBeGreaterThanOrEqual(geometry.coveredBottom);
  expect(external).toEqual([]);
  expect(assetResponses.some((url) => url.endsWith('/hq-intranet-hero.png'))).toBe(true);
  expect(assetResponses.some((url) => url.endsWith('/hq-global-operations-map.png'))).toBe(true);
  expect(assetResponses.some((url) => url.endsWith('/hq-systems-wall.png'))).toBe(true);
});

test('recovers, opens and prepares the verification flag without submitting it', async ({
  page
}, testInfo) => {
  test.skip(!supported(testInfo.project.name), 'Browser controls are behind the viewport gate.');
  await registerAndDeploy(page);
  await page.getByRole('textbox', { name: 'Command' }).fill('cat training/trace-note.txt');
  await page.getByRole('button', { name: 'Run' }).click();
  await expect(page.getByText('OBJ-003')).toBeVisible();
  await page.getByRole('tab', { name: 'Evidence' }).click();
  await page.getByRole('button', { name: 'Copy verification route' }).click();
  await expect(page.locator('[data-evidence-id="EV-002"] [role="status"]')).toContainText(
    /Copied|Copy unavailable\. Select the route and copy it manually\./u
  );
  await expect(page.getByRole('tab', { name: 'Evidence' })).toHaveAttribute(
    'aria-selected',
    'true'
  );
  await page.getByRole('button', { name: 'Browser' }).click();
  const route = page.getByRole('textbox', { name: 'Route' });
  await expect(route).toHaveValue('');
  await expect(route).toHaveAttribute('placeholder', '/');
  await page.context().grantPermissions(['clipboard-read', 'clipboard-write']);
  await page.evaluate(() => navigator.clipboard.writeText('/recruit-verification'));
  await route.focus();
  await page.keyboard.press('Control+V');
  await expect(route).toHaveValue('/recruit-verification');
  await expect(page.getByText('FLAG{WELCOME_TO_HQ}')).toHaveCount(0);
  await page.getByRole('button', { name: 'Open Route' }).click();
  await expect(
    page.getByRole('dialog', { name: 'Field Browser' }).getByText('FLAG{WELCOME_TO_HQ}')
  ).toBeVisible();
  await expect(page.getByText('OBJ-004')).toBeVisible();
  await page.getByRole('button', { name: 'Close Browser' }).click();
  await page.getByRole('tab', { name: 'Evidence' }).click();
  await expect(page.getByRole('heading', { name: 'VERIFICATION FLAG' })).toBeVisible();
  await page.getByRole('button', { name: 'Prepare for Mission Control' }).click();
  await expect(page.getByRole('textbox', { name: 'Verification flag' })).toHaveValue(
    'FLAG{WELCOME_TO_HQ}'
  );
  await expect(page.getByRole('button', { name: 'Submit' })).toBeEnabled();
  await expect(page.getByText('The recovered flag is ready for verification.')).toBeVisible();

  await page.reload();
  await page.getByRole('button', { name: 'Continue Operation' }).click();
  await page.getByRole('button', { name: 'Continue Operation' }).click();
  await expect(page.getByText('OBJ-004')).toBeVisible();
  await expect(page.getByRole('dialog', { name: 'Field Browser' })).toHaveCount(0);
  await page.getByRole('button', { name: 'Browser' }).click();
  await expect(
    page.getByRole('dialog', { name: 'Field Browser' }).getByText('FLAG{WELCOME_TO_HQ}')
  ).toBeVisible();
  await page.getByRole('button', { name: 'Back' }).click();
  await expect(page.getByRole('heading', { name: 'Welcome to OpSlyce HQ' })).toBeVisible();

  if (testInfo.project.name === 'chromium-tablet-landscape') {
    const restoredRoute = page.getByRole('textbox', { name: 'Route' });
    await restoredRoute.fill('/about');
    await restoredRoute.focus();
    await page.setViewportSize({ width: 1024, height: 420 });
    await expect(restoredRoute).toBeInViewport();
    await expect(page.getByRole('button', { name: 'Close Browser' })).toBeInViewport();
    await expect(page.getByRole('button', { name: 'Back' })).toBeInViewport();
    await expect(page.getByRole('button', { name: 'Home' })).toBeInViewport();
    await expect(page.getByRole('button', { name: 'Open Route' })).toBeInViewport();
    await expect(page.locator('[data-mission-workspace]')).toBeVisible();
    await page.setViewportSize({ width: 1024, height: 700 });
    await expect(page.locator('[data-field-browser]')).toBeVisible();
  }
});
