import { map, Observable } from "rxjs";

export type AnyObject = {
  [key: string]: unknown;
};
export type Sources = "blocknative" | "alchemy" | "quicknode";
export type Networks = "ethereum" | "polygon" | "avalanche";

export const mapToSource = (sourceType: Sources) =>
  map(<T extends object>(data: T) => ({
    source: sourceType,
    ...data,
  }));

type FunctionReturning<T> = (...args: any[]) => T;
export type SourceDictOfObservables = {
  [key in Networks]?: FunctionReturning<
    Observable<{
      source: Sources;
    }>
  >;
} & {
  check: FunctionReturning<Observable<true | string>>;
};
