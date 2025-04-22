import { bufferingIterable, iterableToAsync } from './AsyncIterables';
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
});
