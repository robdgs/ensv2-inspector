import { eq } from "@arkiv-network/sdk/query";
import { arkivPublicClient, getArkivWalletClient, ARKIV_ENTITY_TYPE, ARKIV_PROJECT } from "@/src/arkiv/client";
import type { InspectionResult } from "@/src/types/ens";

export interface ResolutionHistoryEntry {
  key: string;
  name: string;
  normalizedName: string;
  node?: string;
  address?: string;
  resolver?: string;
  registry?: string;
  network?: string;
  mode?: string;
  block?: string;
  createdAtBlock?: string;
  lastModifiedAtBlock?: string;
  transactionIndexInBlock?: string;
  operationIndexInTransaction?: string;
  createdAt?: string;
}

function attribute(entity: { attributes?: Array<{ key: string; value: string }> }, key: string) {
  return entity.attributes?.find((item) => item.key === key)?.value;
}

export async function getResolutionHistory(name: string, limit = 20): Promise<ResolutionHistoryEntry[]> {
  const normalized = name.trim().toLowerCase().replace(/^\.|\.$/g, "");
  if (!normalized) return [];

  const result = await arkivPublicClient
    .select({ key: true, payload: true, attributes: true, createdAtBlock: true, lastModifiedAtBlock: true, transactionIndexInBlock: true, operationIndexInTransaction: true })
    .where(eq("project_id", ARKIV_PROJECT), eq("entity_type", ARKIV_ENTITY_TYPE), eq("name", normalized))
    .limit(Math.min(Math.max(limit, 1), 100))
    .fetch();

  return result.entities.map((entity) => {
    const payload = entity.toJson() as Record<string, unknown>;
    return {
      key: entity.key,
      name: String(payload.name ?? normalized),
      normalizedName: String(payload.normalizedName ?? normalized),
      node: typeof payload.node === "string" ? payload.node : undefined,
      address: typeof payload.address === "string" ? payload.address : undefined,
      resolver: typeof payload.resolver === "string" ? payload.resolver : undefined,
      registry: typeof payload.registry === "string" ? payload.registry : undefined,
      network: typeof payload.network === "string" ? payload.network : undefined,
      mode: typeof payload.mode === "string" ? payload.mode : undefined,
      block: attribute(entity, "block"),
      createdAtBlock: entity.createdAtBlock?.toString(),
      lastModifiedAtBlock: entity.lastModifiedAtBlock?.toString(),
      transactionIndexInBlock: entity.transactionIndexInBlock?.toString(),
      operationIndexInTransaction: entity.operationIndexInTransaction?.toString(),
      createdAt: typeof payload.createdAt === "string" ? payload.createdAt : undefined,
    };
  });
}

export async function saveResolutionSnapshot(result: InspectionResult): Promise<{ saved: boolean; key?: string; reason?: string }> {
  const client = getArkivWalletClient();
  const normalizedName = result.normalizedName?.trim().toLowerCase();
  if (!client || !normalizedName) return { saved: false, reason: "Arkiv write client is not configured" };
  if (!result.address || result.address === "0x0000000000000000000000000000000000000000") {
    return { saved: false, reason: "No resolved address to persist" };
  }

  const attributes = [
    { key: "project_id", value: ARKIV_PROJECT },
    { key: "entity_type", value: ARKIV_ENTITY_TYPE },
    { key: "name", value: normalizedName },
    { key: "network", value: result.network ?? "unknown" },
    { key: "mode", value: result.mode ?? "unknown" },
    { key: "address", value: result.address },
    ...(result.node ? [{ key: "node", value: result.node }] : []),
    ...(result.resolver?.address ? [{ key: "resolver", value: result.resolver.address }] : []),
    ...(result.registry?.address ? [{ key: "registry", value: result.registry.address }] : []),
  ];

  const payload = {
    name: normalizedName,
    normalizedName,
    node: result.node,
    address: result.address,
    resolver: result.resolver?.address,
    registry: result.registry?.address,
    network: result.network,
    mode: result.mode,
    createdAt: new Date().toISOString(),
  };

  try {
    const key = `resolution:${normalizedName}:${result.network ?? "unknown"}:${result.address.toLowerCase()}`;
    const existing = await arkivPublicClient
      .select({ key: true })
      .where(eq("project_id", ARKIV_PROJECT), eq("entity_type", ARKIV_ENTITY_TYPE), eq("name", normalizedName), eq("address", result.address))
      .limit(1)
      .fetch();

    if (existing.entities.length > 0) {
      return { saved: true, key: existing.entities[0].key, reason: "Snapshot already exists" };
    }

    const entity = await client.createEntity({
      key,
      payload: JSON.stringify(payload),
      attributes,
    });

    return { saved: true, key: entity.key };
  } catch (error) {
    console.error("Arkiv snapshot failed", error);
    return { saved: false, reason: error instanceof Error ? error.message : String(error) };
  }
}
