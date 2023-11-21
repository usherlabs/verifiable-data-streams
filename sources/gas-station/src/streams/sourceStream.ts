import { AirbyteLogger, AirbyteStreamBase } from "faros-airbyte-cdk";
import { map, Observable } from "rxjs";
import { Dictionary } from "ts-essentials";

export class SourceStream extends AirbyteStreamBase {
  constructor(
    logger: AirbyteLogger,
    private _name: string,
    private source: Observable<any>,
  ) {
    super(logger);
  }

  override get name() {
    return this._name;
  }

  getJsonSchema(): Dictionary<any, string> {
    return require("../../resources/schemas/httpResponse.json");
  }

  get primaryKey(): undefined {
    return undefined;
  }

  override readRecords(): AsyncGenerator<
    Dictionary<any, string>,
    any,
    unknown
  > {
    this.logger.info("Reading records");
    return this.source
      .pipe(
        map((value) => ({
          data: value,
        })),
      )
      [Symbol.asyncIterator]();
  }
}
