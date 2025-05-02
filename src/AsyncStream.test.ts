import { sleep } from './async';
import AsyncOptional from './AsyncOptional';
import AsyncStream from './AsyncStream';
import { compareString, comparingBy, identity } from './functions';
import Stream from './Stream';
import Transformers from './Transformers';

describe('Async Stream', () => {
  describe('Create and collect to array', () => {
    it('can be created from another stream', async () => {
      expect(await AsyncStream.ofStream(Stream.of(1, 2, 3)).toArray()).toEqual([
        1, 2, 3,
      ]);
    });

    it('can be created empty', async () => {
      expect(await AsyncStream.empty().findFirst().isPresent()).toBeFalsy();
    });

    it('can be created from an array', async () => {
      expect(await AsyncStream.ofArray(['a', 'b', 'c']).toArray()).toEqual([
        'a',
        'b',
        'c',
      ]);
    });

    it('can be created from parameters', async () => {
      expect(await AsyncStream.of('a', 'b', 'c').toArray()).toEqual([
        'a',
        'b',
        'c',
      ]);
    });

    it('can be created by concatenation', async () => {
      expect(
        await AsyncStream.concat(
          AsyncStream.of('a', 'b', 'c'),
          AsyncStream.of('d', 'e', 'f')
        ).toArray()
      ).toEqual(['a', 'b', 'c', 'd', 'e', 'f']);
    });
  });

  describe('finding', () => {
    it('can find the first element', async () => {
      expect(
        await AsyncStream.ofStream(Stream.of(1, 2, 3))
          .findFirst()
          .get()
      ).toBe(1);
    });

    it('cannot call findFirst twice', () => {
      const stream = AsyncStream.ofStream(Stream.of(1, 2, 3));
      stream.findFirst();
      expect(() => stream.findFirst()).toThrow();
    });

    it('will not find the first element in empty stream', async () => {
      expect(
        await AsyncStream.ofStream(Stream.empty()).findFirst().isPresent()
      ).toBeFalsy();
    });

    it('will stop the stream on findFirst', async () => {
      const next = vi.fn(() => Promise.resolve(AsyncOptional.empty()));
      const stop = vi.fn();

      const asyncIterable = { next, stop };
      expect(
        await new AsyncStream(asyncIterable).findFirst().isPresent()
      ).toBeFalsy();

      expect(stop).toHaveBeenCalled();
    });

    it('can find the first element with predicate', async () => {
      expect(
        await AsyncStream.ofStream(Stream.of(1, 2, 3))
          .findFirst((el) => el % 2 === 0)
          .get()
      ).toBe(2);
    });

    it('will return if any match', async () => {
      expect(
        await Stream.of(1, 2, 3)
          .async()
          .anyMatch((item) => item % 2 === 0)
      ).toBeTruthy();
    });

    it('will return if any match is false', async () => {
      expect(
        await Stream.of(1, 2, 3)
          .async()
          .anyMatch(async (item) => item % 5 === 0)
      ).toBeFalsy();
    });

    it('will return if none match', async () => {
      expect(
        await Stream.of(1, 2, 3)
          .async()
          .noneMatch((item) => item % 2 === 0)
      ).toBeFalsy();
    });

    it('will return if none match is false', async () => {
      expect(
        await Stream.of(1, 2, 3)
          .async()
          .noneMatch(async (item) => item % 5 === 0)
      ).toBeTruthy();
    });

    it('can do allMatch on empty and it returns true', async () => {
      expect(
        await Stream.empty<number>()
          .async()
          .allMatch(async (item) => item % 5 === 0)
      ).toBeTruthy();
    });

    it('allMatch is false if some do not match', async () => {
      expect(
        await Stream.of(5, 10, 11, 15)
          .async()
          .allMatch(async (item) => item % 5 === 0)
      ).toBeFalsy();
    });

    it('allMatch is true if all match', async () => {
      expect(
        await Stream.of(5, 10, 15)
          .async()
          .allMatch(async (item) => item % 5 === 0)
      ).toBeTruthy();
    });
  });

  describe('filtering', () => {
    it('Async stream can be filtered with a synchronous function', async () => {
      expect(
        await AsyncStream.ofStream(Stream.of(1, 2, 3))
          .filter((item) => item % 2 !== 0)
          .toArray()
      ).toEqual([1, 3]);
    });

    it('Async stream can be filtered with an asynchronous function', async () => {
      expect(
        await AsyncStream.ofStream(Stream.of(1, 2, 3))
          .filter(async (item) => item % 2 !== 0)
          .toArray()
      ).toEqual([1, 3]);
    });
  });

  describe('mapping', () => {
    it('Async stream can be mapped with a synchronous function', async () => {
      expect(
        await AsyncStream.ofStream(Stream.of(1, 2, 3))
          .map((item) => item * 2)
          .toArray()
      ).toEqual([2, 4, 6]);
    });

    it('Async stream can be mapped with an asynchronous function', async () => {
      expect(
        await AsyncStream.ofStream(Stream.of(1, 2, 3))
          .map(async (item) => item * 2)
          .toArray()
      ).toEqual([2, 4, 6]);
    });
  });

  describe('indexed', () => {
    it('will attach an index to each value on the way through', async () => {
      expect(await AsyncStream.of('a', 'b', 'c').indexed().toArray()).toEqual([
        { index: 0, value: 'a' },
        { index: 1, value: 'b' },
        { index: 2, value: 'c' },
      ]);
    });
  });

  describe('sorted', () => {
    it('will attach an index to each value on the way through', async () => {
      expect(
        await AsyncStream.of('c', 'b', 'a')
          .indexed()
          .sorted(comparingBy((item) => item.value, compareString))
          .toArray()
      ).toEqual([
        { index: 2, value: 'a' },
        { index: 1, value: 'b' },
        { index: 0, value: 'c' },
      ]);
    });
  });

  describe('flat mapping mapping', () => {
    it('Async stream can be flat mapped with a synchronous function', async () => {
      expect(
        await AsyncStream.ofStream(Stream.of([1, 2, 3], [4, 5, 6]))
          .flatMap((array) => AsyncStream.ofStream(Stream.ofArray(array)))
          .toArray()
      ).toEqual([1, 2, 3, 4, 5, 6]);
    });

    it('Async stream can be flat mapped with a synchronous function that returns an array', async () => {
      expect(
        await AsyncStream.ofStream(Stream.of([1, 2, 3], [4, 5, 6]))
          .flatMap(identity)
          .toArray()
      ).toEqual([1, 2, 3, 4, 5, 6]);
    });

    it('Async stream can have empty streams in it with a synchronous function', async () => {
      expect(
        await AsyncStream.ofStream(Stream.of([1, 2, 3], [], [4, 5, 6], []))
          .flatMap((array) => AsyncStream.ofStream(Stream.ofArray(array)))
          .toArray()
      ).toEqual([1, 2, 3, 4, 5, 6]);
    });

    it('Async stream can be mapped with an asynchronous function', async () => {
      expect(
        await AsyncStream.ofStream(Stream.of([1, 2, 3], [4, 5, 6]))
          .flatMap(async (array) => AsyncStream.ofStream(Stream.ofArray(array)))
          .toArray()
      ).toEqual([1, 2, 3, 4, 5, 6]);
    });
  });

  describe('counting', () => {
    it('can count', async () => {
      expect(await AsyncStream.ofStream(Stream.of(1, 2, 3)).count()).toBe(3);
    });
  });

  describe('transformation', () => {
    it('can transform enough to provide distinct', async () => {
      expect(
        await Stream.of('a', 'a', 'a', 'b', 'b', 'b', 'c', 'c', 'd', 'c')
          .async()
          .distinct()
          .toArray()
      ).toEqual(['a', 'b', 'c', 'd']);
    });

    it('can transform enough to provide first distinct (which should stop)', async () => {
      expect(
        await Stream.of('a', 'a', 'a', 'b', 'b', 'b', 'c', 'c', 'd', 'c')
          .async()
          .distinct()
          .findFirst()
          .get()
      ).toBe('a');
    });

    it('can transform into batches', async () => {
      expect(
        await Stream.of('a', 'a', 'a', 'b', 'b', 'b', 'c', 'c', 'd', 'c')
          .async()
          .transform(Transformers.batch(2))
          .findFirst()
          .get()
      ).toEqual(['a', 'a']);
    });

    it('can transform into all batches', async () => {
      expect(
        await Stream.of('a', 'b', 'c', 'd')
          .async()
          .transform(Transformers.batch(2))
          .toArray()
      ).toEqual([
        ['a', 'b'],
        ['c', 'd'],
      ]);
    });
  });

  describe('generate', () => {
    it('can generate finite with limit', async () => {
      expect(
        await AsyncStream.generateFinite(() => AsyncOptional.of('a'))
          .limit(5)
          .toArray()
      ).toEqual(['a', 'a', 'a', 'a', 'a']);
    });

    it('can generate finite sequentially', async () => {
      let index = 0;
      const letters = ['a', 'b', 'c', 'd', 'e'];
      expect(
        await AsyncStream.generateFinite(
          () =>
            AsyncOptional.of(
              (async () => {
                await sleep(10);
                if (index < letters.length) {
                  return letters[index++];
                }
                return undefined;
              })()
            ),
          true
        )
          .buffer(3)
          .toArray()
      ).toEqual(['a', 'b', 'c', 'd', 'e']);
    });

    it('can iterate even when parallel', async () => {
      let index = 0;
      const letters = ['b', 'c', 'd', 'e'];
      expect(
        await AsyncStream.iterate(
          () => 'a',
          async (last: string) => {
            await sleep(10);
            if (index < letters.length) {
              return AsyncOptional.of(last + letters[index++]);
            }
            return AsyncOptional.empty();
          }
        )
          .buffer(3)
          .toArray()
      ).toEqual(['a', 'ab', 'abc', 'abcd', 'abcde']);
    });

    it('can iterate from actual seed', async () => {
      let index = 0;
      const letters = ['b', 'c', 'd', 'e'];
      expect(
        await AsyncStream.iterate('a', async (last: string) => {
          await sleep(10);
          if (index < letters.length) {
            return AsyncOptional.of(last + letters[index++]);
          }
          return AsyncOptional.empty();
        }).toArray()
      ).toEqual(['a', 'ab', 'abc', 'abcd', 'abcde']);
    });
  });
});
