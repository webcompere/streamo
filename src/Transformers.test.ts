import Stream from './Stream';
import { batch } from './Transformers';

describe('Transformers', () => {
  it('can be used to batch up elements', () => {
    expect(
      Stream.of('a', 'b', 'c', 'd', 'e').transform(batch(2)).toArray()
    ).toEqual([['a', 'b'], ['c', 'd'], ['e']]);
  });

  it('can be used to batch up elements of exactly the batching boundary', () => {
    expect(Stream.of('a', 'b', 'c', 'd').transform(batch(2)).toArray()).toEqual(
      [
        ['a', 'b'],
        ['c', 'd'],
      ]
    );
  });

  it('can be used to batch up empty elements stream', () => {
    expect(Stream.empty().transform(batch(2)).toArray()).toEqual([]);
  });
});
