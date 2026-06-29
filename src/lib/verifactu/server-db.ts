import { getSupabaseAdmin } from "../supabase/admin";
import type { VerifactuChainState, VerifactuInfo } from "../types";

export async function persistVerifactuRecord(input: {
  userId: string;
  documentId: string;
  issuerNif: string;
  numserie: string;
  verifactu: VerifactuInfo;
  xml: string;
  aeatResponse?: string;
}): Promise<boolean> {
  const admin = getSupabaseAdmin();
  if (!admin) return false;

  const { error } = await admin.from("verifactu_records").insert({
    user_id: input.userId,
    document_id: input.documentId,
      issuer_nif: input.issuerNif,
      numserie: input.numserie,
    record_type: input.verifactu.recordType,
    record_hash: input.verifactu.recordHash,
    previous_hash: input.verifactu.previousHash,
    qr_url: input.verifactu.qrUrl,
    csv: input.verifactu.csv ?? null,
    status: input.verifactu.status,
    xml_payload: input.xml,
    aeat_response: input.aeatResponse ?? null,
  });

  return !error;
}

export async function upsertVerifactuChain(input: {
  userId: string;
  chain: VerifactuChainState;
}): Promise<boolean> {
  const admin = getSupabaseAdmin();
  if (!admin) return false;

  const { error } = await admin.from("verifactu_chain_state").upsert(
    {
      user_id: input.userId,
      issuer_nif: input.chain.issuerNif,
      last_hash: input.chain.lastHash,
      last_numserie: input.chain.lastNumSerie ?? null,
      last_fecha_expedicion: input.chain.lastFechaExpedicion ?? null,
      record_count: input.chain.recordCount,
      updated_at: new Date().toISOString(),
    },
    { onConflict: "user_id,issuer_nif" },
  );

  return !error;
}

export async function findVerifactuRecordByDocument(input: {
  userId: string;
  documentId: string;
}): Promise<{
  verifactu: VerifactuInfo;
  chain: VerifactuChainState;
} | null> {
  const admin = getSupabaseAdmin();
  if (!admin) return null;

  const { data, error } = await admin
    .from("verifactu_records")
    .select(
      "issuer_nif, record_hash, previous_hash, qr_url, csv, status, record_type, created_at",
    )
    .eq("user_id", input.userId)
    .eq("document_id", input.documentId)
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (error || !data) return null;

  const chain = await loadVerifactuChain({
    userId: input.userId,
    issuerNif: data.issuer_nif,
  });

  if (!chain) return null;

  return {
    verifactu: {
      recordHash: data.record_hash,
      previousHash: data.previous_hash,
      recordTimestamp: data.created_at,
      qrUrl: data.qr_url,
      csv: data.csv ?? undefined,
      status: data.status as VerifactuInfo["status"],
      recordType: data.record_type as VerifactuInfo["recordType"],
      environment: "test",
      submittedAt: data.created_at,
    },
    chain,
  };
}

export async function loadVerifactuChain(input: {
  userId: string;
  issuerNif: string;
}): Promise<VerifactuChainState | null> {
  const admin = getSupabaseAdmin();
  if (!admin) return null;

  const { data, error } = await admin
    .from("verifactu_chain_state")
    .select("issuer_nif, last_hash, last_numserie, last_fecha_expedicion, record_count")
    .eq("user_id", input.userId)
    .eq("issuer_nif", input.issuerNif)
    .maybeSingle();

  if (error || !data) return null;

  return {
    issuerNif: data.issuer_nif,
    lastHash: data.last_hash,
    lastNumSerie: data.last_numserie ?? undefined,
    lastFechaExpedicion: data.last_fecha_expedicion ?? undefined,
    recordCount: data.record_count,
  };
}
