import {
  useEffect,
  useRef,
  useState,
  type KeyboardEvent,
  type Ref,
  type FocusEvent,
  type SyntheticEvent
} from 'react';
import { OPS001_CONTENT } from '../../missions/ops001/content';
import {
  formatBrowserHistoryEntry,
  getBrowserAddress,
  getCurrentBrowserEntry,
  type BrowserHistoryEntry,
  type BrowserState
} from '../../simulations/browser/browserState';
import { BROWSER_ADDRESS_LIMIT, type BrowserRoute } from '../../simulations/browser/routeContract';
import type { PreparedBrowserRoute } from '../../profile/localProfile';
import styles from './FieldBrowser.module.css';

type Props = Readonly<{
  browser: BrowserState;
  preparedRoute: PreparedBrowserRoute | null;
  closeButtonRef: Ref<HTMLButtonElement>;
  onClose(): void;
  onOpenRoute(input: string): void;
  onHome(): void;
  onBack(): void;
  onClearPreparedRoute(): void;
}>;

export function FieldBrowser({
  browser,
  preparedRoute,
  closeButtonRef,
  onClose,
  onOpenRoute,
  onHome,
  onBack,
  onClearPreparedRoute
}: Props) {
  const currentEntry = getCurrentBrowserEntry(browser);
  const [address, setAddress] = useState(
    () => preparedRoute?.value ?? getRouteFieldValue(currentEntry)
  );
  const [observedEntry, setObservedEntry] = useState(currentEntry);
  const [observedPreparation, setObservedPreparation] = useState(preparedRoute);
  const viewportRef = useRef<HTMLDivElement>(null);

  if (currentEntry !== observedEntry) {
    setObservedEntry(currentEntry);
    setAddress(getRouteFieldValue(currentEntry));
  }
  if (preparedRoute !== observedPreparation) {
    setObservedPreparation(preparedRoute);
    if (preparedRoute !== null) setAddress(preparedRoute.value);
  }

  useEffect(() => {
    if (viewportRef.current) {
      viewportRef.current.scrollTop = 0;
    }
  }, [browser.historyIndex]);

  function submit(event: SyntheticEvent<HTMLFormElement>) {
    event.preventDefault();
    onOpenRoute(address);
  }

  function navigate(route: BrowserRoute) {
    onOpenRoute(route);
  }

  function goHome() {
    setAddress('');
    onHome();
  }

  function selectExistingAddress(event: FocusEvent<HTMLInputElement>) {
    if (event.currentTarget.value !== '') event.currentTarget.select();
  }

  function handleKeyDown(event: KeyboardEvent<HTMLElement>) {
    if (event.key === 'Escape') {
      event.preventDefault();
      onClose();
      return;
    }
    if (event.key !== 'Tab') return;
    const controls = Array.from(
      event.currentTarget.querySelectorAll<HTMLElement>(
        'button:not(:disabled), input:not(:disabled), summary, [tabindex]:not([tabindex="-1"])'
      )
    );
    if (controls.length === 0) return;
    const activeIndex = controls.indexOf(document.activeElement as HTMLElement);
    if (event.shiftKey && activeIndex <= 0) {
      event.preventDefault();
      controls.at(-1)?.focus();
    } else if (!event.shiftKey && activeIndex === controls.length - 1) {
      event.preventDefault();
      controls[0]?.focus();
    }
  }

  const copy = OPS001_CONTENT.workspace.browser;
  return (
    <section
      role="dialog"
      aria-modal="true"
      aria-label="Field Browser"
      className={styles['browser']}
      data-field-browser
      onKeyDown={handleKeyDown}
    >
      <form className={styles['toolbar']} onSubmit={submit} aria-label="Field Browser controls">
        <button type="button" onClick={onBack} disabled={browser.historyIndex === 0}>
          {copy.back}
        </button>
        <button type="button" onClick={goHome}>
          {copy.home}
        </button>
        <label htmlFor="browser-route">{copy.addressLabel}</label>
        <input
          id="browser-route"
          value={address}
          placeholder={currentEntry.kind === 'page' && currentEntry.route === '/' ? '/' : undefined}
          maxLength={BROWSER_ADDRESS_LIMIT}
          autoCapitalize="none"
          autoCorrect="off"
          spellCheck={false}
          onFocus={selectExistingAddress}
          onChange={(event) => {
            setAddress(event.currentTarget.value);
            if (preparedRoute !== null) onClearPreparedRoute();
          }}
        />
        <button type="submit">{copy.openRoute}</button>
        <details className={styles['history']}>
          <summary>{copy.history}</summary>
          <ol>
            {browser.history.map((entry, index) => (
              <li key={`${String(index)}-${formatBrowserHistoryEntry(entry)}`}>
                {index === browser.historyIndex ? <strong>Current: </strong> : null}
                {formatBrowserHistoryEntry(entry)}
              </li>
            ))}
          </ol>
        </details>
        <button
          ref={closeButtonRef}
          className={styles['close']}
          type="button"
          aria-label="Close Browser"
          onClick={onClose}
        >
          ×
        </button>
      </form>
      <div ref={viewportRef} className={styles['viewport']} data-browser-viewport>
        <BrowserPage entry={currentEntry} onNavigate={navigate} />
      </div>
    </section>
  );
}

function getRouteFieldValue(entry: BrowserHistoryEntry): string {
  return entry.kind === 'page' && entry.route === '/' ? '' : getBrowserAddress(entry);
}

function BrowserPage({
  entry,
  onNavigate
}: Readonly<{ entry: BrowserHistoryEntry; onNavigate(route: BrowserRoute): void }>) {
  const content = OPS001_CONTENT.workspace.browser;
  if (entry.kind === 'error') {
    const error =
      entry.error === 'route-not-found' ? content.errors.unknown : content.errors.unavailable;
    return (
      <article className={styles['page']} data-browser-error={entry.error}>
        <h2>{error.heading}</h2>
        <p>{error.body}</p>
      </article>
    );
  }

  const page = content.pages[entry.route];
  switch (page.kind) {
    case 'home':
      return (
        <article className={styles['page']} data-browser-route={page.route}>
          <p className={styles['eyebrow']}>{page.eyebrow}</p>
          <h2>{page.heading}</h2>
          <p>{page.body}</p>
          <img src={page.image} alt={page.imageAlt} />
          <div className={styles['status']}>
            <strong>{page.statusLabel}</strong>
            <span>{page.status}</span>
          </div>
          <nav className={styles['cards']} aria-label="HQ intranet">
            {page.links.map((link) => (
              <button key={link.route} type="button" onClick={() => onNavigate(link.route)}>
                <strong>{link.label}</strong>
                <span>{link.description}</span>
              </button>
            ))}
          </nav>
        </article>
      );
    case 'about':
      return (
        <article className={styles['page']} data-browser-route={page.route}>
          <h2>{page.heading}</h2>
          <p>{page.opening}</p>
          <img src={page.image} alt={page.imageAlt} />
          <div className={styles['cards']}>
            {page.principles.map((principle) => (
              <section key={principle.heading}>
                <h3>{principle.heading}</h3>
                <p>{principle.body}</p>
              </section>
            ))}
          </div>
          <h3>What we protect</h3>
          <ul>
            {page.protectedItems.map((item) => (
              <li key={item}>{item}</li>
            ))}
          </ul>
        </article>
      );
    case 'bulletins':
      return (
        <article className={styles['page']} data-browser-route={page.route}>
          <h2>{page.heading}</h2>
          <div className={styles['articles']}>
            {page.bulletins.map((bulletin) => (
              <section key={bulletin.heading}>
                <span className={styles['statusLabel']}>{bulletin.status}</span>
                <h3>{bulletin.heading}</h3>
                <p>{bulletin.body}</p>
              </section>
            ))}
          </div>
        </article>
      );
    case 'systems':
      return (
        <article className={styles['page']} data-browser-route={page.route}>
          <h2>{page.heading}</h2>
          <p>{page.opening}</p>
          <img src={page.image} alt={page.imageAlt} />
          <dl className={styles['services']}>
            {page.services.map((service) => (
              <div key={service.label}>
                <dt>
                  {'route' in service ? (
                    <button type="button" onClick={() => onNavigate(service.route)}>
                      {service.label}
                    </button>
                  ) : (
                    service.label
                  )}
                </dt>
                <dd>{service.status}</dd>
              </div>
            ))}
          </dl>
        </article>
      );
    case 'report':
      return (
        <article className={styles['page']} data-browser-route={page.route}>
          <h2>{page.heading}</h2>
          <p className={styles['statusLabel']}>{page.status}</p>
          <h3>{page.reportHeading}</h3>
          <dl className={styles['metrics']}>
            {page.metrics.map((metric) => (
              <div key={metric.label}>
                <dt>{metric.label}</dt>
                <dd>{metric.value}</dd>
              </div>
            ))}
          </dl>
          <p>{page.report}</p>
          <p>
            <strong>Logged:</strong> {page.loggedLabel}
          </p>
        </article>
      );
    case 'verification':
      return (
        <article className={styles['page']} data-browser-route={page.route}>
          <p className={styles['eyebrow']}>{page.eyebrow}</p>
          <h2>{page.heading}</h2>
          <p>{page.welcome}</p>
          <section className={styles['flag']} aria-labelledby="verification-flag-label">
            <h3 id="verification-flag-label">{page.flagLabel}</h3>
            <p>{page.flag}</p>
          </section>
        </article>
      );
  }
}
