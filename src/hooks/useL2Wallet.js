import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { connect as starknetConnect, disconnect as starknetDisconnect } from 'starknetkit';
import { ArgentMobileConnector } from 'starknetkit/argentMobile';
import { InjectedConnector } from 'starknetkit/injected';
import { WebWalletConnector } from 'starknetkit/webwallet';
import { Contract, RpcProvider, WalletAccount } from 'starknet';
import { Address, starknetContracts } from '@influenceth/sdk';

import useStore from '~/hooks/useStore';
import api from '~/lib/api';
import { assetMappings } from '~/lib/assets';

const RETRY_INTERVAL = 10e3; // 10 seconds

const resolveChainId = (chainId) => {
  const cleansed = typeof chainId === 'bigint' ? `0x${chainId.toString(16)}` : chainId;
  if (['0x534e5f4d41494e', 'SN_MAIN'].includes(cleansed)) return 'SN_MAIN';
  if (['0x534e5f474f45524c49', 'SN_GOERLI'].includes(cleansed)) return 'SN_GOERLI';
  if (['0x534e5f5345504f4c4941', 'SN_SEPOLIA', 'sepolia-alpha'].includes(cleansed)) return 'SN_SEPOLIA';
  return 'SN_DEV';
};

const getErrorMessage = (error) => {
  console.error(error);
  if (typeof error === 'string') return error;
  else if (typeof error === 'object' && error?.message) return error.message;
  return 'An unknown error occurred, please check the console for details.';
};

const isAllowedChain = (chain) => {
  return resolveChainId(chain) === resolveChainId(process.env.REACT_APP_STARKNET_CHAIN_ID);
}

const ready = true;
const useL2Wallet = () => {
  const pendingTransactions = useStore(s => s.pendingTransactions);
  const dispatchAssetsInTransit = useStore(s => s.dispatchAssetsInTransit);
  const dispatchBridgingPending = useStore(s => s.dispatchBridgingPending);
  const dispatchBridgingInitiated = useStore(s => s.dispatchBridgingInitiated);
  const dispatchBridgingFailed = useStore(s => s.dispatchBridgingFailed);
  const dispatchPendingTransaction = useStore(s => s.dispatchPendingTransaction);
  const dispatchPendingTransactionComplete = useStore(s => s.dispatchPendingTransactionComplete);
  const dispatchL2L1TxStatus = useStore(s => s.dispatchL2L1TxStatus);
  const createAlert = useStore(s => s.dispatchAlertLogged);
  const mode = useStore(s => s.mode);

  const onConnectCallback = useRef();
  const transactionWaiters = useRef([]);

  const [connectedAccount, setConnectedAccount] = useState();
  const [connecting, setConnecting] = useState(false);
  const [error, setError] = useState();
  const [starknet, setStarknet] = useState();
  const [starknetUpdated, setStarknetUpdated] = useState(1);

  const account = useMemo(
    () => starknet?.address ? Address.toStandard(starknet.address) : undefined,
    [starknet?.address, starknetUpdated]
  );

  const provider = useMemo(() => {
    let nodeUrl = process.env.REACT_APP_STARKNET_PROVIDER;

    if (process.env.REACT_APP_STARKNET_PROVIDER_BACKUP && Math.random() > 0.5) {
      nodeUrl = process.env.REACT_APP_STARKNET_PROVIDER_BACKUP;
    }

    return new RpcProvider({ nodeUrl });
  }, []);

  const onConnectionResult = useCallback((newAccount, newAddress) => {
    setConnecting(false);
    setStarknet(newAccount || null);
    setConnectedAccount(newAddress || null);
    setStarknetUpdated(v => v + 1);

    if (onConnectCallback.current) {
      onConnectCallback.current(newAddress || null);
      onConnectCallback.current = null;
    }
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const attemptConnection = useCallback(async (auto = false) => {
    if (connecting) return;

    try {
      const connectors = [];

      if (!!process.env.REACT_APP_ARGENT_WEB_WALLET_URL) {
        connectors.push(new WebWalletConnector({ url: process.env.REACT_APP_ARGENT_WEB_WALLET_URL, provider }));
      }

      connectors.push(new InjectedConnector({ options: { id: 'argentX', provider }}));
      connectors.push(new InjectedConnector({ options: { id: 'braavos', provider }}));
      connectors.push(new ArgentMobileConnector());

      const connectionOptions = {
        dappName: 'Influence Assets',
        modalMode: auto ? 'neverAsk' : 'alwaysAsk',
        modalTheme: 'dark',
        projectId: 'influence',
        connectors,
        provider
      };

      setError();
      const { connectorData, wallet } = await starknetConnect(connectionOptions);
      console.log('waiting 200ms...');
      await new Promise(resolve => setTimeout(resolve, 200)); // deal with timeout delay from Argent

      if (wallet && connectorData?.account) {
        const chainId = resolveChainId(connectorData.chainId);
        const newAccount = await WalletAccount.connect(provider, wallet, undefined);

        // Default to provider chainId if not set (starknetkit doesn't set for braavos)
        if (!isAllowedChain(chainId)) {
          try {
            await wallet.request({
              type: 'wallet_switchStarknetChain',
              params: { chainId: process.env.REACT_APP_CHAIN_ID }
            });
          } catch (e) { // (standardize error message here since different between wallets)
            throw new Error(`Incorrect chain, please switch to ${resolveChainId(process.env.REACT_APP_CHAIN_ID)}`);
          }

          await attemptConnection(true);
          setConnecting(false);
          return;
        }

        const newAddress = Address.toStandard(connectorData.account);
        setConnectedAccount(newAddress);
        onConnectionResult(newAccount, newAddress);
      } else {
        onConnectionResult();
      }

      return wallet;
    } catch(e) {
      console.warn('connection error', e)
      setError(e);
      onConnectionResult();
      return false;
    }
  }, [connecting, mode]);  // eslint-disable-line react-hooks/exhaustive-deps

  const disconnect = useCallback(() => {
    onConnectionResult();
    if (window.starknet?.account) starknetDisconnect(); // (this doesn't actually seem necessary)
  }, [onConnectionResult]);

  const restorePreviousConnection = useCallback((callback, preferredAddress, preferredWallet) => {
    // NOTE: there is no longer a clear way to pass address or wallet preferences here (maybe possible
    // for some of the wallets via the `connectors` prop in starknetConnect)... but for L2 at least,
    // presumably not many users will have multiple connection methods installed or multiple accounts
    // per wallet, and this is a nice-to-have anyway, so skipping for now
    onConnectCallback.current = callback;
    attemptConnection(true);
  }, [attemptConnection]); // eslint-disable-line react-hooks/exhaustive-deps

  const onConnectionChange = useCallback(() => {
    // react has trouble detecting changes deep to starknet object without essentially
    // using this update counter to force a dependency change where appropriate
    setStarknetUpdated((v) => v + 1);

    // disconnect, then attempt reconnection
    if (starknet) {
      attemptConnection(true);
    } else {
      disconnect();
    }
  }, [attemptConnection, disconnect, starknet]);

  // while connecting or connected, listen for network changes from extension
  useEffect(() => {
    const onAccountsChanged = (e) => {
      // for a while, false positives from braavos seemed to force a disconnection, but
      // that disconnection seems to have been resolved through other changes... leaving
      // this here just in case that comes back though
      // const newAddress = Array.isArray(e) ? e[0] : e;
      // if (newAddress && starknet.account?.address && Address.areEqual(`${newAddress}`, `${starknet.account.address}`)) return;

      onConnectionChange();
    };
    const onNetworkChanged = (e) => { onConnectionChange(); };

    const startListening = () => {
      if (starknet.on) {
        starknet.on('accountsChanged', onAccountsChanged);
        starknet.on('networkChanged', onNetworkChanged);
      } else if (starknet.walletProvider?.on) {
        starknet.walletProvider.on('accountsChanged', onAccountsChanged);
        starknet.walletProvider.on('networkChanged', onNetworkChanged);
      }
    }

    const stopListening = () => {
      if (!starknet) return;

      if (starknet.off) {
        starknet.off('accountsChanged', onAccountsChanged);
        starknet.off('networkChanged', onNetworkChanged);
      } else if (starknet.walletProvider?.off) {
        starknet.walletProvider.off('accountsChanged', onAccountsChanged);
        starknet.walletProvider.off('networkChanged', onNetworkChanged);
      }
    };

    if (starknet) startListening();
    return stopListening;
  }, [onConnectionChange, starknet]); // eslint-disable-line react-hooks/exhaustive-deps

  const isAcceptedOnL1 = useCallback((status) => {
    return status === 'ACCEPTED_ON_L1'
      || (status === 'ACCEPTED_ON_L2' && process.env.REACT_APP_STARKNET_PROVIDER.includes('localhost'))
  }, []);

  const onErrorDefault = useCallback((e, vars, duration) => {
    createAlert({
      level: 'warning',
      content: e,
      duration
    });
  }, [createAlert]);

  const contracts = useMemo(() => {
    if (!starknet) return;

    return {
      'ESTIMATE_L1_L2_MESSAGE_FEE': {
        call: ({ l1Address, l2Address, entrypoint, payload }) => {
          const provider = new RpcProvider({ nodeUrl: process.env.REACT_APP_STARKNET_PROVIDER });
          return provider.estimateMessageFee({
            from_address: l1Address,
            to_address: l2Address,
            entry_point_selector: entrypoint,
            payload
          });
        }
      },

      'BRIDGE_ASSETS': {
        execute: ({ asset, assetIds, destAddress }) => {
          const { starknetAssetAddress, starknetAssetContract } = assetMappings[asset];
          const contract = new Contract(starknetAssetContract, starknetAssetAddress, starknet);
          const args = [destAddress, [...assetIds]];
          return contract.invoke('bridge_to_l1', args);
        },
        onBefore: () => {
          dispatchBridgingPending();
        },
        onTransaction: (txHash) => {
          dispatchBridgingInitiated();
          dispatchL2L1TxStatus('RECEIVED');
        },
        onL2Confirmed: (txHash, { asset, assetIds, destAddress }) => {
          dispatchAssetsInTransit(asset, assetIds, 'l2', account, destAddress);
          dispatchL2L1TxStatus('ACCEPTED_ON_L2');
          return api.flushDevnetMessagesAsNeeded();
        },
        onL1Confirmed: (txHash, vars) => {
          dispatchL2L1TxStatus('ACCEPTED_ON_L1');
        },
        onError: (e, vars, duration) => {
          dispatchBridgingFailed();
          dispatchL2L1TxStatus();
          onErrorDefault(e, vars, duration);
        },
      },

      'DELEGATE': {
        execute: ({ delegateTo, crews }) => {
          const entrypoint = 'run_system';
          const contractAddress = process.env.REACT_APP_STARKNET_DISPATCHER;
          const systemName = '0x44656c656761746543726577';

          const calls = crews.map((crew) => {
            const calldata = [ systemName, '3', delegateTo, '1', crew.id ];
            return { entrypoint, contractAddress, calldata };
          });

          return starknet.execute(calls);
        }
      },

      'DESIGNATE': {
        execute: ({ designee }) => {
          const contract = new Contract(
            starknetContracts.Designate, process.env.REACT_APP_STARKNET_SEPOLIA_DESIGNATE, starknet
          );

          const args = [designee];
          return contract.invoke('designate', args);
        }
      },

      'GET_DESIGNEE': {
        call: ({ designator }) => {
          const contract = new Contract(
            starknetContracts.Designate, process.env.REACT_APP_STARKNET_SEPOLIA_DESIGNATE, starknet
          );

          const args = [designator];
          return contract.call('designee', args);
        }
      },

      'CLAIM_TESTNET': {
        execute: ({ proof, amount }) => {
          const contract = new Contract(
            starknetContracts.Dispatcher, process.env.REACT_APP_STARKNET_DISPATCHER, starknet
          );

          const calldata = contract.callData.compile('run_system', {
            name: 'ClaimTestnetSway', calldata: [ proof.length, ...proof, BigInt(amount) * 1000000n, 0 ]
          });

          return contract.invoke('run_system', calldata);
        }
      },

      'GET_SWAY_BALANCE': {
        call: async () => {
          const contract = new Contract(
            starknetContracts.Sway, process.env.REACT_APP_STARKNET_SWAY_TOKEN, starknet
          );

          const balance = await contract.call('balance_of', [starknet.address]);
          const decimals = await contract.decimals();

          try {
            return parseInt(BigInt(balance).toString()) / (10 ** Number(decimals));
          } catch (e) {
            console.warn(e);
            return null;
          }
        }
      },

      'BRIDGE_SWAY': {
        execute: ({ amount, recipient }) => {
          const contract = new Contract(
            starknetContracts.Sway, process.env.REACT_APP_STARKNET_SWAY_TOKEN, starknet
          );

          const args = [recipient, BigInt(amount * 1e6)];
          return contract.invoke('initiate_withdrawal', args);
        }
      }
    };
  }, [ // eslint-disable-line react-hooks/exhaustive-deps
    account,
    createAlert,
    dispatchAssetsInTransit,
    dispatchBridgingFailed,
    dispatchBridgingInitiated,
    dispatchBridgingPending,
    dispatchL2L1TxStatus,
    onErrorDefault,
    starknet,
    starknetUpdated
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
      if (onError) onError('Call failed.', vars);
      console.error(e);
    }
  }, [contracts]);

  const execute = useCallback(async (key, vars) => {
    if (!contracts[key]) {
      console.warn(`${key} not supported for l2`);
      return;
    }

    const { execute, onBefore, onError, onTransaction } = contracts[key];

    try {
      if (onBefore) onBefore(vars);
      const tx = await execute(vars);

      if (tx.transaction_hash) {
        if (onTransaction) onTransaction(tx.transaction_hash, vars);

        dispatchPendingTransaction({
          layer: 'l2',
          key,
          vars,
          txHash: tx.transaction_hash,
        });

        return tx.transaction_hash;
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
        if (tx.layer === 'l2' && tx.key === key) {
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
    if (!starknet) return;

    pendingTransactions
    .filter(({ layer }) => layer === 'l2')
    .forEach(({ key, vars, txHash }) => {
      if (!txHash) return dispatchPendingTransactionComplete(txHash);
      if (!transactionWaiters.current.includes(txHash)) {
        transactionWaiters.current.push(txHash);

        const onComplete = () => {
          transactionWaiters.current = transactionWaiters.current.filter((tx) => tx.txHash !== txHash);
          dispatchPendingTransactionComplete(txHash);
        };

        const pollForL1Acceptance = () => {
          starknet.getTransaction(txHash)
          .then((receipt) => {
            if (receipt && isAcceptedOnL1(receipt.status)) {
              contracts[key].onL1Confirmed(txHash, vars);
              onComplete();
            } else {
              setTimeout(pollForL1Acceptance, 10e3);
            }
          })
          .catch((e) => {
            console.warn(e);
            setTimeout(pollForL1Acceptance, 10e3);
          })
        };

        starknet.waitForTransaction(txHash, RETRY_INTERVAL)
          .then(() => {
            console.log(txHash);
            if (contracts[key].onL2Confirmed) {
              contracts[key].onL2Confirmed(txHash, vars);
            }

            // if there is an onL1Confirmed handler, poll until that is true
            if (contracts[key].onL1Confirmed) {
              pollForL1Acceptance();
            } else {
              onComplete();
            }
          })
          .catch((err) => {
            console.error(err);
            contracts[key].onError('Transaction hash not generated', vars);
            onComplete();
          });
      }
    });
  }, [ // eslint-disable-line react-hooks/exhaustive-deps
    contracts,
    dispatchPendingTransactionComplete,
    isAcceptedOnL1,
    pendingTransactions,
    starknet, // eslint-disable-line react-hooks/exhaustive-deps
    starknetUpdated
  ]);

  return {
    address: connectedAccount,
    connectionOptions: useMemo(() => ([]), []),
    disconnect,
    error: useMemo(() => error && getErrorMessage(error), [error]),
    isConnecting: connecting,
    isInstalling: false,  // this UI is handled by get-starknet
    openHostedConnectionModal: attemptConnection,
    provider,
    ready,
    reconnect: restorePreviousConnection,
    walletIcon: starknet?.icon && <img src={starknet.icon} alt={`${starknet.name}`} />,
    walletName: starknet?.name,
    tx: {
      call,
      execute,
      getPendingTx,
      getStatus,
    }
  };
};

export default useL2Wallet;
