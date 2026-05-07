import { initializeConnector } from '@web3-react/core';
import { MetaMask } from '@web3-react/metamask';
import { CoinbaseWallet } from '@web3-react/coinbase-wallet';
import { WalletConnect } from '@web3-react/walletconnect-v2';

import chain from './chain';

const connectionsToMake = {
  CoinbaseWallet: {
    name: 'Coinbase Wallet',
    Connector: CoinbaseWallet,
    params: {
      options: {
        url: chain.providerUrl,
        appName: 'web3-react',
      }
    }
  },
  MetaMask: {
    name: 'MetaMask',
    Connector: MetaMask,
    params: {}
  },
  WalletConnect: {
    name: 'WalletConnect',
    Connector: WalletConnect,
    params: {
      options: {
        projectId: process.env.REACT_APP_WALLETCONNECT_PROJECT_ID,
        chains: [chain.chainId],
        // optionalChains,
        showQrModal: true,
      }
    }
  },
};

const map = {};
const connectors = [];
Object.keys(connectionsToMake).forEach((key) => {
  const { Connector, params, name } = connectionsToMake[key];
  const [connector, hooks] = initializeConnector((actions) => new Connector({ actions, ...params }));
  connectors.push([connector, hooks]);
  map[key] = { connector, hooks, name };
}, {});

export const connectorMap = map;
export default connectors;
