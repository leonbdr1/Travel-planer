-- 20261012a_location_facts_cache: location facts of a house from OpenStreetMap
-- (S11.5, architektur.md 6.15) are cached in app.cache_entries under the new
-- namespace 'location_facts' (key: sha256 of the hotel ID, value: walking
-- minutes and a restaurant count, no raw map data).
--
-- Widens the namespace check only; existing namespaces stay allowed.

ALTER TABLE app.cache_entries DROP CONSTRAINT IF EXISTS cache_entries_namespace_check;
ALTER TABLE app.cache_entries ADD CONSTRAINT cache_entries_namespace_check
  CHECK (namespace IN ('rates', 'reference_price', 'hotel_content', 'location_facts'));
