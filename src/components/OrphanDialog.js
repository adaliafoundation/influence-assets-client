import { useCallback, useContext, useEffect, useState } from 'react';
import LoadingAnimation from 'react-spinners/PulseLoader';
import styled, { keyframes } from 'styled-components';
import { Address } from '@influenceth/sdk';

import Dialog from '~/components/Dialog';
import WalletConnectDialog from '~/components/WalletConnectDialog';
import WalletContext from '~/contexts/WalletContext';
import useStore from '~/hooks/useStore';
import OnClickLink from './OnClickLink';
import { contractToAsset, labelToAsset, assetMappings } from '~/lib/assets';

const Container = styled.div`
  max-width: 90vw;
  padding: 25px 40px;
  width: 500px;
  & h3 {
    margin: 0 0 10px;
  }
  & > p {
    margin: 0;
    font-size: 85%;
    line-height: 1.25em;
  }
`;

const LoadingContainer = styled.div`
  align-items: center;
  display: flex;
  flex-direction: column;
  justify-content: center;
  min-height: 200px;
`;

const TxList = styled.div`
  margin: 20px -16px 0;
  & > div {
    align-items: center;
    background-color: #111;
    display: flex;
    flex-direction: row;
    padding: 8px 16px;
    transition: background-color 200ms ease;
    &:nth-child(odd) {
      background-color: #1a1a1a;
    }
    &:hover {
      background-color: #272727;
    }

    & > div:first-child {
      flex: 1;
      font-size: 85%;
      padding-right: 12px;
      & > label {
        display: block;
        font-weight: bold;
      }
    }
  }
`;

const pulsing = keyframes`
  0% { opacity: 0.9; }
  50% { opacity: 0.3; }
  100% { opacity: 0.9; }
`;

const Pulsing = styled.div`
  animation: ${pulsing} 1250ms ease infinite;
  color: #999;
`;

const OrphanDialog = ({ onClose, onReloadAssets }) => {
  const wallets = useContext(WalletContext);

  const l2l1TxStatus = useStore(s => s.l2l1TxStatus);
  const orphanedTransactions = useStore(s => s.orphanedTransactions);
  const inTransitAssets = useStore(s => s.inTransitAssets);

  const [reconnectingFor, setReconnectingFor] = useState();

  const handleComplete = useCallback((orphan) => {
    wallets.l1.tx.execute('RECEIVE_BRIDGE_ASSETS', {
      asset: contractToAsset[orphan.assetType],
      assetIds: orphan.assetIds,
      fromAddress: orphan.fromAddress
    });
  }, [wallets.l1.tx]);

  const tryToComplete = useCallback((orphan, noReconnect) => {
    console.log(wallets.l1.address, orphan.toAddress);
    if (wallets.l1.address && Address.areEqual(wallets.l1.address, orphan.toAddress)) {
      setTimeout(() => handleComplete(orphan), 0);
    } else if (wallets.l1.address) {
      wallets.l1.disconnect();
      if (!noReconnect) setReconnectingFor(orphan);
    } else {
      wallets.l1.reconnect((acct) => {
        if (acct && Address.areEqual(acct, orphan.toAddress)) {
          setTimeout(() => handleComplete(orphan), 0);
        } else {
          wallets.l1.disconnect();
          if (!noReconnect) setReconnectingFor(orphan);
        }
      }, orphan.toAddress);
    }
  }, [handleComplete, wallets.l1.address]); // eslint-disable-line react-hooks/exhaustive-deps

  const reattemptCompletion = useCallback((orphan) => {
    setReconnectingFor();
    tryToComplete(orphan, true);
  }, [tryToComplete]);

  useEffect(() => {
    if (inTransitAssets?.length > 0) {
      const int = setInterval(onReloadAssets, 5 * 60e3); // reload in-transit assets every 5 minutes to see if ready
      return () => {
        if (int) clearInterval(int);
      }
    }
  }, [!!inTransitAssets?.length]);  // eslint-disable-line react-hooks/exhaustive-deps

  const showLoading = l2l1TxStatus && l2l1TxStatus !== 'STUCK_ON_L1';
  const s = orphanedTransactions?.length === 1 ? ' ' : 's ';
  return (
    <>
      <Dialog onClose={onClose}>
        <Container>
          {showLoading && <LoadingContainer><LoadingAnimation color="white" /></LoadingContainer>}
          {!showLoading && (
            <>
              <h3>
                Oops! You left your assets on the bridge!
              </h3>
              <p>
                When bridging from L2-to-L1, your assets <u>cannot</u> be transferred to the
                destination wallet automatically. Once the assets are no longer in transit,
                you can complete your previous transaction{s} by approving the L1-side of
                the bridge{s} below.
              </p>
              <TxList>
                {orphanedTransactions.map((tx, i) => (
                  <div key={i}>
                    <div>
                      <label>{tx.assetType}{tx.assetIds.length === 1 ? '' : 's'}</label>
                      {tx.assetIds.join(', ')}
                    </div>
                    <div>
                      <OnClickLink
                        noUnderline
                        onClick={() => tryToComplete(tx)}
                        themeColor='main'>
                        Approve
                      </OnClickLink>
                    </div>
                  </div>
                ))}
                {inTransitAssets.map((asset, i) => (
                  <div key={i} data-tip="You can approve these assets once they reach L1.">
                    <div>
                      <label>{assetMappings[labelToAsset[asset.label]].singular}</label>
                      {asset.id}
                    </div>
                    <Pulsing>
                      In Transit
                    </Pulsing>
                  </div>
                ))}
              </TxList>
            </>
          )}
        </Container>
      </Dialog>
      {reconnectingFor && (
        <WalletConnectDialog
          layer="l1"
          onClose={() => reattemptCompletion(reconnectingFor)}
          targetAddress={reconnectingFor.toAddress} />
      )}
    </>
  );
};

export default OrphanDialog;