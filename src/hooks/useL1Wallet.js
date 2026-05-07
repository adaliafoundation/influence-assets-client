import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { ethers } from 'ethers';
import { Address, ethereumContracts as configs } from '@influenceth/sdk';

import CoinbaseLogo from '~/assets/images/coinbase-logo.svg';
import MetamaskLogo from '~/assets/images/metamask-fox.svg';
import WalletConnectLogo from '~/assets/images/walletconnect-logo.svg';
import useStore from '~/hooks/useStore';
import api from '~/lib/api';
import { assetMappings } from '~/lib/assets';
import { connectorMap } from '~/lib/blockchain/connectors';
import chain from '~/lib/blockchain/chain';

const ethereum = window.ethereum;
const installedInstallableWallets = !ethereum ? [] : Object.keys(connectorMap).filter((walletId) =>
  (ethereum?.providers || [ethereum]).find((p) =>
    (walletId === 'CoinbaseWallet' && p.isCoinbaseWallet)
    || (walletId === 'MetaMask' && p.isMetaMask)
  )
);

const getErrorMessage = (error) => {
  console.warn(error);
  return error?.message || 'An unknown error occurred. Try logging out and back into your wallet, then refreshing the page if needed.';
};

const useWallet = (walletId) => {
  const [ready, setReady] = useState();

  useEffect(() => {
    if (connectorMap[walletId].connector.connectEagerly) {
      connectorMap[walletId].connector.connectEagerly()
        // .then(() => console.log(walletId, 'reconnected successfully'))
        .catch((e) => { /* console.warn(walletId, 'reconnector failed', e) */ })
        .finally(() => setReady(true));
    } else {
      setReady(true);
    }
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  // NOTE: unused useAccounts, useENSName, useENSNames
  // TODO (enhancement): useAccounts might be helpful for multiple accounts on same wallet
  return {
    _key: walletId,
    _installed: installedInstallableWallets.includes(walletId),
    _name: connectorMap[walletId].name,
    _ready: ready,
    account: connectorMap[walletId].hooks.useAccount(),
    chainId: connectorMap[walletId].hooks.useChainId(),
    connector: connectorMap[walletId].connector,
    isActivating: connectorMap[walletId].hooks.useIsActivating(),
    isActive: connectorMap[walletId].hooks.useIsActive(),
    provider: connectorMap[walletId].hooks.useProvider() || connectorMap[walletId].connector.provider
  };
};

const useL1Wallet = () => {
  const fromLayer = useStore(s => s.fromLayer);
  const pendingTransactions = useStore(s => s.pendingTransactions);
  const lastConnectedL1Wallet = useStore(s => s.lastConnectedL1Wallet);
  const dispatchAssetsInTransit = useStore(s => s.dispatchAssetsInTransit);
  const dispatchAssetsReceived = useStore(s => s.dispatchAssetsReceived);
  const dispatchBridgingPending = useStore(s => s.dispatchBridgingPending);
  const dispatchBridgingInitiated = useStore(s => s.dispatchBridgingInitiated);
  const dispatchBridgingFailed = useStore(s => s.dispatchBridgingFailed);
  const dispatchClaimingPending = useStore(s => s.dispatchClaimingPending);
  const dispatchClaimingInitiated = useStore(s => s.dispatchClaimingInitiated);
  const dispatchClaimingFailed = useStore(s => s.dispatchClaimingFailed);
  const dispatchClaimingComplete = useStore(s => s.dispatchClaimingComplete);
  const dispatchConnectedL1Wallet = useStore(s => s.dispatchConnectedL1Wallet);
  const dispatchL2L1TxStatus = useStore(s => s.dispatchL2L1TxStatus);
  const dispatchCrewmateMintingAsteroid = useStore(s => s.dispatchCrewmateMintingAsteroid);
  const dispatchPendingTransaction = useStore(s => s.dispatchPendingTransaction);
  const dispatchPendingTransactionComplete = useStore(s => s.dispatchPendingTransactionComplete);
  const createAlert = useStore(s => s.dispatchAlertLogged);

  const onConnectCallback = useRef();
  const transactionWaiters = useRef([]);

  const [activationError, setActivationError] = useState(false);
  const [connecting, setConnecting] = useState(false);
  const [installing, setInstalling] = useState(false);
  const [walletConnectLoading, setWalletConnectLoading] = useState(false);
  const [selectedWalletId, setSelectedWalletId] = useState();

  // NOTE: this will result in any dependency on [wallets] to be re-evaluated every render
  // (but memoizing this initialization will mean those dependencies will only trigger once)
  // - could probably use the versioning trick using in useL2Wallet, but would have to aggregate
  //   the versioning on each individual wallet, and none of the current dependencies are very
  //   expensive
  // - could (should?) technically not waste the resources on memoizing things that will be
  //   re-evaled every render though (keeping those in for now in case we want to improve
  //   this later though and make those memoizations relevant again)
  const wallets = {}; // eslint-disable-line react-hooks/exhaustive-deps

  // (this would be an anti-pattern if connectorMap was not final)
  for(let key of Object.keys(connectorMap)) {
    wallets[key] = useWallet(key);  // eslint-disable-line react-hooks/rules-of-hooks
  }

  // populate selected wallet values
  const selectedWallet = wallets[selectedWalletId] || {};
  const { account, chainId, connector, isActivating, isActive, provider } = selectedWallet;

  const ready = useMemo(() => {
    return Object.values(wallets).reduce((acc, w) => acc && w._ready, true);
  }, [wallets]);

  const onActivationError = useCallback((e) => {
    console.error('onActivationError', e);
    setActivationError(e);
  }, []);

  const attemptConnection = useCallback(async ({ _key, connector }) => {
    let chainId = chain.chainHex;
    setActivationError();

    if (connector?.provider?.request) {
      await connector.provider.request({ method: 'wallet_switchEthereumChain', params: [{ chainId }] });
    } else if (_key === 'WalletConnect') {
      chainId = `${chain.chainId}`;
    }

    return connector.activate(chainId)
      .then(() => setSelectedWalletId(_key))
      .catch(onActivationError);
  }, [onActivationError]);

  const onConnectionResult = useCallback((which) => {
    if (which) dispatchConnectedL1Wallet(which);
    if (onConnectCallback.current) {
      onConnectCallback.current(account || false);
      onConnectCallback.current = null;
    }
    setConnecting(false);
  }, [account, dispatchConnectedL1Wallet]);

  useEffect(() => {
    if (!ready) return;
    if (selectedWalletId) {
      if (isActive) {
        onConnectionResult(selectedWalletId);
      } else if (!isActivating) {
        setSelectedWalletId();
      }
    }
  }, [chainId, isActivating, isActive, ready, selectedWalletId]); // eslint-disable-line react-hooks/exhaustive-deps

  const signer = useRef();
  useEffect(() => {
    if (isActive && account && provider) {
      signer.current = provider.getSigner(account);
    } else {
      signer.current = false;
    }
  }, [isActive, account, provider]);

  // while connecting or connected, listen for network changes from extension
  // (disconnect is not offered, so we just always listen currently)
  // NOTE: if have metamask/brave installed, but use walletconnect
  //  to connect, this *might* cause issues

  const restorePreviousConnection = useCallback((callback, preferredAddress, preferredWallet) => {
    if (!ready) return;
    setActivationError();

    let wallet;
    if (preferredAddress) wallet = Object.values(wallets).find((w) => w.isActive && Address.areEqual(w.account, preferredAddress));
    if (!wallet && preferredWallet) wallet = wallets[preferredWallet]?.isActive && wallets[preferredWallet];
    if (!wallet && lastConnectedL1Wallet) wallet = wallets[lastConnectedL1Wallet]?.isActive && wallets[lastConnectedL1Wallet];
    if (!wallet) wallet = Object.values(wallets).find((w) => w.isActive);

    if (wallet && wallet.chainId === chain.chainId) {
      setConnecting(true);
      onConnectCallback.current = callback;
      attemptConnection(wallet);
    } else {
      onConnectionResult(null);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [attemptConnection, lastConnectedL1Wallet, onConnectionResult, ready, wallets]);

  const resetWalletWhenResetFromLayer = useRef();
  useEffect(() => {
    if (!ready) return;

    // make sure can select again in L1 connection dialog
    if (selectedWalletId) {
      if (fromLayer) {
        resetWalletWhenResetFromLayer.current = true;
      } else if (resetWalletWhenResetFromLayer.current) {
        setSelectedWalletId();
        resetWalletWhenResetFromLayer.current = false;
      }
    }

    // if fromLayer is l2, then select a default wallet (user can change)
    if (fromLayer === 'l2') {
      restorePreviousConnection();
    }
  }, [fromLayer, ready]);  // eslint-disable-line react-hooks/exhaustive-deps

  const disconnectWallet = useCallback(() => {
    if (connector?.close) connector.close(); // for WalletConnect
    // if (connector?.deactivate) connector.deactivate(); // NOTE: this causes Coinbase Wallet to get funky and is seemingly unnecessary
    setSelectedWalletId();
  }, [connector]);

  const connectionOptions = useMemo(() => {
    const options = [];

    if (wallets.MetaMask?._installed) {
      options.push({
        label: 'Metamask',
        logo: <MetamaskLogo />,
        dataTip: 'Metamask',
        onClick: () => {
          attemptConnection(wallets.MetaMask);
        }
      });
    } else {
      options.push({
        label: 'Metamask (Install)',
        logo: <MetamaskLogo />,
        dataTip: 'Install Metamask Browser Extension',
        onClick: () => {
          window.open('https://chrome.google.com/webstore/detail/metamask/nkbihfbeogaeaoehlefnkodbefgpgknn');
          setInstalling(true);
        }
      });
    }

    if (wallets.CoinbaseWallet?._installed) {
      options.push({
        label: 'Coinbase Wallet',
        logo: <CoinbaseLogo />,
        dataTip: 'Coinbase Wallet',
        onClick: () => {
          attemptConnection(wallets.CoinbaseWallet)
        }
      });
    } else {
      options.push({
        label: 'Coinbase Wallet (Install)',
        logo: <CoinbaseLogo />,
        dataTip: 'Install Coinbase Wallet Browser Extension',
        onClick: () => {
          // NOTE: coinbase has it's own install flow (so use that if provider is available)
          if (wallets.CoinbaseWallet?.provider) {
            attemptConnection(wallets.CoinbaseWallet)
          } else {
            window.open('https://chrome.google.com/webstore/detail/coinbase-wallet-extension/hnfanknocfeofbddgcijnmhnfnkdnaad');
          }
          setInstalling(true);
        }
      });
    }

    options.push({
      label: 'WalletConnect',
      disabled: walletConnectLoading ? 'true' : undefined,
      loading: !!walletConnectLoading,
      logo: <WalletConnectLogo />,
      dataTip: 'WalletConnect',
      onClick: () => {
        if (wallets.WalletConnect?.close) wallets.WalletConnect.close();
        attemptConnection(wallets.WalletConnect);

        // (walletconnect qr modal is slow to open, so add "loading" to make sure looks like responding)
        setWalletConnectLoading(true);
        setTimeout(() => {
          setWalletConnectLoading(false);
        }, 2000);
      }
    });

    return options;
  }, [attemptConnection, wallets, walletConnectLoading]); // eslint-disable-line react-hooks/exhaustive-deps

  const onErrorDefault = useCallback((e, vars, duration) => {
    createAlert({
      level: 'warning',
      content: e,
      duration
    });
  }, [createAlert]);

  const contracts = useMemo(() => ({
    'GET_CREWMATE_FEATURES': {
      call: async ({ crewmateId }) => {
        if (account && signer.current) {
          const contract = new ethers.Contract(
            process.env.REACT_APP_ETHEREUM_CREWMATE_FEATURES, configs.CrewFeatures, signer.current
          );

          return contract.getFeatures(crewmateId);
        }
        return null;
      },
      onError: onErrorDefault,
    },

    'GET_SWAY_BALANCE': {
      call: async () => {
        if (account && signer.current) {
          const contract = new ethers.Contract(
            process.env.REACT_APP_ETHEREUM_SWAY_TOKEN, configs.SwayToken, signer.current
          );

          const balance = await contract.balanceOf(account);
          const decimals = await contract.decimals();

          try {
            return parseInt(BigInt(balance).toString()) / (10 ** decimals);
          } catch (e) {
            console.warn(e);
          }
        }
        return null;
      },
      onError: onErrorDefault,
    },

    'BRIDGE_ASSETS': {
      execute: ({ asset, assetIds, destAddress, messageFee }) => {
        const { ethereumBridgeAddress, ethereumBridgeContract } = assetMappings[asset];
        const contract = new ethers.Contract(ethereumBridgeAddress, ethereumBridgeContract, signer.current);
        return contract.bridgeToStarknet(assetIds, destAddress, { value: messageFee });
      },
      onBefore: () => {
        dispatchBridgingPending();
      },
      onTransaction: (txHash) => {
        dispatchBridgingInitiated();
      },
      onL1Confirmed: (txHash, { asset, assetIds, destAddress }) => {
        dispatchAssetsInTransit(asset, assetIds, 'l1', account, destAddress);
        return api.flushDevnetMessagesAsNeeded();
      },
      onError: (e, vars, duration) => {
        dispatchBridgingFailed();
        onErrorDefault(e, vars, duration);
      },
    },

    'RECEIVE_BRIDGE_ASSETS': {
      execute: ({ asset, assetIds, fromAddress }) => {
        const { ethereumBridgeAddress, ethereumBridgeContract } = assetMappings[asset];
        const contract = new ethers.Contract(ethereumBridgeAddress, ethereumBridgeContract, signer.current);
        return contract.bridgeFromStarknet(assetIds, fromAddress)
      },
      onBefore: () => {
        dispatchL2L1TxStatus('ACCEPTED_ON_L1');
      },
      onL1Confirmed: (txHash, vars) => {
        dispatchAssetsReceived(vars);
        dispatchL2L1TxStatus();
      },
      onError: (e, vars, duration) => {
        dispatchL2L1TxStatus('STUCK_ON_L1');
        onErrorDefault(e, vars, duration);
      }
    },

    'CLAIM_CREDITS': {
      execute: ({ asteroidIds, crewmateIds }) => {
        const contract = new ethers.Contract(
          process.env.REACT_APP_ETHEREUM_SWAY_GOVERNOR,
          configs.SwayGovernor,
          signer.current
        );

        return contract.claimAssignmentSway(asteroidIds, crewmateIds)
      },
      onBefore: () => {
        dispatchClaimingPending();
      },
      onTransaction: (txHash) => {
        dispatchClaimingInitiated();
      },
      onL1Confirmed: (txHash, vars) => {
        setTimeout(() => {
          dispatchClaimingComplete();
        }, 10e3);
      },
      onError: (e, vars, duration) => {
        dispatchClaimingFailed();
        onErrorDefault(e, vars, duration);
      }
    },

    'MINT_CREWMATE': {
      execute: ({ asteroidId }) => {
        const contract = new ethers.Contract(
          process.env.REACT_APP_ETHEREUM_ARVAD_CREWMATE_SALE,
          configs.ArvadCrewSale,
          signer.current
        );
        return contract.mintCrewWithAsteroid(asteroidId)
      },
      onBefore: (vars) => {
        dispatchCrewmateMintingAsteroid(vars.asteroidId, true);
      },
      onL1Confirmed: (txHash, vars) => {
        // give time for event to be processed before triggering reload of assets
        setTimeout(() => {
          dispatchCrewmateMintingAsteroid(vars.asteroidId, false);
        }, 10000);
      },
      onError: (e, vars, duration) => {
        dispatchCrewmateMintingAsteroid(vars.asteroidId, false);
        onErrorDefault(e, vars, duration);
      },
    },

    'CLAIM_TESTNET': {
      execute: ({ proof, amount }) => {
        const contract = new ethers.Contract(
          process.env.REACT_APP_ETHEREUM_SWAY_GOVERNOR,
          configs.SwayGovernor,
          signer.current
        );

        return contract.claimTesterPhase1Sway(proof, BigInt(amount) * 1000000n);
      },
      onL1Confirmed: (txHash, vars) => {
        return;
      },
      onError: (e, vars, duration) => {
        onErrorDefault(e, vars, duration);
      }
    },

    'APPROVE_SWAY': {
      execute: ({ amount, spender }) => {
        const contract = new ethers.Contract(
          process.env.REACT_APP_ETHEREUM_SWAY_TOKEN,
          configs.SwayToken,
          signer.current
        );

        return contract.approve(spender, BigInt(amount * 1e6));
      },
      onL1Confirmed: (txHash, vars) => {
        return;
      },
      onError: (e, vars, duration) => {
        onErrorDefault(e, vars, duration);
      }
    },

    'BRIDGE_SWAY': {
      execute: ({ amount, recipient, messageFee }) => {
        const contract = new ethers.Contract(
          process.env.REACT_APP_ETHEREUM_SWAY_BRIDGE,
          configs.SwayBridge,
          signer.current
        );

        return contract.deposit(BigInt(amount * 1e6), recipient, { value: messageFee });
      },
      onL1Confirmed: (txHash, vars) => {
        return;
      },
      onError: (e, vars, duration) => {
        onErrorDefault(e, vars, duration);
      }
    },

    'RECEIVE_SWAY': {
      execute: ({ amount, recipient }) => {
        const contract = new ethers.Contract(
          process.env.REACT_APP_ETHEREUM_SWAY_BRIDGE,
          configs.SwayBridge,
          signer.current
        );

        return contract.withdraw(amount, recipient);
      },
      onL1Confirmed: (txHash, vars) => {
        return;
      },
      onError: (e, vars, duration) => {
        onErrorDefault(e, vars, duration);
      }
    },

    'SWAY_LAUNCHED': {
      call: async () => {
        const contract = new ethers.Contract(
          process.env.REACT_APP_ETHEREUM_SWAY_TOKEN, configs.SwayToken, signer.current
        );

        return contract.launched();
      }
    },

    'IS_TRANSFERRER': {
      call: async () => {
        const contract = new ethers.Contract(
          process.env.REACT_APP_ETHEREUM_SWAY_TOKEN, configs.SwayToken, signer.current
        );

        return contract.hasRole('0x9c0b3a9882e11a6bfb8283b46d1e79513afb8024ee864cd3a5b3a9050c42a7d7', account);
      }
    }
  }), [
    account,
    dispatchAssetsInTransit,
    dispatchAssetsReceived,
    dispatchBridgingFailed,
    dispatchBridgingInitiated,
    dispatchBridgingPending,
    dispatchClaimingFailed,
    dispatchClaimingInitiated,
    dispatchClaimingPending,
    dispatchClaimingComplete,
    dispatchCrewmateMintingAsteroid,
    dispatchL2L1TxStatus,
    onErrorDefault
  ]);

  const call = useCallback(async (key, vars) => {
    if (!contracts[key]) {
      console.warn(`${key} not supported for l2`);
      return;
    }

    const { call, onError } = contracts[key];
    try {
      return call(vars);
    } catch (e) {
      onError('Call failed.', vars);
      console.error(e);
    }
  }, [contracts]);

  const execute = useCallback(async (key, vars) => {
    if (!contracts[key]) {
      console.warn(`${key} not supported for l1`);
      return;
    }

    const { execute, onBefore, onError, onTransaction } = contracts[key];

    try {
      if (onBefore) onBefore(vars);
      const tx = await execute(vars);
      if (tx.hash) {
        if (onTransaction) onTransaction(tx.hash, vars);
        dispatchPendingTransaction({
          layer: 'l1',
          key,
          vars,
          txHash: tx.hash,
        });

        return tx;
      } else {
        if (onError) onError('Transaction hash not generated', vars);
      }
    } catch (e) {
      if (onError) onError('Transaction failed or rejected by user.', vars, 4000);
      console.error(e);
    }
  }, [contracts, dispatchPendingTransaction]);

  const getPendingTx = useCallback((key, vars) => {
    if (contracts && contracts[key]) {
      return pendingTransactions.find((tx) => {
        if (tx.layer === 'l1' && tx.key === key) {
          if (contracts[key].isEqual) {
            return contracts[key].isEqual(tx.vars, vars);
          }
          return true;  // default assumes one per type at a time
        }
        return false;
      });
    }
    return null;
  }, [contracts, pendingTransactions]);

  const getStatus = useCallback((key, vars) => {
    return getPendingTx(key, vars) ? 'pending' : 'ready';
  }, [getPendingTx]);

  useEffect(() => {
    if (!signer.current) return;

    pendingTransactions
    .filter(({ layer }) => layer === 'l1')
    .forEach(({ key, vars, txHash }) => {
      if (!txHash) return dispatchPendingTransactionComplete(txHash);
      if (!transactionWaiters.current.includes(txHash)) {
        transactionWaiters.current.push(txHash);

        signer.current.provider.waitForTransaction(txHash, 1)
          .then((receipt) => {
            if (receipt) {
              contracts[key].onL1Confirmed(txHash, vars);
            } else {
              contracts[key].onError('No transaction receipt generated.', vars);
            }
          })
          .catch((err) => {
            contracts[key].onError('Transaction hash not generated', vars);
            console.error(err);
          })
          .finally(() => {
            transactionWaiters.current = transactionWaiters.current.filter((tx) => tx.txHash !== txHash);
            dispatchPendingTransactionComplete(txHash);
          });
      }
    });
  }, [contracts, dispatchPendingTransactionComplete, pendingTransactions]);

  const error = useMemo(() => {
    if (activationError) return getErrorMessage(activationError);
    if (chainId && chainId !== chain.chainId) return `Please ensure "${chain.name}" is selected as your wallet's network.`;
    return null;
  }, [activationError, chainId]);

  return {
    address: isActive && !error && account,
    connectionOptions,
    disconnect: disconnectWallet,
    error,
    isConnecting: !!connecting,
    isInstalling: installing,
    openHostedConnectionModal: null,  // (l2 only)
    provider: signer.current?.provider,
    ready,
    reconnect: restorePreviousConnection,
    walletName: selectedWallet._name || 'connected wallet',
    tx: {
      call,
      execute,
      getPendingTx,
      getStatus,
    }
  };
};

export default useL1Wallet;
