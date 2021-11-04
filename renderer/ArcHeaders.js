/**
 * Normalizes name of a header.
 * @param {string} headerName
 * @return {string} Normalized name
 */
function normalizeName(headerName) {
  if (typeof headerName !== 'string') {
    headerName = String(headerName);
  }
  return headerName.toLowerCase();
}
/**
 * Normalizes value of a header.
 * @param {string} value
 * @return {string} Normalized name
 */
function normalizeValue(value) {
  if (typeof value !== 'string') {
    value = String(value);
  }
  return value;
}
/**
 * A generator for list of headers from a string.
 *
 * ```javascript
 * for (let [name, value] of headersStringToList('a:b')) {
 *  ...
 * }
 * ```
 * @param {string} string
 * @return {Generator}
 */
function* headersStringToList(string) {
  if (!string || string.trim() === '') {
    return [];
  }
  const headers = string.split(/\n(?=[^ \t]+)/gim);
  for (let i = 0, len = headers.length; i < len; i++) {
    const line = headers[i].trim();
    if (line === '') {
      continue;
    }
    const sepPosition = line.indexOf(':');
    if (sepPosition === -1) {
      yield [line, ''];
    } else {
      const headerName = line.substr(0, sepPosition);
      const value = line.substr(sepPosition + 1).trim();
      yield [headerName, value];
    }
  }
}
/**
 * ARC version of headers interface.
 * It supports ARC API.
 */
export class ArcHeaders {
  /**
   * @param {ArcHeaders|Headers|string|object|object[]} headers
   */
  constructor(headers) {
    this.map = {};
    if (headers instanceof ArcHeaders || headers instanceof Headers) {
      headers.forEach((value, headerName) => this.append(headerName, value));
    } else if (Array.isArray(headers)) {
      headers.forEach((header) => this.append(header[0], header[1]));
    } else if (typeof headers === 'string') {
      const iterator = headersStringToList(headers);
      let result = iterator.next();
      while (!result.done) {
        this.append(result.value[0], result.value[1]);
        result = iterator.next();
      }
    } else if (headers) {
      Object.keys(headers).forEach((headerName) => this.append(headerName, headers[headerName]));
    }
  }

  /**
   * Adds value to existing header or creates new header
   * @param {string} headerName
   * @param {string} value
   */
  append(headerName, value) {
    const normalizedName = normalizeName(headerName);
    value = normalizeValue(value);
    let item = this.map[normalizedName];
    if (item) {
      const oldValue = item.value;
      item.value = oldValue ? `${oldValue },${ value}` : value;
    } else {
      item = {
        name: headerName,
        value,
      };
    }
    this.map[normalizedName] = item;
  }

  /**
   * Removes a header from the list of headers.
   * @param {String} headerName Header name
   */
  delete(headerName) {
    delete this.map[normalizeName(headerName)];
  }

  /**
   * Returns current value of the header
   * @param {string} headerName Header name
   * @return {string|undefined}
   */
  get(headerName) {
    const normalizedName = normalizeName(headerName);
    return this.has(headerName) ? this.map[normalizedName].value : undefined;
  }

  /**
   * Checks if header exists.
   * @param {string} headerName
   * @return {boolean}
   */
  has(headerName) {
    return {}.hasOwnProperty.call(this.map, normalizeName(headerName));
  }

  /**
   * Creates new header. If header existed it replaces it's value.
   * @param {String} headerName
   * @param {String} value
   */
  set(headerName, value) {
    const normalizedName = normalizeName(headerName);
    this.map[normalizedName] = {
      value: normalizeValue(value),
      name: headerName,
    };
  }

  /**
   * @param {Function} callback
   * @param {any=} thisArg
   */
  forEach(callback, thisArg) {
    for (const hname in this.map) {
      if ({}.hasOwnProperty.call(this.map, hname)) {
        callback.call(thisArg, this.map[hname].value, this.map[hname].name, this);
      }
    }
  }

  /**
   * @return {string} The entire headers list into a header string
   */
  toString() {
    const result = [];
    this.forEach((value, hname) => {
      let tmp = `${hname}: `;
      if (value) {
        tmp += value;
      }
      result.push(tmp);
    });
    return result.join('\n');
  }

  /**
   */
  * keys() {
    for (const hname in this.map) {
      if ({}.hasOwnProperty.call(this.map, hname)) {
        yield this.map[hname].name;
      }
    }
  }

  /**
   */
  * values() {
    for (const hname in this.map) {
      if ({}.hasOwnProperty.call(this.map, hname)) {
        yield this.map[hname].value;
      }
    }
  }

  /**
   */
  * entries() {
    for (const hname in this.map) {
      if ({}.hasOwnProperty.call(this.map, hname)) {
        yield [this.map[hname].name, this.map[hname].value];
      }
    }
  }

  /**
   */
  * [Symbol.iterator]() {
    for (const hname in this.map) {
      if ({}.hasOwnProperty.call(this.map, hname)) {
        yield [this.map[hname].name, this.map[hname].value];
      }
    }
  }
}
