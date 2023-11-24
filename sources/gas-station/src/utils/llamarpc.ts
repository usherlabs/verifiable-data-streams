import { formatSourceResponse, SourceDictOfObservables } from "./common";
import { map, of, switchMap } from "rxjs";
import { getFeeOptionsFromWeb3 } from "./getFeeOptionsFromWeb3";
import { Web3 } from "web3";

// https://llamarpc.com/
type LlamaNetworks =
  | "arbitrum"
  | "base"
  | "bsc"
  | "ethereum"
  | "optimism"
  | "polygon";

const llamaRpcs = {
  arbitrum: "https://arbitrum.llamarpc.com",
  base: "https://base.llamarpc.com",
  bsc: "https://binance.llamarpc.com",
  ethereum: "https://eth.llamarpc.com",
  optimism: "https://optimism.llamarpc.com",
  polygon: "https://polygon.llamarpc.com",
} as const satisfies Record<LlamaNetworks, string>;

const web3FromNetwork = (network: LlamaNetworks) =>
  new Web3(new Web3.providers.HttpProvider(llamaRpcs[network]));

const feeOptionsFromNetwork = (network: LlamaNetworks) =>
  of(network).pipe(
    map(web3FromNetwork),
    switchMap(getFeeOptionsFromWeb3),
    formatSourceResponse("llama"),
  );

export const llamaNetworkGasStations = {
  optimism: feeOptionsFromNetwork("optimism"),
  polygon: feeOptionsFromNetwork("polygon"),
  ethereum: feeOptionsFromNetwork("ethereum"),
  bsc: feeOptionsFromNetwork("bsc"),
  arbitrum: feeOptionsFromNetwork("arbitrum"),
  base: feeOptionsFromNetwork("base"),
  check: of(true), // no need to check api key
} satisfies SourceDictOfObservables<LlamaNetworks>;
