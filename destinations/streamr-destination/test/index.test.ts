import {
  AirbyteConnectionStatus,
  AirbyteConnectionStatusMessage,
  AirbyteSpec,
} from "faros-airbyte-cdk";
import * as fs from "fs";
import * as os from "os";
import { describe, expect, test as rawTest } from "vitest";

import { CLI, read } from "./cli";
import { tempConfig } from "./temp";
import { sleep } from "faros-feeds-sdk/lib/feed";
import { filter, firstValueFrom, from, map, toArray } from "rxjs";
import { CONFIG_TEST, StreamrClient } from "streamr-client";

const privateKey = process.env.PRIVATE_KEY!;
const streamAddress = "0xd95083fbf72897f8a6607f27891e814b29d843b3";
const singleTestStream = streamAddress + "/tutorial_0_x1231";

const test = rawTest.extend<{
  configWithSuffixPath: string;
  configIgnoreNamePath: string;
  configWithPropertyPath: string;
  streamrClient: StreamrClient;
}>({
  configWithSuffixPath: async ({}, use) => {
    const config = await tempConfig({
      privateKey: privateKey,
      streamrStreamPrefix: streamAddress + "/",
      devNetUrl: "localhost",
      streamNameBehavior: "STREAM_NAME_AS_STREAMR_SUFFIX",
    });
    await use(config);
    fs.unlinkSync(config);
  },
  configIgnoreNamePath: async ({}, use) => {
    const config = await tempConfig({
      privateKey: privateKey,
      streamrStreamPrefix: singleTestStream,
      devNetUrl: "localhost",
      streamNameBehavior: "IGNORE_STREAM_NAME",
    });
    await use(config);
    fs.unlinkSync(config);
  },
  configWithPropertyPath: async ({}, use) => {
    const config = await tempConfig({
      privateKey: privateKey,
      streamrStreamPrefix: singleTestStream,
      devNetUrl: "localhost",
      streamNameBehavior: "STREAM_NAME_AS_DATA_PROPERTY",
    });
    await use(config);
    fs.unlinkSync(config);
  },
  streamrClient: async ({}, use) => {
    process.env.STREAMR_DOCKER_DEV_HOST = "localhost";
    const client = new StreamrClient({
      ...CONFIG_TEST,
      auth: {
        privateKey: privateKey,
      },
    });
    await use(client);
    await client.destroy();
  },
});

describe("index", () => {
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

  test("check", async ({ configWithSuffixPath }) => {
    const cli = await CLI.runWith(["check", "--config", configWithSuffixPath]);

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

  test("indexing with suffix", async ({
    configWithSuffixPath,
    streamrClient,
  }) => {
    const catalogPath = "../sample_files/configured_catalog.json";
    const recordPath = "../sample_files/records.jsonl";
    const cli = await CLI.runWith([
      "write",
      "--config",
      configWithSuffixPath,
      "--catalog",
      require.resolve(catalogPath),
    ]);
    const records = fs.readFileSync(require.resolve(recordPath));

    const subscription = await streamrClient.subscribe({
      streamId: `${streamAddress}/gas-station/polygon`,
    });
    const msgs$ = from(subscription).pipe(map((v) => v.content));

    const eventsPromise = firstValueFrom(msgs$);

    await sleep(3000);
    cli.stdin.write(records);

    const errors$ = from(cli.stderr).pipe(toArray());
    const out$ = from(cli.stdout);

    const dataMsg$ = out$.pipe(
      filter((msg) => msg.includes(`{\\"source\\":\\"blocknative\\"`)),
    );

    expect(await eventsPromise).toMatchObject({
      source: "blocknative",
      system: "ethereum",
      network: "matic-main",
      unit: "gwei",
      maxPrice: 80,
      currentBlockNumber: 50210442,
      msSinceLastBlock: -97,
    });

    expect(await firstValueFrom(dataMsg$)).toBeDefined();

    await cli.exit();

    expect(await firstValueFrom(errors$)).toEqual([]);
  }, 20000);

  test("indexing ignore stream name", async ({
    configIgnoreNamePath,
    streamrClient,
  }) => {
    const catalogPath = "../sample_files/configured_catalog.json";
    const recordPath = "../sample_files/records.jsonl";
    const cli = await CLI.runWith([
      "write",
      "--config",
      configIgnoreNamePath,
      "--catalog",
      require.resolve(catalogPath),
    ]);
    const records = fs.readFileSync(require.resolve(recordPath));

    const subscription = await streamrClient.subscribe({
      streamId: singleTestStream,
    });
    const msgs$ = from(subscription).pipe(map((v) => v.content));

    const eventsPromise = firstValueFrom(msgs$);

    await sleep(3000);
    cli.stdin.write(records);

    const errors$ = from(cli.stderr).pipe(toArray());
    const out$ = from(cli.stdout);

    const dataMsg$ = out$.pipe(
      filter((msg) => msg.includes(`{\\"source\\":\\"blocknative\\"`)),
    );

    expect(await eventsPromise).toMatchObject({
      source: "blocknative",
      system: "ethereum",
      network: "matic-main",
      unit: "gwei",
      maxPrice: 80,
      currentBlockNumber: 50210442,
      msSinceLastBlock: -97,
    });

    expect(await firstValueFrom(dataMsg$)).toBeDefined();

    await cli.exit();

    expect(await firstValueFrom(errors$)).toEqual([]);
  }, 20000);

  test("indexing with stream name as property", async ({
    configWithPropertyPath,
    streamrClient,
  }) => {
    const catalogPath = "../sample_files/configured_catalog.json";
    const recordPath = "../sample_files/records.jsonl";
    const cli = await CLI.runWith([
      "write",
      "--config",
      configWithPropertyPath,
      "--catalog",
      require.resolve(catalogPath),
    ]);
    const records = fs.readFileSync(require.resolve(recordPath));

    const subscription = await streamrClient.subscribe({
      streamId: singleTestStream,
    });
    const msgs$ = from(subscription).pipe(map((v) => v.content));

    const eventsPromise = firstValueFrom(msgs$);

    await sleep(3000);
    cli.stdin.write(records);

    const errors$ = from(cli.stderr).pipe(toArray());
    const out$ = from(cli.stdout);

    const dataMsg$ = out$.pipe(
      filter((msg) => msg.includes(`{\\"source\\":\\"blocknative\\"`)),
    );

    expect(await eventsPromise).toMatchObject({
      "gas-station/polygon": {
        source: "blocknative",
        system: "ethereum",
        network: "matic-main",
        unit: "gwei",
        maxPrice: 80,
        currentBlockNumber: 50210442,
        msSinceLastBlock: -97,
      },
    });

    expect(await firstValueFrom(dataMsg$)).toBeDefined();

    await cli.exit();

    expect(await firstValueFrom(errors$)).toEqual([]);
  }, 20000);
});
