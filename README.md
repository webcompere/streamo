# Streamo

![TypeScript](https://img.shields.io/badge/typescript-%23007ACC.svg?logo=typescript&logoColor=white)
![Build](https://github.com/webcompere/streamo/actions/workflows/build.yml/badge.svg?branch=main)
[![codecov](https://codecov.io/gh/webcompere/streamo/graph/badge.svg?token=tDhFT9GVCf)](https://codecov.io/gh/webcompere/streamo)

A TypeScript implementation of collection streaming. Loosely based on Java's Streaming API.

## Primary Use Case and Rationale

Consider the following code:

```ts
const array = [1, 2, 3];
const doubled = array.map((item) => item * 2);
const asString = doubled.map((item) => `${item}`);
const filtered = asString.filter((item) => item !== '6');
const count = filtered.length;
```

In this example, we've created 3 additional instances of the array to get to the end result.

With streaming, we can operate over much larger quantities of data, and each `map` or `filter` operation applies on the fly.

```ts
const count = Stream.of(1, 2, 3)
  .map((item) => item * 2)
  .map((item) => `${item}`)
  .filter((item) => item !== '6')
  .count();
```

Here, the map and filter operations modify the stream and it's only the count operation which causes iteration to occur, with the data transformed on the fly.

This really comes into its own when we're searching:

```ts
const firstEvenNumber = Stream.of(1, 1, 2, 8, 8, 8, 8, 8)
  .filter((item) => item % 2 === 0)
  .findFirst();

console.log(firstEvenNumber.orElse('unknown'));
```

Here the first even number is `2`. The `findFirst` method returns an `Optional<number>` in this case,
which contains the `2`. The array is not converted into a full filtered copied of the original by calling the `filter` function
8 times. Instead, the filter function is called until we find our first even number and then we stop.

The `Optional` class, also copied from Java, is a way to represent a value, or the absence of a value, as
found in a stream.

## Build

Built with Node 18 and TypeScript

Built with `pnpm`

```bash
# install pnpm
npm i -g pnpm

# prepare for pnpm
pnpm i

# run the full build
pnpm run ci

# run the tests in watch mode
pnpm test:watch

# or just run the tests
pnpm test

# fix linting issues
pnpm lint:fix
```

## Contributing

This project is still incubating. Please feel free to raise issues, but we're not taking PRs at this time.


## TODO

- collectors
  - groupingBy
  - maxBy
  - minBy
- gather
- provide examples and README
- publish to npm

- async stuff