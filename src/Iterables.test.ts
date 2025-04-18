import { ArrayIterable } from './Iterables';

describe('Iterables', () => {
  describe('array', () => {
    it('will throw if no elements and get next', () => {
      expect(() => new ArrayIterable([]).getNext()).toThrow();
    });
  });
});
