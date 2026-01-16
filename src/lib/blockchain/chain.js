
const getInfuraUrlFor = (network) =>
  process.env.REACT_APP_INFURA_ID ? `https://${network}.infura.io/v3/${process.env.REACT_APP_INFURA_ID}` : undefined

const getAlchemyUrlFor = (network) =>
  process.env.REACT_APP_ALCHEMY_ID ? `https://${network}.alchemyapi.io/v2/${process.env.REACT_APP_ALCHEMY_ID}` : undefined

const chains = {
  1: {
    urls: [getInfuraUrlFor('mainnet'), getAlchemyUrlFor('eth-mainnet'), 'https://cloudflare-eth.com'].filter(Boolean),
    name: 'Ethereum Mainnet',
  },
  5: {
    urls: [getInfuraUrlFor('goerli')].filter(Boolean),
    name: 'Goerli Test Network',
  },
  11155111: {
    urls: [ getInfuraUrlFor('sepolia')].filter(Boolean),
    name: 'Sepolia Test Network',
  }
}

export default chains[process.env.REACT_APP_ETH_CHAIN_ID];