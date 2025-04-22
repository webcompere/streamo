# Streamo

![TypeScript](https://img.shields.io/badge/typescript-%23007ACC.svg?logo=typescript&logoColor=white)
[![npm](https://img.shields.io/npm/v/%40webcompere%2Fstreamo)](https://www.npmjs.com/package/@webcompere/streamo)
![Build](https://github.com/webcompere/streamo/actions/workflows/build.yml/badge.svg?branch=main)
[![codecov](https://codecov.io/gh/webcompere/streamo/graph/badge.svg?token=tDhFT9GVCf)](https://codecov.io/gh/webcompere/streamo)

A TypeScript implementation of collection streaming. Loosely based on Java's Streaming API.

## Primary Use Case and Rationale

Consider the following code:

```ts
const count = [1, 2, 3]
  .map((item) => item * 2);
  .map((item) => `${item}`);
  .filter((item) => item !== '6')
  .length;
```

In this example, we've created 3 instances of the array to get to the end result. With a streaming
operation, we iterate the data through each operation and do not need to create intermediate arrays:

```ts
import { Stream } from '@webcompere/streamo';

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
which contains the `2`. Unlike with JavaScript arrays, the array is not converted into a fully filtered
copy of the original by calling the predicate, provided to `filter` 8 times. Instead, the data is streamed
until `findFirst` gets its first result.

The `Optional` class, also copied from Java, is a way to represent a value, or the absence of a value, as
found in a stream.

## Usage

### Overview

- Create a `Stream` from some source data
- Apply operations like `distinct`, `sorted`, `map` or `filter` to change the data passing through it
- Use `skip`, `limit`, `takeWhile`, or `dropWhile`, to trim the data available
- Then use a terminal operation to get a final result, such as `findFirst`, `anyMatch`, `noneMatch`, `count`, `toArray`, `max`, `min`, `reduce`, or `collect`

There's a special subtype of `Stream` for numbers - `NumberStream` which allows a `sum` operator, and some
useful default comparators for sorting/max/min.

> Note: Streams can only be used once. Once we reach a terminal operation, we cannot
> call any other functions on the stream.

### Create a Stream

#### Streams of Literals

If we have an array, we can use `ofArray`:

```ts
const myArray = ['a', 'b', 'c'];
const strings = Stream.ofArray(myArray);
```

If we have some absolute values we can use `of`:

```ts
const strings = Stream.of('a', 'b', 'c');
```

#### Number Streams

We can construct a stream of `number` using `ofNumbers`:

```ts
const numbers = Stream.ofNumbers(1, 2, 3);
```

And if we have a stream of something we want to make into a number stream, we can map
it to a number stream with `mapToNumber` that converts the items into numbers:

```ts
const arrayOfStrings = ['1', '2', '3'];
const numbers = Stream.ofArray(arrayOfStrings).mapToNumber((num) => +num);
```

which means we can use `NumberStream` methods like `sum`:

```ts
expect(numbers.sum()).toBe(6);
```

#### Streams of Entries

We can also create a stream of the entries from a `Map` or the key value pairs from an `Object`:

```ts
const map = new Map<string, string>([
  ['a', 'b'],
  ['c', 'd'],
]);

const streamOfEntries = Stream.ofMap(map);
```

which will allow us to filter the key value pairs, or collect them into an object:

```ts
expect(streamOfEntries.collect(Collectors.toObjectFromEntries())).toEqual({
  a: 'b',
  c: 'd',
});
```

If we need to provide an empty stream, then `Stream.empty()` will do so.

#### Joining Streams

If we have multiple streams, we can add them together with `Stream.concat`:

```ts
const superStream = Stream.concat(Stream.of(1, 2, 3), Stream.of(4, 5, 6));
```

### Familiar Operations from Array

Functions like `map`, `flatMap`, `filter` and `reduce` are familiar from `Array`.

#### Filtering

```ts
const filtered = Stream.of('a', 'b', 'cc', 'd')
  .filter((item) => item.length === 1)
  .toArray(); // a, b, d
```

> Note: if we're just doing a single operation and then converting back to array, then there's
> no advantage of using `Stream`. The runtime advantages of stream take effect with multiple operations
> and the ability to compose functions to route just enough data from a producer to a consumer

#### Mapping

We can also use `map`:

```ts
const mapped = Stream.of({ name: 'Bill' }, { name: 'Bob' })
  .map((item) => item.name)
  .toArray(); // Bill, Bob
```

If we want to map to a `Stream` and have the individual elements of that stream pass down to the following
operators, then we use flat map.

```ts
// stream of two arrays
const individualItems = Stream.of([1, 2, 3], [4, 5, 6])
  .flatMap((array) => Stream.ofArray(array))
  .count(); // will receive 6 items
```

#### Reducing

For reduce we have two options. We can reduce using a single binary operator:

```ts
const reduced = Stream.of('A', 'B', 'C').reduce((a, b) => a + b); // Optional.of('ABC')

// get the value from the optional
expect(reduced.get()).toBe('ABC');
```

When reducing with a binary operator, there's a chance that the stream is empty, so the result is wrapped
in an `Optional`. If we use `reduceFrom` where we supply an initial value, then even if the stream
is empty, there's a guaranteed value.

```ts
const reduced = Stream.of('A', 'B', 'C').reduceFrom(
  '',
  (a, b) => a + b,
  identity
);
expect(reduced).toBe('ABC');
```

The `reduceFrom` function takes three inputs:

- `initialValue` - the starting value
- `accumulator` - a binary operation which takes the accumulator and the next value and adds them together to make the new accumulator
- `converter` - a function which converts from element values to the type of the accumulator

In the above example, we're accumulating in the same type as the element type - `string` - so we can use the convenience function `identity` with the `reduceFrom` function.

### Searching Functions

#### Find First

We can stop iteration at the first available value with `findFirst`. This can be supplied with a predicate
of its own for a search, or can be placed after various `map` and `filter` operations so that it
pulls the items through the stream until it reaches the first one. It returns an `Optional`:

```ts
// no first item on an empty stream
expect(Stream.empty().findFirst().isPresent()).toBeFalsy();

// find first even number
expect(
  Stream.of(1, 2, 3)
    .findFirst((num) => num % 2 === 0)
    .get()
).toBe(2);

// find first number after an even filter
expect(
  Stream.of(1, 2, 3)
    .filter((num) => num % 2 === 0)
    .findFirst()
    .get()
).toBe(2);
```

#### Matching

We can check if any items match a predicate using `anyMatch`. This is like `Array.prototype.some()`:

```ts
expect(Stream.of(1, 2, 3).anyMatch((item) => item === 2)).toBeTruthy();
```

We can check if no items match a predicate using `noneMatch`:

```ts
expect(Stream.of(1, 2, 3).noneMatch((item) => item === 2)).toBeFalsy();
```

We can check if all items match a preciate using `allMatch`:

```ts
expect(Stream.of(1, 2, 3).allMatch((item) => item < 100)).toBeTruthy();
```

### Terminal Operations

> Calling a terminal operation causes the iterators to run. These cannot be run more than
> once, as the stream is used up. Do not reuse a stream after a terminal operation is used.

#### Embedded Collectors

The `toArray` function will collect the items into an array;

```ts
expect(Stream.of('a', 'b', 'c').toArray()).toEqual(['a', 'b', 'c']);
```

The `toMap` function will collect the items into a `Map`;

```ts
const expectedMap = new Map<string, { name: string; age: number }>();
expectedMap.set('John', { name: 'John', age: 41 });
expectedMap.set('Bill', { name: 'Bill', age: 23 });

expect(
  Stream.of({ name: 'John', age: 41 }, { name: 'Bill', age: 23 }).toMap(
    (item) => item.name,
    identity
  )
).toEqual(expectedMap);
```

We need to provide a `keyMapper` and a `valueMapper` function. In this example, the utility function `identity` is called to map the object to itself as the value in the map.

To get the maximum item in a `Stream` we use `max` (and for the minimum we use `min`):

```ts
const maxString = Stream.of('a', 'b', 'c)
   .max(compareString); // an optional, containing 'c'
```

The result is an `Optional` which is empty when the `Stream` is empty.

We need to provide a comparator here, for which the utility function `compareString` can help us. If we're
using a `NumberStream` the comparator defaults to `compareNumber` and, thus, is optional.

We can build a comparator of a property using `comparingBy`:

```ts
const maxElement = Stream.of({ name: 'a', val: 1 }, { name: 'b', val: 2 }).max(
  comparingBy((element) => element.name, compareString)
);
```

`comparingBy` lets us compose a comparator from a function to select the property of the item, and then another
comparator. Or we can build our own comparator from scratch, following the same rules as a [sorting `compareFn`](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Array/sort#description) in
JavaScript.

#### Collectors

The `collect` function uses a `Collector` to produce a final value from the contents of the Stream. This is
similar to `reduceFrom` but collector objects are also composable. The `Collectors` class contains some ready
made objects. Let's look at collecting to an array as an example:

```ts
const array = Stream.of('foo', 'bar').collect(Collectors.toArray()); // ['foo', 'bar']
```

The collector uses three functions:

- `supplier` - create an empty accumulator
- `accumulator` - adds the next element to the accumulator
- `finisher` - converts the accumulator into the final returned object

Other `Collectors` functions include:

- `toObject` - called with a key mapper (which must map to `string`) and value mapper - this produces a `Record<string, V>` from the stream
- `toObjectFromEntries` - does the same, but assuming the stream is already make of `Entry` objects from an original `Map` or `Record`
- `toMap` - as with `toObject` but the key mapper can map to anything
- `toMapFromEntries` - as above
- `counting` - will count the number of entries in the stream
- `summming` - can be used with `Stream<number>` or `NumberStream` and provides the sum of the values
- `averaging` - can be used with `Stream<number>` or `NumberStream` and calculates mean average - returning `Nan` if there are no values
- `joining` - allows optional `delimiter`, `prefix` and `suffix`, and can only operate on `Stream<string>` (map items to string using `map` if necessary)
- `collectingAndThen` - allows us to first apply a collector and then apply a mapping function to convert the output of that to something else
- `minBy` - find the smallest element using a given `Comparator` - same as the `min` function on the `Stream` itself, but also composable with other collectors
- `maxBy` - as `minBy` but with the maxmimum element
- `groupingByToArray` - group the items according to an identity mapper and return a `Map` with the identity as a key and an array of matching items as the value
- `groupingBy` - as with `groupingByToArray` but the items that share an identity are collected using another collector - so we can, for example, group by name and then collect the maximum of each group.

> While some of these collectors replicate terminal operations on `Stream` and `Number` stream, they do so to allow them
> be composed with other collectors. E.g. `groupingBy` may partition by an identity and then the sub items can be further
> collected into a count with `counting` or to an array with `toArray`

### Length Functions

We can use `skip` to ignore some items:

```ts
expect(Stream.of(1, 2, 3).skip(2).toArray()).toEqual([3]);
```

We can use `limit` to stop the stream after it has provided so many values - this is useful when we're using
infinite generators:

```ts
expect(
  Stream.generate(() => 'dave')
    .limit(3)
    .toArray()
).toEqual(['dave', 'dave', 'dave']);
```

We can use `takeWhile` to keep reading from the stream until a predicate stops being true, and `dropWhile` to skip items in the stream until a predicate stops being true.

```ts
expect(
  Stream.ofNumericArray([1, 2, 3, 4, 5])
    .takeWhile((num) => num < 4)
    .sum()
).toBe(6);
```

### Generators

A stream does not have to come from a finite data source. We can use generators.

#### Suppliers

The simplest generator is a `Supplier`:

```ts
// a stream of 10 random numbers
const tenRandoms = Stream.generate(() => Math.random()).limit(10);
```

If the supplier can return an optional with `Optional.empty` to indicate the end of the stream, then we can use `generateFinite`. This will stop when the supply of new values runs out:

```ts
// generate random integers between 0 and 100 until one is even
const oddRandoms = Stream.generateFinite(() =>
  Optional.of(Math.floor(Math.random() * 100)).filter((coin) => coin % 2 === 0)
).toArray();
```

#### Generate with `iterate`

We can use the `iterate` function to provide a source of data from a seed. We provide the `seed`, the `operator` on the last value to produce the next, and an optional predicate on when to stop:

```ts
expect(
  Stream.iterate(
    0, // initial seed 0
    (a) => a + 1 // increment by one each time
    // defaults to always has next
  )
    .limit(4)
    .toArray()
).toEqual([0, 1, 2, 3]);
```

With a predicate:

```ts
expect(
  Stream.iterate(
    0,
    (a) => a + 1,
    (a) => a < 4 // keep going while the next number is less than 4
  ).toArray()
).toEqual([0, 1, 2, 3]);
```

#### Numeric Streams

We can produce `NumberStream`s from numeric ranges:

```ts
// specify the limit of a range
expect(Stream.ofRange(0, 4).toArray()).toEqual([0, 1, 2, 3]);

// or specify the last number
expect(Stream.ofRangeClosed(0, 3).toArray()).toEqual([0, 1, 2, 3]);
```

and the increment between each number defaults to `1` but can be provided, so we get the in between numbers with a `delta` of `0.5`:

```ts
expect(Stream.ofRange(0, 4, 0.5).toArray()).toEqual([
  0, 0.5, 1, 1.5, 2, 2.5, 3, 3.5,
]);

expect(Stream.ofRangeClosed(0, 3, 0.5).toArray()).toEqual([
  0, 0.5, 1, 1.5, 2, 2.5, 3,
]);
```

#### Iterables

If it's more convenient, we can create a subclass of `Iterable` to produce elements, and construct a stream
to wrap that `Iterable`. Similarly, we can use `getIterable` on the `Stream` to use the iterable externally,
or even modify that iterable to produce new elements and feed that to a new `Stream`.

> Internally, most of the streaming operations involve adding wrappers around the stream's iterable.

### Value Modifying Functions

#### Indexing

We can use `indexed` to provide a position value next to each value in the stream:

```ts
// here we're going to take the even numbered items from
// the list according to their position
expect(
  Stream.of('blue', 'green', 'white', 'black')
    .indexed()
    .filter((item) => item.index % 2 !== 0)
    .map((item) => item.value)
    .toArray()
).toEqual(['green', 'black']);
```

`indexed` converts each item into `{index: number, value: item}`. Its numbering is dependent on where in the
streaming operation the `.indexed` is inserted. Here, it's close to the beginning, but if we added it after a
filtering operation, then it would count items post-filter.

In this example, we also used `map` to convert back from the indexed form to the individual items before
collecting to an array.

#### Transformation

We can add a transformer to the middle of a stream to modify the contents of the stream in a stateful way.

E.g. for batching:

```ts
// the `batch` transfomer will convert the stream into sub
// arrays sized according to the batch size
const stream = Stream.of('a', 'b', 'c', 'd', 'e').transform(
  Transformers.batch(2)
);

expect(stream.toArray()).toEqual([['a', 'b'], ['c', 'd'], ['e']]);
```

Transformers are formed of:

- `supplier` - which creates an empty state
- `transformer` - which adds the next item from the stream into that state, possibly emitting a new item for the downstream `Stream` to use; when emitting that item the transformer indicates whether the state is still valid or needs clearing
- `finisher` - which has the opportunity to emit one last item when the upstream stream is now exhausted

We could use a transformer to provide all the prime numbers in a range:

```ts
expect(
  Stream.ofRange(2, Number.MAX_VALUE)
    .transform({
      supplier: (): number[] => [],
      transformer: (a, t) => {
        if (Stream.ofArray(a).noneMatch((prime) => t % prime === 0)) {
          a.push(t);
          return { value: Optional.of(t) };
        }
        return { value: Optional.empty() };
      },
      finisher: () => Optional.empty(),
    })
    .limit(10)
    .toArray()
).toEqual([2, 3, 5, 7, 11, 13, 17, 19, 23, 29]);
```

## Optional

The equivalent Java `Optional` class is a first class citizen in this library. Optional is a special
collection of 0 or 1 items. We can convert it into a `Stream` with its `stream` function. We can
check it for presence and absence of its element with `isEmpty` and we can perform `filter` and
`map` functions on it, which will transform the element present, or cause it to become not present.

In `Optional`, the only value for missing is `undefined`. If the type field of the `Optional` allows
`null` to exist, then there's a special `filterNotNull` that will take `null` out of the type of the
`Optional`.

> Note: Optional is provided as a reflection of the original Java API from which Streamo is ported
> but has also been a useful tool in implementing Streamo.

### Creating an Optional

We can create an `Optional` using `of`:

```ts
const optional = Optional.of('foo');
```

and we can create an empty `Optional`:

```ts
const emptyOptional = Optional.empty();
```

If we need to make this a typed optional, e.g. an empty string optional:

```ts
const emptyString = Optional.empty<string>();
```

### Creating from Alternatives - Coalescing

Optional can replace the `??` coalesce operator in typescript. Let's look at the comparison:

```ts
const a = 'a';
const b = undefined;
const c = undefined;

const coalesceTs = a ?? b ?? c;
expect(coalesceTs).toBe('a');
```

The same coalesce can be done using `Optional.of`:

```ts
const optionalCoalesce = Optional.of(a, b, c).get();
```

With variables, this is fine, but the short-circuiting of `??` would be better than passing all values
to `Optional.of` when we're calling functions to find alternatives. So:

```ts
const coalesceTs = fnA() ?? fnB() ?? fnC(123);
```

should be converted to:

```ts
const optionalCoalesce = Optional.ofSupplier(fnA, fnB, () => fnC(123));
```

The only advantage of using `Optional` over `??` for coalescing is that `.orElse` is a clearer way
to demonstrate that we're providing a guaranteed fallback value.

E.g.

```ts
const optionalCoalesce = Optional.ofSupplier(fnA, fnB).orElse(12);
```

The benefits of `Optional` as a fluent interface over a potentially absent element can be achieved
after coalescing with `??` or in place of it.

The `or` function can be used to bring together multiple suppliers of `Optional` until the first present one:

```ts
const optional = Optional.ofSupplier(fnA, fnB).or(fnC, fnD);
```

### Filtering

If the `Optional` has a value, then the `filter` will apply the predicate to it, and produce a new
`Optional` with the value removed if the predicate wasn't achieved:

```ts
// filtering on string of length 1 blanks out our input
expect(
  Optional.of('foo')
    .filter((st) => st.length === 1)
    .isPresent()
).toBeFalsy();
```

### Map and FlatMap

We can map the `Optional` to another value:

```ts
expect(
  Optional.of('foo')
    .map((opt) => `${opt}!`)
    .get()
).toBe('foo!');
```

If the mapping function itself returns an Optional, we can flatten that by using `flatMap`:

```ts
expect(
  Optional.of('foo')
    .flatMap((opt) => Optional.of(`${opt}!`))
    .get()
).toBe('foo!');
```

### Getting the Result

`isEmpty` and `isPresent` will tell us if the result is available.

The `get` function will retrieve the value, but can also return `undefined`. To guarantee a value of type
`T`, then we need to use `orElse`:

```ts
expect(Optional.of('foo').orElse('bar')).toBe('foo');
```

If the optional is blank, the value provided in `orElse` will be returned:

```ts
expect(Optional.empty().orElse('bar')).toBe('bar');
```

If there's effort in producing the value for else, we use `orElseGet` to invoke a function
to produce the result:

```ts
expect(Optional.empty().orElseGet(() => 'bar')).toBe('bar');
```

If not having a value is an error then we can use `orElseThrow`:

```ts
const nextItem = optionalValue.orElseThrow();
const lastItem = optionalValue.orElseThrow(
  () => new Error('How did this happen?')
);
```

If we want to do something with the value when present, we can use `ifPresent`:

```ts
Optional.of('foo').ifPresent((item) => console.log(item));
```

And this can replace `if`/`else` entirely using `ifPresentOrElse`:

```ts
Optional.of('foo').ifPresentOrElse(
  (item) => console.log(item),
  () => console.log('none')
);
```

## Async Support

> Note: this is incubating

### Optional

Optional supports `mapAsync`, `flatMapAsync` and `filterAsync` which take either a synchronous or
`async` version of the `Mapper` or `Predicate` and return a `Promise` of an `Optional`.

#### See Also

- [README Example code in Unit Tests](./src/examples.test.ts)
- [Contributing](./CONTRIBUTING.md)
- [License](./LICENSE)
