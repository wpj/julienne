// @ts-check

/**
 * @typedef {Object} Props
 * @property {string} name
 */

/**
 * @param {Props} props
 */
export default function template({ name }) {
  return `<div>Hello, ${name}</div>`;
}
