import { Command } from "commander";
import {
  AirbyteConfig,
  AirbyteLogger,
  AirbyteSourceBase,
  AirbyteSourceRunner,
  AirbyteSpec,
  AirbyteStreamBase,
} from "faros-airbyte-cdk";
import { blockNativeNetworkGasStations } from "./utils/block-native";
import {
  catchError,
  defaultIfEmpty,
  EMPTY,
  filter,
  firstValueFrom,
  forkJoin,
  map,
  merge,
  Observable,
  timeout,
} from "rxjs";
import { VError } from "@netflix/nerror";
import { tuple } from "./utils/tuple";
import { alchemyNetworkGasStations } from "./utils/alchemy";
import { SourceStream } from "./streams/sourceStream";
import { networkList, Networks } from "./utils/common";
import { ankrNetworkGasStations } from "./utils/ankr";
import { llamaNetworkGasStations } from "./utils/llamarpc";

/** The main entry point. */
export function mainCommand(): Command {
  const logger = new AirbyteLogger();
  const source = new GasStationSource(logger);
  // @ts-ignore
  return new AirbyteSourceRunner(logger, source).mainCommand();
}

export type SourceConfig = {
  blockNativeApiKey: string;
  alchemyApiKey: string;
} & AirbyteConfig;

/** Example source implementation. */
class GasStationSource extends AirbyteSourceBase<SourceConfig> {
  async spec(): Promise<AirbyteSpec> {
    return new AirbyteSpec(require("../resources/spec.json"));
  }

  async checkConnection(
    config: SourceConfig,
  ): Promise<[boolean, VError | undefined]> {
    const allOk$ = merge(
      blockNativeNetworkGasStations(config.blockNativeApiKey).check,
      alchemyNetworkGasStations(config.alchemyApiKey).check,
      ankrNetworkGasStations.check,
      llamaNetworkGasStations.check,
    );

    const errors$ = allOk$.pipe(
      filter(
        // the string is the reason
        (maybeError): maybeError is string => typeof maybeError === "string",
      ),
      map((error) => new VError(error)),
    );

    const result$ = errors$.pipe(
      map((error) => tuple(false, error)),
      defaultIfEmpty(tuple(true, undefined)),
    );

    return firstValueFrom(result$);
  }

  streams(config: SourceConfig): AirbyteStreamBase[] {
    // we do this way, getting from sources, as if we had choosen to get by network, it would
    // be easy to just forget to add a new network to the list when updating.
    // this way we are type safe.

    // all gas stations
    const gasStations = [
      blockNativeNetworkGasStations(config.blockNativeApiKey),
      alchemyNetworkGasStations(config.alchemyApiKey),
      ankrNetworkGasStations,
      llamaNetworkGasStations,
    ];

    // merge all streams into one
    // {[network]: Observable of gas station data, emitting 1 by 1}
    // it gets concatenated inside our SourceStream class
    const sources = networkList.reduce(
      (acc, network) => ({
        ...acc,
        [network]: merge(
          ...gasStations
            .map((gasStation) => {
              const gasStationNetwork$ = gasStation[
                network as keyof typeof gasStation
              ] as Observable<unknown> | undefined;
              return gasStationNetwork$?.pipe(
                // each source has 30 secs to complete, so it doens't freeze too much
                timeout(30_000),
                // we do this to ignore errors per network source
                catchError((err) => {
                  this.logger.error(
                    new VError(err, `Non fatal error in stream ${network}`)
                      .message,
                  );
                  return EMPTY;
                }),
              );
            })
            // filter out undefined, as not all gasStation sources have all networks
            .filter(Boolean),
        ),
      }),
      {} as Record<Networks, ReturnType<typeof forkJoin>>,
    );

    const streams = Object.entries(sources).map(
      ([network, source]) =>
        new SourceStream(this.logger, `gas-station/${network}`, source),
    );

    return streams;
  }
}
