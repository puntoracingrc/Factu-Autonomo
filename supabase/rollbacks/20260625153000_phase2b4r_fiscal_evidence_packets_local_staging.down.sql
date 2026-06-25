-- Manual rollback for Phase 2B.4R fiscal evidence packet local/staging persistence.
-- Drops only the RPC and separate evidence table created by this phase.

begin;

drop function if exists public.create_fiscal_evidence_packet_local_staging(
  uuid, uuid, text, text, text, text, boolean, jsonb, timestamptz
);

drop table if exists public.fiscal_evidence_packets;

commit;
