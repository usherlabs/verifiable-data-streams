## Docker Images

We’ve made this docker image available:

```jsx
docker pull public.ecr.aws/usherlabs/streamr-destination
```

## Making the Stream Queriable

We use LogStore to store and query historical data from a stream. Staking LSAN to the stream is all it takes for our network to begin keeping it. Learn more about this at [our Docs](https://docs.logstore.usher.so/).

## Connector  Configuration

- **Private Key**: the wallet private key with permission to publish to the streams
- **Streamr Stream Name or Prefix**: See **Stream Name Behavior.**
- **Stream Name Behavior**:
    - **STREAM_NAME_AS_STREAMR_SUFFIX**: Use stream name (stream from Airbyte, not Streamr) as the suffix for the stream name on Streamr.
      E.g.: if your source connector has a stream named `ETH_USDT` and you configure the **Streamr Stream Name or Prefix** as `0x123...890/tickers/` then this data will be published to `0x123...890/tickers/ETH_USDT`. This is useful to split data into multiple Streamr streams from a single source connector.
    - **STREAM_NAME_AS_DATA_PROPERTY**: Use stream name from Airbyte as data property.
      E.g., you set **Streamr Stream Name or Prefix** as `0x123...890/tickers` and you have a stream named `ETH_USDT`, then your data will be published to `0x123...890/tickers` with the format `{ETH_USDT: {...data}}`
    - **IGNORE_STREAM_NAME**: Ignore the stream name from Airbyte. Use **Streamr Stream Name or Prefix** as stream name and publish data from any Airbyte’s Stream as is.
- **devNetUrl:** Optional field. Used in development to set up a different host for Streamr Network.

## Acknowledgments

This connector was inspired by the work on https://github.com/devmate-cloud/streamr-airbyte-connectors but was created as a separate repository for these substantial behavior changes described above.