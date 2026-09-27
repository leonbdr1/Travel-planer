import { Link } from 'react-router';
import { buttonClasses, Heading, Text } from '@reiseplaner/ui';
import { de } from '../i18n/de';

export function NotFound() {
  return (
    <div className="mx-auto max-w-2xl space-y-4 px-4 py-20 text-center sm:px-6">
      <Heading level={1}>{de.notFound.title}</Heading>
      <Text>{de.notFound.text}</Text>
      <Link to="/" className={buttonClasses('secondary')}>
        {de.notFound.home}
      </Link>
    </div>
  );
}
