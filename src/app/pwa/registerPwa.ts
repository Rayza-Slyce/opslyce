import { registerSW } from 'virtual:pwa-register';
import { announcePwaUpdateReady, configurePwaUpdater } from './pwaUpdate';

export function registerPwa(): void {
  const updateSW = registerSW({
    immediate: true,
    onNeedRefresh() {
      announcePwaUpdateReady();
    }
  });

  configurePwaUpdater(() => updateSW(true));
}
