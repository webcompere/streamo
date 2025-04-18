import {
  BinaryOperator,
  Consumer,
  identity,
  Mapper,
  Predicate,
  Supplier,
} from './functions';
import {
  Iterable,
  ArrayIterable,
  FilteringIterable,
  MappingIterable,
  SupplyingIterable,
  LimitingIterable,
  FlatteningIterable,
  RangeIterable,
  TakeWhileIterable,
  DropWhileIterable,
} from './Iterables';
import Optional from './Optional';

export type Indexed<T> = { index: number; value: T };

export default class Stream<T> {
  /**
   * Convert an array to a stream
   * @param array the array to stream
   */
  public static ofArray<T>(array: ReadonlyArray<T>): Stream<T> {
    return new Stream<T>(new ArrayIterable<T>(array));
  }

  /**
   * Convert individual elements to a stream
   * @param elements the elements to stream
   */
  public static of<T>(...elements: T[]): Stream<T> {
    return Stream.ofArray(elements);
  }

  public static ofRange(min: number, maxExclusive: number) {
    return new NumberStream(new RangeIterable(min, maxExclusive));
  }

  public static ofRangeClosed(min: number, maxInclusive: number) {
    return new NumberStream(new RangeIterable(min, maxInclusive + 1));
  }

  public static concat<T>(...streams: Stream<T>[]) {
    return Stream.of(...streams).flatMap(identity());
  }

  /**
   * Creates a stream from a generator
   * @param generator the function to supply the next value
   * @returns an infinite stream generated by the function
   */
  public static generate<T>(generator: Supplier<T>): Stream<T> {
    return new Stream<T>(new SupplyingIterable<T>(generator));
  }

  /**
   * Create an empty stream
   * @returns an empty stream
   */
  public static empty<T>() {
    return Stream.of<T>();
  }

  private readonly iterable: Iterable<T>;

  constructor(iterable: Iterable<T>) {
    this.iterable = iterable;
  }

  /**
   * Convert the stream into an array
   */
  public toArray(): T[] {
    const array: T[] = [];
    while (this.iterable.hasNext()) {
      array.push(this.iterable.getNext());
    }
    return array;
  }

  /**
   * Convert the stream into an array
   */
  public toMap<K, V>(
    keyMapper: Mapper<T, K>,
    valueMapper: Mapper<T, V>
  ): Map<K, V> {
    const map = new Map<K, V>();
    while (this.iterable.hasNext()) {
      const item = this.iterable.getNext();
      map.set(keyMapper(item), valueMapper(item));
    }
    return map;
  }

  /**
   * Convert the stream into a stream of something else
   * @param mapper the mapping function
   */
  public map<R>(mapper: Mapper<T, R>): Stream<R> {
    return new Stream<R>(new MappingIterable(this.iterable, mapper));
  }

  /**
   * Add an index value to the stream so it's `{index, value}` with a 0-based
   * index. Note: the indexing starts at this point in the chain of filters etc.
   * @returns a stream of items with the index added
   */
  public indexed(): Stream<Indexed<T>> {
    let index = 0;
    return this.map((value) => ({ index: index++, value }));
  }

  /**
   * Convert the stream into a stream of numberes
   * @param mapper the mapping function from this element to numbers
   */
  public mapToNumber(mapper: Mapper<T, number>): NumberStream {
    return new NumberStream(new MappingIterable(this.iterable, mapper));
  }

  /**
   * Convert each item of the stream into a streamable and join them
   * @param mapper maps each element to a new stream
   * @returns the stream of all the items as though a single stream
   */
  public flatMap<R>(mapper: Mapper<T, Stream<R>>): Stream<R> {
    return new Stream<R>(
      new FlatteningIterable(
        new MappingIterable(this.iterable, (item) => mapper(item).getIterable())
      )
    );
  }

  /**
   * Filter the stream
   * @param predicate allows the items to pass through to target stream
   */
  public filter(predicate: Predicate<T>): Stream<T> {
    return new Stream<T>(new FilteringIterable(this.iterable, predicate));
  }

  /**
   * Similar to filtering, this requires a filter to pass to return items, but
   * it stops the stream the moment the filter fails
   * @param predicate the condition to pass
   * @returns a stream which only takes while the filter is matched
   */
  public takeWhile(predicate: Predicate<T>): Stream<T> {
    return new Stream<T>(new TakeWhileIterable(this.iterable, predicate));
  }

  /**
   * Similar to filtering and skip, this removes elements which match a filter
   * it stops the stream the moment the filter fails
   * @param predicate the condition to pass
   * @returns a stream which only takes while the filter is matched
   */
  public dropWhile(predicate: Predicate<T>): Stream<T> {
    return new Stream<T>(new DropWhileIterable(this.iterable, predicate));
  }

  /**
   * Add a limit to the result
   * @param max the maximum number of items
   * @returns a new stream which won't go past the max
   */
  public limit(max: number): Stream<T> {
    return new Stream<T>(new LimitingIterable<T>(max, this.iterable));
  }

  /**
   * Get the first item from the stream
   */
  public findFirst(): Optional<T> {
    if (this.iterable.hasNext()) {
      return Optional.of(this.iterable.getNext());
    }
    return Optional.empty();
  }

  /**
   * Exit hatch the iterable we're working on behind the scenes
   * @returns the iterable behind this stream
   */
  public getIterable(): Iterable<T> {
    return this.iterable;
  }

  /**
   * Does anything in the stream match the predicate?
   * @param predicate the test
   * @returns true if anything matches
   */
  public anyMatch(predicate: Predicate<T>) {
    while (this.iterable.hasNext()) {
      if (predicate(this.iterable.getNext())) {
        return true;
      }
    }
    return false;
  }

  /**
   * Does anything in the stream match the predicate?
   * @param predicate the test
   * @returns true if nothing matches
   */
  public noneMatch(predicate: Predicate<T>) {
    while (this.iterable.hasNext()) {
      if (predicate(this.iterable.getNext())) {
        return false;
      }
    }
    return true;
  }

  /**
   * Do all items match the predicate
   * @param predicate the predicate to test
   * @returns true if all match
   */
  public allMatch(predicate: Predicate<T>) {
    while (this.iterable.hasNext()) {
      if (!predicate(this.iterable.getNext())) {
        return false;
      }
    }
    return true;
  }

  /**
   * Perform an item on each one
   * @param consumer the action to perform on each
   */
  public forEach(consumer: Consumer<T>) {
    while (this.iterable.hasNext()) {
      consumer(this.iterable.getNext());
    }
  }

  /**
   * Peek at items as they pass through the stream
   * @param consumer is allowed to look at an item passing through the stream
   */
  public peek(consumer: Consumer<T>): Stream<T> {
    return this.filter((item) => {
      consumer(item);
      return true;
    });
  }

  /**
   * Turn this into a distinct stream
   */
  public distinct(): Stream<T> {
    const seen = new Set<T>();
    return this.filter((item) => {
      const isNew = !seen.has(item);
      if (isNew) {
        seen.add(item);
      }
      return isNew;
    });
  }

  /**
   * Count the elements
   */
  public count() {
    let i = 0;
    while (this.iterable.hasNext()) {
      this.iterable.getNext();
      i++;
    }
    return i;
  }

  /**
   * Skip some elements
   * @param howMany the number to skip
   */
  public skip(howMany: number) {
    for (let i = 0; i < howMany && this.iterable.hasNext(); i++) {
      this.iterable.getNext();
    }
    return this;
  }

  /**
   * Reduce the stream to a single value
   * @param accumulator the operator for combining the amassed result
   * @returns the first element if there's one, the accumulated result if more, or empty
   */
  public reduce(accumulator: BinaryOperator<T>): Optional<T> {
    let resultSoFar = Optional.empty<T>();
    while (this.iterable.hasNext()) {
      const next = this.iterable.getNext();
      if (resultSoFar.isEmpty()) {
        resultSoFar = Optional.of(next);
      } else {
        resultSoFar = resultSoFar.map((item) => accumulator(item, next));
      }
    }

    return resultSoFar;
  }
}

/**
 * Specialist stream for numbers
 */
export class NumberStream extends Stream<number> {
  /**
   * Get the sum
   * @returns the sum of all the values in the stream
   */
  public sum(): number {
    return this.reduce((a, b) => a + b).orElse(0);
  }
}
