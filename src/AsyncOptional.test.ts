import AsyncOptional from './AsyncOptional';
import Optional from './Optional';

describe('AsyncOptional', () => {
  describe('construction', () => {
    it('can be constructed from a promise', async () => {
      expect(await AsyncOptional.of(Promise.resolve('foo')).get()).toBe('foo');
    });

    it('can be constructed from a value', async () => {
      expect(await AsyncOptional.of('foo').get()).toBe('foo');
    });

    it('can be constructed from a neighbouring optional', async () => {
      const asyncOptional = Optional.of('foo').async();
      expect(await asyncOptional.get()).toBe('foo');
    });
  });

  describe('getting', () => {
    it('an async optional can be get-ed', async () => {
      expect(await AsyncOptional.of('foo').get()).toBe('foo');
    });

    it('an empty async optional can be get-ed', async () => {
      expect(await AsyncOptional.empty().get()).toBeUndefined();
    });

    it('can convert back to a standard optional', async () => {
      expect((await AsyncOptional.of('foo').toOptional()).get()).toBe('foo');
    });
  });

  describe('filter', () => {
    it('can filter an optional with a sync function', async () => {
      const optional = Optional.of(27)
        .async()
        .filter((val) => val % 2 === 0);
      expect(await optional.isPresent()).toBeFalsy();
    });

    it('can filter an optional with a sync function and check with isEmpty', async () => {
      const optional = Optional.of(27)
        .async()
        .filter((val) => val % 2 === 0);
      expect(await optional.isEmpty()).toBeTruthy();
    });

    it('can filter an optional with an async function', async () => {
      const optional = Optional.of(27)
        .async()
        .filter(async (val) => val % 2 === 0);
      expect(await optional.isPresent()).toBeFalsy();
    });
  });

  describe('map', () => {
    it('can map an empty optional with a synchronous function', async () => {
      const optional = Optional.empty<number>()
        .async()
        .map((val) => val * 2);
      expect(await optional.get()).toBeUndefined();
    });

    it('can map an optional with a synchronous function', async () => {
      const optional = Optional.of(7)
        .async()
        .map((val) => val * 2);
      expect(await optional.get()).toBe(14);
    });

    it('can map an optional with an asynchronous function', async () => {
      const optional = Optional.of(7)
        .async()
        .map(async (val) => val * 2);
      expect(await optional.get()).toBe(14);
    });
  });

  describe('flat mapping', () => {
    it('can flatmap with an async function', async () => {
      const optional = Optional.of(7)
        .async()
        .flatMap(async () => Optional.of(14));
      expect(await optional.get()).toBe(14);
    });

    it('can flatmap with a synchronouse function', async () => {
      const optional = Optional.of(7)
        .async()
        .flatMap(() => Optional.of(14));
      expect(await optional.get()).toBe(14);
    });
  });

  describe('or else', () => {
    it('resolves empty with or else', async () => {
      expect(await AsyncOptional.empty<number>().orElse(2)).toBe(2);
    });

    it('resolves full with or else', async () => {
      expect(await AsyncOptional.of(10).orElse(2)).toBe(10);
    });

    it('resolves empty with or else throw to throw', async () => {
      await expect(
        AsyncOptional.empty<number>().orElseThrow()
      ).rejects.toThrow();
    });

    it('resolves empty with or else throw to throw custom error', async () => {
      await expect(
        AsyncOptional.empty<number>().orElseThrow(() => new Error('boom'))
      ).rejects.toThrow('boom');
    });

    it('resolves full with or else', async () => {
      await expect(AsyncOptional.of(3).orElseThrow()).resolves.toBe(3);
    });

    it('or else gets with a synchronous supplier of a value when there is a value', async () => {
      expect(await AsyncOptional.of(10).orElseGet(() => 2)).toBe(10);
    });

    it('or elses with a synchronous supplier of a value', async () => {
      expect(await AsyncOptional.empty<number>().orElseGet(() => 2)).toBe(2);
    });

    it('or elses with an asynchronous supplier of a value', async () => {
      expect(await AsyncOptional.empty<number>().orElseGet(async () => 2)).toBe(
        2
      );
    });
  });

  describe('if present', () => {
    it('if not present does nothing', async () => {
      const ifPresent = vi.fn();
      await AsyncOptional.empty().ifPresent(ifPresent);

      expect(ifPresent).not.toHaveBeenCalled();
    });

    it('if present does something', async () => {
      const ifPresent = vi.fn();
      await AsyncOptional.of('foo').ifPresent(ifPresent);

      expect(ifPresent).toHaveBeenCalled();
    });

    it('if not present calls or else', async () => {
      const ifPresent = vi.fn();
      const orElse = vi.fn();
      await AsyncOptional.empty().ifPresentOrElse(ifPresent, orElse);

      expect(ifPresent).not.toHaveBeenCalled();
      expect(orElse).toHaveBeenCalled();
    });

    it('if present does something', async () => {
      const ifPresent = vi.fn();
      const orElse = vi.fn();
      await AsyncOptional.of('foo').ifPresentOrElse(ifPresent, orElse);

      expect(ifPresent).toHaveBeenCalled();
      expect(orElse).not.toHaveBeenCalled();
    });
  });

  describe('to stream', () => {
    it('converts an empty optional to an empty stream', async () => {
      expect(await AsyncOptional.empty().stream().count()).toBe(0);
    });

    it('converts an valued optional to a stream of one', async () => {
      expect(await AsyncOptional.of('foo').stream().findFirst().get()).toBe(
        'foo'
      );
    });

    it('converts an valued optional to a stream of one when we read the whole thing', async () => {
      expect(await AsyncOptional.of('foo').stream().toArray()).toEqual(['foo']);
    });
  });
});
