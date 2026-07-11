import { getSupabaseAdmin } from "../supabase/admin";
import type { VerifactuChainState, VerifactuInfo } from "../types";
import { normalizeIssuerNif } from "./qr";

export function chainLinksContainRecordHash(input: {
  chain: VerifactuChainState;
  targetHash: string;
  links: Array<{ recordHash: string; previousHash: string }>;
}): boolean {
  const previousByHash = new Map(
    input.links.map((link) => [link.recordHash, link.previousHash] as const),
  );
  const visited = new Set<string>();
  let current = input.chain.lastHash;

  while (current && !visited.has(current)) {
    if (current === input.targetHash) return true;
    visited.add(current);
    const previous = previousByHash.get(current);
    if (previous === undefined) return false;
    current = previous;
  }

  return false;
}

async function loadAcceptedVerifactuChainLinks(input: {
  userId: string;
  issuerNif: string;
  expectedCount: number;
}): Promise<Array<{ recordHash: string; previousHash: string }>> {
  const admin = getSupabaseAdmin();
  if (!admin) {
    throw new Error("Persistencia VeriFactu no disponible");
  }
  const pageSize = 500;
  const links: Array<{ recordHash: string; previousHash: string }> = [];

  for (let offset = 0; offset < input.expectedCount; offset += pageSize) {
    const { data, error } = await admin
      .from("verifactu_records")
      .select("id, record_hash, previous_hash, created_at")
      .eq("user_id", input.userId)
      .eq("issuer_nif", normalizeIssuerNif(input.issuerNif))
      .in("status", ["registered", "test_registered"])
      .order("created_at", { ascending: true })
      .order("id", { ascending: true })
      .range(offset, offset + pageSize - 1);
    if (error || !data) {
      throw new Error("No se pudieron verificar los eslabones VeriFactu");
    }
    links.push(
      ...data.map((row) => ({
        recordHash: row.record_hash,
        previousHash: row.previous_hash,
      })),
    );
    if (data.length < pageSize) break;
  }

  return links;
}

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
    issuer_nif: normalizeIssuerNif(input.issuerNif),
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
  chain: VerifactuChainState | null;
  chainContainsRecord: boolean;
  issuerNif: string;
  numserie: string;
} | null> {
  const admin = getSupabaseAdmin();
  if (!admin) {
    throw new Error("Persistencia VeriFactu no disponible");
  }

  const { data, error } = await admin
    .from("verifactu_records")
    .select(
      "issuer_nif, numserie, record_hash, previous_hash, qr_url, csv, status, record_type, xml_payload, created_at",
    )
    .eq("user_id", input.userId)
    .eq("document_id", input.documentId)
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (error) throw new Error("No se pudo consultar el registro VeriFactu");
  if (!data) return null;
  let normalizedIssuerNif: string;
  try {
    normalizedIssuerNif = normalizeIssuerNif(data.issuer_nif);
  } catch {
    return null;
  }

  const chain = await loadVerifactuChain({
    userId: input.userId,
    issuerNif: normalizedIssuerNif,
  });

  const links = chain
    ? await loadAcceptedVerifactuChainLinks({
        userId: input.userId,
        issuerNif: normalizedIssuerNif,
        expectedCount: chain.recordCount,
      })
    : null;
  const xmlTimestamp =
    typeof data.xml_payload === "string"
      ? data.xml_payload.match(
          /<sum1:FechaHoraHusoGenRegistro>([^<]+)<\/sum1:FechaHoraHusoGenRegistro>/,
        )?.[1]
      : undefined;

  return {
    issuerNif: normalizedIssuerNif,
    numserie: data.numserie,
    verifactu: {
      recordHash: data.record_hash,
      previousHash: data.previous_hash,
      recordTimestamp: xmlTimestamp ?? data.created_at,
      qrUrl: data.qr_url,
      csv: data.csv ?? undefined,
      status: data.status as VerifactuInfo["status"],
      recordType: data.record_type as VerifactuInfo["recordType"],
      environment: data.status === "registered" ? "production" : "test",
      submittedAt: data.created_at,
    },
    chain,
    chainContainsRecord:
      links !== null &&
      chain !== null &&
      chainLinksContainRecordHash({
        chain,
        targetHash: data.record_hash,
        links,
      }),
  };
}

export async function loadVerifactuChain(input: {
  userId: string;
  issuerNif: string;
}): Promise<VerifactuChainState | null> {
  const admin = getSupabaseAdmin();
  if (!admin) {
    throw new Error("Persistencia VeriFactu no disponible");
  }

  const { data, error } = await admin
    .from("verifactu_chain_state")
    .select("issuer_nif, last_hash, last_numserie, last_fecha_expedicion, record_count")
    .eq("user_id", input.userId)
    .eq("issuer_nif", input.issuerNif)
    .maybeSingle();

  if (error) throw new Error("No se pudo consultar la cadena VeriFactu");
  if (!data) return null;

  return {
    issuerNif: data.issuer_nif,
    lastHash: data.last_hash,
    lastNumSerie: data.last_numserie ?? undefined,
    lastFechaExpedicion: data.last_fecha_expedicion ?? undefined,
    recordCount: data.record_count,
  };
}
