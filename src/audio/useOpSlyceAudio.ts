import { useEffect, useRef } from 'react';
import type { GameEngineState } from '../engine/gameEngine';
import { createAudioController, type AudioController } from './audioController';
import {
  createAudioSnapshot,
  selectTransitionCue,
  shouldUseHqAmbience,
  type AudioSnapshot
} from './audioPolicy';

export function useOpSlyceAudio(state: GameEngineState, settingsOpen: boolean) {
  const controllerRef = useRef<AudioController | null>(null);
  const previousSnapshot = useRef<AudioSnapshot>(createAudioSnapshot(state));

  useEffect(() => {
    const controller = createAudioController();
    controllerRef.current = controller;
    const unlock = () => controller.unlock();
    window.addEventListener('pointerdown', unlock, { capture: true });
    window.addEventListener('keydown', unlock, { capture: true });

    return () => {
      window.removeEventListener('pointerdown', unlock, { capture: true });
      window.removeEventListener('keydown', unlock, { capture: true });
      if (controllerRef.current === controller) controllerRef.current = null;
      controller.dispose();
    };
  }, []);

  useEffect(() => {
    const playMarkedControl = (target: EventTarget | null) => {
      if (!(target instanceof Element)) return;
      const control = target.closest<HTMLElement>('[data-audio-ui]');
      if (control === null) return;
      if (control instanceof HTMLButtonElement && control.disabled) return;
      if (control.getAttribute('aria-disabled') === 'true') return;

      const audioUi = control.dataset['audioUi'];
      const cue =
        audioUi === 'byte' ? 'byte-ping' : audioUi === 'deploy' ? 'deploy-operation' : 'ui-confirm';
      controllerRef.current?.playCue(cue);
    };
    const onPointerDown = (event: PointerEvent) => playMarkedControl(event.target);
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Enter' || event.key === ' ') playMarkedControl(event.target);
    };

    document.addEventListener('pointerdown', onPointerDown, { capture: true });
    document.addEventListener('keydown', onKeyDown, { capture: true });
    return () => {
      document.removeEventListener('pointerdown', onPointerDown, { capture: true });
      document.removeEventListener('keydown', onKeyDown, { capture: true });
    };
  }, []);

  useEffect(() => {
    controllerRef.current?.setPreferences({
      soundEffects: state.settings.soundEffects,
      hqAmbience: state.settings.hqAmbience
    });
  }, [state.settings.hqAmbience, state.settings.soundEffects]);

  useEffect(() => {
    const ambienceRequested = shouldUseHqAmbience(
      state.screen,
      settingsOpen,
      state.profile?.progression ?? null
    );
    const syncVisibility = () => {
      controllerRef.current?.setAmbienceActive(
        ambienceRequested && document.visibilityState !== 'hidden',
        state.screen === 'mission-workspace' ? 0.55 : 1
      );
    };

    syncVisibility();
    document.addEventListener('visibilitychange', syncVisibility);
    return () => document.removeEventListener('visibilitychange', syncVisibility);
  }, [settingsOpen, state.profile?.progression, state.screen]);

  useEffect(() => {
    const currentSnapshot = createAudioSnapshot(state);
    const cue = selectTransitionCue(previousSnapshot.current, currentSnapshot);
    previousSnapshot.current = currentSnapshot;
    if (cue !== null) controllerRef.current?.playCue(cue);
  }, [state]);
}
