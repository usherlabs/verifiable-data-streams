import { Web3, Web3Eth } from "web3";

function formatFeeHistory(
  result: Awaited<ReturnType<Web3Eth["getFeeHistory"]>>,
  includePending?: boolean,
) {
  const numberOfBlocks = result.gasUsedRatio.length;
  const blockNums = Array.from(
    { length: numberOfBlocks },
    (_, i) => Number(result.oldestBlock) + i,
  );

  // @ts-expect-error there's an error at web3 types
  const baseFeePerGas = result.baseFeePerGas as bigint[];
  const blocks = blockNums.map((blockNum, index) => ({
    number: blockNum as string | number,
    baseFeePerGas: Number(baseFeePerGas[index]),
    gasUsedRatio: Number(result.gasUsedRatio[index]),
    priorityFeePerGas: result.reward[index].map(Number),
  }));

  if (includePending) {
    blocks.push({
      number: "pending",
      baseFeePerGas: Number(baseFeePerGas[numberOfBlocks]),
      gasUsedRatio: NaN,
      priorityFeePerGas: [],
    });
  }

  return blocks;
}

function avg(arr: number[]) {
  const sum = arr.reduce((a, v) => a + v);
  return Math.round(sum / arr.length);
}

export const getFeeOptionsFromWeb3 = async (web3: Web3) => {
  const feeHistory = await web3.eth.getFeeHistory(
    20,
    "pending",
    [10, 25, 60, 85],
  );
  const blocks = formatFeeHistory(feeHistory, false);

  const slow = avg(blocks.map((b) => b.priorityFeePerGas[0]));
  const average = avg(blocks.map((b) => b.priorityFeePerGas[1]));
  const fast = avg(blocks.map((b) => b.priorityFeePerGas[2]));
  const rapid = avg(blocks.map((b) => b.priorityFeePerGas[3]));

  const pendingBlock = await web3.eth.getBlock("pending");
  const baseFeePerGas = Number(pendingBlock.baseFeePerGas);
  const latestBlock = blocks[blocks.length - 1];
  return {
    safeLow: { maxFee: slow + baseFeePerGas, maxPriorityFee: slow },
    standard: { maxFee: average + baseFeePerGas, maxPriorityFee: average },
    fast: { maxFee: fast + baseFeePerGas, maxPriorityFee: fast },
    rapid: { maxFee: rapid + baseFeePerGas, maxPriorityFee: rapid },
    estimatedBaseFee: baseFeePerGas,
    blockNumber: latestBlock.number,
  };
};
