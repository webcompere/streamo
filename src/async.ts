/**
 * Provide a sleep
 * @param timeMs time to sleep for
 */
export const sleep = async (timeMs: number): Promise<void> => {
  await new Promise((resolve, reject) => setTimeout(resolve, timeMs));
};

/**
 * A mapping function
 */
export type AsyncMapper<T, R> = (t: T) => Promise<R>;

/**
 * A predicate function
 */
export type AsyncPredicate<T> = (t: T) => Promise<boolean>;

/**
 * Function that supplies a value
 */
export type AsyncSupplier<T> = () => Promise<T>;

/**
 * Consume a value
 */
export type AsyncConsumer<T> = (t: T) => Promise<void>;

/**
 * A doing function
 */
export type AsyncCallable = () => Promise<void>;

/**
 * A value which may be a promise, or may be an actual value
 */
export type PromiseOrValue<T> = T | Promise<T>;

/**
 * Coerce into a promise
 * @param value the value, which is either a promise or not
 * @returns a definite promise
 */
export const toPromise = <T>(value: PromiseOrValue<T>): Promise<T> =>
  Promise.resolve(value);
