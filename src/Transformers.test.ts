import Stream from './Stream';
import Transformers from './Transformers';

describe('Transformers', () => {
  it('can be used to batch up elements', () => {
    expect(
      Stream.of('a', 'b', 'c', 'd', 'e')
        .transform(Transformers.batch(2))
        .toArray()
    ).toEqual([['a', 'b'], ['c', 'd'], ['e']]);
  });

  it('can be used to batch up elements of exactly the batching boundary', () => {
    expect(
      Stream.of('a', 'b', 'c', 'd').transform(Transformers.batch(2)).toArray()
    ).toEqual([
      ['a', 'b'],
      ['c', 'd'],
    ]);
  });

  it('can be used to batch up empty elements stream', () => {
    expect(Stream.empty().transform(Transformers.batch(2)).toArray()).toEqual(
      []
    );
  });
});
