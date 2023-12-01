Welcome to the **Verifiable Data Sources** repository from UsherLabs, a hub hosting public, verifiable, and tamper-proof
data sources powered by innovative technologies such
as [Airbyte](https://airbyte.com/), [Streamr](https://streamr.network/), and [LogStore](https://www.usher.so/logstore/).
This repository is dedicated to providing public data streams for various applications, ensuring data accuracy and
accessibility.

### **Key Features:**

- **Integration with Airbyte, Streamr, and LogStore:** Leverage these platforms for efficient data streaming and
  querying.
- **Historical Data Querying:** Access historical data using LogStore with LSAN tokens.
- **Broad Airbyte Connectors Compatibility:** Extend functionalities by
  incorporating [any Airbyte connector](https://airbyte.com/connectors?connector-type=Sources) to channel data into your
  personalized stream.

## **Getting Started**

To start building more resources in this repository, ensure the following requirements are met:

- Node.js (version 18 or higher)
- Package Manager: **`pnpm`**

Otherwise, if you plan to consume data from one of these sources, you may find the project at Streamr Hub
and [learn how to query data from it using LogStore](https://docs.logstore.usher.so/network/sdk/getting-started).

## **Resources**

### **Data Sources and Destinations**

| Name                    | Type        | Links                                                                                                               | Description                                                                                                                    |
|-------------------------|-------------|---------------------------------------------------------------------------------------------------------------------|--------------------------------------------------------------------------------------------------------------------------------|
| Multi-Chain Gas Station | Source      | [GitHub](https://github.com/usherlabs/verifiable-data-streams/sources/gas-station) </br>[Streamr Hub](https://streamr.network/hub/projects/0x833774c6a6bcffdc67289895167d1190b738803502c89a451bbfd13076e4a61b/overview)</br>[Usage Demo](https://codesandbox.io/p/devbox/multi-chain-gas-station-data-streams-2h4krg) | Track and analyze gas prices across different blockchains.                                                                     |
| Streamr Destination     | Destination | [GitHub](https://github.com/devmate-cloud/streamr-airbyte-connectors/tree/main)                                     | Enhanced flexibility in data publishing, inspired by existing Streamr-Airbyte connectors but with specific capabilities added. |

### **Querying Historical Data**

To query historical data using LogStore, it's essential to own and stake LSAN tokens. For detailed instructions, refer
to the [LogStore Documentation](https://docs.logstore.usher.so/network/cli/getting-started).

## **Development**

### **Building a Connector**

To contribute by building a new connector, follow these steps:

1. Clone the repository.
2. Run **`pnpm install`** to install dependencies.
3. Build a Docker image for the connector. For example, for the Gas Station source connector:

    ```bash
    docker build . --build-arg path=sources/gas-station -t <image-name>
    ```

4. Run the Docker image:

    ```bash
    docker run <image-name>
    ```

### **Useful Links**

- [Airbyte Documentation](https://docs.airbyte.com/) - Learn how to build or use an Airbyte connector.
- [LogStore Documentation](https://docs.logstore.usher.so/) - Detailed information on using LogStore for data querying.
- [Gas Station Project Page at Streamr Hub](https://streamr.network/hub/projects/0x833774c6a6bcffdc67289895167d1190b738803502c89a451bbfd13076e4a61b/overview) - List of available streams

## **Contributing**

Feel free to contribute to this project! Whether adding a new data source, improving existing connectors, or providing
feedback, your input is valuable. Visit our [GitHub Repository](https://github.com/usherlabs/verifiable-data-streams) to
get started.
