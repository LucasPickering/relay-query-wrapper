# relay-query-wrapper

![npm version](https://img.shields.io/github/license/LucasPickering/relay-query-wrapper)
[![npm version](https://img.shields.io/npm/v/relay-query-wrapper)](https://www.npmjs.com/package/relay-query-wrapper)

A simple higher-order component that makes it easy to create complex Relay component trees. This makes it easy to:

- Present granular loading states
- Optionally render subcomponents based on the presence of data
- Share query data between with two components that are far apart in the component tree

This functionality is accomplished through the `withQuery` function.

## Examples

All examples use the [Star Wars GraphQL schema](https://studio.apollographql.com/public/star-wars-swapi/home). For plain JavaScript usage, simply exclude the typey parts.

### Basic Example

The main idea behind this wrapper is that you never had to handwrite a `usePreloadedQuery` or `useLazyLoadQuery` component yourself. Your components all just consume fragments, then the top-level component in the tree is wrapped in `withQuery`. You _do_ however still need `useQueryLoader` somewhere to trigger the query loading.

```typescript
// FilmList.tsx
interface Props {
  filmsConnectionKey: FilmList_filmsConnection$key;
}

const FilmList: React.FC<Props> = ({ filmsConnectionKey }) => {
  // This component just consumes a fragment key
  const filmsConnection = useFragment(
    graphql`
      fragment FilmList_filmsConnection on FilmsConnection {
        films {
          id
          title
        }
      }
    `,
    filmsConnectionKey
  );

  return (
    <ul>
      {filmsConnection.films.map((film) => (
        <li key={film.id}>{film.title}</li>
      ))}
    </ul>
  );
};

// We have to tell withQuery what prop (in this case filmsConnectionKey) we expect it to auto-populate
export default withQuery<FilmListQuery, Props, "filmsConnectionKey">({
  // The query that will populate this
  query: graphql`
    query FilmListQuery {
      allFilms {
        ...FilmList_filmsConnection
      }
    }
  `,
  // This maps the returned query data into props for your component
  dataToProps: (data) => data.allFilms && { filmsConnectionKey: data.allFilms },
  // Rendered *while the query is loading*
  fallbackElement: <span>Loading...</span>,
})(FilmList);
```

```typescript
// HomePage.tsx
import FilmList from "./FilmList";
import type { FilmListQuery as FilmListQueryType } from "./__generated__/FilmListQuery.graphql";
import FilmListQuery from "./__generated__/FilmListQuery.graphql";

const HomePage: React.FC = () => {
  const [queryRef, loadQuery] =
    useQueryLoader<FilmListQueryType>(FilmListQuery);

  // Load data on first render. Warning: this creates a render-then-fetch
  // pattern which is discouraged in Relay, but this is just an example
  useEffect(() => {
    loadQuery({});
  }, [loadQuery]);

  return <FilmList queryRef={queryRef} />;
};
```

### Passthrough Props

Your wrapped component can accept props other than your query data:

```typescript
// FilmList.tsx
interface Props {
  filmsConnectionKey: FilmList_filmsConnection$key;
  color: string;
}

const FilmList: React.FC<Props> = ({ filmsConnectionKey, color }) => {
  // Component contents are the same as the basic example, but you can access
  // the color prop now
};

export default withQuery<FilmListQuery, Props, "filmsConnectionKey">({
  // This still only needs to populate the Relay key. All other props are pass
  // through transparently.
  dataToProps: (data) => data.allFilms && { filmsConnectionKey: data.allFilms },
  // Omitting other fields from the basic example...
})(FilmList);
```

```typescript
// HomePage.tsx
const HomePage: React.FC = () => {
  // Omitting useQueryLoader from the basic example...
  return <FilmList queryRef={queryRef} color="red" />;
};
```

### Multiple Consumers

You can easily have multiple disjoint components consume the same query, simply by using multiple instances of `withQuery`. You need to give them a common query definition though.

Note: This example is substantially simplified, in practice you would simply use a fragment with a common parent for this use case. But in sufficiently complex UIs, you may need two disjoint query consumers, in which case this pattern comes in handy.

```typescript
// queries.ts

// The query name has to start with the file name, hence `queriesFilmListQuery`
const filmListQuery = graphql`
  query queriesFilmListQuery {
    allFilms {
      ...FilmList_filmsConnection
    }
  }
`;
```

```typescript
// FilmList.tsx
// Omitting component definition from the basic example...

export default withQuery<queriesProblemQuery, Props, "filmsConnectionKey">({
  // The query that will populate this
  query: filmListQuery,
  // Omitting other fields from the basic example...
})(FilmList);
```

```typescript
// FilmList2.tsx

// Imagine another consumer of the same query data, identical to FilmList.tsx
```

```typescript
// HomePage.tsx
import FilmList from "./FilmList";
import FilmList2 from "./FilmList2";
// Notice we import the generated query still, *not* the value directly from
// queries.ts
import type { queriesFilmListQuery as queriesFilmListQueryType } from "./__generated__/queriesFilmListQuery.graphql";
import queriesFilmListQuery from "./__generated__/queriesFilmListQuery.graphql";

const HomePage: React.FC = () => {
  // We'll use this query ref for both film lists, meaning we only have to make
  // the query once.
  const [queryRef, loadQuery] =
    useQueryLoader<queriesFilmListQueryType>(queriesFilmListQuery);

  // Load data on first render. Warning: this creates a render-then-fetch
  // pattern which is discouraged in Relay, but this is just an example
  useEffect(() => {
    loadQuery({});
  }, [loadQuery]);

  return (
    <div>
      <FilmList queryRef={queryRef} />
      <FilmList2 queryRef={queryRef} />
    </div>
  );
};
```

### Optional Rendering

`withQuery` lets you easily render a query-consuming component only under certain circumstances. For example, if you have a search bar and only want to render data once a film ID is entered:

```typescript
// FilmDetail.tsx
interface Props {
  filmKey: FilmDetail_film$key;
}

const FilmDetail: React.FC<Props> = ({ filmKey }) => {
  const film = useFragment(
    graphql`
      fragment FilmDetail_film on Film {
        title
      }
    `,
    filmKey
  );

  return <div>The name of this film is: {film.title}</div>;
};

export default withQuery<FilmListQuery, Props, "filmKey">({
  query: graphql`
    query FilmQuery($filmID: ID!) {
      film(filmID: $filmID) {
        ...FilmDetail_film
      }
    }
  `,
  dataToProps: (data) => data.film && { filmKey: data.film },
  fallbackElement: <span>Loading...</span>,
  // Rendered when no search term is entered, i.e. before query starts
  preloadElement: <span>Search for a film</span>,
  // Rendered if the query comes up empty, i.e. dataToProps returns null
  noDataElement: <span>Film not found!</span>,
})(FilmList);
```

```typescript
// HomePage.tsx
import FilmDetail from "./FilmDetail";
import type { FilmQuery as FilmQueryType } from "./__generated__/FilmQuery.graphql";
import FilmQuery from "./__generated__/FilmQuery.graphql";

const HomePage: React.FC = () => {
  const [filmId, setFilmID] = useState("");

  // We'll use this query ref for both film lists, meaning we only have to make
  // the query once.
  const [queryRef, loadQuery, disposeQuery] =
    useQueryLoader<FilmQueryType>(FilmQuery);

  // Reload the query
  useEffect(() => {
    if (filmID) {
      loadQuery({ filmID });
    } else {
      // If the search bar is cleared out, we want to stop showing results
      disposeQuery();
    }
  }, [loadQuery, filmID]);

  // queryRef will be null before the first fetch. The wrapped FilmDetail will
  // automatically render a predefined placeholder until the user searches
  return (
    <div>
      <SearchBar filmID={filmID} setFilmID={setFilmID} />
      <FilmDetail queryRef={queryRef} />
    </div>
  );
};
```

### Loading Query Ref from Context

Occasionally, you want to store a Relay query ref in context rather than passing it as a prop. You can easily create a consumer of this using `withContextQuery`:

```typescript
// FilmListQueryContext.ts
const FilmListQueryContext = React.createContext<{
  // The query ref *has* to be stored under this key!
  queryRef: PreloadedQuery<FilmListQuery> | null | undefined;
}>({});
```

```typescript
import FilmListQueryContext from "./FilmListQueryContext";

// FilmList.tsx
interface Props {
  filmsConnectionKey: FilmList_filmsConnection$key;
}

const FilmList: React.FC<Props> = ({ filmsConnectionKey }) => {
  // This component just consumes a fragment key
  const filmsConnection = useFragment(
    graphql`
      fragment FilmList_filmsConnection on FilmsConnection {
        films {
          id
          title
        }
      }
    `,
    filmsConnectionKey
  );

  return (
    <ul>
      {filmsConnection.films.map((film) => (
        <li key={film.id}>{film.title}</li>
      ))}
    </ul>
  );
};

export default withContextQuery<FilmListQuery, Props>({
  // We'll load the queryRef from this context, instead of a prop
  context: FilmListQueryContext,
  query: graphql`
    query FilmListQuery {
      allFilms {
        ...FilmList_filmsConnection
      }
    }
  `,
  dataToProps: (data) => data.allFilms && { filmsConnectionKey: data.allFilms },
  fallbackElement: <span>Loading...</span>,
})(FilmList);
```

```typescript
// HomePage.tsx
import FilmList from "./FilmList";
import FilmListQueryContext from "./FilmListQueryContext";
import type { FilmListQuery as FilmListQueryType } from "./__generated__/FilmListQuery.graphql";
import FilmListQuery from "./__generated__/FilmListQuery.graphql";

const HomePage: React.FC = () => {
  const [queryRef, loadQuery] =
    useQueryLoader<FilmListQueryType>(FilmListQuery);

  useEffect(() => {
    loadQuery({});
  }, [loadQuery]);

  return (
    <FilmListQueryContext.Provider value={{ queryRef }}>
      <FilmList />
    </FilmListQueryContext.Provider>
  );
};
```
