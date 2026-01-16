import { useCallback, useContext } from 'react';
import LoadingAnimation from 'react-spinners/PulseLoader';
import styled, { keyframes } from 'styled-components';
import { Asteroid } from '@influenceth/sdk';

import Dialog from '~/components/Dialog';
import WalletContext from '~/contexts/WalletContext';
import useStore from '~/hooks/useStore';
import OnClickLink from './OnClickLink';

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

const AsteroidList = styled.div`
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
`;

const MintCrewmateDialog = ({ unreadyAssets, onClose }) => {
  const wallets = useContext(WalletContext);
  
  const crewmateMintingAsteroids = useStore((s) => s.crewmateMintingAsteroids);

  const showLoading = false;  // TODO:
  const tryToMint = useCallback((asteroidId) => {
    wallets.l1.tx.execute('MINT_CREWMATE', { asteroidId });
  }, [wallets?.l1?.tx]);

  if (!unreadyAssets) return null;
  return (
    <Dialog onClose={onClose}>
      <Container>
        {showLoading && <LoadingContainer><LoadingAnimation color="white" /></LoadingContainer>}
        {!showLoading && (
          <>
            <h3>
              Oops! Some asteroids are not ready.
            </h3>
            <p>
              A crewmate was included with the purchase of each of the following asteroids,
              and you must mint that crewmate on L1 before you can bridge the asteroid to L2.
            </p>

            <AsteroidList>
              {unreadyAssets.map((asset) => (
                <div key={`${asset.id}`}>
                  <div>
                    <label>{asset.Name?.name || Asteroid.Entity.getBaseName(asset)}</label>
                  </div>
                  <div>
                    {(crewmateMintingAsteroids || []).includes(asset.id)
                      ? <Pulsing>Minting...</Pulsing>
                      : (
                        <OnClickLink
                          noUnderline
                          onClick={() => tryToMint(asset.id)}
                          themeColor='main'>
                          Mint Crewmate
                        </OnClickLink>
                      )}
                  </div>
                </div>
              ))}
            </AsteroidList>
          </>
        )}
      </Container>
    </Dialog>
  );
};

export default MintCrewmateDialog;