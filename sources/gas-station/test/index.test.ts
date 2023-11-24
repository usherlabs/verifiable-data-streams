import { describe, expect, test } from "vitest";
import { blockNativeNetworkGasStations } from "../src/utils/block-native";
import { catchError, firstValueFrom, merge, tap } from "rxjs";
import { alchemyNetworkGasStations } from "../src/utils/alchemy";
import { BigNumber } from "alchemy-sdk";
import { ankrNetworkGasStations } from "../src/utils/ankr";
import { llamaNetworkGasStations } from "../src/utils/llamarpc";

describe("block native", () => {
  const apiKey = process.env.BLOCK_NATIVE_KEY!;
  test("check works", async () => {
    const res = await firstValueFrom(
      blockNativeNetworkGasStations(apiKey).check,
    );
    expect(res).toBe(true);
  });

  test("invalid key returns false check", async () => {
    const res = await firstValueFrom(
      blockNativeNetworkGasStations("invalid").check,
    );
    expect(res).toBe("Blocknative API key is invalid");
  });

  test("polygon works", async () => {
    const res = await firstValueFrom(
      blockNativeNetworkGasStations(apiKey).polygon,
    );
    expect(res.source).toBe("blocknative");
    expect(res).toMatchObject({
      source: "blocknative",
      network: "matic-main",
      system: "ethereum",
      unit: "gwei",
    });
  });

  test("ethereum works", async () => {
    const res = await firstValueFrom(
      blockNativeNetworkGasStations(apiKey).ethereum,
    );
    expect(res.source).toBe("blocknative");
    expect(res).toMatchObject({
      source: "blocknative",
      network: "main",
      system: "ethereum",
      unit: "gwei",
    });
  });
});

describe("alchemy", () => {
  const apiKey = process.env.ALCHEMY_KEY!;

  const expectedAlchemyShape = {
    data: {
      gasPrice: expect.any(BigNumber),
      lastBaseFeePerGas: expect.any(BigNumber),
      maxFeePerGas: expect.any(BigNumber),
      maxPriorityFeePerGas: expect.any(BigNumber),
    },
    source: "alchemy",
  };

  test("check works", async () => {
    const res = await firstValueFrom(alchemyNetworkGasStations(apiKey).check);
    expect(res).toBe(true);
  });

  test("invalid key returns false check", async () => {
    const res = await firstValueFrom(
      alchemyNetworkGasStations.check("invalid"),
    );
    expect(res).toBe("Alchemy API key is invalid");
  });

  test("ethereum works", async () => {
    const res = await firstValueFrom(
      alchemyNetworkGasStations(apiKey).ethereum,
    );
    expect(res.source).toBe("alchemy");
    expect(res).toMatchObject(expectedAlchemyShape);
  });

  test("polygon works", async () => {
    const res = await firstValueFrom(alchemyNetworkGasStations(apiKey).polygon);
    expect(res.source).toBe("alchemy");
    expect(res).toEqual(expectedAlchemyShape);
  });
});

describe(
  "ankr",
  () => {
    test("single network work", async () => {
      const res = await firstValueFrom(ankrNetworkGasStations.polygon);

      expect(res).toMatchObject({
        source: "ankr",
        blockNumber: expect.any(Number),
        estimatedBaseFee: expect.any(Number),
        fast: {
          maxFee: expect.any(Number),
          maxPriorityFee: expect.any(Number),
        },
        safeLow: {
          maxFee: expect.any(Number),
          maxPriorityFee: expect.any(Number),
        },
        standard: {
          maxFee: expect.any(Number),
          maxPriorityFee: expect.any(Number),
        },
        rapid: {
          maxFee: expect.any(Number),
          maxPriorityFee: expect.any(Number),
        },
      });
    });
    test("All networks work", async () => {
      const { check, ...allFns } = ankrNetworkGasStations;
      const results$ = Object.entries(allFns).map(([network, src]) => {
        return src.pipe(
          tap((res) => console.log(`Got response for ${network}`, res)),
          catchError((e) => {
            console.error(`Error on ${network}`, e);
            return [];
          }),
        );
      });
      const fnExecution$ = merge(...results$);
      for await (const res of fnExecution$) {
        console.log("Got response from ankr", res);
        expect(res).toMatchObject({
          source: "ankr",
          blockNumber: expect.any(Number),
          estimatedBaseFee: expect.any(Number),
          fast: {
            maxFee: expect.any(Number),
            maxPriorityFee: expect.any(Number),
          },
          safeLow: {
            maxFee: expect.any(Number),
            maxPriorityFee: expect.any(Number),
          },
          standard: {
            maxFee: expect.any(Number),
            maxPriorityFee: expect.any(Number),
          },
          rapid: {
            maxFee: expect.any(Number),
            maxPriorityFee: expect.any(Number),
          },
        });
      }
    });
  },
  { timeout: 40_000 },
);

describe("llama", () => {
  test("single network work", async () => {
    const res = await firstValueFrom(llamaNetworkGasStations.polygon);
    expect(res).toMatchObject({
      source: "llama",
      blockNumber: expect.any(Number),
      estimatedBaseFee: expect.any(Number),
      fast: {
        maxFee: expect.any(Number),
        maxPriorityFee: expect.any(Number),
      },
      safeLow: {
        maxFee: expect.any(Number),
        maxPriorityFee: expect.any(Number),
      },
      standard: {
        maxFee: expect.any(Number),
        maxPriorityFee: expect.any(Number),
      },
      rapid: {
        maxFee: expect.any(Number),
        maxPriorityFee: expect.any(Number),
      },
    });
  });
  test(
    "All networks work",
    async () => {
      const { check, ...allFns } = llamaNetworkGasStations;
      const results$ = Object.entries(allFns).map(([network, src]) => {
        return src.pipe(
          tap((res) => console.log(`Got response for ${network}`, res)),
          catchError((e) => {
            console.error(`Error on ${network}`, e);
            return [];
          }),
        );
      });
      const fnExecution$ = merge(...results$);
      for await (const res of fnExecution$) {
        expect(res).toMatchObject({
          source: "llama",
          blockNumber: expect.any(Number),
          estimatedBaseFee: expect.any(Number),
          fast: {
            maxFee: expect.any(Number),
            maxPriorityFee: expect.any(Number),
          },
          safeLow: {
            maxFee: expect.any(Number),
            maxPriorityFee: expect.any(Number),
          },
          standard: {
            maxFee: expect.any(Number),
            maxPriorityFee: expect.any(Number),
          },
          rapid: {
            maxFee: expect.any(Number),
            maxPriorityFee: expect.any(Number),
          },
        });
      }
    },
    { timeout: 40_000 },
  );
});
