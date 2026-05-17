# TODO List - Synapse Integration

## Completed
- [x] Initial design and architecture planning.
- [x] Adopted Synapse as the primary repository.
- [x] Unified API client structure (`utils/adsClient.js`).
- [x] Ported PostgreSQL schema initialization to `Synapse/utils/init_db.js`.
- [x] Added `pg` dependency and updated `package.json`.
- [x] Migrated Ads agents (`intent-surgeon`, `persuasion-architect`, `roi-sentry`) to `handlers/agent/ads/` and converted to ESM.

## In Progress
- [ ] Port `Weekly Auditor` agent to ESM.
- [ ] Port `Location Sentry` agent to ESM.
- [ ] Refactor `AgentOrchestrator` to integrate new ESM agent modules.
- [ ] Finalize unified entry point for all agents.

## Pending
- [ ] Implement Business-Aware Agent (Intelligence Layer).
- [ ] Final verification in production environment (Vercel).
- [ ] Push to GitHub.
