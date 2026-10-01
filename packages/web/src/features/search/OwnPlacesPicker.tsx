// Manual place choice with several places at once (Aufgabe 3): type a name
// or postal code, pick it, repeat. Picked places show as removable chips and
// are searched in addition to (or instead of) the suggested places.
import { useCallback, useState } from "react";
import { XMarkIcon } from "@heroicons/react/16/solid";
import { MapPinIcon } from "@heroicons/react/20/solid";
import type { LocalityDto, PlaceDto } from "@reiseplaner/contracts";
import { ErrorMessage } from "@reiseplaner/ui";
import { ApiRequestError } from "../../api/client";
import { de } from "../../i18n/de";
import { AsyncCombobox } from "./AsyncCombobox";
import { resolvePlace, searchPlaces } from "./api";
import { FlightBadge } from "./FlightBadge";
import { formatMinutes } from "./labels";
import { Cell } from "./SearchBar";

const t = de.wizard.ownPlaces;

type Hit =
  | { kind: "place"; place: PlaceDto }
  | { kind: "locality"; locality: LocalityDto };

export function OwnPlacesPicker({
  places,
  origin,
  max,
  onChange,
}: {
  places: PlaceDto[];
  origin: number | null;
  max: number;
  onChange: (places: PlaceDto[], origin: number | null) => void;
}) {
  const [error, setError] = useState<string | null>(null);
  const load = useCallback(
    async (q: string, signal: AbortSignal): Promise<Hit[]> => {
      const res = await searchPlaces(q, origin, signal);
      return [
        ...res.catalog.map((place) => ({ kind: "place" as const, place })),
        ...res.localities.map((locality) => ({
          kind: "locality" as const,
          locality,
        })),
      ];
    },
    [origin],
  );

  async function add(hit: Hit | null) {
    if (!hit) return;
    setError(null);
    if (places.length >= max) {
      setError(t.full(max));
      return;
    }
    try {
      const geonameid =
        hit.kind === "place" ? hit.place.geonameid : hit.locality.geonameid;
      // Resolving by GeoNames id brings the drive time from the start location.
      const place =
        geonameid !== null
          ? (await resolvePlace(geonameid, origin)).place
          : hit.kind === "place"
            ? hit.place
            : null;
      if (!place || places.some((p) => p.id === place.id)) return;
      onChange([...places, place], origin);
    } catch (err) {
      setError(
        err instanceof ApiRequestError ? err.message : de.status.apiUnreachable,
      );
    }
  }

  const full = places.length >= max;
  return (
    <div className="space-y-3" data-testid="own-places">
      <Cell
        label={t.destination}
        htmlFor="own-places-input"
        icon={<MapPinIcon aria-hidden="true" className="size-5" />}
      >
        <div className="[&_input]:bg-transparent [&_input]:p-0 [&_input]:font-semibold [&_input]:shadow-none [&_input]:ring-0 [&_input]:focus:ring-0 [&_input]:sm:text-sm/6">
          <AsyncCombobox<Hit>
            id="own-places-input"
            testId="own-places-input"
            value={null}
            clearOnSelect
            onChange={(hit) => void add(hit)}
            load={load}
            itemKey={(h) =>
              h.kind === "place"
                ? `p-${h.place.id}`
                : `l-${h.locality.geonameid}`
            }
            itemLabel={(h) =>
              h.kind === "place" ? h.place.name : h.locality.label
            }
            renderItem={(h) =>
              h.kind === "place" ? (
                <span>
                  {h.place.name}{" "}
                  <span className="text-zinc-500">
                    · {h.place.region_name ?? ""}
                  </span>
                </span>
              ) : (
                <span>{h.locality.label}</span>
              )
            }
            placeholder={full ? t.full(max) : t.placeholder}
            emptyText={de.wizard.frame.originNoResults}
          />
        </div>
      </Cell>
      {places.length > 0 ? (
        <ul className="flex flex-wrap gap-2" aria-label={t.chosen}>
          {places.map((p) => (
            <li key={p.id} data-testid="own-place-chip">
              <span className="inline-flex items-center gap-1.5 rounded-full bg-brand-50 py-1 pr-1 pl-3 text-sm font-medium text-brand-900 ring-1 ring-brand-200">
                {p.name}
                {p.minutes !== null ? (
                  <span className="font-normal whitespace-nowrap text-brand-700">
                    · {formatMinutes(p.minutes)}
                  </span>
                ) : null}
                <FlightBadge minutes={p.minutes} />
                <button
                  type="button"
                  aria-label={t.remove(p.name)}
                  onClick={() =>
                    onChange(
                      places.filter((x) => x.id !== p.id),
                      origin,
                    )
                  }
                  className="rounded-full p-1 text-brand-700 hover:bg-brand-100"
                >
                  <XMarkIcon aria-hidden="true" className="size-3.5" />
                </button>
              </span>
            </li>
          ))}
        </ul>
      ) : null}
      {error ? <ErrorMessage>{error}</ErrorMessage> : null}
    </div>
  );
}
