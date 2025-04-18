import { identity } from './functions';
import Stream from './Stream';

describe('streaming', () => {
  describe('collect to array', () => {
    it('can collect an array', () => {
      const collected = Stream.ofArray([1, 2, 3]).toArray();

      expect(collected).toEqual([1, 2, 3]);
    });

    it('can collect individual elements', () => {
      const collected = Stream.of(1, 2, 3).toArray();

      expect(collected).toEqual([1, 2, 3]);
    });
  });

  describe('mapping', () => {
    it('can convert elements with map', () => {
      const collected = Stream.of(1, 2, 3)
        .map((value) => value * 2)
        .toArray();

      expect(collected).toEqual([2, 4, 6]);
    });

    it('can apply multiple mappings', () => {
      const collected = Stream.of(1, 2, 3)
        .map((value) => ({ value }))
        .map((obj) => ({ ...obj, name: 'jimmy' }))
        .toArray();

      expect(collected).toEqual([
        { name: 'jimmy', value: 1 },
        { name: 'jimmy', value: 2 },
        { name: 'jimmy', value: 3 },
      ]);
    });

    it('can apply multiple mappings and a filter', () => {
      const collected = Stream.of(1, 2, 3)
        .map((value) => ({ value }))
        .map((obj) => ({ ...obj, name: 'jimmy' }))
        .filter((obj) => obj.value != 2)
        .toArray();

      expect(collected).toEqual([
        { name: 'jimmy', value: 1 },
        { name: 'jimmy', value: 3 },
      ]);
    });
  });

  describe('flat mapping', () => {
    it('can flatten elements', () => {
      expect(
        Stream.of([1, 2, 3], [4, 5, 6])
          .flatMap((item) => Stream.ofArray(item))
          .toArray()
      ).toEqual([1, 2, 3, 4, 5, 6]);
    });

    it('can concatenate streams', () => {
      expect(
        Stream.concat(Stream.of(1, 2, 3), Stream.of(4, 5, 6)).toArray()
      ).toEqual([1, 2, 3, 4, 5, 6]);
    });
  });

  describe('filtering', () => {
    it('filters items', () => {
      const collected = Stream.of(1, 2, 3, 4, 5, 6)
        .filter((value) => value % 2 === 0)
        .toArray();

      expect(collected).toEqual([2, 4, 6]);
    });

    it('limits items', () => {
      expect(Stream.of(1, 2, 3, 4, 5).limit(3).toArray()).toEqual([1, 2, 3]);
    });

    it('can apply the limit to an infinite stream', () => {
      const generator = vi.fn(() => 'foo');
      expect(Stream.generate(generator).limit(3).toArray()).toEqual([
        'foo',
        'foo',
        'foo',
      ]);

      // but the generator wasn't called more than needed
      expect(generator).toHaveBeenCalledTimes(3);
    });
  });

  describe('find first', () => {
    it('will find the first item when there is one', () => {
      expect(Stream.of(1).findFirst().get()).toBe(1);
    });

    it('will find no first item in an empty stream', () => {
      expect(Stream.empty().findFirst().isPresent()).toBeFalsy();
    });

    it('can get the first item of a generated stream', () => {
      expect(
        Stream.generate(() => 'foo')
          .findFirst()
          .get()
      ).toBe('foo');
    });
  });

  describe('matching', () => {
    it('will find no matches', () => {
      expect(Stream.of(1, 2, 3).anyMatch((item) => item === 999)).toBeFalsy();
    });

    it('will find matches', () => {
      expect(Stream.of(1, 2, 3).anyMatch((item) => item === 2)).toBeTruthy();
    });

    it('will prove no matches', () => {
      expect(Stream.of(1, 2, 3).noneMatch((item) => item === 999)).toBeTruthy();
    });

    it('will disprove no matches', () => {
      expect(Stream.of(1, 2, 3).noneMatch((item) => item === 2)).toBeFalsy();
    });

    it('will not match all', () => {
      expect(Stream.of(1, 2, 3).allMatch((item) => item === 2)).toBeFalsy();
    });

    it('will match all', () => {
      expect(Stream.of(1, 2, 3).allMatch((item) => item < 20)).toBeTruthy();
    });
  });

  describe('for each', () => {
    it('will iterate over each element', () => {
      const consumer = vi.fn();

      Stream.of(1, 2, 3, 4).forEach(consumer);

      expect(consumer).toHaveBeenCalledTimes(4);
      expect(consumer).toHaveBeenCalledWith(1);
      expect(consumer).toHaveBeenCalledWith(2);
      expect(consumer).toHaveBeenCalledWith(3);
      expect(consumer).toHaveBeenCalledWith(4);
    });
  });

  describe('distinct', () => {
    it('will remove duplicates from a stream', () => {
      expect(Stream.of(1, 1, 2, 2, 3, 3, 4, 4).distinct().toArray()).toEqual([
        1, 2, 3, 4,
      ]);
    });
  });

  describe('peek', () => {
    it('will get to see every item', () => {
      const peeker = vi.fn();
      expect(Stream.of(1, 2, 3).peek(peeker).toArray()).toEqual([1, 2, 3]);
      expect(peeker).toHaveBeenCalledTimes(3);
    });
  });

  describe('count', () => {
    it('will count the elements', () => {
      expect(Stream.of(1, 2, 3).count()).toBe(3);
    });
  });

  describe('skip', () => {
    it('will skip some elements', () => {
      expect(Stream.of(1, 2, 3).skip(2).toArray()).toEqual([3]);
    });

    it('can safely skip every element', () => {
      expect(Stream.of(1).skip(100).toArray()).toEqual([]);
    });
  });

  describe('to map', () => {
    it('can put all the elements into a map', () => {
      const expectedMap = new Map<string, { name: string; age: number }>();
      expectedMap.set('John', { name: 'John', age: 41 });
      expectedMap.set('Bill', { name: 'Bill', age: 23 });

      expect(
        Stream.of({ name: 'John', age: 41 }, { name: 'Bill', age: 23 }).toMap(
          (item) => item.name,
          identity()
        )
      ).toEqual(expectedMap);
    });
  });

  describe('reduce', () => {
    it('reduces no items to empty', () => {
      expect(
        Stream.empty()
          .reduce((a, b) => b)
          .isEmpty()
      ).toBeTruthy();
    });

    it('can reduce one item to itself', () => {
      expect(
        Stream.of(1)
          .reduce((a, b) => a + b)
          .get()
      ).toBe(1);
    });

    it('can reduce two items to a third', () => {
      expect(
        Stream.of(1, 2)
          .reduce((a, b) => a + b)
          .get()
      ).toBe(3);
    });
  });

  describe('Numeric', () => {
    it('can add up numbers', () => {
      expect(Stream.of(1, 2, 3).mapToNumber(identity()).sum()).toBe(6);
    });

    it('creates a range', () => {
      expect(Stream.ofRange(0, 4).sum()).toBe(6);
    });

    it('creates a range closed', () => {
      expect(Stream.ofRangeClosed(0, 4).sum()).toBe(10);
    });
  });

  describe('take while', () => {
    it('when nothing matches, is empty', () => {
      expect(
        Stream.of(1, 2, 3)
          .takeWhile((element) => element === 4)
          .count()
      ).toBe(0);
    });

    it('when some match, then gets them', () => {
      expect(
        Stream.of(1, 2, 3)
          .takeWhile((element) => element < 3)
          .toArray()
      ).toEqual([1, 2]);
    });

    it('stops taking, even when more later match', () => {
      expect(
        Stream.of(1, 2, 3, 2, 1)
          .takeWhile((element) => element < 3)
          .toArray()
      ).toEqual([1, 2]);
    });

    it('takes none if the first element doesnt match', () => {
      expect(
        Stream.of(4, 1, 2, 2, 1)
          .takeWhile((element) => element < 3)
          .count()
      ).toBe(0);
    });
  });
});
