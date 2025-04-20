import { identity, not } from './functions';

describe('functions', () => {
  it('identity returns itself', () => {
    expect(identity('foo')).toBe('foo');
  });

  it('not of a predicate returns the opposite', () => {
    expect(not((x: number) => x % 2 === 0)(2)).toBeFalsy();
  });
});
