// Message for a page whose data could not be loaded: a 404 names what is
// missing, everything else (offline, timeout, server fault) says so.
import { de } from '../i18n/de';
import { ApiRequestError } from './client';

export function loadErrorText(err: unknown, notFound: string): string {
  if (err instanceof ApiRequestError && err.status === 404) return notFound;
  if (err instanceof ApiRequestError) return err.message;
  return de.status.apiUnreachable;
}
