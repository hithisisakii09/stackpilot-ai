export function buildMarketMigrationSql(){
 return `-- StackPilot migration 6. Append-only candidate market revision integrity.
ALTER TABLE market_observations ADD CONSTRAINT market_observations_manual_envelope CHECK (
 (observation->>'kind' IS DISTINCT FROM 'manual-market-observation-v1' OR (
  jsonb_typeof(observation) = 'object'
  AND jsonb_typeof(observation->'revision') = 'number'
  AND observation->>'revision' ~ '^[1-9][0-9]{0,2}$'
  AND jsonb_typeof(observation->'seriesId') = 'string'
  AND observation->>'seriesId' ~ '^[a-z][a-z0-9]*(-[a-z0-9]+)*$'
  AND length(observation->>'seriesId') BETWEEN 3 AND 64
  AND observation->>'status' = 'candidate'
  AND observation->>'reviewState' = 'unreviewed'
 )) IS TRUE
);
CREATE UNIQUE INDEX market_observations_manual_revision ON market_observations(organization_id,(observation->>'seriesId'),((observation->>'revision')::integer) DESC) WHERE observation->>'kind' = 'manual-market-observation-v1';
`;
}
