import { eq } from "@arkiv-network/sdk/query";
import { arkivPublicClient, ARKIV_ENTITY_TYPE, ARKIV_PROJECT } from "@/src/arkiv/client";

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
    .select({
      key: true,
      payload: true,
      attributes: true,
      createdAtBlock: true,
      lastModifiedAtBlock: true,
      transactionIndexInBlock: true,
      operationIndexInTransaction: true,
    })
    .where(
      eq("project_id", ARKIV_PROJECT),
      eq("entity_type", ARKIV_ENTITY_TYPE),
      eq("name", normalized),
    )
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
