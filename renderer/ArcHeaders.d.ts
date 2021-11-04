/**
 * ARC version of headers interface.
 * It supports ARC API.
 */
export declare class ArcHeaders {
  constructor(headers: ArcHeaders|Headers|string|object|object[]);

  /**
   * Adds value to existing header or creates new header
   */
  append(headerName: string, value: string): void;

  /**
   * Removes a header from the list of headers.
   * @param {String} headerName Header name
   */
  delete(headerName: string): void;

  /**
   * Returns current value of the header
   * @param {string} headerName Header name
   */
  get(headerName: string): string|undefined;

  /**
   * Checks if header exists.
   * @param {string} headerName
   * @return {boolean}
   */
  has(headerName: string): boolean;

  /**
   * Creates new header. If header existed it replaces it's value.
   */
  set(headerName: string, value: string): void;

  forEach(callback: Function, thisArg?: any): void;

  /**
   * @returns The entire headers list into a header string
   */
  toString(): string;
  keys(): Iterator<string>;
  values(): Iterator<string>;
  entries(): Iterator<string[]>;
  [Symbol.iterator]: IteratorResult<string[]>;
}
