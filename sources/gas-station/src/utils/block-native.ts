import { fromFetch } from "rxjs/internal/observable/dom/fetch";
import { catchError, map, of } from "rxjs";
import {
  AnyObject,
  formatSourceResponse,
  SourceDictOfObservables,
} from "./common";

type BlockNativeNetworks = "ethereum" | "polygon";

// curl -H "Authorization: your-apikey-here" https://api.blocknative.com/gasprices/blockprices
const blockNativeEthereumGasStationFromKey = (apiKey: string) =>
  fromFetch<AnyObject>("https://api.blocknative.com/gasprices/blockprices", {
    headers: {
      Authorization: apiKey,
    },
    selector: (response) => response.json(),
  }).pipe(formatSourceResponse("blocknative"));

// curl -H "Authorization: your-apikey-here" "https://api.blocknative.com/gasprices/blockprices?chainid=137"
const blockNativePolygonGasStationFromKey = (apiKey: string) =>
  fromFetch<AnyObject>(
    "https://api.blocknative.com/gasprices/blockprices?chainid=137",
    {
      headers: {
        Authorization: apiKey,
      },
      selector: (response) => response.json(),
    },
  ).pipe(formatSourceResponse("blocknative"));

const invalidMsg = "Blocknative API key is invalid";
const checkApiKey = (apiKey: string) =>
  blockNativePolygonGasStationFromKey(apiKey).pipe(
    map((val) =>
      "msg" in val &&
      typeof val.msg === "string" &&
      val.msg.includes("Authorization header must")
        ? invalidMsg
        : true,
    ),
    // check if got no error
    catchError(() => {
      return of(invalidMsg);
    }),
  );

export const blockNativeNetworkGasStations = (apiKey: string) =>
  ({
    ethereum: blockNativeEthereumGasStationFromKey(apiKey),
    polygon: blockNativePolygonGasStationFromKey(apiKey),
    check: checkApiKey(apiKey),
  }) satisfies SourceDictOfObservables<BlockNativeNetworks>;
