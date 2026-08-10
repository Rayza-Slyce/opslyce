import { render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { useState } from 'react';
import type { PreparedBrowserRoute } from '../../profile/localProfile';
import {
  createInitialBrowserState,
  getCurrentBrowserEntry,
  goBrowserBack,
  goBrowserHome,
  navigateBrowser,
  type BrowserState
} from '../../simulations/browser/browserState';
import { FieldBrowser } from './FieldBrowser';

function BrowserHarness({ recovered = false }: Readonly<{ recovered?: boolean }>) {
  const [browser, setBrowser] = useState<BrowserState>(createInitialBrowserState());
  return (
    <FieldBrowser
      browser={browser}
      preparedRoute={null}
      closeButtonRef={null}
      onClose={() => undefined}
      onOpenRoute={(input) => setBrowser((state) => navigateBrowser(state, input, recovered).state)}
      onHome={() => setBrowser((state) => goBrowserHome(state, recovered).state)}
      onBack={() => setBrowser(goBrowserBack)}
      onClearPreparedRoute={() => undefined}
    />
  );
}

const bytePreparedRoute: PreparedBrowserRoute = {
  value: '/recruit-verification',
  source: 'byte-assist',
  revision: 1
};

describe('FieldBrowser', () => {
  it('renders exact HQ home content and uses simulated internal navigation', async () => {
    const user = userEvent.setup();
    render(<BrowserHarness />);
    expect(screen.getByRole('heading', { name: 'Welcome to OpSlyce HQ' })).toBeVisible();
    expect(screen.getByText('All primary systems operational.')).toBeVisible();
    expect(screen.queryByText('/recruit-verification')).not.toBeInTheDocument();
    expect(screen.getByAltText('A calm interior view of OpSlyce HQ.')).toHaveAttribute(
      'src',
      '/assets/browser/hq-intranet-hero.png'
    );

    const viewport = document.querySelector<HTMLElement>('[data-browser-viewport]');
    expect(viewport).not.toBeNull();
    if (viewport) {
      viewport.scrollTop = 120;
    }
    await user.click(screen.getByRole('button', { name: /About OpSlyce/u }));
    await waitFor(() => expect(viewport).toHaveProperty('scrollTop', 0));
    expect(screen.getByRole('heading', { name: 'About OpSlyce' })).toBeVisible();
    expect(
      screen.getByAltText('A global operations map showing connected OpSlyce locations.')
    ).toHaveAttribute('src', '/assets/browser/hq-global-operations-map.png');
    await user.click(screen.getByRole('button', { name: 'Home' }));
    await user.click(screen.getByRole('button', { name: /Systems Desk/u }));
    expect(
      screen.getByAltText('A glass systems wall displaying a network workflow.')
    ).toHaveAttribute('src', '/assets/browser/hq-systems-wall.png');
    await user.click(screen.getByRole('button', { name: 'Route Index' }));
    expect(screen.getByText('WEB INDEX RECONCILIATION')).toBeVisible();
    expect(screen.getByText('Unlisted routes found')).toBeVisible();
  }, 10_000);

  it('supports editable address navigation, errors, Back, Home and history', async () => {
    const user = userEvent.setup();
    render(<BrowserHarness />);
    const address = screen.getByRole('textbox', { name: 'Route' });
    expect(address).toHaveValue('');
    expect(address).toHaveAttribute('placeholder', '/');
    await user.type(address, '/bulletins');
    await user.click(screen.getByRole('button', { name: 'Open Route' }));
    expect(screen.getByRole('heading', { name: 'HQ Bulletins' })).toBeVisible();
    await user.clear(address);
    await user.type(address, 'https://example.com');
    await user.click(screen.getByRole('button', { name: 'Open Route' }));
    expect(screen.getByRole('heading', { name: 'ROUTE NOT AVAILABLE' })).toBeVisible();
    expect(address).toHaveValue('https://example.com');
    await user.click(screen.getByRole('button', { name: 'Back' }));
    expect(screen.getByRole('heading', { name: 'HQ Bulletins' })).toBeVisible();
    await user.click(screen.getByRole('button', { name: 'Home' }));
    expect(screen.getByRole('heading', { name: 'Welcome to OpSlyce HQ' })).toBeVisible();
    expect(address).toHaveValue('');
    expect(address).toHaveAttribute('placeholder', '/');
    await user.click(screen.getByText('History'));
    expect(within(screen.getByRole('list')).getAllByRole('listitem')).toHaveLength(3);
  });

  it('keeps the mission route unknown before discovery and opens exact flag content after it', async () => {
    const user = userEvent.setup();
    const { rerender } = render(<BrowserHarness />);
    const address = screen.getByRole('textbox', { name: 'Route' });
    await user.clear(address);
    await user.type(address, '/recruit-verification');
    await user.click(screen.getByRole('button', { name: 'Open Route' }));
    expect(screen.getByRole('heading', { name: 'ROUTE NOT FOUND' })).toBeVisible();

    rerender(<BrowserHarness recovered />);
    const recoveredAddress = screen.getByRole('textbox', { name: 'Route' });
    await user.clear(recoveredAddress);
    await user.type(recoveredAddress, '/recruit-verification');
    await user.click(screen.getByRole('button', { name: 'Open Route' }));
    expect(screen.getByRole('heading', { name: 'IDENTITY CONFIRMED' })).toBeVisible();
    expect(screen.getByText('FLAG{WELCOME_TO_HQ}')).toBeVisible();
  });

  it('starts from persisted Browser history rather than an Evidence-prepared route', () => {
    expect(getCurrentBrowserEntry(createInitialBrowserState())).toEqual({
      kind: 'page',
      route: '/'
    });
    render(<BrowserHarness recovered />);
    expect(screen.getByRole('textbox', { name: 'Route' })).toHaveValue('');
    expect(screen.getByRole('textbox', { name: 'Route' })).toHaveAttribute('placeholder', '/');
    expect(screen.queryByText('FLAG{WELCOME_TO_HQ}')).not.toBeInTheDocument();
  });

  it('keeps home internal while making route entry paste-ready and selecting non-root values', async () => {
    const user = userEvent.setup();
    render(<BrowserHarness />);
    const address = screen.getByRole('textbox', { name: 'Route' });

    await user.click(address);
    await user.paste('/recruit-verification');
    expect(address).toHaveValue('/recruit-verification');

    await user.clear(address);
    await user.type(address, '/about');
    await user.click(screen.getByRole('button', { name: 'Open Route' }));
    expect(address).toHaveValue('/about');
    expect(address).not.toHaveAttribute('placeholder');

    await user.click(address);
    const routeInput = address as HTMLInputElement;
    expect(routeInput.selectionStart).toBe(0);
    expect(routeInput.selectionEnd).toBe('/about'.length);
  });

  it('clears a Byte-prepared route when Home is selected on Home', async () => {
    const user = userEvent.setup();
    const { unmount } = render(
      <FieldBrowser
        browser={createInitialBrowserState()}
        preparedRoute={bytePreparedRoute}
        closeButtonRef={null}
        onClose={() => undefined}
        onOpenRoute={() => undefined}
        onHome={() => undefined}
        onBack={() => undefined}
        onClearPreparedRoute={() => undefined}
      />
    );
    const address = screen.getByRole('textbox', { name: 'Route' });
    expect(address).toHaveValue('/recruit-verification');

    await user.click(screen.getByRole('button', { name: 'Home' }));
    expect(address).toHaveValue('');
    expect(address).toHaveAttribute('placeholder', '/');

    unmount();
    render(
      <FieldBrowser
        browser={createInitialBrowserState()}
        preparedRoute={null}
        closeButtonRef={null}
        onClose={() => undefined}
        onOpenRoute={() => undefined}
        onHome={() => undefined}
        onBack={() => undefined}
        onClearPreparedRoute={() => undefined}
      />
    );
    expect(screen.getByRole('textbox', { name: 'Route' })).toHaveValue('');
  });

  it('shows the actual Back destination after Byte preparation is cleared', async () => {
    const user = userEvent.setup();
    let browser = createInitialBrowserState();
    browser = navigateBrowser(browser, '/about', false).state;
    browser = navigateBrowser(browser, '/systems', false).state;
    const backDestination = goBrowserBack(browser);
    const { rerender } = render(
      <FieldBrowser
        browser={browser}
        preparedRoute={bytePreparedRoute}
        closeButtonRef={null}
        onClose={() => undefined}
        onOpenRoute={() => undefined}
        onHome={() => undefined}
        onBack={() =>
          rerender(
            <FieldBrowser
              browser={backDestination}
              preparedRoute={null}
              closeButtonRef={null}
              onClose={() => undefined}
              onOpenRoute={() => undefined}
              onHome={() => undefined}
              onBack={() => undefined}
              onClearPreparedRoute={() => undefined}
            />
          )
        }
        onClearPreparedRoute={() => undefined}
      />
    );
    expect(screen.getByRole('textbox', { name: 'Route' })).toHaveValue('/recruit-verification');

    await user.click(screen.getByRole('button', { name: 'Back' }));
    expect(screen.getByRole('heading', { name: 'About OpSlyce' })).toBeVisible();
    expect(screen.getByRole('textbox', { name: 'Route' })).toHaveValue('/about');
  });
});
