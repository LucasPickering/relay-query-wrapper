import { useContext } from "react";
import { OperationType } from "relay-runtime";
import { QueryRef } from "types";
import withQuery, { Options as WithQueryOptions } from "./withQuery";

interface Options<
  Query extends OperationType,
  Props,
  DataKeys extends keyof Props,
  Ctx extends QueryRef<Query>
> extends WithQueryOptions<Query, Props, DataKeys> {
  context: React.Context<Ctx>;
}

type ContextAccessorProps<InnerProps, DataKeys extends keyof InnerProps> = Omit<
  InnerProps,
  DataKeys | "queryRef"
>;

/**
 * A version of {@link withQuery} that loads the query ref from a React context
 * object, instead of a prop. The context must have the query ref stored under
 * the key `queryRef`.
 */
function withContextQuery<
  Query extends OperationType,
  Props,
  DataKeys extends keyof Props = keyof Props,
  Ctx extends QueryRef<Query> = QueryRef<Query>
>({
  context,
  ...rest
}: Options<Query, Props, DataKeys, Ctx>): (
  Component: React.FC<Props>
) => React.FC<ContextAccessorProps<Props, DataKeys>> {
  return (Component) => {
    const baseName = Component.displayName ?? Component.name;
    const WithQueryComponent = withQuery(rest)(Component);

    const ContextComponent: React.FC<ContextAccessorProps<Props, DataKeys>> = (
      props
    ) => {
      const { queryRef } = useContext(context);
      return <WithQueryComponent queryRef={queryRef} {...props} />;
    };
    ContextComponent.displayName = `${baseName}ContextAccessor`;

    return ContextComponent;
  };
}

export default withContextQuery;
