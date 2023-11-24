import {Command} from "commander";
import {
  AirbyteConfig,
  AirbyteConfiguredCatalog,
  AirbyteConfiguredStream,
  AirbyteConnectionStatus,
  AirbyteConnectionStatusMessage,
  AirbyteDestination,
  AirbyteDestinationRunner,
  AirbyteLogger,
  AirbyteMessageType,
  AirbyteRecord,
  AirbyteSpec,
  AirbyteStateMessage,
  AirbyteStream,
  parseAirbyteMessage,
} from "faros-airbyte-cdk";
import * as readline from "readline";
import {CONFIG_TEST, Stream, StreamrClient} from "streamr-client";
import {Dictionary} from "ts-essentials";
import * as nerror from "@netflix/nerror";
import _ from "lodash";
import {from, Observable, shareReplay, tap} from "rxjs";
import {sleep} from "faros-feeds-sdk/lib/feed";

/** The main entry point. */
export function mainCommand(options?: {
  exitOverride?: boolean;
  suppressOutput?: boolean;
}): Command {
  const logger = new AirbyteLogger();
  const destination = new StreamrDestination(logger);
  const destinationRunner = new AirbyteDestinationRunner(logger, destination);
  const program = destinationRunner.mainCommand();

  if (options?.exitOverride) {
    program.exitOverride();
  }
  if (options?.suppressOutput) {
    program.configureOutput({
      // eslint-disable-next-line @typescript-eslint/no-empty-function
      writeOut: () => {},
      // eslint-disable-next-line @typescript-eslint/no-empty-function
      writeErr: () => {},
    });
  }

  // @ts-ignore
  return program;
}

export enum InvalidRecordStrategy {
  FAIL = "FAIL",
  SKIP = "SKIP",
}

interface WriteStats {
  messagesRead: number;
  recordsRead: number;
  recordsProcessed: number;
  recordsWritten: number;
  recordsErrored: number;
  processedByStream: Dictionary<number>;
  writtenByModel: Dictionary<number>;
}

type ExpectedConfig = {
  privateKey: string;
  devNetUrl?: string;
  // Prefix for stream name. If Stream Name Behavior is set to IGNORE_STREAM_NAME, this prefix will be used as stream name.
  streamrStreamPrefix: string;
  // How to use stream name from Airbyte.
  //  - STREAM_NAME_AS_STREAMR_SUFFIX: Use stream name from Airbyte as suffix for stream name on Streamr.
  //  - STREAM_NAME_AS_DATA_PROPERTY: Use stream name from Airbyte as data property.
  //  - IGNORE_STREAM_NAME: Ignore stream name from Airbyte. Use streamrStreamPrefix as stream name and publish data as is.
  streamNameBehavior:
    | "STREAM_NAME_AS_STREAMR_SUFFIX"
    | "STREAM_NAME_AS_DATA_PROPERTY"
    | "IGNORE_STREAM_NAME";
};

/** Streamr destination implementation. */
class StreamrDestination extends AirbyteDestination<ExpectedConfig> {
  private streamrStreamsDict: Record<string, Stream> = {};
  private _streamrClient: StreamrClient | undefined = undefined;
  private invalidRecordStrategy: InvalidRecordStrategy =
    InvalidRecordStrategy.SKIP;

  constructor(private readonly logger: AirbyteLogger) {
    super();
  }

  getStreamrClient(): StreamrClient {
    if (this.streamrClient) return this.streamrClient;
    throw new nerror.VError("Streamr client is not initialized");
  }

  get streamrClient() {
    if (!this._streamrClient)
      throw new nerror.VError("Streamr client is not initialized");
    return this._streamrClient;
  }

  async spec(): Promise<AirbyteSpec> {
    return new AirbyteSpec(require("../resources/spec.json"));
  }

  async check(
    config: AirbyteConfig & ExpectedConfig,
  ): Promise<AirbyteConnectionStatusMessage> {
    // TODO: How to validate that private key is valid?
    try {
      await this.initStreamrClient(config);
    } catch (e: any) {
      return new AirbyteConnectionStatusMessage({
        status: AirbyteConnectionStatus.FAILED,
        message: e.message,
      });
    }

    return new AirbyteConnectionStatusMessage({
      status: AirbyteConnectionStatus.SUCCEEDED,
    });
  }

  private initStreams = async (
    streams: AirbyteStream[],
    config: ExpectedConfig,
  ): Promise<void> => {
    const shouldPartitionByStreamName =
      config.streamNameBehavior === "STREAM_NAME_AS_STREAMR_SUFFIX";

    // If behavior is not to use as suffix, we will have only one stream to work with
    // and we will set it as default stream for all records
    //
    // This way, we don't need to change the
    // logic about where to publish each stream message
    const maybeSingleStream = !shouldPartitionByStreamName
      ? await this.streamrClient
          .getStream(config.streamrStreamPrefix)
          .catch((e) => {
            throw new nerror.VError(
              e,
              `Failed to get stream ${config.streamrStreamPrefix}`,
            );
          })
      : undefined;

    const streamObjectsPromises = streams.map(async (stream) => [
      stream.name,
      shouldPartitionByStreamName
        ? await this.streamrClient
            .getStream(`${config.streamrStreamPrefix}${stream.name}`)
            .catch((e) => {
              throw new nerror.VError(e, `Failed to get stream ${stream.name}`);
            })
        : maybeSingleStream!,
    ]);

    const streamObjects = await Promise.all(streamObjectsPromises);
    this.streamrStreamsDict = _.fromPairs(streamObjects);
  };

  private async initStreamrClient(
    config: AirbyteConfig & ExpectedConfig,
  ): Promise<void> {
    if (config.devNetUrl) {
      this.logger.info(`Using rpc endpoint ${config.devNetUrl}`);
      process.env.STREAMR_DOCKER_DEV_HOST = config.devNetUrl;
    }

    try {
      const maybeTestConfig = config.devNetUrl ? CONFIG_TEST : {};

      this._streamrClient = new StreamrClient({
        ...maybeTestConfig,
        auth: {
          privateKey: config.privateKey,
        },
      });

      // just to check it's working
      await this.streamrClient.getAddress();
    } catch (e) {
      throw new nerror.VError(
        `Failed to initialize Streamr Client. Error: ${e}`,
      );
    }
  }

  async *write(
    config: AirbyteConfig & ExpectedConfig,
    catalog: AirbyteConfiguredCatalog,
    stdin: NodeJS.ReadStream,
    dryRun: boolean,
  ): AsyncGenerator<AirbyteStateMessage> {
    await this.initStreamrClient(config);
    await this.initStreams(
      catalog.streams.map((s) => s.stream),
      config,
    );

    const { streams, deleteModelEntries } =
      this.initStreamsCheckConverters(catalog);

    const stateMessages: AirbyteStateMessage[] = [];

    // Avoid creating a new revision and writer when dry run is enabled
    const shouldWrite = !(config.dry_run === true || dryRun);
    if (shouldWrite) {
      await this.writeEntries(
        config,
        stdin,
        streams,
        stateMessages,
        shouldWrite,
      );
    } else {
      this.logger.info("Dry run is ENABLED. Won't write any records");
      await this.writeEntries(
        config,
        stdin,
        streams,
        stateMessages,
        shouldWrite,
      );
    }
    // Since we are writing all records in a single revision,
    // we should be ok to return all the state messages at the end,
    // once the revision has been closed.
    for (const state of stateMessages) yield state;

    this.logger.info("Closing Streamr client");
    await this.streamrClient.destroy();
  }

  private async writeEntries(
    config: AirbyteConfig & ExpectedConfig,
    stdin: NodeJS.ReadStream,
    streams: Dictionary<AirbyteConfiguredStream>,
    stateMessages: AirbyteStateMessage[],
    shouldWrite?: boolean,
  ): Promise<void> {
    const stats = {
      messagesRead: 0,
      recordsRead: 0,
      recordsProcessed: 0,
      recordsWritten: 0,
      recordsErrored: 0,
      processedByStream: {} as Dictionary<number>,
      writtenByModel: {} as Dictionary<number>,
    };

    const input = new Observable<string>((subscriber) => {
      this.logger.info("Reading input");
      const iface = readline.createInterface({
        input: stdin,
        terminal: stdin.isTTY,
      });

      return from(iface)
        .pipe(
          tap({
            complete: () => {
              this.logger.info("Closing input");
              iface.close();
            },
          }),
        )
        .subscribe(subscriber);
    }).pipe(shareReplay());
    try {
      const publishPromises: Promise<any>[] = [];
      // Process input & write records
      for await (const line of input) {
        this.handleRecordProcessingError(stats, () => {
          const msg = parseAirbyteMessage(line);
          stats.messagesRead++;
          if (msg.type === AirbyteMessageType.STATE) {
            stateMessages.push(msg as AirbyteStateMessage);
          } else if (msg.type === AirbyteMessageType.RECORD) {
            stats.recordsRead++;
            const recordMessage = msg as AirbyteRecord;
            if (!recordMessage.record) {
              throw new nerror.VError("Empty record");
            }
            // if (!streamrStreamsDict[recordMessage.record.stream]) {
            //   throw new nerror.VError(
            //     `Undefined stream ${recordMessage.record.stream}`
            //   );
            // }
            const unpacked = recordMessage.unpackRaw();
            if (!unpacked.record) {
              throw new nerror.VError("Empty unpacked record");
            }
            const stream = unpacked.record.stream;
            const count = stats.processedByStream[stream];
            stats.processedByStream[stream] = count ? count + 1 : 1;

            const streamrStream = this.streamrStreamsDict[stream];

            if (!streamrStream) {
              throw new nerror.VError(
                `Undefined stream ${recordMessage.record.stream}`,
              );
            }

            const writeRecord = async (
              context: AirbyteRecord,
            ): Promise<any> => {
              this.logger.info(
                `Writing record to stream ${context.record.stream}`,
              );

              this.logger.info(
                `content: ${JSON.stringify(context.record.data)}`,
              );
              
              const message =
                config.streamNameBehavior === "STREAM_NAME_AS_DATA_PROPERTY"
                  ? {
                      [context.record.stream]: context.record.data,
                    }
                  : context.record.data;
              await streamrStream.publish(message);
              await sleep(5000);

              stats.recordsWritten++;
              stats.recordsProcessed++;
            };

            publishPromises.push(
              writeRecord(unpacked)
                .then()
                .catch((error) => {
                  throw new nerror.VError("Error sync record");
                }),
            );
          }
        });
      }
      await Promise.all(publishPromises);
    } finally {
      this.logWriteStats(stats, shouldWrite);
    }
  }

  private logWriteStats(stats: WriteStats, shouldWrite?: boolean): void {
    this.logger.info(`Read ${stats.messagesRead} messages`);
    this.logger.info(`Read ${stats.recordsRead} records`);
    this.logger.info(`Processed ${stats.recordsProcessed} records`);
    const processed = _(stats.processedByStream)
      .toPairs()
      .orderBy(0, "asc")
      .fromPairs()
      .value();
    this.logger.info(
      `Processed records by stream: ${JSON.stringify(processed)}`,
    );
    const writeMsg = shouldWrite ? "Wrote" : "Would write";
    this.logger.info(`${writeMsg} ${stats.recordsWritten} records`);
    const written = _(stats.writtenByModel)
      .toPairs()
      .orderBy(0, "asc")
      .fromPairs()
      .value();
    this.logger.info(
      `${writeMsg} records by model: ${JSON.stringify(written)}`,
    );
    this.logger.info(`Errored ${stats.recordsErrored} records`);
  }

  private handleRecordProcessingError(
    stats: WriteStats,
    processRecord: () => void,
  ): void {
    try {
      processRecord();
    } catch (e: any) {
      stats.recordsErrored++;
      this.logger.error(
        `Error processing input: ${e.message ?? JSON.stringify(e)}`,
      );
      if (this.invalidRecordStrategy === InvalidRecordStrategy.FAIL) {
        throw e;
      }
    }
  }

  private initStreamsCheckConverters(catalog: AirbyteConfiguredCatalog): {
    streams: Dictionary<AirbyteConfiguredStream>;
    deleteModelEntries: ReadonlyArray<string>;
  } {
    const streams = _.keyBy(catalog.streams, (s) => s.stream.name);
    const deleteModelEntries: string[] = [];

    // Check input streamrStreamsDict & initialize record converters
    // TODO: Check on destination sync mode
    // for (const stream of streamKeys) {
    //   const destinationSyncMode = streamrStreamsDict[stream].destination_sync_mode;
    //   if (!destinationSyncMode) {
    //     throw new nerror.VError(
    //       `Undefined destination sync mode for stream ${stream}`
    //     );
    //   }

    //   // Prepare destination models to delete if any
    //   if (destinationSyncMode === DestinationSyncMode.OVERWRITE) {
    //     // TODO: PUSH TO delete list
    //     // deleteModelEntries.push(...converter.destinationModels);
    //   }
    // }

    return {
      streams,
      deleteModelEntries: _.uniq(deleteModelEntries),
    };
  }
}
