import { useCallback, useEffect, useRef, useState } from 'react';
import styled from 'styled-components';

import BackgroundImage from '~/assets/images/background.jpg';

import Header from '~/components/Header';
import { WalletProvider } from '~/contexts/WalletContext';
import useStore from '~/hooks/useStore';
import api from '~/lib/api';

import ConnectPage from './Connect';
import BridgePage from './Bridge';
import ClaimPage from './Claim';
import ClaimEthereumPage from './ClaimEthereum';
import ClaimStarknetPage from './ClaimStarknet';
import BridgeSwayStarknetPage from './BridgeSwayStarknet';
import BridgeSwayEthereumPage from './BridgeSwayEthereum';
import ReceiveSwayEthereum from './ReceiveSwayEthereum';
import DesignatePage from './Designate';

const Container = styled.div`
  display: flex;
  flex-direction: column;
  height: 100%;
  width: 100%;
`;

const MainContainer = styled.div`
  background-image: url(${BackgroundImage});
  background-size: cover;
  height: ${p => p.headerIsVisible ? 'calc(100vh - 75px)' : '100vh'};
  transition: height 200ms ease;
  width: 100vw;
`;

const Main = styled.div`
  align-items: center;
  background: black;
  display: flex;
  flex-direction: column;
  height: 100%;
  margin: 0 auto;
  overflow-y: auto;
  width: 950px;
  max-width: 100%;
`;

const PageContent = styled.div`
  flex: 1;
  height: 100%;
  width: 100%;
`;

const Footer = styled.div`
  align-items: center;
  border-top: 1px solid #555;
  color: #999;
  display: flex;
  flex-direction: column;
  font-size: 75%;
  justify-content: center;
  height: 99px;
  width: 600px;
  & > div:last-child {
    opacity: 0.5;
  }
  & a {
    color: white;
    text-decoration: none;
  }
`;

function Manager(props) {
  const fromAccount = useStore((s) => s.fromAccount);
  const fromLayer = useStore((s) => s.fromLayer);

  const crewmateMintingAsteroids = useStore((s) => s.crewmateMintingAsteroids);
  const mode = useStore((s) => s.mode);

  const dispatchFromAccountDeselected = useStore(s => s.dispatchFromAccountDeselected);
  const dispatchFromAccountSelected = useStore(s => s.dispatchFromAccountSelected);

  const [reloadingAssets, setReloadingAssets] = useState();

  // on "new transfer", logoutOnEmpty is true
  // - if the current account has anything left to transfer, just reset current account state; else, deselect account
  const onReloadAssets = useCallback((logoutOnEmpty) => {
    setReloadingAssets(true);
    api.getWalletAssets({ fromLayer, fromAccount })
      .then((walletAssets) => {
        dispatchFromAccountSelected(fromLayer, fromAccount, walletAssets);
        if (logoutOnEmpty && walletAssets.asteroids.length + walletAssets.crewmates.length === 0) {
          dispatchFromAccountDeselected();
        }
      })
      .catch((e) => {
        if (logoutOnEmpty) dispatchFromAccountDeselected();
      })
      .finally(() => {
        setReloadingAssets(false);
      })
  }, [dispatchFromAccountDeselected, dispatchFromAccountSelected, fromLayer, fromAccount]);

  const previousCrewmateMintingAsteroids = useRef();
  useEffect(() => {
    // (if one asteroid just finished crew minting, reload assets)
    if (crewmateMintingAsteroids?.length < previousCrewmateMintingAsteroids.current) {
      onReloadAssets();
    }
    previousCrewmateMintingAsteroids.current = crewmateMintingAsteroids?.length || 0;
  }, [crewmateMintingAsteroids]); // eslint-disable-line react-hooks/exhaustive-deps

  return (
    <WalletProvider>
      <Container>
        <Header visible={!!fromAccount} />
        <MainContainer headerIsVisible={!!fromAccount}>
          <Main>
            <PageContent>
              {!fromAccount && <ConnectPage />}
              {fromAccount && mode === 'bridge' && <BridgePage onReloadAssets={onReloadAssets} reloadingAssets={reloadingAssets} />}
              {fromAccount && mode === 'claim' && <ClaimPage onReloadAssets={onReloadAssets} reloadingAssets={reloadingAssets} />}
              {fromAccount && mode === 'claim-ethereum' && <ClaimEthereumPage />}
              {fromAccount && mode === 'claim-starknet' && <ClaimStarknetPage />}
              {fromAccount && mode === 'claim-bridge-sway-starknet' && <BridgeSwayStarknetPage />}
              {fromAccount && mode === 'claim-bridge-sway-ethereum' && <BridgeSwayEthereumPage />}
              {fromAccount && mode === 'claim-bridge-sway-receive' && <ReceiveSwayEthereum />}
              {fromAccount && mode === 'designate' && <DesignatePage />}
            </PageContent>
            <Footer>
              <div>Need Help? <a href="https://discord.gg/ubt298ApGc" rel="noreferrer" target="_blank">Contact Support in Discord.</a></div>
              <div>© Unstoppable Games. All rights reserved.</div>
            </Footer>
          </Main>
        </MainContainer>
      </Container>
    </WalletProvider>
  );
};

export default Manager;