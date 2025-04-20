import Collectors, { collect } from './Collectors';
import { ArrayIterable } from './Iterables';

describe('Collectors', () => {
  describe('to list', () => {
    it('can collect an empty iterator', () => {
      expect(collect(new ArrayIterable([]), Collectors.toList())).toEqual([]);
    });
  });

  describe('to object', () => {
    it('can collect the list elements and put them in an object', () => {
      expect(
        collect(
          new ArrayIterable([
            { name: 'Jim', age: 46 },
            { name: 'Bob', age: 67 },
          ]),
          Collectors.toObject(
            (obj) => obj.name,
            (obj) => obj.age
          )
        )
      ).toEqual({ Jim: 46, Bob: 67 });
    });
  });
});
