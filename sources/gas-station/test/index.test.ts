import { describe, expect, test } from "vitest";
import { blockNativeNetworkGasStations } from "../src/utils/block-native";
import { firstValueFrom } from "rxjs";
import { alchemyNetworkGasStations } from "../src/utils/alchemy";
import { BigNumber } from "alchemy-sdk";

describe("block native", () => {
  const apiKey = process.env.BLOCK_NATIVE_KEY!;
  test("check works", async () => {
    const res = await firstValueFrom(
      blockNativeNetworkGasStations.check(apiKey),
    );
    expect(res).toBe(true);
  });

  test("invalid key returns false check", async () => {
    const res = await firstValueFrom(
      blockNativeNetworkGasStations.check("invalid"),
    );
    expect(res).toBe("Blocknative API key is invalid");
  });

  test("polygon works", async () => {
    const res = await firstValueFrom(
      blockNativeNetworkGasStations.polygon(apiKey),
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
      blockNativeNetworkGasStations.ethereum(apiKey),
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
    const res = await firstValueFrom(alchemyNetworkGasStations.check(apiKey));
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
      alchemyNetworkGasStations.ethereum(apiKey),
    );
    expect(res.source).toBe("alchemy");
    expect(res).toMatchObject(expectedAlchemyShape);
  });

  test("polygon works", async () => {
    const res = await firstValueFrom(alchemyNetworkGasStations.polygon(apiKey));
    expect(res.source).toBe("alchemy");
    expect(res).toEqual(expectedAlchemyShape);
  });
});
