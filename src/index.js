import { get, set } from 'lodash';

export const MaxResults = 10;
const jsonre = /^({|\[)/;
const slash = /\//g;

/**
 * Initialize a new configuration object
 * @param  {Object}          options        - options
 * @param  {String|String[]} options.prefix - ssm parameter prefix
 * @param  {Object}          options.ssm    - aws ssm service instance
 * @return {Promise}
 */
export default async function initializeConfig(options) {
  const { prefix, ssm, validate } = options;
  // coerce prefix into array of prefixes
  const prefixes = Array.isArray(prefix) ? prefix : [prefix];

  const parameters = await Promise.all(prefixes.map(async (pre) => {
    const p = await load({ prefix: pre, ssm });
    return { pre, params: p };
  }));

  // iterate through prefixes, merging parameters onto single result object
  const config = parameters.reduce((acc, { pre, params }) => {
    // build configuration object using names and values of ssm parameters
    params.forEach((p) => {
      const key = p.Name.replace(`${pre}/`, '').replace(slash, '.');
      const val = jsonre.test(p.Value) ? JSON.parse(p.Value) : p.Value;
      set(acc, key, val);
    });
    return acc;
  }, {});

  // allow custom validation
  if (typeof validate === 'function') {
    validate(config);
  }

  // return an object with an exposed getter
  return {
    get: get.bind(null, config),
  };
}

/**
 * Load parameters from ssm
 * @param  {Object}  options          - options
 * @param  {String}  [options.prefix] - ssm parameter prefix
 * @param  {Object}  options.ssm      - aws ssm service instance
 * @return {Promise}
 */
async function load({ _nextToken, prefix, ssm }) {
  // build service method parameters
  const params = {
    MaxResults,
    Path: prefix,
    Recursive: true,
    WithDescryption: true,
  };
  if (typeof _nextToken === 'string') {
    params.NextToken = _nextToken;
  }
  const { NextToken, Parameters: results } = await ssm.getParametersByPath(params).promise();
  if (results.length === MaxResults && typeof NextToken === 'string') {
    const nextResults = await load({ _nextToken: NextToken, ssm });
    results.push(...nextResults);
  }
  return results;
}
