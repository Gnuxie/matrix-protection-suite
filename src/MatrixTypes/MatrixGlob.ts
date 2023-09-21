/**
 * Copyright (C) 2023 Gnuxie <Gnuxie@protonmail.com>
 * All rights reserved.
 *
 * This file incorperates work from matrix-bot-sdk
 * https://github.com/turt2live/matrix-bot-sdk
 * which included the following license notice:
MIT License

Copyright (c) 2018 - 2022 Travis Ralston

Permission is hereby granted, free of charge, to any person obtaining a copy
of this software and associated documentation files (the "Software"), to deal
in the Software without restriction, including without limitation the rights
to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
copies of the Software, and to permit persons to whom the Software is
furnished to do so, subject to the following conditions:

The above copyright notice and this permission notice shall be included in all
copies or substantial portions of the Software.

THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE
SOFTWARE.
 */

import globToRegexp from 'glob-to-regexp';

/**
 * Represents a common Matrix glob. This is commonly used
 * for server ACLs and similar functions.
 * @category Utilities
 */
export class MatrixGlob {
  /**
   * The regular expression which represents this glob.
   */
  public readonly regex: RegExp;

  /**
   * Creates a new Matrix Glob
   * @param {string} glob The glob to convert. Eg: "*.example.org"
   */
  constructor(glob: string) {
    const globRegex = globToRegexp(glob, {
      extended: false,
      globstar: false,
    });

    // We need to convert `?` manually because globToRegexp's extended mode
    // does more than we want it to.
    const replaced = globRegex.toString().replace(/\\\?/g, '.');
    this.regex = new RegExp(replaced.substring(1, replaced.length - 1));
  }

  /**
   * Tests the glob against a value, returning true if it matches.
   * @param {string} val The value to test.
   * @returns {boolean} True if the value matches the glob, false otherwise.
   */
  public test(val: string): boolean {
    return this.regex.test(val);
  }
}
