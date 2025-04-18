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

/**
 * Get the opposite of a predicate
 * @param predicate the predicate to not
 * @returns a predicate inverting the input predicate
 */
export const not = <T>(predicate: Predicate<T>) => {
  return (input: T) => !predicate(input);
};
