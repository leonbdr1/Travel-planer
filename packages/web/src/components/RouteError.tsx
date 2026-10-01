// Error page of the router (B6): instead of React Router's English default
// with a stack trace, a short German message with "reload" and the way home.
// After a deployment an old tab may ask for page code that no longer exists;
// a reload fetches the new version.
import { isRouteErrorResponse, Link, useRouteError } from 'react-router';
import { Button, buttonClasses, Heading, Text } from '@reiseplaner/ui';
import { de } from '../i18n/de';
import { NotFound } from '../pages/NotFound';

const STALE_CODE = /dynamically imported module|importing a module script failed|failed to fetch dynamically|loading chunk/i;

export function RouteError() {
  const error = useRouteError();
  if (isRouteErrorResponse(error) && error.status === 404) return <NotFound />;
  const stale = error instanceof Error && STALE_CODE.test(error.message);
  const t = de.routeError;
  return (
    <div className="mx-auto max-w-2xl space-y-4 px-4 py-20 text-center sm:px-6" data-testid="route-error">
      <Heading level={1}>{stale ? t.staleTitle : t.title}</Heading>
      <Text>{t.text}</Text>
      <div className="flex flex-wrap justify-center gap-3">
        <Button onClick={() => window.location.reload()}>{t.reload}</Button>
        <Link to="/" className={buttonClasses('secondary')}>
          {de.notFound.home}
        </Link>
      </div>
    </div>
  );
}
