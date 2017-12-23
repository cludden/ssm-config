# ssm-config
a `node.js` library for fetching and parsing encrypted configuration from AWS SSM Parameter Store,

## Getting Started
Define some parameters in SSM:
```shell
$ aws ssm put-parameter --type String --name /my-app/log/level --value debug
$ aws ssm put-parameter --type String --name /my-app/db --value {"user":"foo","port":3306}
$ aws ssm put-parameter --type SecureString --name /my-app/db/password --value s3cr3t
$ aws ssm put-parameter --type String --name /shared/number --value 11
```

Build a config object:
```javascript
import AWS from 'aws-sdk';
import { expect } from 'chai';
import loadConfig from '@cludden/ssm-config';

const prefix = '/my-app';
const ssm = new AWS.SSM();

const config = await loadConfig({ prefix, ssm });
config.get('log'); // => {level: "debug"}
config.get('log.level'); // => "debug"
config.get('db'); // => {"user":"foo","port":3306,"password":"s3cr3t"}
config.get('db.password'); // => "s3cr3t"
```

With custom validation logic:
```javascript
import AWS from 'aws-sdk';
import { expect } from 'chai';
import loadConfig from '@cludden/ssm-config';

const prefix = ['/my-app', '/shared'];
const ssm = new AWS.SSM();

function validate(c) {
    if (!Object.prototype.hasOwnProperty.call(c, 'number')) {
        throw new Error('missing required property "number"');
    }
    c.number = parseInt(c.number, 10);
    if (isNaN(c.number) || c.number < 10) {
        throw new Error('"number" must be greater than or equal to 10');
    }
}

const config = await loadConfig({ prefix, ssm, validate });
config.get('number'); // => 11
```

## Installing
```shell
# install via NPM
$ npm install --save @cludden/ssm-config
```

## Contributing
1. Clone it (`git clone git@github.com:cludden/ssm-config.git`)
1. Create your feature branch (`git checkout -b my-new-feature`)
1. Commit your changes using [conventional changelog standards](https://github.com/bcoe/conventional-changelog-standard/blob/master/convention.md) (`git commit -m 'feat(my-new-feature): Add some feature'`)
1. Push to the branch (`git push origin my-new-feature`)
1. Ensure linting/security/tests are all passing
1. Create new Pull Request

## Testing
Prerequisites:
- [Docker & Compose](https://store.docker.com/search?offering=community&type=edition))

```shell
# run test suite and generate code coverage
$ docker-compose run ssm-config

# run linter
$ docker-compose run ssm-config npm run lint

# run security scan
$ docker-compose run ssm-config npm run sec
```

## Building
```
$ docker-compose run ssm-config
```

## License
Licensed under the [MIT License](LICENSE.md)

Copyright (c) 2017 Chris Ludden