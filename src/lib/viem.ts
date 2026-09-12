import { createPublicClient, http } from "viem";
import { mainnet, sepolia } from "viem/chains";

export const ensClient = createPublicClient({
  chain: sepolia,
  transport: http(),
});

export const mainnetEnsClient = createPublicClient({
  chain: mainnet,
  transport: http(),
});
