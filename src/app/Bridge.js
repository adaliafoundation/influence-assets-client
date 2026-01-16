import { useCallback, useContext, useEffect, useRef, useMemo, useState } from 'react';
import LoadingAnimation from 'react-spinners/PulseLoader';
import styled from 'styled-components';
import { Address } from '@influenceth/sdk';

import EthereumIcon from '~/assets/images/ethereum-icon.png';
import StarknetIcon from '~/assets/images/starknet-icon.png';
import AssetSelector from '~/components/AssetSelector';
import BrightButton from '~/components/BrightButton';
import DestinationConfirm from '~/components/DestinationConfirm';
import DelegateConfirm from '~/components/DelegateConfirm';
import L2L1Dialog from '~/components/L2L1Dialog';
import OrphanDialog from '~/components/OrphanDialog';
import WalletContext from '~/contexts/WalletContext';
import useStore from '~/hooks/useStore';
import api from '~/lib/api';
import { assetMappings } from '~/lib/assets';
import MintCrewmateDialog from '../components/MintCrewmateDialog';
import ClaimSwayDialog from '../components/ClaimSwayDialog';

const RETRY_INTERVAL = 10e3; // 10 seconds

const MAX_SELECTABLE = 25;

const highlightColor = 'white';

const Container = styled.div`
  color: #777;
  display: flex;
  flex-direction: column;
  height: calc(100vh - 175px);
  justify-content: flex-start;
  overflow: hidden;
  width: 100%;
`;

const Summary = styled.div`
  align-items: center;
  background: #141419;
  display: flex;
  flex-direction: row;
  min-height: 85px;
  padding: 15px 25px;
  width: 100%;
`;

const Highlight = styled.span`
  color: ${highlightColor};
`;

const MainButtonContainer = styled.div`
  display: flex;
  justify-content: flex-end;

  & button {
    margin-left: 10px;
  }

  @media (max-width: 600px) {
    width: auto;
  }
`;

const PretransferSummary = styled(Summary)`
  & > div:nth-child(1) {
    flex: 1;

    padding-right: 10px;
    text-align: left;
    & > *:first-child {
      font-size: 24px;
      text-transform: uppercase;
      white-space: nowrap;
      @media (max-width: 480px) {
        font-size: 20px;
      }
      @media (max-width: 440px) {
        font-size: 16px;
      }
    }
    & > *:last-child {
      font-size: 85%;
    }
  }
`;

const TransferringSummary = styled(Summary)`
  background: #26718c;
  color: white;
  & > div:first-child,
  & > div:last-child {
    width: 150px;
  }
  & > div:nth-child(2) {
    flex: 1;
    font-size: 22px;
    font-weight: normal;
    line-height: 1em;
    padding-top: 5px;
    text-align: center;
    text-transform: uppercase;
  }

  @media (max-width: 600px) {
    & > div:first-child,
    & > div:last-child {
      width: auto;
    }
    & > div:nth-child(2) {
      padding: 5px 20px 0;
      text-align: left;
      @media (max-width: 400px) {
        padding-right: 0;
        white-space: nowrap;
      }
    }
  }
`;

const TransferredSummary = styled(Summary)`
  & > div:nth-child(2) {
    flex: 1;
    padding-left: 20px;
    padding-right: 10px;
    text-align: left;
    & > span:first-child {
      font-size: 24px;
      text-transform: uppercase;
      white-space: nowrap;
      @media (max-width: 420px) {
        font-size: 20px;
      }
      @media (max-width: 360px) {
        font-size: 16px;
      }
    }
    & > div:last-child {
      font-size: 85%;
    }
  }
  @media (max-width: 640px) {
    & > button {
      margin: 10px 0;
      position: fixed;
      bottom: 20px;
      left: 20px;
      right: 20px;
    }
  }
`;

const LogoContainer = styled.div`
  background: ${p => p.fromLayer && (p.fromLayer === 'l1' ? p.theme.colors.l2 : p.theme.colors.l1)};
  border: 1px solid ${p => p.fromLayer ? 'transparent' : 'rgba(255, 255, 255, 0.5)'};
  border-radius: 100%;
  height: 50px;
  padding: 4px;
  text-align: center;
  width: 50px;
  & img {
    max-height: 100%;
    max-width: 100%;
  }
`;

const EstimateContainer = styled.div`
  font-size: 90%;
  font-weight: bold;
  text-align: right;

  @media (max-width: 500px) {
    display: none;
  }
`;

const BridgeButtonContent = styled.span`
  &:before {
    content: "Bridge to ${p => p.fromLayer === 'l1' ? 'L2' : 'L1'}";
    @media (max-width: 390px) {
      content: "Bridge";
    }
  }
`;

const Bridge = ({ onReloadAssets, reloadingAssets }) => {
  const wallets = useContext(WalletContext);

  const assetTab = useStore(s => s.assetTab);
  const asteroids = useStore(s => s.asteroids || []);
  const crewmates = useStore(s => s.crewmates || []);
  const crews = useStore(s => s.crews || []);
  const ships = useStore(s => s.ships || []);
  const fromAccount = useStore(s => s.fromAccount);
  const fromLayer = useStore(s => s.fromLayer);
  const inTransitAssets = useStore(s => s.inTransitAssets);
  const orphanedTransactions = useStore(s => s.orphanedTransactions);

  const l2l1DelayEstimate = useStore(s => s.l2l1DelayEstimate);
  const l2l1TxStatus = useStore(s => s.l2l1TxStatus);
  const overallBridgingStatus = useStore(s => s.overallBridgingStatus);
  const inTransit = useStore(s => s.inTransit);
  const createAlert = useStore(s => s.dispatchAlertLogged);
  const dispatchBridgingComplete = useStore(s => s.dispatchBridgingComplete);
  const dispatchAssetInTransitUpdated = useStore(s => s.dispatchAssetInTransitUpdated);

  const [confirming, setConfirming] = useState();
  const [delegating, setDelegating] = useState();
  const [delegationConfirming, setDelegationConfirming] = useState();

  const [suppressL2L1Dialog, setSuppressL2L1Dialog] = useState(false);
  const [suppressOrphanDialog, setSuppressOrphanDialog] = useState(false);
  const [suppressMintDialog, setSuppressMintDialog] = useState(true);
  const [suppressClaimDialog, setSuppressClaimDialog] = useState(true);

  const transitTimeout = useRef();

  const assets = { asteroids, crewmates, crews, ships }[assetTab];
  const selected = useMemo(() => assets.filter((a) => a._selected), [assets]);
  const wallet = fromLayer === 'l1' ? wallets.l1 : wallets.l2;

  const onBeforeSelect = useCallback((asset) => {
    if (overallBridgingStatus > 0) return;
    return true;
  }, [overallBridgingStatus]);

  const onBeforeSelectAll = useCallback(() => {
    if (overallBridgingStatus > 0) return;
    return true;
  }, [overallBridgingStatus]);

  // make sure no unready assets are selected... if so, pop dialog
  const [unreadyAsteroids, unreadyAsteroidsSelected] = useMemo(() => {
    if (assetTab !== 'asteroids' || fromLayer !== 'l1') return [[], []];
    const unready = asteroids.filter((a) => a.AsteroidReward?.hasMintableCrewmate);
    const unreadyAndSelected = unready.filter((a) => a._selected);
    return [unready, unreadyAndSelected];
  }, [assetTab, asteroids, fromLayer]);

  const [unreadyClaimables, unreadyClaimablesSelected] = useMemo(() => {
    if (fromLayer !== 'l1') return [[], []];
    let unready = [];

    // No longer checking asteroids, allow them to be bridged without claiming SWAY

    if (assetTab === 'crewmates') {
      unready = crewmates.filter((c) => c._unclaimedSway > 0);
    }

    const unreadyAndSelected = unready.filter((asset) => asset._selected);
    return [unready, unreadyAndSelected];
  }, [assetTab, crewmates, fromLayer]);

  const handleBridgeConfirmation = useCallback(() => {
    if (selected.length === 0) {
      createAlert({
        level: 'warning',
        content: 'You have not selected any assets to bridge yet.',
        duration: 5000
      });
    }
    else if (selected.length > MAX_SELECTABLE) {
      createAlert({
        level: 'warning',
        content: `You cannot bridge more than ${MAX_SELECTABLE} assets in a single transaction.`,
        duration: 5000
      });
    } else if (unreadyAsteroidsSelected?.length > 0) {
      setSuppressMintDialog(false);
    } else if (unreadyClaimablesSelected?.length > 0) {
      setSuppressClaimDialog(false);
    } else {
      setConfirming(true);
    }
  }, [createAlert, selected, unreadyAsteroidsSelected, unreadyClaimablesSelected]);

  const handleBridgeResponse = useCallback(async (confirmedDestAddress) => {
    setConfirming(false);
    if (!!confirmedDestAddress && selected.length > 0) {
      const payload = {
        asset: assetTab,
        assetIds: selected.map((s) => s.id),
        destAddress: confirmedDestAddress
      };

      // for l1->l2, estimate message fee
      if (fromLayer === 'l1') {
        // estimate fee based on the asset id list that will be sent to l2 (which includes features for crewmates)
        let l2AssetIds = [ ...payload.assetIds ];

        if (assetTab === 'crewmates') {
          const features = await Promise.all(selected.map((s) => {
            return s.coll < 4 ? wallets.l1.tx.call('GET_CREWMATE_FEATURES', { crewmateId: s.id }) : 0;
          }));

          l2AssetIds = selected.reduce((acc, s, i) => [...acc, s.id, features[i].toString()], []);
        }

        const { ethereumBridgeAddress, starknetAssetAddress, l1l2payload } = assetMappings[assetTab];
        const messageFee = await wallets.l2.tx.call('ESTIMATE_L1_L2_MESSAGE_FEE', {
          l1Address: ethereumBridgeAddress,
          l2Address: starknetAssetAddress,
          entrypoint: 'bridge_from_l1',
          payload: l1l2payload({ ...payload, assetIds: l2AssetIds, sender: wallets.l1.address })
        });

        payload.messageFee = messageFee?.overall_fee;
      }

      wallet.tx.execute('BRIDGE_ASSETS', payload);
    }
  }, [
    assetTab,
    fromLayer,
    selected,
    wallet.tx,
    wallets.l1?.address,
    wallets.l1?.tx,
    wallets.l2?.tx
  ]);

  const completeL2L1Bridging = useCallback(() => {
    const selectedIds = selected.map((s) => s.id);
    wallets.l1.tx.execute('RECEIVE_BRIDGE_ASSETS', {
      asset: assetTab,
      assetIds: selectedIds,
      fromAddress: fromAccount
    });
  }, [
    assetTab,
    fromAccount,
    selected,
    wallets.l1.tx
  ]);

  const evaluateInTransit = useCallback(() => {
    transitTimeout.current = null;

    const ids = Object.keys(inTransit).filter((i) => (
      inTransit[i].fromLayer === fromLayer && inTransit[i].fromAccount === fromAccount
    ));

    // NOTE: don't need events, just watch owner
    const checkAndPoll = (inTransitAssets) => {
      if (inTransitAssets?.length > 0) {
        let bridgeIsComplete = true;
        inTransitAssets.forEach((a) => {
          if (Address.areEqual(inTransit[a.id]?.toAccount, a.Nft.owner) && a.Nft.bridge.status === 'COMPLETE') {
            dispatchAssetInTransitUpdated(assetTab, a.id, 2);
          } else {
            bridgeIsComplete = false;
          }
        });

        if (bridgeIsComplete) {
          dispatchBridgingComplete();
        } else {
          transitTimeout.current = setTimeout(evaluateInTransit, RETRY_INTERVAL);
        }
      }
    };

    api.getEntities({ ids, label: assetMappings[assetTab].id })
      .then(checkAndPoll)
      .catch((e) => {
        transitTimeout.current = setTimeout(evaluateInTransit, RETRY_INTERVAL);
      });

  }, [
    assetTab,
    inTransit,
    dispatchAssetInTransitUpdated,
    dispatchBridgingComplete,
    fromLayer,
    fromAccount
  ]);

  const handleDelegateConfirmation = useCallback(() => {
    if (selected.length === 0) {
      createAlert({
        level: 'warning',
        content: 'You have not selected any assets to delegate.',
        duration: 5000
      });
    } else if (selected.length > MAX_SELECTABLE) {
      createAlert({
        level: 'warning',
        content: `You cannot delegate more than ${MAX_SELECTABLE} crews in a single transaction.`,
        duration: 5000
      });
    } else {
      setDelegating(true);
    }
  }, [createAlert, selected]);

  const handleDelegateResponse = useCallback(async (delegateTo) => {
    setDelegating(false);
    setDelegationConfirming(true);

    try {
      const txHash = await wallet.tx.execute('DELEGATE', { delegateTo, crews: selected });
      await wallet.provider.waitForTransaction(txHash);

      // reload assets after a short delay
      setTimeout(() => onReloadAssets(false), 15000);
    } catch (e) {
      createAlert({
        level: 'error',
        content: 'Failed to delegate crews. Please try again.',
        duration: 5000
      });
    } finally {
      setDelegationConfirming(false);
    }
  }, [selected, wallet]);

  useEffect(() => {
    if (Object.keys(inTransit).length === 0) return;
    evaluateInTransit();
    return () => {
      if (transitTimeout.current) clearTimeout(transitTimeout.current);
    }
  }, [inTransit, evaluateInTransit]);

  const lastOrphanedTxCount = useRef();
  useEffect(() => {
    if (!fromLayer) return;
    if (lastOrphanedTxCount.current > 0) {
      if (orphanedTransactions.length < lastOrphanedTxCount.current) {
        // if just processed an orphaned transaction, reload assets
        // NOTE: this leads to several race conditions... better for user to click the "refresh" button
        // onReloadAssets(false, true);

        // if just processed last orphaned transaction, give success message
        if (orphanedTransactions.length === 0) {
          createAlert({
            content: 'All assets that were previously waiting on the L1 bridge contract have been recovered.'
              + (fromLayer === 'l1' ? ' Click here for an updated view of your assets.' : ''),
            duration: 10000,
            onRemoval: () => {
              if (fromLayer === 'l1') {
                setTimeout(() => onReloadAssets(false), 1500);
              }
            }
          });
        }
      }
    }
    lastOrphanedTxCount.current = orphanedTransactions?.length || 0;
  }, [createAlert, fromLayer, orphanedTransactions?.length]); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    if (unreadyAsteroidsSelected?.length > 0) {
      setSuppressMintDialog(false);
    }
  }, [unreadyAsteroidsSelected?.length]);

  useEffect(() => {
    if (unreadyClaimablesSelected?.length > 0) {
      setSuppressClaimDialog(false);
    }
  }, [unreadyClaimablesSelected?.length]);

  // Don't show orphan dialog when L1 wallet is not connected
  useEffect(() => {
    if (!wallets?.l1?.address) {
      setSuppressOrphanDialog(true);
    } else {
      setSuppressOrphanDialog(false);
    }
  }, [wallets?.l1?.address]);

  // re-open l2l1 dialog on l2l1 tx status change
  useEffect(() => {
    setSuppressL2L1Dialog(false);
  }, [l2l1TxStatus]);

  const l2l1DelayEstimatePretty = useMemo(() => {
    if (l2l1DelayEstimate) {
      return Math.ceil(2 * l2l1DelayEstimate / 3600) / 2;
    }
    return 6;
  }, [l2l1DelayEstimate]);

  const fromLayerPretty = fromLayer === 'l1' ? 'Ethereum' : 'Starknet';

  return (
    <Container>
      {overallBridgingStatus === 0 && (
        <PretransferSummary fromLayer={fromLayer}>
          <div>
            <Highlight>{fromLayerPretty} Assets</Highlight>
            <div>
              {selected.length === 0
                  ? <>Select assets to manage</>
                  : `${selected.length} Asset${selected.length === 1 ? '' : 's'} Selected`
              }
            </div>
          </div>
          <MainButtonContainer>
            {assetTab === 'crews' && fromLayer === 'l2' && (
              <BrightButton
                bold
                noWrap
                onClick={handleDelegateConfirmation}
                loading={delegationConfirming}
                disabled={selected?.length === 0 || delegationConfirming}>
                Delegate
              </BrightButton>
            )}
            <BrightButton
              bold
              noWrap
              onClick={handleBridgeConfirmation}
              disabled={selected?.length === 0}>
              <BridgeButtonContent fromLayer={fromLayer} />
            </BrightButton>
          </MainButtonContainer>
        </PretransferSummary>
      )}
      {overallBridgingStatus === 1 && (
        <TransferringSummary>
          <div>
            <LogoContainer>
              {fromLayer === 'l1' && <img src={EthereumIcon} alt="Ethereum" />}
              {fromLayer === 'l2' && <img src={StarknetIcon} alt="Starknet" />}
            </LogoContainer>
          </div>
          <div>
            <div>Waiting on User Approval</div>
          </div>
          <EstimateContainer>
            Check Wallet for transaction prompt
          </EstimateContainer>
        </TransferringSummary>
      )}
      {overallBridgingStatus === 2 && (
        <TransferringSummary>
          <div>
            <LogoContainer>
              {fromLayer === 'l2' && <img src={EthereumIcon} alt="Ethereum" />}
              {fromLayer === 'l1' && <img src={StarknetIcon} alt="Starknet" />}
            </LogoContainer>
          </div>
          <div>
            <div>Bridging in Progress</div>
            <LoadingAnimation color="white" size={7} margin={5} />
          </div>
          <EstimateContainer>
            <div>Expected Wait</div>
            <div style={{ fontWeight: 'normal' }}>~{fromLayer === 'l1' ? '3 minutes' : `${l2l1DelayEstimatePretty}+ hours`}</div>
          </EstimateContainer>
        </TransferringSummary>
      )}
      {overallBridgingStatus === 3 && (
        <TransferredSummary>
          <div>
            <LogoContainer fromLayer={fromLayer}>
              {fromLayer === 'l2' && <img src={EthereumIcon} alt="Ethereum" />}
              {fromLayer === 'l1' && <img src={StarknetIcon} alt="StarkNet" />}
            </LogoContainer>
          </div>
          <div>
            <Highlight>{selected.length} asset{selected.length !== 1 && 's'} transferred!</Highlight>
            {fromLayer === 'l2' && <div>All assets marked with Ethereum logo are now available for use on Layer 1.</div>}
            {fromLayer === 'l1' && <div>All assets marked with StarkNet logo are now available for use on Layer 2.</div>}
          </div>
          <BrightButton
            bold
            disabled={reloadingAssets}
            loading={reloadingAssets}
            onClick={() => onReloadAssets(true)}
            style={{ width: 200 }}>
            Back
          </BrightButton>
        </TransferredSummary>
      )}

      <AssetSelector
        assets={assets}
        disabled={overallBridgingStatus !== 0}
        isDisabledAsset={(asset) => false}
        isTabbed
        maxSelectable={MAX_SELECTABLE}
        onReloadAssets={onReloadAssets}
        onBeforeSelect={onBeforeSelect}
        onBeforeSelectAll={onBeforeSelectAll}
        reloadingAssets={reloadingAssets}
      />

      {confirming && <DestinationConfirm fromLayer={fromLayer} onConfirm={handleBridgeResponse} />}
      {delegating && <DelegateConfirm onConfirm={handleDelegateResponse} />}

      {overallBridgingStatus === 2 && l2l1TxStatus && !suppressL2L1Dialog && (
        <L2L1Dialog
          l1Address={Object.values(inTransit)[0]?.toAccount}
          handleComplete={completeL2L1Bridging}
          onClose={() => setSuppressL2L1Dialog(true)}
          status={l2l1TxStatus}
        />
      )}

      {overallBridgingStatus === 0 && (inTransitAssets?.length > 0 || orphanedTransactions?.length > 0) && !suppressOrphanDialog && (
        <OrphanDialog onClose={() => setSuppressOrphanDialog(true)} onReloadAssets={onReloadAssets} />
      )}

      {overallBridgingStatus === 0 && unreadyAsteroids?.length > 0 && !suppressMintDialog && (
        <MintCrewmateDialog unreadyAssets={unreadyAsteroids} onClose={() => setSuppressMintDialog(true)} />
      )}

      {overallBridgingStatus === 0 && unreadyClaimables?.length > 0 && !suppressClaimDialog && (
        <ClaimSwayDialog
          assetType={assetTab}
          unreadyAssets={unreadyClaimables}
          onClose={() => setSuppressClaimDialog(true)} />
      )}
    </Container>
  );
};

export default Bridge;
