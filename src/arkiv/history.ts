import { ExpirationTime, jsonToPayload } from "@arkiv-network/sdk";
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
  createdAtBlock?: string;
  lastModifiedAtBlock?: string;
  transactionIndexInBlock?: string;
  operationIndexInTransaction?: string;
  createdAt?: string;
}

function attribute(entity: { attributes?: Record<string, { value?: unknown } | unknown> }, key: string) {
  const value = entity.attributes?.[key];
  if (value == null) return undefined;
  if (typeof value === "object" && value !== null && "value" in value) {
    return String((value as { value?: unknown }).value);
  }
  return String(value);
}

export async function getResolutionHistory(
  name: string,
  limit = 20,
): Promise<ResolutionHistoryEntry[]> {
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
      createdAtBlock: entity.createdAtBlock?.toString(),
      lastModifiedAtBlock: entity.lastModifiedAtBlock?.toString(),
      transactionIndexInBlock: entity.transactionIndexInBlock?.toString(),
      operationIndexInTransaction: entity.operationIndexInTransaction?.toString(),
      createdAt: typeof payload.createdAt === "string" ? payload.createdAt : undefined,
    };
  });
}

export async function saveResolutionSnapshot(
  result: InspectionResult,
): Promise<{ saved: boolean; key?: string; reason?: string }> {
  const client = getArkivWalletClient();
  const normalizedName = result.normalizedName?.trim().toLowerCase();

  if (!client || !normalizedName) {
    return {
      saved: false,
      reason: !client
        ? "Arkiv write client is not configured"
        : "Missing normalized ENS name",
    };
  }

  if (
    !result.address ||
    result.address.toLowerCase() ===
      "0x0000000000000000000000000000000000000000"
  ) {
    return { saved: false, reason: "No resolved address to persist" };
  }

  try {
    const existing = await arkivPublicClient
      .select({ key: true, payload: true })
      .where(
        eq("project_id", ARKIV_PROJECT),
        eq("entity_type", ARKIV_ENTITY_TYPE),
        eq("name", normalizedName),
      )
      .limit(1)
      .fetch();

    const latest = existing.entities[0];
    if (latest) {
      const previous = latest.toJson() as Record<string, unknown>;
      const sameSnapshot =
        String(previous.address ?? "").toLowerCase() === result.address.toLowerCase() &&
        String(previous.resolver ?? "").toLowerCase() ===
          String(result.resolver?.address ?? "").toLowerCase() &&
        String(previous.registry ?? "").toLowerCase() ===
          String(result.registry?.address ?? "").toLowerCase() &&
        String(previous.node ?? "").toLowerCase() === String(result.node ?? "").toLowerCase() &&
        String(previous.network ?? "") === String(result.network ?? "") &&
        String(previous.mode ?? "") === String(result.mode ?? "");

      if (sameSnapshot) {
        return {
          saved: true,
          key: latest.key,
          reason: "Snapshot unchanged",
        };
      }
    }

    const attributes: Record<string, string> = {
      project_id: ARKIV_PROJECT,
      entity_type: ARKIV_ENTITY_TYPE,
      name: normalizedName,
      network: result.network ?? "unknown",
      mode: result.mode ?? "unknown",
      address: result.address,
    };

    if (result.node) attributes.node = result.node;
    if (result.resolver?.address) attributes.resolver = result.resolver.address;
    if (result.registry?.address) attributes.registry = result.registry.address;

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

    const { entityKey } = await client.createEntity({
      contentType: "application/json",
      attributes,
      payload: jsonToPayload(payload),
      expires: ExpirationTime.permanent(),
    });

    return { saved: true, key: entityKey, reason: "Snapshot created" };
  } catch (error) {
    console.error("[Arkiv] snapshot failed", error);
    return {
      saved: false,
      reason: error instanceof Error ? error.message : String(error),
    };
  }
}
