export interface UserSession
 {
  id: string;
  email: string;
  name: string;
}

export interface Session {
  user: UserSession;
  token: string;
}

export interface SessionState {
  user: UserSession | null;
  token: string | null;
  isLoading: boolean;
}
