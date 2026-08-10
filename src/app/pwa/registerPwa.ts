import { registerSW } from 'virtual:pwa-register';

export const PWA_UPDATE_READY_EVENT = 'opslyce:pwa-update-ready';

export function registerPwa(): void {
  registerSW({
    immediate: true,
    onNeedRefresh() {
      window.dispatchEvent(new CustomEvent(PWA_UPDATE_READY_EVENT));
    }
  });
}
