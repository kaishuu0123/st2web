// Note: Due to the multitude of calls required to collect all packs, the status
// changes needed on those packs, and the lack of a universal get-pack command,
// this file creates a unified api for listing and fetching packs.

import _ from 'lodash';
import api from '@stackstorm/module-api';

let globalPacks = [];

export default {
  list() {
    return Promise.all([
      api.client.packs.list()
        .then((packs) => _.map(packs, (pack) => ({
          ...pack,
          status: 'installed',
          installedVersion: pack.version,
        }))),
      api.client.packs.get('index')
        // `index: packs`: A rather ugly hack that helps us not to update st2client just yet
        .then(({ index: packs }) => _.map(packs, (pack, ref) => ({
          ...pack,
          status: 'available',

          // In some cases, pack.ref might be missing and we better sort it out earlier
          ref: pack.ref || ref,
        }))),
      api.client.configSchemas.list()
        .then((packs) => _.map(packs, ({ pack, attributes }) => ({
          ref: pack,
          config_schema: {
            properties: attributes,
          },
        }))),
      api.client.configs.list({ show_secrets: true })
        .then((packs) => _.map(packs, ({ pack, values }) => ({
          ref: pack,
          config: values,
        }))),
    ])
      .then((lists) => lists.reverse().reduce((packs, list) => {
        packs = [ ...packs ];

        _.forEach(list, (pack) => {
          let found = false;
          for (const index in packs) {
            if (packs[index].ref !== pack.ref) {
              continue;
            }

            found = true;
            packs[index] = {
              ...packs[index],
              ...pack,
            };
          }

          if (!found) {
            packs.push(pack);
          }
        });

        return packs;
      }, []))
      .then((packs) => _.map(packs, (pack) => {
        if (!pack.content) {
          const types = [ 'actions', 'aliases', 'rules', 'sensors', 'tests', 'triggers' ];
          pack.files.forEach((file) => {
            const [ folder, filename ] = file.split('/');

            if (types.indexOf(folder) >= 0 && /.yaml$/.test(filename)) {
              pack.content = pack.content || {};
              pack.content[folder] = pack.content[folder] || { count: 0 };
              pack.content[folder].count = pack.content[folder].count + 1;
            }
          });
        }

        return pack;
      }))
      .then((packs) => globalPacks = packs)
    ;
  },
  get(id) {
    const pack = globalPacks.find(({ ref }) => ref === id);
    if (pack) {
      return Promise.resolve(pack);
    }

    return Promise.reject({
      name: 'APIError',
      status: 404,
      message: `Resource with a ref or id "${id}" not found`,
    });
  },
  install(id) {
    return api.client.packInstall.schedule({ packs: [ id ] })
      .then((pack) => mergePack({ ...pack, ref: id, status: 'installed' }))
    ;
  },
  uninstall(id) {
    return api.client.packUninstall.schedule({ packs: [ id ] })
      .then((pack) => mergePack({ ...pack, ref: id, status: 'available' }))
    ;
  },
  save(id, pack) {
    return api.client.configs.edit(id, pack, { show_secrets: true })
      .then((res) => ({ ref: id, config: res }))
      .then(mergePack)
    ;
  },
};

function mergePack(pack) {
  for (const index in globalPacks) {
    if (globalPacks[index].ref !== pack.ref) {
      continue;
    }

    globalPacks[index] = {
      ...globalPacks[index],
      ...pack,
    };
  }

  return pack;
}
