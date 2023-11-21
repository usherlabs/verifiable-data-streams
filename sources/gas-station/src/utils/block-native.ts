import { fromFetch } from "rxjs/internal/observable/dom/fetch";
import { catchError, map, of } from "rxjs";
import { AnyObject, mapToSource, SourceDictOfObservables } from "./common";

// curl -H "Authorization: your-apikey-here" https://api.blocknative.com/gasprices/blockprices
const blockNativeEthereumGasStationFromKey = (apiKey: string) =>
  fromFetch<AnyObject>("https://api.blocknative.com/gasprices/blockprices", {
    headers: {
      Authorization: apiKey,
    },
    selector: (response) => response.json(),
  }).pipe(mapToSource("blocknative"));

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
  ).pipe(mapToSource("blocknative"));

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

export const blockNativeNetworkGasStations = {
  ethereum: blockNativeEthereumGasStationFromKey,
  polygon: blockNativePolygonGasStationFromKey,
  check: checkApiKey,
} satisfies SourceDictOfObservables;
