import { get, set } from 'lodash';

export const MaxResults = 10;
const jsonre = /^({|\[)/;
const slash = /\//g;

/**
 * Initialize a new configuration object
 * @param  {Object}  options        - options
 * @param  {String}  options.prefix - ssm parameter prefix
 * @param  {Object}  options.ssm    - aws ssm service instance
 * @return {Promise}
 */
export default async function initializeConfig(options) {
  const { prefix, ssm } = options;
  // load params from ssm
  const params = await load({ prefix, ssm });
  // build configuration object using names and values of ssm parameters
  const config = params.reduce((acc, p) => {
    const key = p.Name.replace(`${prefix}/`, '').replace(slash, '.');
    const val = jsonre.test(p.Value) ? JSON.parse(p.Value) : p.Value;
    set(acc, key, val);
    return acc;
  }, {});
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
    Recursive: true,
    WithDescryption: true,
  };
  if (typeof _nextToken === 'string') {
    params.NextToken = _nextToken;
  } else {
    params.Path = prefix;
  }
  const { NextToken, Parameters: results } = await ssm.getParametersByPath(params).promise();
  if (results.length === MaxResults && typeof NextToken === 'string') {
    const nextResults = await load({ _nextToken: NextToken, ssm });
    results.push(...nextResults);
  }
  return results;
}
