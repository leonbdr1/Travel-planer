// Aufgabe F16: from 30 hours by car a destination is marked with a plane.
// Only a hint – flights are not sold; the accommodation search works as usual.
import { PaperAirplaneIcon } from '@heroicons/react/20/solid';
import { isFlightDistance } from '@reiseplaner/domain';
import { de } from '../../i18n/de';

export function FlightBadge({ minutes }: { minutes: number | null }) {
  if (minutes === null || !isFlightDistance(minutes)) return null;
  return (
    <span
      className="inline-flex items-center gap-1 whitespace-nowrap rounded-full bg-sky-50 px-2 py-0.5 text-xs font-medium text-sky-800 ring-1 ring-sky-200"
      title={de.wizard.places.flightTitle}
      data-testid="flight-badge"
    >
      <PaperAirplaneIcon aria-hidden="true" className="size-3.5" />
      {de.wizard.places.flight}
    </span>
  );
}
