import { useEffect, useState } from 'react';
import LoadingAnimation from 'react-spinners/PuffLoader';
import ReactTooltip from 'react-tooltip';
import styled from 'styled-components';

import ethereumIcon from '~/assets/images/ethereum-icon.png';
import starknetIcon from '~/assets/images/starknet-icon.png';
import { SwayMonochromeIcon } from '~/components/Icons';
import useStore from '~/hooks/useStore';

const Card = styled.div`
  background: ${p => p.image ? `url(${p.image}) #111` : '#111'};
  background-repeat: no-repeat;
  background-size: contain;
  font-size: ${p => (p.cardWidth || 0) * 0.045}px;
  font-weight: bold;
  padding-top: 133.3%;
  position: relative;
  width: 100%;
`;

const Corner = styled.div`
  height: 0;
  padding-top: 32%;
  width: 32%;
  left: 0;
  position: absolute;
  top: 0;
  &:after {
    content: '';
    background-position: 50% 50%;
    background-repeat: no-repeat;
    background-size: contain;
    padding-top: 40%;
    position: absolute;
    top: 12.5%;
    left: 12.5%;
    width: 40%;
  }
`;

const L1Corner = styled(Corner)`
  background: linear-gradient(to bottom right, #151c2e 50%, transparent 50.1%);
  &:after {
    background-image: url(${ethereumIcon});
  }
`;
const L2Corner = styled(Corner)`
  background: linear-gradient(to bottom right, #3e3b80 50%, transparent 50.1%);
  &:after {
    background-image: url(${starknetIcon});
  }
`;
const InTransitCorner = styled(Corner)`
  background: linear-gradient(to bottom right, ${p => p.theme.colors.main} 50%, transparent 50.1%);
  & > * {
    padding-top: 0;
    position: absolute !important;
    top: 12.5%;
    left: 12.5%;
  }
`;
const SwayCorner = styled(InTransitCorner)`
  color: white;
  font-size: 24px;
  & > * {
    top: 11.5%;
    left: 6.5%;
  }
`;

const Loading = styled.div`
  left: 50%;
  margin: -30px 0 0 -30px;  
  position: absolute;
  top: 50%;
`;

const AssetCard = ({ imageUrl, fallbackImageUrl, bridgingStatus, unclaimedSway }) => {
  const fromLayer = useStore(s => s.fromLayer);
  const mode = useStore(s => s.mode);
  const [ imageFailed, setImageFailed ] = useState(false);
  const [ imageLoaded, setImageLoaded ] = useState(false);

  useEffect(() => {
    const i = new Image();
    i.src = imageUrl;
    // i.crossOrigin = 'anonymous';
    i.onload = () => setImageLoaded(true);
    i.onerror = () => { setImageLoaded(true); setImageFailed(true); };
    return () => {
      i.onload = () => {/* no-op */};
      i.onerror = () => {/* no-op */};
    }
  }, [imageUrl]);

  useEffect(() => ReactTooltip.rebuild(), [bridgingStatus, fromLayer]);

  const useImage = (imageLoaded && !imageFailed && imageUrl)
    || (imageLoaded && imageFailed && fallbackImageUrl)
    || null;
  return (
    <Card image={useImage}>
      <Loading>
        <LoadingAnimation color="white" loading={!imageLoaded} />
      </Loading>
      {mode === 'claim' && (
        <SwayCorner data-tip={unclaimedSway > 0 ? `${unclaimedSway.toLocaleString()} Sway` : 'Already Claimed'} data-place="top">
          <SwayMonochromeIcon />
        </SwayCorner>
      )}
      {mode === 'bridge' && (
        <>
          {bridgingStatus === 1 && (
            <InTransitCorner data-tip="Bridging in progress..." data-place="top">
              <LoadingAnimation color="white" size={18} />
            </InTransitCorner>
          )}
          {((bridgingStatus === 0 && fromLayer === 'l1') || (bridgingStatus === 2 && fromLayer === 'l2')) && <L1Corner data-tip="Currently on L1" />}
          {((bridgingStatus === 0 && fromLayer === 'l2') || (bridgingStatus === 2 && fromLayer === 'l1')) && <L2Corner data-tip="Currently on L2" data-place="right" />}
        </>
      )}
    </Card>
  );
};

export default AssetCard;