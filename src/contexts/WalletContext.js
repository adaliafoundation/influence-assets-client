import React, { useCallback, useEffect, useState } from 'react';

import useL1Wallet from '~/hooks/useL1Wallet';
import useL2Wallet from '~/hooks/useL2Wallet';
import useStore from '~/hooks/useStore';

const WalletContext = React.createContext();

function InnerWalletProvider({ children }) {
  const fromAccount = useStore((s) => s.fromAccount);
  const fromLayer = useStore((s) => s.fromLayer);
  const dispatchFromAccountDeselected = useStore((s) => s.dispatchFromAccountDeselected);

  const wallets = {};
  wallets.l1 = useL1Wallet();
  wallets.l2 = useL2Wallet();

  const fromWalletAddress = wallets[fromLayer]?.address;
  const fromWalletReady = wallets[fromLayer]?.ready;
  const fromWalletError = wallets[fromLayer]?.error;
  const checkWalletIntegrity = useCallback((connectedAddress) => {
    // if address matches session...
    if (connectedAddress === fromAccount) {
      // ... and if no errors, return
      if (!fromWalletError) {
        return true;
      }
    }
    dispatchFromAccountDeselected();
  }, [fromAccount, fromWalletError, dispatchFromAccountDeselected]);

  // reconnect to the fromLayer wallet if not already connected...
  // clear state if connected to a wallet that does not match state wallet
  useEffect(() => {
    if (fromLayer) {
      if (fromWalletAddress) {
        checkWalletIntegrity(fromWalletAddress);
      } else if (fromWalletReady) {
        wallets[fromLayer].reconnect(checkWalletIntegrity, fromWalletAddress);
      }
    }

  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [checkWalletIntegrity, fromLayer, fromWalletAddress, fromWalletReady]);

  useEffect(() => {
    if (fromWalletError) {
      dispatchFromAccountDeselected();
    }
  }, [fromWalletError]); // eslint-disable-line react-hooks/exhaustive-deps

  return (
    <WalletContext.Provider value={wallets}>
      {children}
    </WalletContext.Provider>
  );
}

// TODO: this poller is probably not necessary, but be sure to check on all pages (i.e. if refresh)
//  (i.e. braavos doesn't inject that script)
//  (could maybe also use starknet's internal isDocumentReady somehow)

// if argentx is installed (i.e. injected into page), wait for window.starknet to
// be created before rendering... otherwise useL2Wallet hook will cause issues
const argentXInstalled = !!document.querySelector("#argent-x-extension");
export function WalletProvider({ children }) {
  const [ready, setReady] = useState(false);

  const pollUntilReady = useCallback(() => {
    if (!argentXInstalled || window.starknet) {
      setReady(true);
    } else {
      setTimeout(pollUntilReady, 50);
    }
  }, []); // eslint-disable-line react-hooks/exhaustive-deps
  useEffect(pollUntilReady, [pollUntilReady]);

  if (!ready) return null;
  return (
    <InnerWalletProvider>
      {children}
    </InnerWalletProvider>
  );
}

export default WalletContext;