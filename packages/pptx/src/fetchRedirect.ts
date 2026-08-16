import { PaperError } from "./errors.js";

const MAX_REDIRECTS = 3;
const REDIRECT_STATUSES = new Set([301, 302, 303, 307, 308]);

/**
 * Follows HTTP redirects only after each resolved target passes URL validation.
 * The caller owns the fetch policy (retry, timeout, and other RequestInit fields).
 */
export async function fetchFollowingValidatedRedirects(
  initialUrl: string,
  fetchHop: (url: string) => Promise<Response>,
  validateRedirect: (url: string) => Promise<void>,
): Promise<Response> {
  let currentUrl = initialUrl;
  let redirectsFollowed = 0;

  while (true) {
    const response = await fetchHop(currentUrl);
    if (!REDIRECT_STATUSES.has(response.status)) return response;

    const location = response.headers.get("location");
    if (location === null) return response;

    if (redirectsFollowed >= MAX_REDIRECTS) {
      throw new PaperError(
        `Blocked URL: redirect limit of ${MAX_REDIRECTS} exceeded`,
        { code: "VALIDATION_FAILED", phase: "media" },
      );
    }

    let redirectUrl: string;
    try {
      redirectUrl = new URL(location, currentUrl).toString();
    } catch {
      throw new PaperError(
        `Invalid redirect URL: ${location}`,
        { code: "VALIDATION_FAILED", phase: "media" },
      );
    }

    await validateRedirect(redirectUrl);
    redirectsFollowed += 1;
    currentUrl = redirectUrl;
  }
}
