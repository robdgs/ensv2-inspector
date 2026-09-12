import { createPublicClient, http } from "viem";
import { sepolia } from "viem/chains";

export const ensClient = createPublicClient({
  chain: sepolia,
  transport: http(),
});
