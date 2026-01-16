import { useCallback, useContext, useMemo } from 'react';
import LoadingAnimation from 'react-spinners/PulseLoader';
import styled from 'styled-components';

import BrightButton from '~/components/BrightButton';
import { HiddenOnly } from '~/components/ConditionalContent';
import { SwayIcon } from '~/components/Icons';
import WalletContext from '~/contexts/WalletContext';
import useStore from '~/hooks/useStore';
import AssetSelector from '../components/AssetSelector';

const MAX_SELECTABLE = 50;

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
  height: 85px;
  padding: 15px 25px;
  width: 100%;
`;

const Highlight = styled.span`
  color: ${highlightColor};
`;

const MainButtonContainer = styled.div`
  display: flex;
  justify-content: flex-end;
  @media (max-width: 600px) {
    width: auto;
  }
`;
const SwayTotal = styled.div`
  align-items: center;
  color: white;
  display: flex;
  flex-direction: row;
  font-size: 18px;
  justify-content: flex-end;
  padding-right: 12px;
  & > svg {
    font-size: 24px;
  }

  ${p => p.hideBelowWidth && `
    @media (max-width: ${p.hideBelowWidth}px) {
      display: none;
    }
  `}
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

const PreError = styled.span`
  color: ${p => p.theme.colors.error};
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
  & svg {
    height: 40px;
    width: 40px;
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

const Claim = ({ onReloadAssets, reloadingAssets }) => {
  const wallets = useContext(WalletContext);

  const asteroids = useStore(s => s.asteroids || []);
  const crewmates = useStore(s => s.crewmates || []);
  const fromLayer = useStore(s => s.fromLayer);

  const overallClaimingStatus = useStore(s => s.overallClaimingStatus);
  const createAlert = useStore(s => s.dispatchAlertLogged);

  const assets = useMemo(() => {
    return [
      ...asteroids.filter((a) => a._unclaimedSway > 0),
      ...crewmates.filter((c) => c._unclaimedSway > 0)
    ].sort((a, b) => {
      if (a._type !== b._type) {
        return a._type === 'crewmates' ? 1 : -1;
      } else {
        return a._unclaimedSway > b._unclaimedSway ? -1 : 1;
      }
    });
  }, [asteroids, crewmates]);

  const selected = useMemo(() => assets.filter((a) => a._selected), [assets]);
  const selectedTotal = useMemo(() => selected.reduce((acc, c) => acc + c._unclaimedSway, 0), [selected]);
  const wallet = fromLayer === 'l1' ? wallets.l1 : wallets.l2;

  const onBeforeSelect = useCallback((asset) => {
    if (overallClaimingStatus > 0) return false;
    return (asset._unclaimedSway > 0);
  }, [overallClaimingStatus]);

  const onBeforeSelectAll = useCallback(() => {
    if (overallClaimingStatus > 0) return false;
    return true;
  }, [overallClaimingStatus]);

  const handleClaimConfirmation = useCallback(() => {
    if (selected.length === 0) {
      createAlert({
        level: 'warning',
        content: 'You have not selected any assets to claim Sway on yet.',
        duration: 5000
      });
    }
    else if (selected.length > MAX_SELECTABLE) {
      createAlert({
        level: 'warning',
        content: `You cannot claim Sway on more than ${MAX_SELECTABLE} assets in a single transaction.`,
        duration: 5000
      });
    }
    else if (!selected.find((s) => s._type === 'crewmates')) {
      createAlert({
        level: 'warning',
        content: `You must include at least one crewmate in each Sway claim transaction.`,
        duration: 5000
      });
    } else {
      wallet.tx.execute('CLAIM_CREDITS', {
        asteroidIds: selected.filter((s) => s._type === 'asteroids').map((s) => s.id),
        crewmateIds: selected.filter((s) => s._type === 'crewmates').map((s) => s.id),
      });
    }
  }, [createAlert, selected, wallet.tx]);

  const isDisabledAsset = useCallback((asset) => {
    return asset._unclaimedSway === 0;
  }, []);

  const crewmateError = useMemo(() => {
    if (assets.length > 0 && !assets.find((s) => s._type === 'crewmates')) {
      return true;
    } else if (selected.length > 0 && !selected.find((s) => s._type === 'crewmates')) {
      return true;
    }
    return false;
  }, [assets, selected]);

  return (
    <Container>
      {overallClaimingStatus === 0 && (
        <PretransferSummary>
          <div>
            <Highlight>
              <HiddenOnly max={575}>Claim Sway</HiddenOnly>
              <HiddenOnly min={576}>Claim {selectedTotal > 0 ? <><SwayIcon />{selectedTotal.toLocaleString()}</> : 'Sway'}</HiddenOnly>
            </Highlight>
            <div>
              {
                crewmateError
                  ? <PreError>At least one crewmate must be included in each claim.</PreError>
                  : (
                    selected.length === 0
                      ? <>Select assets on which to claim<HiddenOnly max={545}> your Sway</HiddenOnly>.</>
                      : `${selected.length} Asset${selected.length === 1 ? '' : 's'} Selected`
                  )
              }
            </div>
          </div>
          <MainButtonContainer>
            {selectedTotal > 0 && (
              <SwayTotal hideBelowWidth={575}>
                <SwayIcon />{selectedTotal.toLocaleString()}
              </SwayTotal>
            )}
            <BrightButton
              bold
              noWrap
              onClick={handleClaimConfirmation}
              disabled={crewmateError || selected?.length === 0}>
              Claim Sway
            </BrightButton>
          </MainButtonContainer>
        </PretransferSummary>
      )}
      {overallClaimingStatus === 1 && (
        <TransferringSummary>
          <div>
            <LogoContainer>
              <SwayIcon />
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
      {overallClaimingStatus === 2 && (
        <TransferringSummary>
          <div>
            <LogoContainer>
              <SwayIcon />
            </LogoContainer>
          </div>
          <div>
            <div>Transaction in Progress</div>
            <LoadingAnimation color="white" size={7} margin={5} />
          </div>
          <SwayTotal>
            <SwayIcon />{selectedTotal.toLocaleString()}
          </SwayTotal>
        </TransferringSummary>
      )}
      {overallClaimingStatus === 3 && (
        <TransferredSummary>
          <div>
            <LogoContainer style={{ color: 'white' }}>
              <SwayIcon />
            </LogoContainer>
          </div>
          <div>
            <Highlight>{selectedTotal.toLocaleString()} claimed!</Highlight>
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
        disabled={overallClaimingStatus !== 0}
        isDisabledAsset={isDisabledAsset}
        maxSelectable={MAX_SELECTABLE}
        onReloadAssets={onReloadAssets}
        onBeforeSelect={onBeforeSelect}
        onBeforeSelectAll={onBeforeSelectAll}
        reloadingAssets={reloadingAssets}
      />

    </Container>
  );
};

export default Claim;
