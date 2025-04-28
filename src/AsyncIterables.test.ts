import { sleep } from './async';
import {
  AsyncIterable,
  bufferingIterable,
  filteredAsyncIterable,
  flatMappedAsyncIterable,
  generatingIterable,
  iterableToAsync,
  limitingIterable,
} from './AsyncIterables';
import AsyncOptional from './AsyncOptional';
import AsyncStream from './AsyncStream';
import { ArrayIterable } from './Iterables';

describe('Async Iterables', () => {
  describe('from synchronous iterables', () => {
    it('can provide the first item of a list', async () => {
      const asyncIterable = iterableToAsync(new ArrayIterable([1, 2, 3]));
      expect(await (await asyncIterable.next()).get()).toBe(1);
    });

    it('can provide all items of a list', async () => {
      const asyncIterable = iterableToAsync(new ArrayIterable([1, 2, 3]));
      expect(await (await asyncIterable.next()).get()).toBe(1);
      expect(await (await asyncIterable.next()).get()).toBe(2);
      expect(await (await asyncIterable.next()).get()).toBe(3);
      expect(await (await asyncIterable.next()).isPresent()).toBeFalsy();
    });

    it('stopping an array iterable does nothing', async () => {
      const asyncIterable = iterableToAsync(new ArrayIterable([1, 2, 3]));
      expect(await (await asyncIterable.next()).get()).toBe(1);
      expect(await (await asyncIterable.next()).get()).toBe(2);
      asyncIterable.stop();
      expect(await (await asyncIterable.next()).get()).toBe(3);
      expect(await (await asyncIterable.next()).isPresent()).toBeFalsy();
    });
  });

  describe('filtering', () => {
    it('filtering iterable provides the next filtered item', async () => {
      const filter = filteredAsyncIterable(
        iterableToAsync(new ArrayIterable([1, 2, 3, 4, 5, 6])),
        (item) => item % 2 === 0
      );
      expect(await (await filter.next()).get()).toBe(2);
      expect(await (await filter.next()).get()).toBe(4);
      expect(await (await filter.next()).get()).toBe(6);
      expect(await (await filter.next()).get()).toBeUndefined();
    });

    it('filtering iterable can be stopped', async () => {
      const filter = filteredAsyncIterable(
        iterableToAsync(new ArrayIterable([1, 2, 3, 4, 5, 6])),
        (item) => item % 2 === 0
      );
      expect(await (await filter.next()).get()).toBe(2);
      filter.stop();
      expect(await (await filter.next()).get()).toBeUndefined();
    });
  });

  describe('flat mapping iterable', () => {
    it('will only return multiples items', async () => {
      const flatMapping = flatMappedAsyncIterable(
        iterableToAsync(
          new ArrayIterable([
            [1, 2, 3],
            [4, 5, 6],
          ])
        ),
        (item) => AsyncStream.ofArray(item)
      );

      expect(await (await flatMapping.next()).get()).toBe(1);
      expect(await (await flatMapping.next()).get()).toBe(2);
      expect(await (await flatMapping.next()).get()).toBe(3);
      expect(await (await flatMapping.next()).get()).toBe(4);
      expect(await (await flatMapping.next()).get()).toBe(5);
      expect(await (await flatMapping.next()).get()).toBe(6);
      expect(await (await flatMapping.next()).get()).toBeUndefined();
    });

    it('will only return one item if there has been a stop', async () => {
      const flatMapping = flatMappedAsyncIterable(
        iterableToAsync(
          new ArrayIterable([
            [1, 2, 3],
            [4, 5, 6],
          ])
        ),
        (item) => AsyncStream.ofArray(item)
      );

      expect(await (await flatMapping.next()).get()).toBe(1);

      flatMapping.stop();
      expect(await (await flatMapping.next()).get()).toBeUndefined();
    });
  });

  describe('batching buffer', () => {
    it('stopped buffer never returns anything', async () => {
      const buffer = bufferingIterable(
        iterableToAsync(new ArrayIterable([1, 2, 3])),
        3
      );
      buffer.stop();

      expect(await (await buffer.next()).isPresent()).toBeFalsy();
    });
  });

  describe('limiting iterable', () => {
    it('returns two items if not stopped', async () => {
      const iterable: AsyncIterable<string> = limitingIterable(
        generatingIterable(() => AsyncOptional.of('a')),
        2
      );

      expect(await (await iterable.next()).get()).toBe('a');
      expect(await (await iterable.next()).get()).toBe('a');
      expect(await (await iterable.next()).get()).toBeUndefined();
    });

    it('returns nothing if stopped by someone else', async () => {
      const iterable: AsyncIterable<string> = limitingIterable(
        generatingIterable(() => AsyncOptional.of('a')),
        2
      );
      iterable.stop();

      expect(await (await iterable.next()).get()).toBeUndefined();
    });

    it('returns any two items', async () => {
      const iterable: AsyncIterable<string> = limitingIterable(
        generatingIterable(async () => {
          await sleep(10);
          return AsyncOptional.of('a');
        }),
        2
      );

      const all = await Promise.all([
        iterable.next().then((it) => it.get()),
        iterable.next().then((it) => it.get()),
        iterable.next().then((it) => it.get()),
        iterable.next().then((it) => it.get()),
      ]);

      expect(all.filter(Boolean).length).toBe(2);
    });
  });
});
