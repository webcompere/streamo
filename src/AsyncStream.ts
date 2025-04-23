import { AsyncMapper, AsyncPredicate } from './async';
import {
  AsyncIterable,
  bufferingIterable,
  emptyAsyncIterable,
  filteredAsyncIterable,
  flatMappedAsyncIterable,
  iterableToAsync,
  mappedAsyncIterable,
  transformingAsyncIterable,
} from './AsyncIterables';
import AsyncOptional from './AsyncOptional';
import Collectors, { collectAsync, Collector } from './Collectors';
import { Comparator, identity, Mapper, Predicate, Supplier } from './functions';
import { ArrayIterable } from './Iterables';
import Stream, { Indexed } from './Stream';
import Transformers, { Transformer } from './Transformers';

/**
 * Like {@link Stream} this operates over a source of data and allows it to be
 * manipulated with mapping and filtering functions before terminal operations
 * for converting to a final result. The source may itself be async, and the operations
 * may be async or not.
 */
export default class AsyncStream<T> {
  /**
   * Create an async stream from a Stream
   * @param stream the stream to turn into an async stream
   * @returns an AsyncStream of this stream's data
   */
  public static ofStream<T>(stream: Stream<T>): AsyncStream<T> {
    return new AsyncStream<T>(iterableToAsync(stream.getIterable()));
  }

  /**
   * Create an async stream from some items
   * @param items items to have in the stream
   * @returns the items to put in the stream
   */
  public static of<T>(...items: T[]): AsyncStream<T> {
    return AsyncStream.ofArray(items);
  }

  /**
   * Construct an async stream from an array
   * @param array an array of source elements
   * @returns new AsyncStream
   */
  public static ofArray<T>(array: T[]): AsyncStream<T> {
    return new AsyncStream<T>(iterableToAsync(new ArrayIterable(array)));
  }

  /**
   * Concatenate multiple streams together
   * @param streams the streams to concatenate
   * @returns a stream composed of the intermediate streams
   */
  public static concat<T>(...streams: AsyncStream<T>[]): AsyncStream<T> {
    return AsyncStream.ofArray(streams).flatMap(identity);
  }

  /**
   * Efficiently create an empty AsyncStream
   * @returns an empty AsyncStream
   */
  public static empty<T>(): AsyncStream<T> {
    return new AsyncStream<T>(emptyAsyncIterable());
  }

  private readonly asyncIterable: AsyncIterable<T>;
  private hasTerminated = false;

  /**
   * Construct the stream - ideally use the factory methods over the constructor
   * @param asyncIterable the internal interable
   */
  constructor(asyncIterable: AsyncIterable<T>) {
    this.asyncIterable = asyncIterable;
  }

  /**
   * Get the interal iterable
   * @returns the async iterable from within this stream
   */
  public getIterable(): AsyncIterable<T> {
    return this.terminal(() => this.asyncIterable);
  }

  private terminal<R>(operation: Supplier<R>): R {
    if (this.hasTerminated) {
      throw new Error('Cannot reuse a terminated stream');
    }
    this.hasTerminated = true;
    return operation();
  }

  /**
   * Find the first item in the stream
   * @returns the first item from the stream as an AsyncOptional
   */
  public findFirst(
    predicate?: AsyncPredicate<T> | Predicate<T>
  ): AsyncOptional<T> {
    return this.terminal(() => {
      // implement the provided predicate by delegating to another instance of the stream
      if (predicate) {
        return this.filter(predicate).findFirst();
      }

      // we have a promise of the first item and we decorate it with a stop
      // to prevent any async upstream processes from producing more items
      return AsyncOptional.flattenPromise(
        this.asyncIterable.next().then((item) => {
          this.asyncIterable.stop();
          return item;
        })
      );
    });
  }

  /**
   * Do any of the items match the predicate?
   * @param predicate the predicate to find
   */
  public async anyMatch(
    predicate: AsyncPredicate<T> | Predicate<T>
  ): Promise<boolean> {
    return this.terminal(() => this.filter(predicate).findFirst().isPresent());
  }

  /**
   * Do none of the items match the predicate?
   * @param predicate the predicate to find
   */
  public async noneMatch(
    predicate: AsyncPredicate<T> | Predicate<T>
  ): Promise<boolean> {
    return this.terminal(() => this.filter(predicate).findFirst().isEmpty());
  }

  /**
   * Do all of the items match the predicate (true if there are no items in the stream)
   * @param predicate the predicate to check against all of the items
   */
  public async allMatch(
    predicate: AsyncPredicate<T> | Predicate<T>
  ): Promise<boolean> {
    return !(await this.anyMatch(async (item) => !(await predicate(item))));
  }

  /**
   * Apply a filter to the stream
   * @param predicate the predicate to filter with
   * @returns a new stream with the filter applied
   */
  public filter(predicate: Predicate<T> | AsyncPredicate<T>): AsyncStream<T> {
    return new AsyncStream(
      filteredAsyncIterable(this.asyncIterable, predicate)
    );
  }

  /**
   * Convert the stream into a stream of something else
   * @param mapper the mapping function
   */
  public map<R>(mapper: Mapper<T, R> | AsyncMapper<T, R>): AsyncStream<R> {
    return new AsyncStream(mappedAsyncIterable(this.asyncIterable, mapper));
  }

  /**
   * Expand the items in each T into a stream of Rs and stream the Rs
   * @param mapper the mapper which converts the item into a new AsyncStream
   */
  public flatMap<R>(
    mapper: Mapper<T, AsyncStream<R>> | AsyncMapper<T, AsyncStream<R>>
  ): AsyncStream<R> {
    return new AsyncStream(flatMappedAsyncIterable(this.asyncIterable, mapper));
  }

  /**
   * Add an index value to the stream so it's `{index, value}` with a 0-based
   * index. Note: the indexing starts at this point in the chain of filters etc.
   * @returns a stream of items with the index added
   */
  public indexed(): AsyncStream<Indexed<T>> {
    let index = 0;
    return this.map((value) => ({ index: index++, value }));
  }

  /**
   * Apply a sort mid stream
   * @param compareFn the comparator to use
   * @returns the stream with a sort applied
   */
  public sorted(compareFn?: Comparator<T>): AsyncStream<T> {
    return this.transform(Transformers.sorted(compareFn)).flatMap((array) =>
      AsyncStream.ofArray(array)
    );
  }

  /**
   * Convert the stream to distinct elements
   * @returns a stream of unique elements
   */
  public distinct(): AsyncStream<T> {
    return this.transform(Transformers.distinct());
  }

  /**
   * Apply a transformation to this stream
   * @param transformer the transformer to apply
   */
  public transform<A, R>(transformer: Transformer<T, A, R>): AsyncStream<R> {
    return new AsyncStream(
      transformingAsyncIterable(this.asyncIterable, transformer)
    );
  }

  /**
   * Add a buffer to the async iterable. This will maintain a buffer of next items which
   * are resolving through their `map` and `filter` operations. It will keep the buffer full
   * though will stop pulling items into it if a terminal operation wants to abort reading the
   * stream - e.g. `findFirst`
   * @param size the size of the buffer
   * @returns a stream with the buffer in it
   */
  public buffer(size: number): AsyncStream<T> {
    return new AsyncStream(bufferingIterable(this.asyncIterable, size));
  }

  /**
   * Collect to an array - a wrapper for the collect function
   * @returns a promise of an array with all the values in
   */
  public toArray(): Promise<T[]> {
    return this.collect(Collectors.toArray());
  }

  /**
   * Collect to a count
   * @returns a promise of the number of items in the stream
   */
  public count(): Promise<number> {
    return this.collect(Collectors.counting());
  }

  /**
   * Collect with a collector
   * @param collector the collector to use - see {@link Collectors}
   * @returns the result of collecting
   */
  public collect<A, R>(collector: Collector<T, A, R>): Promise<R> {
    return this.terminal(() => collectAsync(this.asyncIterable, collector));
  }
}
