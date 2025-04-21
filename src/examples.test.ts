import Collectors from './Collectors';
import { identity } from './functions';
import Optional from './Optional';
import Stream from './Stream';

describe('Examples', () => {
  describe('in the readme', () => {
    describe('creating', () => {
      it('creates stream from array', () => {
        const myArray = ['a', 'b', 'c'];
        const strings = Stream.ofArray(myArray);
        expect(strings.count()).toBe(3);
      });

      it('absolute values', () => {
        const strings = Stream.of('a', 'b', 'c');
        expect(strings.count()).toBe(3);
      });

      it('numbers', () => {
        const numbers = Stream.ofNumbers(1, 2, 3);
        expect(numbers.sum()).toBe(6);
      });

      it('can map to numeric', () => {
        const arrayOfStrings = ['1', '2', '3'];
        const numbers = Stream.ofArray(arrayOfStrings).mapToNumber(
          (num) => +num
        );
        expect(numbers.sum()).toBe(6);
      });

      it('can create a stream from a map', () => {
        const map = new Map<string, string>([
          ['a', 'b'],
          ['c', 'd'],
        ]);
        expect(
          Stream.ofMap(map).collect(Collectors.toObjectFromEntries())
        ).toEqual({ a: 'b', c: 'd' });
      });
    });

    describe('filtering, mapping', () => {
      it('can filter', () => {
        const filtered = Stream.of('a', 'b', 'cc', 'd')
          .filter((item) => item.length === 1)
          .toArray();

        expect(filtered).toEqual(['a', 'b', 'd']);
      });

      it('can map', () => {
        const mapped = Stream.of({ name: 'Bill' }, { name: 'Bob' })
          .map((item) => item.name)
          .toArray();

        expect(mapped).toEqual(['Bill', 'Bob']);
      });

      it('can reduce', () => {
        const reduced = Stream.of('A', 'B', 'C').reduce((a, b) => a + b);
        expect(reduced.get()).toBe('ABC');
      });

      it('can reduce from', () => {
        const reduced = Stream.of('A', 'B', 'C').reduceFrom(
          '',
          (a, b) => a + b,
          identity
        );
        expect(reduced).toBe('ABC');
      });
    });

    describe('Optional', () => {
      it('naturally coalesces', () => {
        const a = 'a';
        const b = undefined;
        const c = undefined;
        expect(Optional.of(a, b, c).get()).toBe('a');
      });

      it('compared with coalesce in ts', () => {
        const a = 'a';
        const b = undefined;
        const c = undefined;
        expect(a ?? b ?? c).toBe('a');
      });

      it('filtering on string of length 1 blanks out our input', () => {
        expect(
          Optional.of('foo')
            .filter((st) => st.length === 1)
            .isPresent()
        ).toBeFalsy();
      });

      it('maps to another value', () => {
        expect(
          Optional.of('foo')
            .map((opt) => `${opt}!`)
            .get()
        ).toBe('foo!');
      });

      it('flatmaps to another value', () => {
        expect(
          Optional.of('foo')
            .flatMap((opt) => Optional.of(`${opt}!`))
            .get()
        ).toBe('foo!');
      });

      it('can or else from empty', () => {
        expect(Optional.empty().orElse('bar')).toBe('bar');
      });

      it('uses orElseGet', () => {
        expect(Optional.empty().orElseGet(() => 'bar')).toBe('bar');
      });
    });
  });

  describe('random stream', () => {
    it('can use random numbers', () => {
      expect(
        Stream.generate(() => Math.random())
          .limit(10)
          .count()
      ).toBe(10);
    });

    it('can toss coins until it gets heads', () => {
      expect(
        Stream.generateFinite(() =>
          Optional.of(Math.floor(Math.random() * 100)).filter(
            (coin) => coin % 2 === 0
          )
        ).toArray()
      ).toBeTruthy();
    });
  });

  describe('findFirst', () => {
    it('examples', () => {
      // no first item on an empty stream
      expect(Stream.empty().findFirst().isPresent()).toBeFalsy();

      // find first even number
      expect(
        Stream.of(1, 2, 3)
          .findFirst((num) => num % 2 === 0)
          .get()
      ).toBe(2);

      // find first number after an even filter
      expect(
        Stream.of(1, 2, 3)
          .filter((num) => num % 2 === 0)
          .findFirst()
          .get()
      ).toBe(2);
    });
  });

  describe('ranges', () => {
    it('produces a bounded range', () => {
      // specify the limit of a range
      expect(Stream.ofRange(0, 4).toArray()).toEqual([0, 1, 2, 3]);
    });

    it('produces a bounded range with half numbers', () => {
      // specify the limit of a range
      expect(Stream.ofRange(0, 4, 0.5).toArray()).toEqual([
        0, 0.5, 1, 1.5, 2, 2.5, 3, 3.5,
      ]);
    });

    it('produces a closed range', () => {
      // or specify the last number
      expect(Stream.ofRangeClosed(0, 3).toArray()).toEqual([0, 1, 2, 3]);
    });

    it('produces a close range with half numbers', () => {
      // specify the limit of a range
      expect(Stream.ofRangeClosed(0, 3, 0.5).toArray()).toEqual([
        0, 0.5, 1, 1.5, 2, 2.5, 3,
      ]);
    });
  });

  describe('transformers', () => {
    it('can be used to provide elements where each element must exceed the last', () => {
      const numbers = [5, 4, 3, 2, 6, 5, 4, 3, 2, 7, 9];
      const onlyAscending = [5, 6, 7, 9];

      expect(
        Stream.ofArray(numbers)
          .transform({
            supplier: () => ({ max: 0 }),
            transformer: (a, t) => {
              if (t > a.max) {
                a.max = t;
                return { value: Optional.of(t) };
              }
              return { value: Optional.empty() };
            },
            finisher: () => Optional.empty(),
          })
          .toArray()
      ).toEqual(onlyAscending);
    });

    it('can be used to calculate prime numbers', () => {
      expect(
        Stream.ofRange(2, Number.MAX_VALUE)
          .transform({
            supplier: (): number[] => [],
            transformer: (a, t) => {
              if (Stream.ofArray(a).noneMatch((prime) => t % prime === 0)) {
                a.push(t);
                return { value: Optional.of(t) };
              }
              return { value: Optional.empty() };
            },
            finisher: () => Optional.empty(),
          })
          .limit(10)
          .toArray()
      ).toEqual([2, 3, 5, 7, 11, 13, 17, 19, 23, 29]);
    });
  });
});
