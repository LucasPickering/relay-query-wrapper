import { PreloadedQuery } from "react-relay";
import { OperationType } from "relay-runtime";

export interface QueryRef<Query extends OperationType> {
  queryRef: PreloadedQuery<Query> | null | undefined;
}
