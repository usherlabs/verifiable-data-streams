import { catchError, map, Observable, pipe, throwError } from "rxjs";
import { VError } from "@netflix/nerror";

export type AnyObject = {
  [key: string]: unknown;
};
export type Sources = "blocknative" | "alchemy" | "ankr" | "llama";
export type Networks = (typeof networkList)[number];

export const networkList = [
  "ethereum",
  "polygon",
  "arbitrum",
  "optimism",
  "astar",
  "base",
  "bsc",
  "fantom",
  "avalanche",
] as const;

export const formatSourceResponse = (sourceType: Sources) =>
  pipe(
    map(<T extends object>(data: T) => ({
      source: sourceType,
      ...data,
    })),
    catchError((err) => {
      return throwError(() => new VError(err, `Error in ${sourceType}`));
    }),
  );

export type SourceDictOfObservables<N extends Networks = Networks> = {
  [key in N]: Observable<{
    source: Sources;
  }>;
} & {
  check: Observable<true | string>;
};
