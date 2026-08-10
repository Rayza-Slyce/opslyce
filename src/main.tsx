import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { App } from './app/App';
import { GameEngineProvider } from './app/GameEngineProvider';
import { registerPwa } from './app/pwa/registerPwa';
import './app/global.css';

const rootElement = document.querySelector<HTMLElement>('#root');

if (rootElement === null) {
  throw new Error('OpSlyce root element was not found.');
}

createRoot(rootElement).render(
  <StrictMode>
    <GameEngineProvider>
      <App />
    </GameEngineProvider>
  </StrictMode>
);

registerPwa();
