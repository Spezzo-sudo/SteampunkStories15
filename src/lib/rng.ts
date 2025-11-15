/**
 * Lightweight xorshift32 pseudo random number generator used for deterministic map sampling.
 */
export class XorShift32 {
  private state: number;

  constructor(seed = 2463534242) {
    this.state = seed >>> 0;
  }

  /**
   * Advances the generator and returns the next unsigned 32-bit integer.
   */
  nextU32() {
    let x = this.state;
    x ^= x << 13;
    x ^= x >>> 17;
    x ^= x << 5;
    this.state = x >>> 0;
    return this.state;
  }

  /**
   * Returns a normalized floating point value in the [0,1) range.
   */
  nextFloat() {
    return (this.nextU32() >>> 0) / 0xffffffff;
  }
}

/**
 * Simple 3-argument hash that mixes coordinates into a 32-bit seed.
 */
export const hash32 = (a: number, b: number, c: number) => {
  let x = (a | 0) ^ ((b << 11) | 0) ^ ((c << 19) | 0);
  x = (x ^ 0x9e3779b9) >>> 0;
  x ^= x << 7;
  x ^= x >>> 17;
  x ^= x << 13;
  return x >>> 0;
};
