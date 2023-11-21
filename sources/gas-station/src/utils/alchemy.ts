import { mapToSource, SourceDictOfObservables } from "./common";
import { Alchemy, Network } from "alchemy-sdk";
import { catchError, defer, map, of, pipe } from "rxjs";

const feeDataFromAlchemy = (client: Alchemy) =>
  defer(() => client.core.getFeeData()).pipe(mapToSource("alchemy"));
const alchemyFromNetwork = (network: Network) => (apiKey: string) =>
  new Alchemy({ apiKey, network });

const feeDataFromNetwork = (network: Network) =>
  pipe(alchemyFromNetwork(network), feeDataFromAlchemy);

const invalidMsg = "Alchemy API key is invalid";
const checkAlchemyApiKey = (client: Alchemy) =>
  defer(() => client.core.getBlockNumber()).pipe(
    map((val) => (typeof val === "number" ? true : invalidMsg)),
    catchError(() => of(invalidMsg)),
  );

export const alchemyNetworkGasStations = {
  ethereum: feeDataFromNetwork(Network.ETH_MAINNET),
  polygon: feeDataFromNetwork(Network.MATIC_MAINNET),
  check: pipe(alchemyFromNetwork(Network.ETH_MAINNET), checkAlchemyApiKey),
} satisfies SourceDictOfObservables;
