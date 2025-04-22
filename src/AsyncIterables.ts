import { AsyncMapper, AsyncPredicate, AsyncSupplier } from './async';
import AsyncOptional from './AsyncOptional';
import AsyncStream from './AsyncStream';
import { Callable, Mapper, noop, Predicate } from './functions';
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

export const filteredAsyncIterable = <T>(
  iterable: AsyncIterable<T>,
  predicate: Predicate<T> | AsyncPredicate<T>
): AsyncIterable<T> => ({
  next: async () => {
    while (true) {
      const next = await (await iterable.next()).toOptional();
      if (!next.isPresent()) {
        return AsyncOptional.empty();
      }
      const filtered = await next.filterAsync(predicate);
      if (filtered.isPresent()) {
        return filtered.async();
      }
    }
  },
  stop: iterable.stop,
});

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
  mapper: Mapper<T, AsyncStream<R>> | AsyncMapper<T, AsyncStream<R>>
): AsyncIterable<R> => {
  let done = false;
  let lastIterable: AsyncIterable<R> = emptyAsyncIterable();
  return {
    next: async () => {
      while (!done) {
        const next = await lastIterable.next();
        if (await next.isPresent()) {
          return next;
        }
        // need to fetch the next batch
        const nextIterable = (await iterable.next())
          .map(mapper)
          .map((stream) => stream.getIterable());

        // if there's no next batch, we're done
        if (!(await nextIterable.isPresent())) {
          done = true;
        } else {
          // try using this as the next batch
          lastIterable = (await nextIterable.get())!;
        }
      }
      return AsyncOptional.empty();
    },
    stop: iterable.stop,
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

export const bufferingIterable = <T>(
  iterable: AsyncIterable<T>,
  size: number
): AsyncIterable<T> => {
  let stop = false;
  const pending = new Map<number, Promise<AsyncOptional<T>>>();
  const ready: AsyncOptional<T>[] = [];
  let index = 0;

  const queueMore = () => {
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
  };

  const nextReadyOne = async (): Promise<AsyncOptional<T> | undefined> => {
    // pull from the buffer
    while (ready.length) {
      const buffered = ready.pop()!;

      const isPresent = await buffered.isPresent();

      queueMore();

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

        queueMore();

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
