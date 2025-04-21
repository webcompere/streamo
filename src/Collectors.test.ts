import Collectors, { collect } from './Collectors';
import { compareString, comparingBy } from './functions';
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

    it('can collect entries into an object', () => {
      expect(
        Stream.ofObject({ a: 1, b: 2 }).collect(
          Collectors.toObjectFromEntries()
        )
      ).toEqual({ a: 1, b: 2 });
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

  describe('average', () => {
    it('will calculate the average of some numbers', () => {
      expect(Stream.ofNumbers(1, 2, 3).collect(Collectors.averaging())).toBe(2);
    });

    it('cannot calculate an average of nothing', () => {
      expect(Stream.empty<number>().collect(Collectors.averaging())).toBe(
        Number.NaN
      );
    });
  });

  describe('joining', () => {
    it('will join a sequence of strings with no parameters', () => {
      expect(Stream.of('a', 'b', 'c').collect(Collectors.joining())).toBe(
        'abc'
      );
    });

    it('will join a sequence of strings with delimiter', () => {
      expect(Stream.of('a', 'b', 'c').collect(Collectors.joining(','))).toBe(
        'a,b,c'
      );
    });

    it('will join a sequence of strings with delimiter and prefix', () => {
      expect(
        Stream.of('a', 'b', 'c').collect(Collectors.joining(',', '('))
      ).toBe('(a,b,c');
    });

    it('will join a sequence of strings with delimiter, prefix, suffix', () => {
      expect(
        Stream.of('a', 'b', 'c').collect(Collectors.joining(',', '(', ')'))
      ).toBe('(a,b,c)');
    });

    it('will join an empty of strings with delimiter, prefix, suffix', () => {
      expect(
        Stream.empty<string>().collect(Collectors.joining(',', '(', ')'))
      ).toBe('()');
    });
  });

  describe('collecting and then', () => {
    it('will apply a finishing function after a collector', () => {
      expect(
        Stream.of('a', 'b', 'c').collect(
          Collectors.collectingAndThen(
            Collectors.joining(',', '(', ')'),
            (s) => s.length
          )
        )
      ).toBe(7);
    });
  });

  describe('min and max by', () => {
    it('can find the largest item', () => {
      expect(
        Stream.of('red', 'green', 'blue')
          .collect(Collectors.maxBy(compareString))
          .get()
      ).toBe('red');
    });

    it('can find the smallest item', () => {
      expect(
        Stream.of('red', 'green', 'blue')
          .collect(Collectors.minBy(compareString))
          .get()
      ).toBe('blue');
    });

    it('can find the smallest item using comparingBy', () => {
      expect(
        Stream.of({ colour: 'red' }, { colour: 'green' }, { colour: 'blue' })
          .collect(
            Collectors.minBy(comparingBy((item) => item.colour, compareString))
          )
          .get()
      ).toEqual({ colour: 'blue' });
    });

    it('will return empty if no items', () => {
      expect(
        Stream.empty<string>()
          .collect(Collectors.minBy(compareString))
          .isPresent()
      ).toBeFalsy();
    });
  });
});
