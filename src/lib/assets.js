import { Entity, ethereumContracts, starknetContracts } from '@influenceth/sdk';

const contractToAsset = {
  'Asteroid': 'asteroids',
  'Crew': 'crews',
  'Crewmate': 'crewmates',
  'Ship': 'ships'
};

const labelToAsset = {
  1: 'crews',
  2: 'crewmates',
  3: 'asteroids',
  6: 'ships'
};

const assetMappings = {
  'asteroids': {
    active: process.env.REACT_APP_ETHEREUM_ASTEROID_BRIDGE && process.env.REACT_APP_STARKNET_ASTEROID_TOKEN,
    id: Entity.IDS.ASTEROID,
    ethereumAssetContract: ethereumContracts.Asteroid,
    ethereumBridgeAddress: process.env.REACT_APP_ETHEREUM_ASTEROID_BRIDGE,
    ethereumBridgeContract: ethereumContracts.AsteroidBridge,
    starknetAssetAddress: process.env.REACT_APP_STARKNET_ASTEROID_TOKEN,
    starknetAssetContract: starknetContracts.Asteroid,
    singular: 'Asteroid',
    plural: 'Asteroids',
    l1l2payload: ({ destAddress, assetIds }) => [destAddress, assetIds.length, ...assetIds]
  },
  'crews': {
    active: process.env.REACT_APP_ETHEREUM_CREW_BRIDGE && process.env.REACT_APP_STARKNET_CREW_TOKEN,
    id: Entity.IDS.CREW,
    ethereumAssetContract: ethereumContracts.Crew,
    ethereumBridgeAddress: process.env.REACT_APP_ETHEREUM_CREW_BRIDGE,
    ethereumBridgeContract: ethereumContracts.CrewBridge,
    starknetAssetAddress: process.env.REACT_APP_STARKNET_CREW_TOKEN,
    starknetAssetContract: starknetContracts.Crew,
    singular: 'Crew',
    plural: 'Crews',
    l1l2payload: ({ destAddress, sender, assetIds }) => [destAddress, sender, assetIds.length, ...assetIds]
  },
  'crewmates': {
    active: process.env.REACT_APP_ETHEREUM_CREWMATE_BRIDGE && process.env.REACT_APP_STARKNET_CREWMATE_TOKEN,
    id: Entity.IDS.CREWMATE,
    ethereumAssetContract: ethereumContracts.Crewmate,
    ethereumBridgeAddress: process.env.REACT_APP_ETHEREUM_CREWMATE_BRIDGE,
    ethereumBridgeContract: ethereumContracts.CrewmateBridge,
    starknetAssetAddress: process.env.REACT_APP_STARKNET_CREWMATE_TOKEN,
    starknetAssetContract: starknetContracts.Crewmate,
    singular: 'Crewmate',
    plural: 'Crewmates',
    l1l2payload: ({ destAddress, assetIds }) => [destAddress, assetIds.length, ...assetIds]
  },
  'ships': {
    active: process.env.REACT_APP_ETHEREUM_SHIP_BRIDGE && process.env.REACT_APP_STARKNET_SHIP_TOKEN,
    id: Entity.IDS.SHIP,
    ethereumAssetContract: ethereumContracts.Ship,
    ethereumBridgeAddress: process.env.REACT_APP_ETHEREUM_SHIP_BRIDGE,
    ethereumBridgeContract: ethereumContracts.ShipBridge,
    starknetAssetAddress: process.env.REACT_APP_STARKNET_SHIP_TOKEN,
    starknetAssetContract: starknetContracts.Ship,
    singular: 'Ship',
    plural: 'Ships',
    l1l2payload: ({ destAddress, sender, assetIds }) => [destAddress, sender, assetIds.length, ...assetIds]
  }
};

export {
  contractToAsset,
  labelToAsset,
  assetMappings
};
