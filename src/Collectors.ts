import { identity, Mapper, Supplier } from './functions';
import { Iterable } from './Iterables';

/**
 * A collector is an object that collects into a final object of type R - the reduced
 * form, using a supplier of A's to create an empty accumulator, an accumulator function
 * which operates on the accumualator and element (T) and then a finisher to transform
 * the accumulator to the final result
 */
export type Collector<T, A, R> = {
  /**
   * Supplies an empty accumulator
   */
  supplier: Supplier<A>;

  /**
   * Combine the next element into the accumulator
   * @param accumulator the accumulator so far
   * @param element the element type
   */
  accumulator: (accumulator: A, element: T) => void;

  /**
   * Convert the accumulator into the final type
   */
  finisher: Mapper<A, R>;
};

/**
 * Perform general collection over an iterable with a collector
 * @param iterable the source of elements
 * @param collector the collector
 * @returns a collected object
 */
export const collect = <T, A, R>(
  iterable: Iterable<T>,
  collector: Collector<T, A, R>
): R => {
  const accumulated = collector.supplier();
  while (iterable.hasNext()) {
    collector.accumulator(accumulated, iterable.getNext());
  }
  return collector.finisher(accumulated);
};

export default class Collectors {
  /**
   * Basic collector, which applies collection to a stream or iterable to produce a list
   */
  public static toList<T>(): Collector<T, T[], T[]> {
    return {
      supplier: () => [],
      accumulator: (a, t) => a.push(t),
      finisher: identity,
    };
  }

  public static toObject<T, V>(
    keyMapper: Mapper<T, string>,
    valueMapper: Mapper<T, V>
  ): Collector<T, Record<string, V>, Record<string, V>> {
    return {
      supplier: () => ({}),
      accumulator: (a, t) => (a[keyMapper(t)] = valueMapper(t)),
      finisher: identity,
    };
  }
}
