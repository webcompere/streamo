import { Mapper, not, Predicate, Supplier } from './functions';
import Optional from './Optional';
import { Transformer } from './Transformers';

export interface Iterable<T> {
  /**
   * Returns true if there are more elements
   */
  hasNext(): boolean;

  /**
   * Returns the next element, or throws if called inappropriately
   */
  getNext(): T;
}

/**
 * Iterates over one iterator and maps on the fly to the other
 */
export class MappingIterable<T, R> implements Iterable<R> {
  private readonly source: Iterable<T>;
  private readonly mapper: Mapper<T, R>;

  constructor(source: Iterable<T>, mapper: Mapper<T, R>) {
    this.source = source;
    this.mapper = mapper;
  }

  hasNext(): boolean {
    return this.source.hasNext();
  }

  getNext(): R {
    return this.mapper(this.source.getNext());
  }
}

/**
 * Iterates over another iterable only returning the ones that match the predicate
 */
export class FilteringIterable<T> implements Iterable<T> {
  private next: Optional<T> = Optional.empty();
  private readonly source: Iterable<T>;
  private readonly predicate: Predicate<T>;

  constructor(source: Iterable<T>, predicate: Predicate<T>) {
    this.source = source;
    this.predicate = predicate;
  }

  hasNext(): boolean {
    this.next = Optional.empty();
    while (this.source.hasNext() && this.next.isEmpty()) {
      this.next = Optional.of(this.source.getNext()).filter(this.predicate);
    }
    return this.next.isPresent();
  }
  getNext(): T {
    return this.next.orElseThrow(() => new Error('No elements remaining'));
  }
}

/**
 * Iterates over another iterable only returning while the predicate is matched
 */
export class TakeWhileIterable<T> implements Iterable<T> {
  private first = true;
  private next: Optional<T> = Optional.empty();
  private readonly source: Iterable<T>;
  private readonly predicate: Predicate<T>;

  constructor(source: Iterable<T>, predicate: Predicate<T>) {
    this.source = source;
    this.predicate = predicate;
  }

  hasNext(): boolean {
    if (this.first) {
      if (this.source.hasNext()) {
        this.next = Optional.of(this.source.getNext()).filter(this.predicate);
      }
      this.first = false;
    } else if (this.next.isPresent() && this.source.hasNext()) {
      this.next = Optional.of(this.source.getNext()).filter(this.predicate);
    }

    return this.next.isPresent();
  }
  getNext(): T {
    return this.next.orElseThrow(() => new Error('No elements remaining'));
  }
}

/**
 * Iterates over another iterable skipping the first few elements where the predicate is matched
 */
export class DropWhileIterable<T> implements Iterable<T> {
  private first = true;
  private next: Optional<T> = Optional.empty();
  private readonly source: Iterable<T>;
  private readonly predicate: Predicate<T>;

  constructor(source: Iterable<T>, predicate: Predicate<T>) {
    this.source = source;
    this.predicate = predicate;
  }

  hasNext(): boolean {
    if (this.first) {
      // chew through the items matching the filter until we get one which
      // doesn't match the filter
      this.first = false;
      while (this.source.hasNext() && this.next.isEmpty()) {
        this.next = Optional.of(this.source.getNext()).filter(
          not(this.predicate)
        );
      }
    } else if (this.source.hasNext()) {
      this.next = Optional.of(this.source.getNext());
    } else {
      this.next = Optional.empty();
    }

    return this.next.isPresent();
  }
  getNext(): T {
    return this.next.orElseThrow(() => new Error('No elements remaining'));
  }
}

/**
 * Iterates over an iterator, but with a limit
 */
export class LimitingIterable<T> implements Iterable<T> {
  private readonly decoratee: Iterable<T>;
  private readonly limit: number;
  private readSoFar = 0;

  constructor(limit: number, decoratee: Iterable<T>) {
    this.limit = limit;
    this.decoratee = decoratee;
  }

  hasNext(): boolean {
    if (this.readSoFar >= this.limit) {
      return false;
    }
    return this.decoratee.hasNext();
  }

  getNext(): T {
    this.readSoFar++;
    return this.decoratee.getNext();
  }
}

export class SupplyingIterable<T> implements Iterable<T> {
  private readonly generator: Supplier<T>;

  constructor(generator: Supplier<T>) {
    this.generator = generator;
  }

  hasNext(): boolean {
    // we can always make another
    return true;
  }

  getNext(): T {
    return this.generator();
  }
}

/**
 * Iterator over an array
 */
export class ArrayIterable<T> implements Iterable<T> {
  private readonly array: ReadonlyArray<T>;
  private currentIndex = 0;

  constructor(array: ReadonlyArray<T>) {
    this.array = array;
  }

  hasNext(): boolean {
    return this.currentIndex < this.array.length;
  }

  getNext(): T {
    if (!this.hasNext()) {
      throw new Error('Index out of bounds');
    }
    return this.array[this.currentIndex++];
  }
}

/**
 * Iterates over an iterator of iterators, but returns elements within all of them
 */
export class FlatteningIterable<T> implements Iterable<T> {
  private currentIterable: Optional<Iterable<T>> = Optional.empty();
  private readonly source: Iterable<Iterable<T>>;

  constructor(source: Iterable<Iterable<T>>) {
    this.source = source;
  }

  hasNext(): boolean {
    while (
      !this.currentIterable
        .map((iterable) => iterable.hasNext())
        .orElse(false) &&
      this.source.hasNext()
    ) {
      this.currentIterable = Optional.of(this.source.getNext());
    }
    return this.currentIterable
      .map((iterable) => iterable.hasNext())
      .orElse(false);
  }
  getNext(): T {
    return this.currentIterable
      .map((iterable) => iterable.getNext())
      .orElseThrow(() => new Error('Index out of bounds'));
  }
}

/**
 * Iterates over a number
 */
export class RangeIterable implements Iterable<number> {
  private current;
  private readonly maxExclusive: number;
  private readonly delta: number;

  constructor(min: number, maxExclusive: number, delta = 1) {
    this.current = min;
    this.maxExclusive = maxExclusive;
    this.delta = delta;
  }

  hasNext(): boolean {
    return this.current < this.maxExclusive;
  }

  getNext(): number {
    const next = this.current;
    this.current += this.delta;
    return next;
  }
}

/**
 * An iterator which uses a transformer
 */
export class TransformingIterator<T, A, R> implements Iterable<R> {
  private readonly transformer: Transformer<T, A, R>;
  private readonly source: Iterable<T>;
  private next: Optional<R> = Optional.empty();
  private accumulator: A;

  constructor(source: Iterable<T>, transformer: Transformer<T, A, R>) {
    this.transformer = transformer;
    this.source = source;
    this.accumulator = this.transformer.supplier();
  }

  hasNext(): boolean {
    this.next = Optional.empty();

    while (this.source.hasNext()) {
      const transformation = this.transformer.transformer(
        this.accumulator,
        this.source.getNext()
      );
      if (transformation.value.isPresent()) {
        if (transformation.clearState) {
          this.accumulator = this.transformer.supplier();
        }
        this.next = transformation.value;
        return true;
      }
    }

    // we ran out of elements so finalise the accumulator
    this.next = this.transformer.finisher(this.accumulator);

    // and wipe it
    this.accumulator = this.transformer.supplier();
    return this.next.isPresent();
  }

  getNext(): R {
    return this.next.orElseThrow(() => new Error('No elements remaining'));
  }
}
