import axios from 'axios';
import { Address, Entity } from '@influenceth/sdk';
import { starknet as starknetChain } from '~/lib/blockchain/chain';

const config = { baseURL: process.env.REACT_APP_API_URL };
const instance = axios.create(config);
const apiVersion = 'v2';

const buildQuery = (queryObj) => {
  return Object.keys(queryObj || {}).map((key) => {
    return `${encodeURIComponent(key)}=${encodeURIComponent(queryObj[key])}`;
  }).join('&');
};

const getEntities = async ({ ids, match, label, components }) => {
  const query = {};
  if (ids) {
    query.id = ids.join(',');
  } else if (match) {
    // i.e. { 'Celestial.celestialType': 2 }
    // i.e. { 'Location.location': { label: Entity.IDS.LOT, id: 123 } }
    query.match = `${Object.keys(match)[0]}:${JSON.stringify(Object.values(match)[0])}`;
  }
  if (label) {
    query.label = label;  // i.e. 'asteroid'
  }
  if (components) {
    query.components = components.join(',');  // i.e. [ 'celestial', 'control' ]
  }

  const response = await instance.get(`/${apiVersion}/entities?${buildQuery(query)}`);
  return response.data;
};

const api = {

  flushDevnetMessagesAsNeeded: async () => {
    if (starknetChain.isDevnet) {
      const response = await instance.post(`/postman/flush`, {}, { baseURL: starknetChain.providerUrl });
      return response.data;
    }
    return {};
  },

  getEntities,

  getSwayClaims: async (address) => {
    const response = await instance.get(`/${apiVersion}/claims/${address}`);
    return response.data;
  },

  getSwayCrossings: async (address) => {
    const response = await instance.get(`/${apiVersion}/swaycrossings?toAddress=${address}`);
    return response.data;
  },

  getWalletAssets: ({ fromLayer, fromAccount }) => {
    const currentLayer = fromLayer === 'l1' ? 'ethereum' : 'starknet';
    const currentAccount = Address.toStandard(fromAccount).toLowerCase();

    return Promise.allSettled([
      getEntities({ match: { [`Nft.owners.${currentLayer}`]: currentAccount }, label: Entity.IDS.ASTEROID, components: ['Nft', 'Celestial', 'Name', 'AsteroidReward'] }),
      getEntities({ match: { [`Nft.owners.${currentLayer}`]: currentAccount }, label: Entity.IDS.CREWMATE, components: ['Nft', 'Crewmate', 'Name', 'CrewmateReward'] }),
      getEntities({ match: { [`Nft.owners.${currentLayer}`]: currentAccount }, label: Entity.IDS.CREW, components: ['Nft', 'Crew', 'Name'] }),
      getEntities({ match: { [`Nft.owners.${currentLayer}`]: currentAccount }, label: Entity.IDS.SHIP, components: ['Nft', 'Ship', 'Name'] }),
      new Promise(async (resolve) => {
        const response = await instance.get(
          `/${apiVersion}/crossings`,
          { params: { [fromLayer === 'l1' ? 'toAddress' : 'fromAddress']: fromAccount } }
        );
        resolve(response.data);
      })
    ])
    .then(([ asteroidsResponse, crewmatesResponse, crewsResponse, shipsResponse, orphanedTransactionsResponse ]) => {
      const asteroids = asteroidsResponse?.value || [];
      const crewmates = crewmatesResponse?.value || [];
      const crew = crewsResponse?.value || [];
      const ships = shipsResponse?.value || [];
      const orphanedTransactions = orphanedTransactionsResponse?.value || [];
      const inTransitAssets = [...asteroids, ...crewmates]
        .filter((a) => a.Nft?.bridge?.status === 'PROCESSING' && a.Nft.bridge.destination === 'ETHEREUM') // only for L2 -> L1 transfers
        .filter((a) => !orphanedTransactions.find(
          (tx) => (
              (tx.assetType === 'Asteroid' && a.label === Entity.IDS.ASTEROID) ||
              (tx.assetType === 'Crewmate' && a.label === Entity.IDS.CREWMATE) ||
              (tx.assetType === 'Crew' && a.label === Entity.IDS.CREW) ||
              (tx.assetType === 'Ship' && a.label === Entity.IDS.SHIP)
            ) && tx.assetIds.includes(a.id))
        );
      return {
        asteroids: asteroids.filter((a) => !a.Nft.bridge?.destination || (a.Nft.bridge.destination === currentLayer.toUpperCase() && a.Nft.bridge.status === 'COMPLETE')),
        crewmates: crewmates.filter((a) => !a.Nft.bridge?.destination || (a.Nft.bridge.destination === currentLayer.toUpperCase() && a.Nft.bridge.status === 'COMPLETE')),
        crews: crew.filter((a) => !a.Nft.bridge?.destination || (a.Nft.bridge.destination === currentLayer.toUpperCase() && a.Nft.bridge.status === 'COMPLETE')),
        ships: ships.filter((a) => !a.Nft.bridge?.destination || (a.Nft.bridge.destination === currentLayer.toUpperCase() && a.Nft.bridge.status === 'COMPLETE')),
        orphanedTransactions,
        inTransitAssets
      };
    })
  },

  getL1AcceptedBlock: async () => {
    const response = await instance.get(`/${apiVersion}/chain`);
    return response.data.l1AcceptedBlock;
  }
};

export default api;
