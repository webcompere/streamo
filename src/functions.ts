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
 * A function that takes an input of one type and transforms it to a value of the same type
 */
export type UnaryOperator<T> = Mapper<T, T>;

/**
 * A function that does nothing
 */
export const noop: Callable = () => {};

/**
 * the identity function
 * @returns the identity function of any type
 */
export const identity = <T>(t: T): T => t;

/**
 * Get the opposite of a predicate
 * @param predicate the predicate to not
 * @returns a predicate inverting the input predicate
 */
export const not = <T>(predicate: Predicate<T>) => {
  return (input: T) => !predicate(input);
};

/**
 * Predicate that's always true
 * @param a any input
 * @returns a function that always returns true
 */
export const alwaysTrue = <T>(a: T) => true;

/**
 * A.K.A. compareFn as used in arrays
 */
export type Comparator<T> = (a: T, b: T) => number;

/**
 * Reverse a comparator
 * @param comparator the comparator to reverse
 * @returns a reverse of a comparator
 */
export const reversed =
  <T>(comparator: Comparator<T>): Comparator<T> =>
  (a, b) =>
    -comparator(a, b);

/**
 * Comparator for numbers
 * @param a first number
 * @param b second number
 * @returns forwards order
 */
export const compareNumbers: Comparator<number> = (a, b) => a - b;

/**
 * Compare strings
 * @param a first string
 * @param b second string
 * @returns a comparator that uses `localeCompare`
 */
export const compareString: Comparator<string> = (a, b) => a.localeCompare(b);
