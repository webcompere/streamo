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
});
