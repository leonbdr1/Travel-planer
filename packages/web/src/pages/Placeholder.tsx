import { Alert, Heading } from '@reiseplaner/ui';
import { de } from '../i18n/de';

/** Temporary page for routes whose slice is not built yet. */
export function Placeholder({ title }: { title: string }) {
  return (
    <div className="mx-auto max-w-3xl space-y-6 px-4 py-12 sm:px-6">
      <Heading level={1}>{title}</Heading>
      <Alert tone="info">{de.common.placeholderNotice}</Alert>
    </div>
  );
}
