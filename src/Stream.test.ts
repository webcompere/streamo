import Collectors from './Collectors';
import {
  compareNumbers,
  compareString,
  Consumer,
  identity,
  reversed,
} from './functions';
import Optional from './Optional';
import Stream from './Stream';

describe('streaming', () => {
  describe('of vector sources', () => {
    it('can create from an array', () => {
      expect(Stream.ofArray(['a', 'b', 'c']).count()).toBe(3);
    });

    it('can create from varargs', () => {
      expect(Stream.of('a', 'b', 'c').count()).toBe(3);
    });

    it('can create from an object', () => {
      expect(Stream.ofObject({ a: 1, b: 2 }).count()).toBe(2);
    });

    it('can creat4e from a map', () => {
      const map = new Map<string, number>();
      map.set('a', 1);
      map.set('b', 2);

      expect(Stream.ofMap(map).count()).toBe(2);
    });
  });

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

    it('can flatten elements direct to array', () => {
      expect(
        Stream.of([1, 2, 3], [4, 5, 6]).flatMap(identity).toArray()
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

  describe('generate', () => {
    it('can generate indefinitely', () => {
      expect(
        Stream.generate(() => 'foo')
          .limit(100)
          .count()
      ).toBe(100);
    });

    it('can generate finite until the finite source runs out', () => {
      const some = ['foo', 'bar'];
      expect(
        Stream.generateFinite(() => Optional.of(some.pop()))
          .limit(100)
          .toArray()
      ).toEqual(['bar', 'foo']);
    });
  });

  describe('iterate', () => {
    it('can provide a series of values', () => {
      expect(
        Stream.iterate(0, (a) => a + 1)
          .limit(4)
          .toArray()
      ).toEqual([0, 1, 2, 3]);
    });

    it('can provide a series of values, self terminating at the last', () => {
      expect(
        Stream.iterate(
          0,
          (a) => a + 1,
          (a) => a < 4
        ).toArray()
      ).toEqual([0, 1, 2, 3]);
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

    it('can provide a predicate to findFirst as a shortcut to using filter', () => {
      expect(
        Stream.of('bar', 'foo')
          .findFirst((x) => x === 'foo')
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

    it('will match all on empty', () => {
      expect(Stream.empty<number>().allMatch((item) => item < 20)).toBeTruthy();
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

  describe('sorted', () => {
    it('will apply a sort to an already sorted stream', () => {
      expect(Stream.of(1, 2, 3).sorted().toArray()).toEqual([1, 2, 3]);
    });

    it('will apply a sort to an unsorted stream', () => {
      expect(Stream.of(5, 2, 1, 3, 4).sorted().toArray()).toEqual([
        1, 2, 3, 4, 5,
      ]);
    });

    it('can sort numbers correctly when numeric', () => {
      expect(Stream.ofNumbers(1, 10, 2, 25, 99, 9).sorted().toArray()).toEqual([
        1, 2, 9, 10, 25, 99,
      ]);
    });

    it('will apply a sort to an unsorted stream with custom comparator', () => {
      expect(Stream.of(5, 2, 1, 3, 4).sorted(compareNumbers).toArray()).toEqual(
        [1, 2, 3, 4, 5]
      );
    });

    it('will apply a sort to an unsorted stream with custom comparator in reverse order', () => {
      expect(
        Stream.of(5, 2, 1, 3, 4).sorted(reversed(compareNumbers)).toArray()
      ).toEqual([5, 4, 3, 2, 1]);
    });

    it('will apply a sort to an unsorted stream with default comparator', () => {
      expect(Stream.of('red', 'green', 'blue').sorted().toArray()).toEqual([
        'blue',
        'green',
        'red',
      ]);
    });

    it('will apply a sort to an unsorted stream with custom string comparator', () => {
      expect(
        Stream.of('red', 'green', 'blue').sorted(compareString).toArray()
      ).toEqual(['blue', 'green', 'red']);
    });
  });

  describe('min and max', () => {
    it('can find the minimum of a stream', () => {
      expect(Stream.of(5, 4, 3, 2, 1).min(compareNumbers).get()).toBe(1);
    });

    it('can find the maximum of a stream', () => {
      expect(Stream.of(5, 4, 3, 2, 1).max(compareNumbers).get()).toBe(5);
    });

    it('can find no maximum of an empty stream', () => {
      expect(Stream.empty<number>().max(compareNumbers).get()).toBeUndefined();
    });

    it('can use numeric comparison max for free with numberstream', () => {
      expect(Stream.of(5, 4, 3, 2, 1).mapToNumber(identity).max().get()).toBe(
        5
      );
    });

    it('can use numeric comparison min for free with numberstream', () => {
      expect(Stream.of(5, 4, 3, 2, 1).mapToNumber(identity).min().get()).toBe(
        1
      );
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
          identity
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

    it('can reduce no items to the initial value', () => {
      expect(
        Stream.empty<string>().reduceFrom('foo', (a, b) => `${a}${b}`, identity)
      ).toBe('foo');
    });

    it('can reduce multiple items by combining', () => {
      expect(
        Stream.of('bar').reduceFrom('foo', (a, b) => `${a} ${b}`, identity)
      ).toBe('foo bar');
    });

    it('can reduce multiple items with type conversion', () => {
      expect(
        Stream.of('foo', 'fo', 'f').reduceFrom(
          '',
          (a, b) => `${a} ${b}`,
          (st: string) => `${st.length}`
        )
      ).toBe(' 3 2 1');
    });

    it('can join nothing together', () => {
      expect(Stream.empty().join(',')).toBe('');
    });

    it('can join one thing together', () => {
      expect(Stream.of('a').join(',')).toBe('a');
    });

    it('can join things together', () => {
      expect(Stream.of('a', 'b', 'c', 'd').join(',')).toBe('a,b,c,d');
    });

    it('can join things together with no delimiter', () => {
      expect(Stream.of('a', 'b', 'c', 'd').join()).toBe('abcd');
    });

    it('can join things together when first is blank', () => {
      expect(Stream.of('', 'b', 'c', 'd').join(',')).toBe(',b,c,d');
    });
  });

  describe('Numeric', () => {
    it('can add up numbers', () => {
      expect(Stream.of(1, 2, 3).mapToNumber(identity).sum()).toBe(6);
    });

    it('creates a range', () => {
      expect(Stream.ofRange(0, 4).sum()).toBe(6);
    });

    it('creates a range closed', () => {
      expect(Stream.ofRangeClosed(0, 4).sum()).toBe(10);
    });

    it('will create a numeric stream directly', () => {
      expect(Stream.ofNumbers(1, 2, 3).sum()).toBe(6);
    });

    it('will create a numeric stream from an array', () => {
      expect(Stream.ofNumericArray([1, 2, 3]).sum()).toBe(6);
    });

    it('will keep a number stream as itself for limit', () => {
      expect(Stream.ofNumericArray([1, 2, 3, 4, 5]).limit(3).sum()).toBe(6);
    });

    it('will keep a number stream as itself for filter', () => {
      expect(
        Stream.ofNumericArray([1, 2, 3, 4, 5])
          .filter((num) => num % 2 === 0)
          .sum()
      ).toBe(6);
    });

    it('will keep a number stream as itself for takeWhile', () => {
      expect(
        Stream.ofNumericArray([1, 2, 3, 4, 5])
          .takeWhile((num) => num < 4)
          .sum()
      ).toBe(6);
    });

    it('will keep a number stream as itself for dropWhile', () => {
      expect(
        Stream.ofNumericArray([1, 2, 3, 4, 5])
          .dropWhile((num) => num < 4)
          .sum()
      ).toBe(9);
    });

    it('will keep a number stream as itself for distinct', () => {
      expect(
        Stream.ofNumericArray([1, 1, 2, 2, 3, 3, 3]).distinct().sum()
      ).toBe(6);
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

  describe('drop while', () => {
    it('will skip nothing if no elements', () => {
      expect(
        Stream.empty<string>()
          .dropWhile((s) => s === '')
          .count()
      ).toBe(0);
    });

    it('will skip elements matching the filter', () => {
      expect(
        Stream.of('', '', 'red')
          .dropWhile((s) => s === '')
          .toArray()
      ).toEqual(['red']);
    });

    it('will skip nothing if first element does not match filter', () => {
      expect(
        Stream.of('blue', '', '', 'red')
          .dropWhile((s) => s === '')
          .toArray()
      ).toEqual(['blue', '', '', 'red']);
    });
  });

  describe('indexed', () => {
    it('will provide indexes', () => {
      expect(
        Stream.of(9, 8, 7, 6)
          .indexed()
          .map((item) => item.index)
          .toArray()
      ).toEqual([0, 1, 2, 3]);
    });

    it('will allow us to filter based on the nth item', () => {
      expect(
        Stream.of('blue', 'green', 'white', 'black')
          .indexed()
          .filter((item) => item.index % 2 !== 0)
          .map((item) => item.value)
          .toArray()
      ).toEqual(['green', 'black']);
    });
  });

  describe('collection', () => {
    it('can use toArray instead of built in toArray', () => {
      expect(
        Stream.of('red', 'green', 'blue').collect(Collectors.toArray())
      ).toEqual(['red', 'green', 'blue']);
    });
  });

  describe('to async', () => {
    it('can be converted to an async stream', async () => {
      expect(await Stream.of(1, 2, 3).async().toArray()).toEqual([1, 2, 3]);
    });
  });

  describe('Terminal operations', () => {
    it.each([
      (stream: Stream<number>) => stream.toArray(),
      (stream: Stream<number>) => stream.toMap(identity, identity),
      (stream: Stream<number>) => stream.count(),
      (stream: Stream<number>) => stream.min(compareNumbers),
      (stream: Stream<number>) => stream.max(compareNumbers),
      (stream: Stream<number>) => stream.getIterable(),
      (stream: Stream<number>) => stream.allMatch((x) => x === 2),
      (stream: Stream<number>) => stream.noneMatch((x) => x === 2),
      (stream: Stream<number>) => stream.anyMatch((x) => x === 2),
      (stream: Stream<number>) => stream.findFirst(),
      (stream: Stream<number>) => stream.reduce((a, b) => a + b),
      (stream: Stream<number>) =>
        stream.reduceFrom(1, (a, b) => a + b, identity),
    ])(
      'cannot use a terminal operation more than once',
      (operation: Consumer<Stream<number>>) => {
        const stream = Stream.of(1, 2, 3, 4, 5);
        operation(stream);

        expect(() => operation(stream)).toThrow();
      }
    );
  });
});
