import { AsyncMapper, AsyncPredicate, AsyncSupplier, sleep } from './async';
import AsyncOptional from './AsyncOptional';
import AsyncStream from './AsyncStream';
import { Callable, Mapper, noop, Predicate, Supplier } from './functions';
import { Iterable } from './Iterables';
import { Transformer } from './Transformers';

/**
 * The async iterable provides a function which supplies an async optional
 * if the optional resolves to empty, then the source is empty. We must also tell
 * the iterable to stop if we decide to abort the stream before collecting all the
 * values.
 */
export type AsyncIterable<T> = {
  next: AsyncSupplier<AsyncOptional<T>>;
  stop: Callable;
};

/**
 * Create a stub iterable
 * @returns an async interable which returns no items
 */
export const emptyAsyncIterable = <T>(): AsyncIterable<T> => ({
  next: async () => AsyncOptional.empty<T>(),
  stop: noop,
});

/**
 * Generate the stream from a source function
 * @param generator the function that generates the next {@link AsyncOptional} with either an element or
 * empty in it
 * @returns the iterator
 */
export const generatingIterable = <T>(
  generator: Supplier<AsyncOptional<T>> | AsyncSupplier<AsyncOptional<T>>
) => ({
  next: async () => await generator(),
  stop: noop,
});

/**
 * Generate the stream from a source function
 * @param generator the function that generates the next {@link AsyncOptional} with either an element or
 * empty in it and guarantee the order
 * @returns the iterator
 */
export const sequentialGeneratingIterable = <T>(
  generator: Supplier<AsyncOptional<T>> | AsyncSupplier<AsyncOptional<T>>
): AsyncIterable<T> => {
  const promises: Promise<T | undefined>[] = [];
  return {
    next: async () => {
      // wait for no pending promises from someone else
      // surrendering to the primary operation
      while (promises.length) {
        await Promise.all([...promises, sleep(1)]);
      }

      promises.push((async () => await (await generator()).get())());

      const next = await Promise.race(promises);
      promises.pop();
      return AsyncOptional.of(next);
    },
    stop: noop,
  };
};

/**
 * Convert a regular iterable to async
 * @param iterable an iterable to convert into the async iterable pattern
 * @returns an AsyncIterable
 */
export const iterableToAsync = <T>(
  iterable: Iterable<T>
): AsyncIterable<T> => ({
  next: async () => {
    if (iterable.hasNext()) {
      return AsyncOptional.of(iterable.getNext());
    }
    return AsyncOptional.empty<T>();
  },
  stop: noop,
});

/**
 * Filtering an iterable until an element is found
 * @param iterable the iterable to filter
 * @param predicate the predicate to allow an element through
 * @returns a filtering iterable
 */
export const filteredAsyncIterable = <T>(
  iterable: AsyncIterable<T>,
  predicate: Predicate<T> | AsyncPredicate<T>
): AsyncIterable<T> => {
  let stopped = false;
  return {
    next: async () => {
      while (!stopped) {
        const next = await (await iterable.next()).toOptional();
        if (!next.isPresent()) {
          return AsyncOptional.empty();
        }
        const filtered = await next.filterAsync(predicate);
        if (filtered.isPresent()) {
          return filtered.async();
        }
      }
      return AsyncOptional.empty();
    },
    stop: () => {
      stopped = true;
      iterable.stop();
    },
  };
};

/**
 * Apply mapping on the fly to the iterable
 * @param iterable the source iterable
 * @param mapper the mapper to apply
 * @returns a mapping iterable
 */
export const mappedAsyncIterable = <T, R>(
  iterable: AsyncIterable<T>,
  mapper: Mapper<T, R> | AsyncMapper<T, R>
): AsyncIterable<R> => ({
  next: async () => (await iterable.next()).map(mapper),
  stop: iterable.stop,
});

/**
 * Apply flat mapping to each stream yielded by the iterable
 * @param iterable the source iterable
 * @param mapper the mapper to produce the next stream
 * @returns an iterable
 */
export const flatMappedAsyncIterable = <T, R>(
  iterable: AsyncIterable<T>,
  mapper: Mapper<T, AsyncStream<R> | R[]> | AsyncMapper<T, AsyncStream<R> | R[]>
): AsyncIterable<R> => {
  let done = false;
  let availableIterables: AsyncIterable<R>[] = [emptyAsyncIterable()];
  let awaiting = 0;
  return {
    next: async () => {
      while (!done && (awaiting || availableIterables.length)) {
        if (availableIterables.length) {
          const thisBatch = availableIterables[0];
          const next = await thisBatch.next();
          if (await next.isPresent()) {
            return next;
          }

          // this batch is used up and it may still need removing
          if (availableIterables[0] === thisBatch) {
            availableIterables.shift();
          }
        } else {
          // avoid thrashing and try to pick up from a batch arriving
          await sleep(1);
        }

        if (!availableIterables.length) {
          // need to fetch the next batch
          awaiting++;
          const nextIterable = (await iterable.next())
            .map(mapper)
            .map((streamOrArray) =>
              streamOrArray instanceof Array
                ? AsyncStream.ofArray(streamOrArray)
                : streamOrArray
            )
            .map((stream) => stream.getIterable());

          if (await nextIterable.isPresent()) {
            // add this as the next batch
            availableIterables.push((await nextIterable.get())!);
          }
          awaiting--;
        }
      }
      return AsyncOptional.empty();
    },
    stop: () => {
      done = true;
      iterable.stop();
    },
  };
};

/**
 * Applies a transformer to an iterable to produce a new iterable. Will listen to stop messages.
 * @param iterable the iterable to transform
 * @param transformer the transformer to apply
 */
export const transformingAsyncIterable = <T, A, R>(
  iterable: AsyncIterable<T>,
  transformer: Transformer<T, A, R>
): AsyncIterable<R> => {
  let stop = false;
  let accumulator: A | undefined;
  return {
    next: async (): Promise<AsyncOptional<R>> => {
      // ensure there's an accumulator
      accumulator = accumulator ?? transformer.supplier();

      while (!stop) {
        const nextValue = await iterable.next();
        if (await nextValue.isPresent()) {
          const transformed = transformer.transformer(
            accumulator,
            (await nextValue.get())!
          );
          if (transformed.value.isPresent()) {
            if (transformed.clearState) {
              accumulator = undefined;
            }
            return AsyncOptional.of(transformed.value);
          }
        } else {
          stop = true;

          // the finisher is given the final chance to flush the accumulator
          return AsyncOptional.of(transformer.finisher(accumulator));
        }
      }

      // this iterator is done
      return AsyncOptional.empty();
    },
    stop: () => {
      stop = true;
      iterable.stop();
    },
  };
};

/**
 * Put an item limit on top of a source
 * @param source the source iterable
 * @param max the maximum number of items to emit
 * @returns the stream, trimmed to the number of items
 */
export const limitingIterable = <T>(
  source: AsyncIterable<T>,
  max: number
): AsyncIterable<T> => {
  let stop = false;
  let count = 0;
  return {
    next: async () => {
      if (stop) {
        return AsyncOptional.empty();
      }
      if (count >= max) {
        source.stop();
        stop = true;
        return AsyncOptional.empty();
      }
      const nextItem = await source.next();

      // it's possible some other promise has already beaten us to this item
      if (count < max && !stop) {
        count++;
        return nextItem;
      }
      return AsyncOptional.empty();
    },
    stop: () => {
      source.stop();
      stop = true;
    },
  };
};

/**
 * Create a buffer around the upstream iterables
 * @param iterable the decoratee, which provides the next iterables
 * @param size size of the buffer
 * @returns a new buffering iterable
 */
export const bufferingIterable = <T>(
  iterable: AsyncIterable<T>,
  size: number
): AsyncIterable<T> => {
  let stop = false;
  const pending = new Map<number, Promise<AsyncOptional<T>>>();
  const ready: AsyncOptional<T>[] = [];
  let index = 0;

  const queueMore = async () => {
    while (!stop && pending.size < size) {
      const promise = iterable.next();
      const nextIndex = index++;
      pending.set(
        nextIndex,
        promise.then((value) => {
          pending.delete(nextIndex);
          ready.push(value);
          return value;
        })
      );
    }

    // this micro sleep stops thrashing
    await sleep(1);
  };

  const nextReadyOne = async (): Promise<AsyncOptional<T> | undefined> => {
    // pull from the buffer
    while (ready.length) {
      const buffered = ready.pop()!;

      const isPresent = await buffered.isPresent();

      await queueMore();

      if (isPresent) {
        return buffered;
      } else {
        stop = true;
      }
    }
    return undefined;
  };

  return {
    next: async () => {
      if (stop && !ready.length) {
        return AsyncOptional.empty();
      }

      while (!stop || ready.length) {
        const available = await nextReadyOne();
        if (available) {
          return available;
        }

        await queueMore();

        if (pending.size) {
          await Promise.race(pending.keys());
        }
      }

      return AsyncOptional.empty();
    },
    stop: () => {
      stop = true;
      iterable.stop();
    },
  };
};
