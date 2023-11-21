import {
  AirbyteConnectionStatus,
  AirbyteConnectionStatusMessage,
  AirbyteSpec,
  AirbyteStateMessage,
} from "faros-airbyte-cdk";
import * as fs from "fs";
import * as os from "os";
import { afterEach, beforeEach, describe, expect, test } from "vitest";

import { CLI, read } from "./cli";
import { tempConfig } from "./temp";
import {sleep} from "faros-feeds-sdk/lib/feed";

const privateKey =
  process.env.PRIVATE_KEY!;
const streamAddress = "0xd95083fbf72897f8a6607f27891e814b29d843b3";

describe("index", () => {
  // const mockttp = getLocal({debug: false, recordTraffic: false});
  let configPath: string;

  beforeEach(async () => {
    // await mockttp.start({startPort: 30000, endPort: 50000});
    configPath = await tempConfig({privateKey: privateKey, streamAddress: streamAddress, devNetUrl: 'localhost'});
  });

  afterEach(async () => {
    // await mockttp.stop();
    fs.unlinkSync(configPath);
  });

  test("help", async () => {
    const cli = await CLI.runWith(["--help"]);
    expect(await read(cli.stderr)).toBe("");
    expect(await read(cli.stdout)).toMatch(/^Usage: main*/);
    expect(await cli.wait()).toBe(0);
  });

  test("spec", async () => {
    const cli = await CLI.runWith(["spec"]);
    expect(await read(cli.stderr)).toBe("");
    expect(await read(cli.stdout)).toBe(
      JSON.stringify(new AirbyteSpec(require("../resources/spec.json"))) +
        os.EOL,
    );
    expect(await cli.wait()).toBe(0);
  });

  test("check", async () => {
    // await mockttp
    //   .get('/users/me')
    //   .once()
    //   .thenReply(200, JSON.stringify({tenantId: '1'}));
    // await mockttp
    //   .get('/graphs/test-graph/statistics')
    //   .once()
    //   .thenReply(200, JSON.stringify({}));

    const cli = await CLI.runWith(["check", "--config", configPath]);

    expect(await read(cli.stderr)).toBe("");
    expect(await read(cli.stdout)).toContain(
      JSON.stringify(
        new AirbyteConnectionStatusMessage({
          status: AirbyteConnectionStatus.SUCCEEDED,
        }),
      ) + os.EOL,
    );
    expect(await cli.wait()).toBe(0);
  });

  test("indexing", async () => {
    const catalogPath = "../sample_files/configured_catalog.json";
    const recordPath = "../sample_files/records.jsonl";
    const cli = await CLI.runWith([
      "write",
      "--config",
      configPath,
      "--catalog",
      require.resolve( catalogPath ),
    ]);
    const records = fs.readFileSync(require.resolve( recordPath ));

    await sleep(3000)
    cli.stdin.write(records);


    expect(await read(cli.stderr)).toBe("");
    expect(await read(cli.stdout)).toBe(
      JSON.stringify(
        new AirbyteStateMessage({
          data: {

          },
        }),
      ) + os.EOL,
    );
    expect(await cli.wait()).toBe(0);
  }, 20000);
});
