import { sleep } from './async';
import { alwaysTrue } from './functions';
import Optional from './Optional';

describe('Optional', () => {
  describe('presence', () => {
    it('with no value is empty', () => {
      const optional = new Optional<string>();
      expect(optional.isEmpty()).toBeTruthy();
    });

    it('with no value is not present', () => {
      const optional = new Optional<string>();
      expect(optional.isPresent()).toBeFalsy();
    });

    it('with value is not empty', () => {
      const optional = new Optional('foo');
      expect(optional.isEmpty()).toBeFalsy();
    });

    it('with value is present', () => {
      const optional = new Optional('foo');
      expect(optional.isPresent()).toBeTruthy();
    });
  });

  describe('coalescing', () => {
    it('will provide no value if all undefined', () => {
      expect(
        Optional.of<string>(
          undefined,
          undefined,
          undefined,
          undefined
        ).isEmpty()
      ).toBeTruthy();
    });

    it('will provide truthy value if available', () => {
      expect(
        Optional.of<string>(
          undefined,
          undefined,
          undefined,
          undefined,
          'result'
        ).get()
      ).toBe('result');
    });

    it('will provide empty value if all suppliers provide undefined', () => {
      expect(
        Optional.ofSupplier<string>(
          () => undefined,
          () => undefined,
          () => undefined,
          () => undefined
        ).isEmpty()
      ).toBeTruthy();
    });

    it('will provide truthy value if supplier can produce one', () => {
      expect(
        Optional.ofSupplier<string>(
          () => undefined,
          () => undefined,
          () => undefined,
          () => undefined,
          () => 'result'
        ).get()
      ).toBe('result');
    });

    it('will provide truthy value if one supplier can produce one', () => {
      expect(Optional.ofSupplier<string>(() => 'result').get()).toBe('result');
    });
  });

  describe('getting', () => {
    it('get with contents is content', () => {
      expect(Optional.of('foo').get()).toBe('foo');
    });

    it('get with no content is undefined', () => {
      expect(Optional.empty().get()).toBeUndefined();
    });

    it('or else when contents is the content', () => {
      expect(Optional.of('foo').orElse('bar')).toBe('foo');
    });

    it('or else when no content is alternative', () => {
      expect(Optional.empty().orElse('bar')).toBe('bar');
    });

    it('or else using a supplier is possible', () => {
      expect(Optional.empty().orElseGet(() => 'bar')).toBe('bar');
    });

    it('or else using a supplier is not called when not needed', () => {
      const supplier = vi.fn();
      expect(Optional.of('foo').orElseGet(supplier)).toBe('foo');

      expect(supplier).not.toHaveBeenCalled();
    });

    it('or else will throw if not present', () => {
      expect(() => Optional.empty().orElseThrow()).toThrow();
    });

    it('or else will not throw if present', () => {
      expect(() => Optional.of('foo').orElseThrow()).not.toThrow();
    });

    it('or else will throw specific if not present', () => {
      expect(() =>
        Optional.empty().orElseThrow(() => new Error('bad'))
      ).toThrowError(new Error('bad'));
    });

    it('or else will not throw if present', () => {
      expect(() =>
        Optional.of('foo').orElseThrow(() => new Error('bad'))
      ).not.toThrow();
    });

    it('or else will return if present', () => {
      expect(Optional.of('foo').orElseThrow(() => new Error('bad'))).toBe(
        'foo'
      );
    });
  });

  describe('mapping', () => {
    it('with no value maps to empty', () => {
      expect(new Optional<string>().map((a) => '' + a).isEmpty()).toBeTruthy();
    });

    it('with no value maps to value', () => {
      expect(new Optional('foo').map((a) => 'bar ' + a).get()).toBe('bar foo');
    });
  });

  describe('flat mapping', () => {
    it('with no value maps to empty', () => {
      expect(
        new Optional<string>().flatMap((a) => Optional.of('' + a)).isEmpty()
      ).toBeTruthy();
    });

    it('with no value maps to value', () => {
      expect(
        new Optional('foo').flatMap((a) => Optional.of('bar ' + a)).get()
      ).toBe('bar foo');
    });
  });

  describe('to stream', () => {
    it('can stream the value if present', () => {
      expect(new Optional('foo').stream().toArray()).toEqual(['foo']);
    });

    it('can stream no value', () => {
      expect(new Optional().stream().toArray()).toEqual([]);
    });
  });

  describe('filtering', () => {
    it('filters a value in', () => {
      expect(
        new Optional(2).filter((x) => x % 2 === 0).isPresent()
      ).toBeTruthy();
    });

    it('filters a value out', () => {
      expect(
        new Optional(1).filter((x) => x % 2 === 0).isPresent()
      ).toBeFalsy();
    });

    it('null in union type is not empty', () => {
      expect(new Optional<string | null>(null).isEmpty()).toBeFalsy();
    });

    it('can filter out null if using a nully', () => {
      expect(
        new Optional<string | null>(null).filterNotNull().isEmpty()
      ).toBeTruthy();
    });

    it('can guarantee non null type via filter not null', () => {
      const value: string = new Optional<string | null>('foo')
        .filterNotNull()
        .orElse('bar');
      expect(value).toBe('foo');
    });
  });

  describe('consuming', () => {
    it('will not call the consumer if not present', () => {
      const consumer = vi.fn();
      Optional.empty().ifPresent(consumer);

      expect(consumer).not.toHaveBeenCalled();
    });

    it('will call the consumer if present', () => {
      const consumer = vi.fn();
      Optional.of('foo').ifPresent(consumer);

      expect(consumer).toHaveBeenCalledWith('foo');
    });

    it('will do the first thing if present', () => {
      const ifPresent = vi.fn();
      const orElse = vi.fn();
      Optional.of('foo').ifPresentOrElse(ifPresent, orElse);
      expect(ifPresent).toHaveBeenCalledWith('foo');
      expect(orElse).not.toHaveBeenCalled();
    });

    it('will do the other thing if not present', () => {
      const ifPresent = vi.fn();
      const orElse = vi.fn();
      Optional.empty().ifPresentOrElse(ifPresent, orElse);
      expect(ifPresent).not.toHaveBeenCalled();
      expect(orElse).toHaveBeenCalled();
    });
  });

  describe('or', () => {
    it('will pick first value if present', () => {
      expect(
        Optional.of('foo')
          .or(() => Optional.of('bar'))
          .get()
      ).toBe('foo');
    });

    it('will pick second value if first not present', () => {
      expect(
        Optional.empty<string>()
          .or(() => Optional.of('bar'))
          .get()
      ).toBe('bar');
    });

    it('will pick first non empty value', () => {
      expect(
        Optional.empty<string>()
          .or(
            () => Optional.empty(),
            () => Optional.of('bar')
          )
          .get()
      ).toBe('bar');
    });
  });

  describe('async filter', () => {
    it('resolves empty to empty', async () => {
      const optional = await Optional.empty().filterAsync(async () => true);
      expect(optional.isEmpty()).toBeTruthy();
    });

    it('resolves empty to empty with synchronous function', async () => {
      const optional = await Optional.empty().filterAsync(alwaysTrue);
      expect(optional.isEmpty()).toBeTruthy();
    });

    it('resolves value against async filter', async () => {
      const optional = await Optional.of('foo').filterAsync(async (val) => {
        await sleep(1);
        return val === 'foo';
      });
      expect(optional.isEmpty()).toBeFalsy();
    });

    it('resolves negative against async filter', async () => {
      const optional = await Optional.of('bar').filterAsync(async (val) => {
        await sleep(1);
        return val === 'foo';
      });
      expect(optional.isEmpty()).toBeTruthy();
    });

    it('resolves negative against sync filter', async () => {
      const optional = await Optional.of('bar').filterAsync((val) => {
        return val === 'foo';
      });
      expect(optional.isEmpty()).toBeTruthy();
    });
  });

  describe('map async', () => {
    it('will perform an async map on empty', async () => {
      expect(
        (
          await Optional.empty().mapAsync(async (val) => {
            await sleep(1);
            return val + '!';
          })
        ).isEmpty()
      ).toBeTruthy();
    });

    it('will perform an async map on a value', async () => {
      expect(
        (
          await Optional.of('foo').mapAsync(async (val) => {
            await sleep(1);
            return val + '!';
          })
        ).get()
      ).toBe('foo!');
    });

    it('will perform a synchronous map on a value', async () => {
      expect(
        (
          await Optional.of('foo').mapAsync((val) => {
            return val + '!';
          })
        ).get()
      ).toBe('foo!');
    });
  });

  describe('flatmap async', () => {
    it('allows a flat map operation on empty to be async', async () => {
      const optional = await Optional.empty().flatMapAsync(async () => {
        await sleep(1);
        return Optional.of('bar');
      });

      expect(optional.isPresent()).toBeFalsy();
    });

    it('allows a flat map operation to be async', async () => {
      const optional = await Optional.of('foo').flatMapAsync(async () => {
        await sleep(1);
        return Optional.of('bar');
      });

      expect(optional.get()).toBe('bar');
    });

    it('allows a flat map operation to be sync', async () => {
      const optional = await Optional.of('foo').flatMapAsync(() => {
        return Optional.of('bar');
      });

      expect(optional.get()).toBe('bar');
    });
  });
});
