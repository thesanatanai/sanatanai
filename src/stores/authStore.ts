import { create } from "zustand";

interface AuthState {
  /**
   * The API access token. It lives only here, in the page's memory: never in
   * localStorage, sessionStorage or a cookie the page can read. The server hands it
   * over when it renders the page, and a renewal replaces it. A reload starts again from the server.
   */
  accessToken: string | null;
  setAccessToken: (token: string | null) => void;
}

export const useAuthStore = create<AuthState>()((set) => ({
  accessToken: null,
  setAccessToken: (accessToken) => set({ accessToken }),
}));

/** The current access token, for code outside React. */
export const getAccessToken = () => useAuthStore.getState().accessToken;
