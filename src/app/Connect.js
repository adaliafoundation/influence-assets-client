import { useCallback, useContext, useEffect, useState } from 'react';
import styled from 'styled-components';
import ReactTooltip from 'react-tooltip';

import ProductionLogoSVG from '~/assets/images/influence.svg';
import PrereleaseLogoSVG from '~/assets/images/influence-prerelease.svg';
import EthereumLogo from '~/assets/images/ethereum-logo.png';
import StarknetLogo from '~/assets/images/starknet-logo.png';
import BorderWrap from '~/components/BorderWrap';
import BrightButton from '~/components/BrightButton';
import { SwayIcon } from '~/components/Icons';
import { Tab, Tabs } from '~/components/Tabs';
import WalletConnectDialog from '~/components/WalletConnectDialog';
import WalletContext from '~/contexts/WalletContext';
import useStore from '~/hooks/useStore';
import api from '~/lib/api';

const Container = styled.div`
  align-items: center;
  display: flex;
  flex-direction: column;
  height: 100%;
  padding: 60px 150px 50px;
  width: 100%;

  @media (max-width: 800px) {
    padding: 50px;
  }
  @media (max-width: 600px) {
    padding: 50px 20px;
  }
`;

const LogoSVG = process.env.REACT_APP_STARKNET_CHAIN_ID === '0x534e5f5345504f4c4941' ? PrereleaseLogoSVG : ProductionLogoSVG;
const Logo = styled(LogoSVG)`
  height: 42px;
  margin-bottom: 30px;
`;

const PageTitle = styled.div`
  font-size: 28px;
  padding-bottom: 12px;
  text-align: center;
  text-transform: uppercase;
`;

const PageTabs = styled.div`
  border-top: 1px solid #0;
  height: 40px;
  width: 100%;
`;

const PageContent = styled.div`
  border-top: 1px solid #555;
  color: #777;
  display: flex;
  flex: 1;
  flex-direction: column;
  padding: 40px 0;
  position: relative;

  a {
    color: white;
  }
`;

const InnerContainer = styled.div`
  align-items: center;
  display: flex;
  flex-direction: column;
  text-align: center;
  width: 600px;
`;

const Instructions = styled.div`
  font-size: 115%;

  & ol {
    color: #bbb;
    font-size: 90%;
    line-height: 1.5em;
    text-align: left;
  }
`;

const Card = styled(BorderWrap)`
  height: auto;
  margin: 32px 0 0;
  max-width: 92vw;
  width: 100%;
  & > div {
    height: 85px;
  }
`;

const Direction = styled.div`
  align-items: center;
  background: ${p => p.theme.colors[p.layer]};
  display: flex;
  justify-content: center;
  padding: 0 25px;

  & img {
    width: 165px;
    max-width: 25vw;
  }
`;

const ButtonContainer = styled.div`
  align-items: center;
  display: flex;
  justify-content: center;
`;


const BackgroundImageHolder = styled.div`
  position: absolute;
  height: calc(100% + 50px);
  left: 0;
  top: 0;
  width: 100%;
  & > svg {
    color: white;
    height: 100%;
    opacity: 0.1;
    width: 100%;
  }
`;

const Connect = (props) => {
  const wallets = useContext(WalletContext);
  const createAlert = useStore(s => s.dispatchAlertLogged);
  const dispatchFromAccountSelected = useStore(s => s.dispatchFromAccountSelected);
  const dispatchL2L1DelayEstimate = useStore(s => s.dispatchL2L1DelayEstimate);
  const dispatchMode = useStore(s => s.dispatchMode);
  const prevFromLayer = useStore(s => s.prevFromLayer);
  const mode = useStore(s => s.mode);

  const [connecting, setConnecting] = useState(false);
  const [fromLayer, setFromLayer] = useState(prevFromLayer || 'l1');
  const [fromAccount, setFromAccount] = useState();

  useEffect(() => {
    if (!(fromLayer && fromAccount)) return;
    if (fromLayer === 'l2' && !wallets.l2?.provider) return;  // (this should be impossible)

    api.getWalletAssets({ fromLayer, fromAccount })
      .then((walletAssets) => {
        dispatchFromAccountSelected(fromLayer, fromAccount, walletAssets);

        // update l2/l1 delay
        if (fromLayer === 'l2') {
          api.getL1AcceptedBlock().then((l1AcceptedBlock) => {
            if (l1AcceptedBlock) {
              wallets.l2.provider.getBlock(l1AcceptedBlock).then((block) => {
                if (block) {
                  dispatchL2L1DelayEstimate(Date.now() / 1000 - block.timestamp);
                }
              });
            }
          });
        }
      })
      .catch((e) => {
        setConnecting(false);
        createAlert({
          level: 'warning',
          content: e.message,
          duration: 5000
        });
      });
  }, [ // eslint-disable-line react-hooks/exhaustive-deps
    createAlert,
    fromLayer,
    fromAccount,
    dispatchFromAccountSelected,
    dispatchL2L1DelayEstimate,
    !wallets.l2?.provider // eslint-disable-line react-hooks/exhaustive-deps
  ]);

  const fromWalletAddress = wallets[fromLayer].address;
  useEffect(() => {
    if (connecting && fromWalletAddress) setFromAccount(fromWalletAddress);
  }, [connecting, fromWalletAddress]);

  const onConnect = useCallback(async (layer) => {
    setFromLayer(layer);
    setConnecting(true);
  }, []);

  useEffect(() => {
    if (!mode) dispatchMode('bridge');
  }, [mode, dispatchMode]);

  useEffect(() => ReactTooltip.rebuild(), []);

  useEffect(() => {
    Object.values(wallets).forEach((w) => w.disconnect())
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  return (
    <Container>
      <PageTitle>
        <Logo />
        <div>Asset Manager</div>
      </PageTitle>
      <PageTabs>
        <Tabs>
          <Tab
            selectable={mode !== 'bridge'}
            selected={mode === 'bridge'}
            onClick={() => dispatchMode('bridge')}>
            Assets
          </Tab>
          <Tab
            selectable={mode !== 'claim'}
            selected={mode === 'claim'}
            onClick={() => dispatchMode('claim')}>
            Sway
          </Tab>
          {process.env.REACT_APP_STARKNET_SEPOLIA_DESIGNATE && (
            <Tab
              selectable={mode !== 'designate'}
              selected={mode === 'designate'}
              onClick={() => dispatchMode('designate')}>
              Designate
            </Tab>
          )}
        </Tabs>
      </PageTabs>
      <PageContent>
        {mode === 'bridge' && (
          <InnerContainer>
            <Instructions>View assets on:</Instructions>

            <Card>
              <Direction layer="l2">
                <img alt="StarkNet" src={StarknetLogo} />
              </Direction>
              <ButtonContainer>
                <BrightButton
                  onClick={() => onConnect('l2')}
                  disabled={connecting}
                  loading={connecting && fromLayer === 'l2'}>
                  Connect Starknet Wallet
                </BrightButton>
              </ButtonContainer>
            </Card>

            <Card>
              <Direction layer="l1">
                <img alt="Ethereum" src={EthereumLogo} />
              </Direction>
              <ButtonContainer>
                <BrightButton
                  onClick={() => onConnect('l1')}
                  disabled={connecting}
                  loading={connecting && fromLayer === 'l1'}>
                  Connect Ethereum Wallet
                </BrightButton>
              </ButtonContainer>
            </Card>

            {connecting && !wallets[fromLayer].address && (
              <WalletConnectDialog layer={fromLayer} onClose={() => setConnecting(false)} />
            )}
          </InnerContainer>
        )}
        {mode.substr(0, 5) === 'claim' && (
          <InnerContainer>
            <BackgroundImageHolder>
              <SwayIcon />
            </BackgroundImageHolder>

            <Instructions style={{ marginBottom: 20 }}>
              Bridge SWAY between Ethereum and Starknet:
            </Instructions>

            <BrightButton
              onClick={() => onConnect('l1').then(() => dispatchMode('claim-bridge-sway-starknet'))}
              disabled={connecting}
              loading={connecting && fromLayer === 'l1'}
              style={{ marginBottom: 20, width: 300 }}>
              Bridge to Starknet
            </BrightButton>

            <BrightButton
              onClick={() => onConnect('l2').then(() => dispatchMode('claim-bridge-sway-ethereum'))}
              disabled={connecting}
              loading={connecting && fromLayer === 'l2'}
              style={{ marginBottom: 20, width: 300 }}>
              Bridge to Ethereum
            </BrightButton>

            <BrightButton
              onClick={() => onConnect('l1').then(() => dispatchMode('claim-bridge-sway-receive'))}
              disabled={connecting}
              loading={connecting && fromLayer === 'l1'}
              style={{ marginBottom: 20, width: 300 }}>
              Receive on Ethereum
            </BrightButton>

            <Instructions style={{ marginTop: 10, marginBottom: 20 }}>
              Claim community allocated SWAY
            </Instructions>

            <BrightButton
              onClick={() => onConnect('l1').then(() => dispatchMode('claim'))}
              disabled={connecting}
              loading={connecting && fromLayer === 'l1'}
              style={{ marginBottom: 20, width: 300 }}>
              Arvad Crew Assignments
            </BrightButton>

            <BrightButton
              onClick={() => onConnect('l1').then(() => dispatchMode('claim-ethereum'))}
              disabled={connecting}
              loading={connecting && fromLayer === 'l1'}
              style={{ marginBottom: 20, width: 300 }}>
              Ethereum Testnets
            </BrightButton>

            <BrightButton
              onClick={() => onConnect('l2').then(() => dispatchMode('claim-starknet'))}
              disabled={connecting}
              loading={connecting && fromLayer === 'l2'}
              style={{ marginBottom: 20, width: 300 }}>
              Starknet Testnets
            </BrightButton>

            {connecting && !wallets[fromLayer].address && (
              <WalletConnectDialog layer={fromLayer} onClose={() => setConnecting(false)} />
            )}
          </InnerContainer>
        )}
        {mode === 'designate' && (
          <InnerContainer>
            <BackgroundImageHolder>
              <SwayIcon />
            </BackgroundImageHolder>

            <Instructions style={{ marginBottom: 20 }}>
              To Designate an Account:
              <ol>
                <li>Copy your Starknet mainnet address from Argent or Braavos</li>
                <li>Click on "Connect to Starknet Sepolia Account" below</li>
                <li>Once connected, paste your Starknet Mainnet account address into the box</li>
                <li>Confirm the transaction when prompted</li>
              </ol>
            </Instructions>

            <BrightButton onClick={() => onConnect('l2')} disabled={connecting} loading={connecting && fromLayer === 'l2'}>
              Connect Starknet Sepolia Account
            </BrightButton>

            {connecting && !wallets[fromLayer].address && (
              <WalletConnectDialog layer={fromLayer} onClose={() => setConnecting(false)} />
            )}
          </InnerContainer>
        )}
      </PageContent>
    </Container>
  );
};

export default Connect;
