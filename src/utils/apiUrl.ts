const trim = (url: string) => url.replace(/\/+$/, "");

/** The API's origin as browsers reach it. Set `NEXT_PUBLIC_API_URL` for every deployment. */
export const API_URL = trim(process.env.NEXT_PUBLIC_API_URL || "http://localhost:8080");

/**
 * The API's origin as this site's own server reaches it. Defaults to {@link API_URL};
 * set `API_INTERNAL_URL` when the server has a closer address (a private network, a container name).
 */
export const serverApiUrl = () => trim(process.env.API_INTERNAL_URL || API_URL);
