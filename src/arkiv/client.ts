import { createPublicClient, createWalletClient } from "@arkiv-network/sdk";
import { tiramisu } from "@arkiv-network/sdk/chains";
import { http } from "viem";
import { privateKeyToAccount } from "viem/accounts";

const apiKey = process.env.ARKIV_API_KEY;
const rpcUrl = apiKey
  ? `${tiramisu.rpcUrls.default.http[0]}/${apiKey}`
  : tiramisu.rpcUrls.default.http[0];

/** Read-only Arkiv client. Safe to use from server routes; no private key required. */
export const arkivPublicClient = createPublicClient({
  chain: tiramisu,
  transport: http(rpcUrl),
});

export const ARKIV_PROJECT = "ensv2-inspector";
export const ARKIV_ENTITY_TYPE = "ensv2_resolution";

/** Server-side write client. Never expose ARKIV_PRIVATE_KEY to the browser. */
export function getArkivWalletClient() {
  const privateKey = process.env.ARKIV_PRIVATE_KEY as `0x${string}` | undefined;
  if (!privateKey) return null;
  return createWalletClient({
    chain: tiramisu,
    transport: http(rpcUrl),
    account: privateKeyToAccount(privateKey),
  });
}
