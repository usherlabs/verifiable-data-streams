import { Command } from "commander";
import {
  AirbyteConfig,
  AirbyteConfiguredCatalog,
  AirbyteLogger,
  AirbyteMessage,
  AirbyteSourceBase,
  AirbyteSourceRunner,
  AirbyteSpec,
  AirbyteState,
  AirbyteStreamBase,
} from "faros-airbyte-cdk";
import { blockNativeNetworkGasStations } from "./utils/block-native";
import {
  defaultIfEmpty,
  filter,
  firstValueFrom,
  forkJoin,
  from,
  map,
  merge,
  tap,
} from "rxjs";
import { VError } from "@netflix/nerror";
import { tuple } from "./utils/tuple";
import { alchemyNetworkGasStations } from "./utils/alchemy";
import { SourceStream } from "./streams/sourceStream";

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
    const blockNativeOk$ = blockNativeNetworkGasStations.check(
      config.blockNativeApiKey,
    );

    const alchemyOk$ = alchemyNetworkGasStations.check(config.alchemyApiKey);

    const allOk$ = merge(blockNativeOk$, alchemyOk$);

    const errors$ = allOk$.pipe(
      filter(
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
    const polygonSrc$ = forkJoin([
      blockNativeNetworkGasStations.polygon(config.blockNativeApiKey),
      alchemyNetworkGasStations.polygon(config.alchemyApiKey),
    ]);
    const ethereumSrc$ = forkJoin([
      blockNativeNetworkGasStations.ethereum(config.blockNativeApiKey),
      alchemyNetworkGasStations.ethereum(config.alchemyApiKey),
    ]);

    return [
      new SourceStream(this.logger, "gas-station/polygon", polygonSrc$),
      new SourceStream(this.logger, "gas-station/ethereum", ethereumSrc$),
    ];
  }

  read(
    config: SourceConfig,
    catalog: AirbyteConfiguredCatalog,
    state?: AirbyteState,
  ): AsyncGenerator<AirbyteMessage> {
    return from(super.read(config, catalog, state))
      .pipe(
        tap((data) => {
          this.logger.info(`Got data, ${JSON.stringify(data)}`);
        }),
      )
      [Symbol.asyncIterator]();
  }
}
