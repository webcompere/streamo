import {
  Callable,
  Consumer,
  Mapper,
  noop,
  Predicate,
  Supplier,
} from './functions';
import Stream from './Stream';

/**
 * A value which may be optional
 */
export default class Optional<T> {
  private readonly contents?: T;

  constructor(contents?: T) {
    this.contents = contents;
  }

  /**
   * Factory method to create an optional
   * @param contents the value (or absent) for the optional
   * @returns new Optional to represent the value
   */
  public static of<T>(contents?: T) {
    return new Optional<T>(contents);
  }

  /**
   * Create an empty optional
   * @returns new empty optional of an expected type
   */
  public static empty<T>(): Optional<T> {
    return new Optional<T>();
  }

  /**
   * Is this value missing
   * @returns truthy if the value is not present
   */
  public isEmpty() {
    return typeof this.contents === 'undefined';
  }

  /**
   * Is this value present
   * @returns truthy if the value is present
   */
  public isPresent() {
    return !this.isEmpty();
  }

  /**
   * Get the value
   * @returns the value, or undefined if not present
   */
  public get(): T | undefined {
    return this.contents;
  }

  /**
   * Provide either our value if not undefined or a default
   * @param orElse the value to provide
   * @returns a guaranteed value
   */
  public orElse(orElse: T): T {
    if (typeof this.contents !== 'undefined') {
      return this.contents;
    }
    return orElse;
  }

  /**
   * Provide either our value if not undefined or a default
   * @param orElse supplies the value to provide
   * @returns a guaranteed value
   */
  public orElseGet(orElse: Supplier<T>): T {
    if (typeof this.contents !== 'undefined') {
      return this.contents;
    }
    return orElse();
  }

  /**
   * Return the value or throw
   * @param errorSupplier the supplier of the error
   * @returns the value, or throws
   */
  public orElseThrow(
    errorSupplier: Supplier<Error> = () => new Error('Empty optional')
  ) {
    if (typeof this.contents !== 'undefined') {
      return this.contents;
    }
    throw errorSupplier();
  }

  /**
   * Do something if the value is present
   * @param consumer consumes the value if there is one
   */
  public ifPresent(consumer: Consumer<T>) {
    this.ifPresentOrElse(consumer, noop);
  }

  /**
   * Do something if the value is present
   * @param consumer consumes the value if there is one
   * @param doAction the thing to do if not present
   */
  public ifPresentOrElse(consumer: Consumer<T>, doAction: Callable) {
    if (typeof this.contents !== 'undefined') {
      consumer(this.contents);
    } else {
      doAction();
    }
  }

  /**
   * Map this optional to another type
   * @param mapper the mapping function
   * @returns an optional with the converted value, or empty if we have none
   *   or an empty optional if the conversion results in undefined
   */
  public map<R>(mapper: Mapper<T, R | undefined>): Optional<R> {
    if (typeof this.contents === 'undefined') {
      return new Optional();
    }
    return new Optional(mapper(this.contents));
  }

  /**
   * Consume any value in this and map it to a fresh optional
   * @param mapper a mapper from the value in this to a new optional
   * @returns the new optional in itself
   */
  public flatMap<R>(mapper: Mapper<T, Optional<R>>): Optional<R> {
    if (typeof this.contents === 'undefined') {
      return new Optional();
    }
    return mapper(this.contents);
  }

  /**
   * Filter the value
   * @param filter the filter to apply
   * @returns an optional with either our value, or empty if we've just gone blank
   */
  public filter(filter: Predicate<T>): Optional<T> {
    if (typeof this.contents !== 'undefined' && !filter(this.contents)) {
      return Optional.empty();
    }
    return this;
  }

  /**
   * When using null as a possible value of the objects, this banishes null
   * from the optionality by going to empty without a null in sight
   * @returns an optional with no nulliness
   */
  public filterNotNull(): Optional<Exclude<T, null>> {
    if (null === this.contents || typeof this.contents === 'undefined') {
      return Optional.empty();
    }
    return Optional.of(this.contents as Exclude<T, null>);
  }

  /**
   * Stream this value
   */
  public stream(): Stream<T> {
    if (typeof this.contents === 'undefined') {
      return Stream.of();
    }
    return Stream.of(this.contents);
  }
}
