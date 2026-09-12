import { parseAbi } from "viem";

export const universalResolverAbi = parseAbi([
  "function resolve(bytes name, bytes data) view returns (bytes result, address resolver)",
  "function reverse(bytes lookupAddress, uint256 coinType) view returns (string primary, address resolver, address reverseResolver)",
  "function findResolver(bytes name) view returns (address resolver, bytes32 node, uint256 resolverOffset)",
  "function findRegistries(bytes name) view returns (address[] registries)",
  "function ROOT_REGISTRY() view returns (address)",
]);

export const registryAbi = parseAbi([
  "function getSubregistry(string label) view returns (address)",
  "function getResolver(string label) view returns (address)",
]);

export const resolverAbi = parseAbi([
  "function addr(bytes32 node) view returns (address)",
  "function text(bytes32 node, string key) view returns (string)",
  "function name(bytes32 node) view returns (string)",
]);
