import { useEffect, useRef, useState } from 'react';

export const getDefaultWorkspaceForState = (appState) =>
  appState.gameConfig.setupLocked ? 'board' : 'setup';

export function useWorkspaceNavigation(appState, gameId) {
  const [workspace, setWorkspace] = useState(getDefaultWorkspaceForState(appState));
  const lastGameIdRef = useRef('');

  useEffect(() => {
    if (!gameId) return;
    if (lastGameIdRef.current === gameId) return;
    lastGameIdRef.current = gameId;
    setWorkspace(getDefaultWorkspaceForState(appState));
  }, [appState, gameId]);

  return {
    workspace,
    setWorkspace,
  };
}
