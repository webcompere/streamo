import { AsyncMapper, sleep } from './async';
import { Mapper } from './functions';
import Stream from './Stream';

class Tracker {
  concurrency = 0;
  max = 0;
  count = 0;

  increment() {
    this.concurrency++;
    this.count++;
    this.max = Math.max(this.max, this.concurrency);
  }

  decrement() {
    this.concurrency--;
  }
}

const task = async (tracker: Tracker) => {
  tracker.increment();

  await sleep(10);

  tracker.decrement();
};

const mapperFactory =
  <T, R>(tracker: Tracker, mapper: Mapper<T, R>): AsyncMapper<T, R> =>
  async (value: T) => {
    await task(tracker);
    return mapper(value);
  };

describe('Concurrent happenings', () => {
  it('hits concurrency of 1 during a normal process', async () => {
    const tracker = new Tracker();
    const result = await Stream.of(1, 2, 3)
      .async()
      .map(mapperFactory(tracker, (t) => t * 2))
      .toArray();

    expect(result).toEqual([2, 4, 6]);
    expect(tracker.max).toBe(1);
  });

  it('hits concurrency of 3 with batching', async () => {
    const tracker = new Tracker();
    const result = await Stream.of(1, 2, 3)
      .async()
      .map(mapperFactory(tracker, (t) => t * 2))
      .buffer(3)
      .toArray();

    expect(result).toContain(2);
    expect(result).toContain(4);
    expect(result).toContain(6);
    expect(tracker.max).toBe(3);
  });

  it('hits concurrency of 3 with batching more values', async () => {
    const tracker = new Tracker();
    const result = await Stream.of(1, 2, 3, 4, 5, 6, 7, 8)
      .async()
      .map(mapperFactory(tracker, (t) => t * 2))
      .buffer(3)
      .toArray();

    expect(result).toContain(2);
    expect(result).toContain(4);
    expect(result).toContain(6);
    expect(result.length).toBe(8);
    expect(tracker.max).toBe(3);
  });

  it('stops the stream before all values are loaded', async () => {
    const tracker = new Tracker();
    await Stream.of(1, 2, 3, 4, 5, 6, 7, 8)
      .async()
      .map(mapperFactory(tracker, (t) => t * 2))
      .buffer(3)
      .findFirst()
      .get();

    expect(tracker.max).toBe(3);
    expect(tracker.count).toBeLessThan(8);
  });

  it('can process an empty stream', async () => {
    const tracker = new Tracker();
    const first = await Stream.empty<number>()
      .async()
      .map(mapperFactory(tracker, (t) => t * 2))
      .buffer(3)
      .findFirst()
      .get();

    expect(tracker.max).toBe(0);
    expect(first).toBeUndefined();
  });
});
