/**
 * A mapping function
 */
export type Mapper<T, R> = (t: T) => R;

/**
 * A predicate function
 */
export type Predicate<T> = (t: T) => boolean;

/**
 * Function that supplies a value
 */
export type Supplier<T> = () => T;

/**
 * Consume a value
 */
export type Consumer<T> = (t: T) => void;

/**
 * A doing function
 */
export type Callable = () => void;

/**
 * A function that takes two inputs of the same type and returns something of the same type
 */
export type BinaryOperator<T> = (a: T, b: T) => T;

/**
 * A function that does nothing
 */
export const noop: Callable = () => {};

/**
 * the identity function
 * @returns the identity function of any type
 */
export const identity =
  <T>() =>
  (t: T): T =>
    t;
