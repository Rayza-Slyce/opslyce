import { useContext } from 'react';
import { GameEngineContext, type GameEngineContextValue } from './gameEngineContext';

export function useGameEngine(): GameEngineContextValue {
  const context = useContext(GameEngineContext);

  if (context === null) {
    throw new Error('useGameEngine must be used inside GameEngineProvider.');
  }

  return context;
}
