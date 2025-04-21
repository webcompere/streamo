import { identity, Mapper, Supplier } from './functions';
import { Iterable } from './Iterables';

/**
 * A collector is an object that collects into a final object of type R - the reduced
 * form, using a supplier of A's to create an empty accumulator, an accumulator function
 * which operates on the accumualator and element (T) and then a finisher to transform
 * the accumulator to the final result
 */
export interface Collector<T, A, R> {
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
}

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

/**
 * An entry from a map or record
 */
export type Entry<K, V> = { key: K; value: V };

/**
 * Ready made collector operations
 */
export default class Collectors {
  /**
   * Basic collector, which applies collection to a stream or iterable to produce a list
   */
  public static toArray<T>(): Collector<T, T[], T[]> {
    return {
      supplier: () => [],
      accumulator: (a, t) => a.push(t),
      finisher: identity,
    };
  }

  /**
   * Collect the items in the iterable/stream into key value pairs in an object
   * @param keyMapper map the stream items into the string key
   * @param valueMapper map the stream items into the value object
   * @returns a record
   */
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

  /**
   * Collect a stream of entries into an object the entries must have
   * a key type of string
   * @returns a collector that turns the entries back into an object
   */
  public static toObjectFromEntries<V>() {
    return Collectors.toObject<Entry<string, V>, V>(
      (entry) => entry.key,
      (entry) => entry.value
    );
  }

  /**
   * Collect to a map
   * @param keyMapper map from the item to the key part of the map
   * @param valueMapper map from the item to the value part of the map
   * @returns a collector for producing a Map
   */
  public static toMap<T, K, V>(
    keyMapper: Mapper<T, K>,
    valueMapper: Mapper<T, V>
  ): Collector<T, Map<K, V>, Map<K, V>> {
    return {
      supplier: () => new Map<K, V>(),
      accumulator: (a, t) => a.set(keyMapper(t), valueMapper(t)),
      finisher: identity,
    };
  }

  /**
   * Collect to a map from entry objects
   * @returns a collector to map converting a stream of entries into a Map
   */
  public static toMapFromEntries<K, V>() {
    return Collectors.toMap<Entry<K, V>, K, V>(
      (entry) => entry.key,
      (entry) => entry.value
    );
  }

  /**
   * Collect to an average
   * @returns a collector which produces an average of the input or NaN if none
   */
  public static averaging(): Collector<number, void, number> {
    let count = 0;
    let sum = 0;
    return {
      supplier: () => ({}),
      accumulator: (a, b) => {
        sum += b;
        count++;
      },
      finisher: (a) => {
        if (count === 0) {
          return Number.NaN;
        }
        return sum / count;
      },
    };
  }

  /**
   * Create a joining collector assuming a stream of strings
   * @param delimiter the delimiter between items
   * @param prefix the prefix before the whole join
   * @param suffix the suffix of the join
   * @returns a collector which builds a string joining the items together
   */
  public static joining(
    delimiter = '',
    prefix = '',
    suffix = ''
  ): Collector<string, void, string> {
    let result = prefix;
    let first = true;
    return {
      supplier: () => ({}),
      accumulator: (a, b) => {
        if (!first) {
          result = result + delimiter;
        }
        first = false;
        result = result + b;
      },
      finisher: () => result + suffix,
    };
  }

  public static collectingAndThen<T, A, R, RR>(
    collector: Collector<T, A, R>,
    finisher: Mapper<R, RR>
  ): Collector<T, A, RR> {
    return {
      supplier: collector.supplier,
      accumulator: collector.accumulator,
      finisher: (a) => finisher(collector.finisher(a)),
    };
  }
}
