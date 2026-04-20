import type Keycloak from 'keycloak-js';

interface LoginButtonProps {
  keycloak: Keycloak;
  disabled?: boolean;
}

export function LoginButton({ keycloak, disabled }: LoginButtonProps) {
  return (
    <button
      className="login-btn"
      onClick={() => keycloak.login()}
      disabled={disabled}
    >
      로그인
    </button>
  );
}
