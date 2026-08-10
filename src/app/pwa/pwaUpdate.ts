export const PWA_UPDATE_READY_EVENT = 'opslyce:pwa-update-ready';

type PwaUpdater = () => Promise<void>;

let updater: PwaUpdater | null = null;
let updateReady = false;

export function configurePwaUpdater(nextUpdater: PwaUpdater): void {
  updater = nextUpdater;
}

export function announcePwaUpdateReady(): void {
  updateReady = true;
  window.dispatchEvent(new Event(PWA_UPDATE_READY_EVENT));
}

export function isPwaUpdateReady(): boolean {
  return updateReady;
}

export function dismissPwaUpdateReady(): void {
  updateReady = false;
}

export async function applyPwaUpdate(): Promise<void> {
  if (updater === null) return;
  await updater();
}
