import Collectors, { collect } from './Collectors';
import { ArrayIterable } from './Iterables';
import Stream from './Stream';

describe('Collectors', () => {
  describe('to array', () => {
    it('can collect an empty iterator', () => {
      expect(collect(new ArrayIterable([]), Collectors.toArray())).toEqual([]);
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

  describe('toMap', () => {
    it('can convert an object into a map', () => {
      const expectedMap = new Map<string, number>();
      expectedMap.set('a', 1);
      expectedMap.set('b', 2);
      expect(
        Stream.ofObject({ a: 1, b: 2 }).collect(Collectors.toMapFromEntries())
      ).toEqual(expectedMap);
    });

    it('can convert to map arbitrarily', () => {
      const expectedMap = new Map<string, number>();
      expectedMap.set('a', 1);
      expectedMap.set('b', 2);
      expect(
        Stream.of({ name: 'a', value: 1 }, { name: 'b', value: 2 }).collect(
          Collectors.toMap(
            (item) => item.name,
            (item) => item.value
          )
        )
      ).toEqual(expectedMap);
    });
  });
});
