import {
  AsyncCallable,
  AsyncConsumer,
  AsyncMapper,
  AsyncPredicate,
  AsyncSupplier,
  PromiseOrValue,
  toPromise,
} from './async';
import { AsyncIterable } from './AsyncIterables';
import AsyncStream from './AsyncStream';
import {
  Callable,
  Consumer,
  Mapper,
  noop,
  Predicate,
  Supplier,
} from './functions';
import Optional from './Optional';

/**
 * An async version of {@link Optional} which allows fluent
 * operations over the promise of the optional
 */
export default class AsyncOptional<T> {
  private readonly optionalPromise: Promise<Optional<T>>;

  private constructor(optionalPromise: Promise<Optional<T>>) {
    this.optionalPromise = optionalPromise;
  }

  /**
   * Create an AsyncOptional
   * @param value the value or promise to a value that returns T or undefined
   * @returns a new {@link AsyncOptional} with the value in
   */
  public static of<T>(
    value?: PromiseOrValue<T | undefined> | Optional<T>
  ): AsyncOptional<T> {
    // detect if this is an optional itself
    if (value && typeof value === 'object' && 'orElseGet' in value) {
      return new AsyncOptional<T>(Promise.resolve(value));
    }

    // coerce to a promise and then make it a promise of an optional
    return new AsyncOptional<T>(
      toPromise(value).then((val) => Optional.of(val))
    );
  }

  /**
   * Convert a promise of an async optional ino an async optional
   * @param promisedAsyncOptional flatten a promised async optional into an async optional
   * @returns an async optional
   */
  public static flattenPromise<T>(
    promisedAsyncOptional: Promise<AsyncOptional<T>>
  ): AsyncOptional<T> {
    return new AsyncOptional<T>(
      promisedAsyncOptional.then((promised) => promised.toOptional())
    );
  }

  /**
   * Create an empty async optional
   * @returns an empty AsyncOptional
   */
  public static empty<T>(): AsyncOptional<T> {
    return AsyncOptional.of<T>();
  }

  /**
   * Get the contents of the optional
   * @returns the value from the inner optional
   */
  public async get() {
    return (await this.optionalPromise).get();
  }

  /**
   * Is the value present
   * @returns a promise to whether this optional is present
   */
  public async isPresent() {
    return (await this.optionalPromise).isPresent();
  }

  /**
   * Is the value empty
   * @returns a promise to whether this optional is empty
   */
  public async isEmpty() {
    return (await this.optionalPromise).isEmpty();
  }

  /**
   * Become synchronous again
   * @returns the optional we're waiting for
   */
  public async toOptional(): Promise<Optional<T>> {
    return await this.optionalPromise;
  }

  /**
   * Apply a filter to this optional
   * @param filter the sync or async filter to apply
   * @returns an AsyncOptional
   */
  public filter(filter: AsyncPredicate<T> | Predicate<T>): AsyncOptional<T> {
    return new AsyncOptional<T>(
      this.optionalPromise.then((optional) => optional.filterAsync(filter))
    );
  }

  /**
   * Apply a map operation to this optional
   * @param mapper function to convert the inner value to its next value
   * @returns an AsyncOptional
   */
  public map<R>(
    mapper: AsyncMapper<T, R | undefined> | Mapper<T, R | undefined>
  ) {
    return new AsyncOptional<R>(
      this.optionalPromise.then((optional) => optional.mapAsync(mapper))
    );
  }

  /**
   * Consume any value in this and map it to a fresh optional
   * @param mapper a mapper from the value in this to a new optional
   * @returns the new optional in itself
   */
  public flatMap<R>(
    mapper: AsyncMapper<T, Optional<R>> | Mapper<T, Optional<R>>
  ) {
    return new AsyncOptional<T>(
      this.optionalPromise.then((optional) => optional.flatMapAsync(mapper))
    );
  }

  /**
   * Provide either our value if not undefined or a default
   * @param orElse the value to provide
   * @returns a guaranteed value
   */
  public async orElse(orElse: T) {
    return (await this.optionalPromise).orElse(orElse);
  }

  /**
   * Provide either our value if not undefined or a default
   * @param orElse supplies the value to provide
   * @returns a guaranteed value
   */
  public async orElseGet(orElse: Supplier<T> | AsyncSupplier<T>) {
    const optional = await this.toOptional();
    if (optional.isPresent()) {
      return optional.get();
    }
    return await orElse();
  }

  /**
   * Return the value or throw
   * @param errorSupplier the supplier of the error
   * @returns the value, or throws
   */
  public async orElseThrow(
    errorSupplier: Supplier<Error> = () => new Error('Empty optional')
  ) {
    return (await this.optionalPromise).orElseThrow(errorSupplier);
  }

  /**
   * Do something if the value is present
   * @param consumer consumes the value if there is one
   */
  public async ifPresent(consumer: AsyncConsumer<T> | Consumer<T>) {
    await this.ifPresentOrElse(consumer, noop);
  }

  /**
   * Do something if the value is present
   * @param consumer consumes the value if there is one
   * @param doAction the thing to do if not present
   */
  public async ifPresentOrElse(
    consumer: Consumer<T> | AsyncConsumer<T>,
    doAction: Callable | AsyncCallable
  ) {
    const optional = await this.optionalPromise;
    if (optional.isPresent()) {
      await consumer(optional.get()!);
    } else {
      await doAction();
    }
  }

  /**
   * Convert to a stream of 0 or 1 items
   */
  public stream(): AsyncStream<T> {
    let done = false;
    const iterator: AsyncIterable<T> = {
      next: async () => {
        // only return this item once
        if (done) {
          return AsyncOptional.empty();
        }
        done = true;
        return this;
      },
      stop: noop,
    };
    return new AsyncStream<T>(iterator);
  }
}
