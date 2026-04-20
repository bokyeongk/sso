import { useEffect, useRef, useState } from 'react';
import type Keycloak from 'keycloak-js';
import keycloak from '../lib/keycloak';

interface KeycloakState {
  keycloak: Keycloak;
  initialized: boolean;
  authenticated: boolean;
}

export function useKeycloak(): KeycloakState {
  const [initialized, setInitialized] = useState(false);
  const [authenticated, setAuthenticated] = useState(false);
  const initCalled = useRef(false);

  useEffect(() => {
    if (initCalled.current) return;
    initCalled.current = true;

    keycloak
      .init({ onLoad: 'login-required' })
      .then((auth) => {
        setAuthenticated(auth);
        setInitialized(true);
      })
      .catch(() => {
        setInitialized(true);
      });
  }, []);

  return { keycloak, initialized, authenticated };
}
