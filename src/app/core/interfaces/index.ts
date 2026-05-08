export interface User {
  id: string;
  email: string;
  name: string;
}

export interface Session {
  user: User;
  token: string;
}

export interface SessionState {
  user: User | null;
  token: string | null;
  isLoading: boolean;
}
