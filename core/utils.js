/**
 * A utility function to map a value from one range to another.
 * @param {number} value The input value.
 * @param {number} start1 The lower bound of the input range.
 * @param {number} stop1 The upper bound of the input range.
 * @param {number} start2 The lower bound of the output range.
 * @param {number} stop2 The upper bound of the output range.
 * @returns {number} The mapped value.
 */
export const map = (value, start1, stop1, start2, stop2) => {
  return start2 + (stop2 - start2) * ((value - start1) / (stop1 - start1));
};
