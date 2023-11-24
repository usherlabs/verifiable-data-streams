import { formatSourceResponse, SourceDictOfObservables } from "./common";
import { map, of, switchMap } from "rxjs";
import { flow } from "fp-ts/function";
import { getFeeOptionsFromWeb3 } from "./getFeeOptionsFromWeb3";
import { Web3 } from "web3";

// https://www.ankr.com/rpc/chains/
type AnkrNetworks =
  | "polygon"
  | "ethereum"
  | "bsc"
  | "fantom"
  | "arbitrum"
  | "optimism"
  | "avalanche";

const baseUrl = "https://rpc.ankr.com/";
const web3FromNetwork = (network: AnkrNetworks) =>
  new Web3(new Web3.providers.HttpProvider(baseUrl + network));

const feeOptionsFromNetwork = flow(
  of,
  map(web3FromNetwork),
  switchMap(getFeeOptionsFromWeb3),
  formatSourceResponse("ankr"),
);

export const ankrNetworkGasStations = {
  optimism: feeOptionsFromNetwork("optimism"),
  polygon: feeOptionsFromNetwork("polygon"),
  ethereum: feeOptionsFromNetwork("ethereum"),
  bsc: feeOptionsFromNetwork("bsc"),
  fantom: feeOptionsFromNetwork("fantom"),
  arbitrum: feeOptionsFromNetwork("arbitrum"),
  avalanche: feeOptionsFromNetwork("avalanche"),
  check: of(true), // no need to check api key
} satisfies SourceDictOfObservables<AnkrNetworks>;
