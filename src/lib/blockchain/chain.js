const ethereumChainId = Number(process.env.REACT_APP_ETH_CHAIN_ID);

const chains = {
  1: {
    name: 'Ethereum Mainnet',
  },
  5: {
    name: 'Goerli Test Network',
  },
  11155111: {
    name: 'Sepolia Test Network',
  },
  1337: {
    name: 'Local Test Network',
  }
};

export const starknet = {
  chainId: process.env.REACT_APP_STARKNET_CHAIN_ID,
  isDevnet: process.env.REACT_APP_STARKNET_PROVIDER?.includes('localhost') || false,
  providerUrl: process.env.REACT_APP_STARKNET_PROVIDER,
};

export default {
  chainHex: Number.isFinite(ethereumChainId) ? `0x${ethereumChainId.toString(16)}` : undefined,
  chainId: ethereumChainId,
  name: chains[ethereumChainId]?.name || `Chain ${process.env.REACT_APP_ETH_CHAIN_ID}`,
  providerUrl: process.env.REACT_APP_ETHEREUM_PROVIDER,
};
