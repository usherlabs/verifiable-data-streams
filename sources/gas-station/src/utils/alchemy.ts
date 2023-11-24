import { formatSourceResponse, SourceDictOfObservables } from "./common";
import { Alchemy, Network } from "alchemy-sdk";
import { catchError, defer, map, of } from "rxjs";
import { flow, pipe } from "fp-ts/function";

type AlchemyNetworks =
  | "ethereum"
  | "polygon"
  | "arbitrum"
  | "optimism"
  | "astar"
  | "base";

const feeDataFromAlchemy = (client: Alchemy) =>
  defer(() => client.core.getFeeData()).pipe(formatSourceResponse("alchemy"));
const alchemyFromNetwork = (network: Network) => (apiKey: string) =>
  new Alchemy({ apiKey, network });

const feeDataFromNetwork = (network: Network) =>
  flow(alchemyFromNetwork(network), feeDataFromAlchemy);

const invalidMsg = "Alchemy API key is invalid";
const checkAlchemyApiKey = (client: Alchemy) =>
  defer(() => client.core.getBlockNumber()).pipe(
    map((val) => (typeof val === "number" ? true : invalidMsg)),
    catchError(() => of(invalidMsg)),
  );

export const alchemyNetworkGasStations = (apiKey: string) =>
  ({
    ethereum: feeDataFromNetwork(Network.ETH_MAINNET)(apiKey),
    polygon: feeDataFromNetwork(Network.MATIC_MAINNET)(apiKey),
    arbitrum: feeDataFromNetwork(Network.ARB_MAINNET)(apiKey),
    optimism: feeDataFromNetwork(Network.OPT_MAINNET)(apiKey),
    astar: feeDataFromNetwork(Network.ASTAR_MAINNET)(apiKey),
    base: feeDataFromNetwork(Network.BASE_MAINNET)(apiKey),
    check: pipe(
      apiKey,
      alchemyFromNetwork(Network.ETH_MAINNET),
      checkAlchemyApiKey,
    ),
  }) satisfies SourceDictOfObservables<AlchemyNetworks>;
