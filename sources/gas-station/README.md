## Data Sources
Data is currently sourced from:

- [Alchemy](https://www.alchemy.com/)
- [Ankr](https://www.ankr.com/)
- [Blocknative](https://www.blocknative.com/)
- [LLamaNodes](https://llamanodes.com/)



Each message has the following format:

```json
{
  "data": [
    {
      "source": "SOME_SOURCE",
      ...
    }
  ]
}
```

e.g. of data items:

```json
{
  "source": "ankr",
  "safeLow": {
    "maxFee": 243083221814,
    "maxPriorityFee": 25364874734
  },
  "standard": {
    "maxFee": 247997412077,
    "maxPriorityFee": 30279064997
  },
  "fast": {
    "maxFee": 259943930169,
    "maxPriorityFee": 42225583089
  },
  "rapid": {
    "maxFee": 280745110931,
    "maxPriorityFee": 63026763851
  },
  "estimatedBaseFee": 217718347080,
  "blockNumber": 50304192
}

```

### Response formats per source

**Blocknative:**

```json
{
  "source": "blocknative",
  "system": "...",
  "network": "...",
  "unit": "...",
  "maxPrice": ...,
  "currentBlockNumber": ...,
  "msSinceLastBlock": ...,
  "blockPrices": [
    ...
  ],
  "estimatedBaseFees": [
    ...
  ]
}
```

**Alchemy:**

```json
{
  "source": "alchemy",
  "lastBaseFeePerGas": ...,
  "maxFeePerGas": ...,
  "maxPriorityFeePerGas": ...,
  "gasPrice": ...
}
```

**Ankr:**

```json
{
  "source": "ankr",
  "safeLow": ...,
  "standard": ...,
  "fast": ...,
  "rapid": ...,
  "estimatedBaseFee": ...,
  "blockNumber": ...
}
```

**Llama:**

```json
{
  "source": "llama",
  "safeLow": ...,
  "standard": ...,
  "fast": ...,
  "rapid": ...,
  "estimatedBaseFee": ...,
  "blockNumber": ...
}
```

### **Networks with Corresponding Sources**

| Blockchain Network  | Blocknative | Alchemy | Ankr | Llama |
|---------------------|-------------|---------|------|-------|
| Polygon             | ✅           | ✅       | ✅    | ✅     |
| Arbitrum            |             | ✅       | ✅    | ✅     |
| Ethereum            | ✅           | ✅       |      | ✅     |
| Avalanche           |             |         | ✅    |       |
| Fantom              |             |         | ✅    |       |
| Binance Smart Chain |             |         |      | ✅     |
| Optimism            |             | ✅       | ✅    | ✅     |
| Base                |             | ✅       |      | ✅     |
| Astar               |             | ✅       |      |       |

### How to configure your pipeline

After following Airbyte guide’s and setting up a destination, you may configure by owning and setting **Alchemy** and *
*Block Native** API Keys on source parameters.

## Public Data Usage

To get started, refer to [LogStore Documentation](https://docs.logstore.usher.so/) to use the available public data. You
may find the address for the streams on the project’s page at Streamr Hub.

## Docker Images

We’ve made this docker image available:

```sh
docker pull public.ecr.aws/usherlabs/gas-station-source
```

## Resources

- [CodeSandbox Usage Demonstration](https://codesandbox.io/p/devbox/multi-chain-gas-station-data-streams-2h4krg)
