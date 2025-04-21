import Optional from './Optional';

/**
 * A transformer is a bit like a collector, but it can be put in the middle of a stream/iterable. It
 * will be fed with items and returns an optional value is there is one to return. It can have a state
 * in terms of an accumulator, which may be reset when it returns a non optional empty with a true value
 * for 'clearState'
 */
export interface Transformer<T, A, R> {
  /**
   * Clean the accumulator for transforming
   * @returns a supplier of a fresh state/accumulator
   */
  supplier: () => A;

  /**
   * Perform transformation of the input element
   * @param a the accumulator
   * @param t the next element
   * @returns an optional value, which, if present comes with an optional request to clear the state
   */
  transformer: (a: A, t: T) => { clearState?: boolean; value: Optional<R> };

  /**
   * When we reach the final element, the finisher may provide an optional last value
   * @param a the accumulator
   * @returns an optional last value
   */
  finisher: (a: A) => Optional<R>;
}

export default class Transformers {
  /**
   * A batching transformer - converts the stream into array of the batch size
   * @param size the size of each batch
   */
  public static batch<T>(size: number): Transformer<T, T[], T[]> {
    return {
      supplier: () => [],
      transformer: (a, t) => {
        a.push(t);
        if (a.length >= size) {
          return { clearState: true, value: Optional.of(a) };
        }
        return { value: Optional.empty() };
      },
      finisher: (a) => Optional.of(a).filter((a) => a.length > 0),
    };
  }
}
