import Optional from './Optional';
import Stream from './Stream';

describe('Examples', () => {
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
