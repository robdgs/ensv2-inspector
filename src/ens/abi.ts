import { parseAbi } from "viem";

export const universalResolverAbi = parseAbi([
  "function resolve(bytes name, bytes data) view returns (bytes result, address resolver)",
  "function reverse(bytes lookupAddress, uint256 coinType) view returns (string primary, address resolver, address reverseResolver)",
]);

export const resolverAbi = parseAbi([
  "function addr(bytes32 node) view returns (address)",
  "function text(bytes32 node, string key) view returns (string)",
]);
