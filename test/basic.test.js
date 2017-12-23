import AWS from 'aws-sdk';
import chai, { expect } from 'chai';
import aspromised from 'chai-as-promised';
import faker from 'faker';
import { chunk } from 'lodash';
import { afterEach, describe, it } from 'mocha';
import sinon from 'sinon';

import init, { MaxResults } from '../src';

chai.use(aspromised);

const sandbox = sinon.sandbox.create();
const ssm = new AWS.SSM({
  accessKeyId: 'xxxxx',
  secretAccessKey: 'xxxxx',
  region: 'us-west-2',
});

describe('UNIT basic', function () {
  afterEach(function () {
    sandbox.restore();
  });

  it('fails on ssm failure', async function () {
    sandbox.stub(ssm, 'getParametersByPath').returns({
      promise: sinon.stub().rejects(new Error()),
    });
    expect(init({ ssm, prefix: '/test' })).to.eventually.be.rejectedWith(Error);
    sandbox.restore();
    const stub = sandbox.stub(ssm, 'getParametersByPath');
    [...Array(2).keys()].forEach((n, i) => {
      stub.onCall(i).returns({
        promise: sinon.stub().resolves({
          Parameters: [...Array(MaxResults).keys()].map(() => ({})),
          NextToken: faker.random.uuid(),
        }),
      });
    });
    stub.onCall(2).returns({
      promise: sinon.stub().rejects(new Error('blah')),
    });
    return init({ ssm, prefix: '/test' })
      .catch((err) => {
        expect(err).to.have.property('message', 'blah');
        expect(stub.callCount).to.equal(3);
      });
  });

  it('builds correct config object', async function () {
    const stub = sandbox.stub(ssm, 'getParametersByPath');
    const params = [{
      Name: '/test/foo/bar',
      Value: 'baz',
    }, {
      Name: '/test/foo/baz',
      Value: '{"bar":"foo"}',
    }, {
      Name: '/test/a',
      Value: '[1,2,3]',
    }, {
      Name: '/test/b',
      Value: 'b',
    }, {
      Name: '/test/c',
      Value: '{"c":{"d":["e",{"f":"g"}]}}',
    }];
    chunk(params, MaxResults).forEach((p, i) => {
      stub.onCall(i).returns({
        promise: sinon.stub().resolves({
          Parameters: p,
          NextToken: i === params.length - 1 ? undefined : faker.random.uuid(),
        }),
      });
    });
    const config = await init({ prefix: '/test', ssm });
    expect(config).to.have.property('get')
      .that.is.a('function');
    expect(config.get('foo')).to.have.nested.property('bar', 'baz');
    expect(config.get('foo')).to.have.nested.property('baz.bar', 'foo');
    expect(config.get('a')).to.be.an('array').deep.equal([1, 2, 3]);
    expect(config.get('b')).to.equal('b');
    expect(config.get('c')).to.have.nested.property('c.d.0', 'e');
    expect(config.get('c')).to.have.nested.property('c.d.1.f', 'g');
  });
});
