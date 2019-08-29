import {project} from '@magicspace/core';

import {AUTHORING} from './@constants';

export default project({
  name: 'mr.universe',
  extends: [
    {
      name: '@magicspace/templates/general/workspace',
      options: {
        ...AUTHORING,
        repository: 'https://github.com/makeflow/mr.universe.git',
      },
    },
  ],
});
