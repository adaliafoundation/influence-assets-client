import { useCallback, useContext, useEffect, useMemo, useState } from 'react';
import styled from 'styled-components';
import ReactTooltip from 'react-tooltip';
import { BsFillPlusSquareFill as AddIcon } from 'react-icons/bs';
import { RiCloseCircleFill as CloseIcon } from 'react-icons/ri';

import EthereumIcon from '~/assets/images/ethereum-icon.png';
import EthereumLogo from '~/assets/images/ethereum-logo.png';
import ProductionLogoSVG from '~/assets/images/influence.svg';
import PrereleaseLogoSVG from '~/assets/images/influence-prerelease.svg';
import StarknetIcon from '~/assets/images/starknet-icon.png';
import StarknetLogo from '~/assets/images/starknet-logo.png';
import { SwayIcon } from '~/components/Icons';
import WalletContext from '~/contexts/WalletContext';
import useStore from '~/hooks/useStore';

const Main = styled.div`
  align-items: center;
  border-bottom: 1px solid #222;
  display: flex;
  flex-direction: row;
  height: ${p => p.in ? '75px' : '0'};
  overflow: hidden;
  padding: 0 20px;
  transition: height 200ms ease;
`;

const LogoSVG = process.env.REACT_APP_STARKNET_CHAIN_ID === '0x534e5f5345504f4c4941' ? PrereleaseLogoSVG : ProductionLogoSVG;
const Logo = styled(LogoSVG)`
  height: 32px;
  max-width: 40vw;
`;

const MiddleFlex = styled.div`
  display: flex;
  flex-direction: row;
  justify-content: center;
  flex-basis: 60%;
`;

const DirectionLogo = styled.img`
  width: 125px;
`;

const DirectionIcon = styled.img`
  display: none;
  height: 32px;
`;

const Balance = styled.div`
  align-items: center;
  background: ${p => p.theme.colors[p.layer]};
  border-radius: 30px;
  display: inline-flex;
  font-weight: bold;
  padding: 10px 20px;
  position: relative;
  max-width: calc(100vw - 420px);
  & label {
    font-size: 12px;
    flex: 1;
    opacity: 0.5;
    white-space: nowrap;
    padding-right: 20px;
    & span {
      @media (max-width: 720px) {
        display: none;
      }
    }
    @media (max-width: 650px) {
      display: none;
    }
  }
  & svg {
    font-size: 24px;
  }
  @media (max-width: 575px) {
    display: none;
  }
`;

const Direction = styled.div`
  align-items: center;
  background: ${p => p.theme.colors[p.layer]};
  border-radius: 30px;
  display: flex;
  justify-content: center;
  padding: 8px 32px;
  width: 540px;
  max-width: calc(100vw - 420px);

  & > div {
    align-items: center;
    display: flex;
  }

  @media (max-width: 860px) {
    width: auto;
    & > div {
      &:first-child,
      &:last-child {
        &:before {
          display: none;
        }
      }
      & ${DirectionLogo} {
        display: none;
      }
      & ${DirectionIcon} {
        display: inline-block;
      }
    }
    & > span {
      padding: 0 15px;
    }
  }

  @media (max-width: 590px) {
    display: none;
  }
`;

const RightSide = styled.div`
  align-items: center;
  display: flex;
  flex-basis: 20%;
  justify-content: flex-end;
  min-width: 175px;
  @media (max-width: 600px) {
    min-width: 0;
  }
`;

const Connected = styled.div`
  align-items: center;
  background: #333;
  border-radius: 6px;
  color: white;
  cursor: ${p => p.theme.cursors.active};
  display: flex;
  flex-direction: row;
  font-size: 12px;
  padding: 8px;
  position: relative;
  &:before {
    background: #8cc63f;
    border-radius: 10px;
    content: '';
    display: block;
    height: 10px;
    width: 10px;
  }

  & > div:first-child {
    padding-left: 4px;
    white-space: nowrap;
  }

  & > svg {
    margin-left: 10px;
    opacity: 0.3;
    transform: scale(1.6);
    transition: opacity 300ms ease;
  }

  &:hover {
    & svg {
      opacity: 0.6;
    }
  }
`;

const ConnectedLayerIcon = styled.img`
  height: 25px;
  margin-right: 7px;
`;

const LogoLink = styled.span`
  color: white;
  flex-basis: 20%;
  font-size: 12px;
  text-decoration: none;
  &:after {
    content: 'Asset Manager';
    display: block;
    margin-left: 38px;
    margin-top: -4px;
    text-align: left;
    text-transform: uppercase;
  }
`;

const AddToken = styled.div`
  color: ${p => p.theme.colors.success};
  cursor: ${p => p.theme.cursors.active};
  opacity: 0.9;
  position: absolute;
  right: -6px;
  top: 2px;
  transition: opacity 250ms ease, transform 250ms ease;
  z-index:1;
  & > svg {
    font-size: 18px;
  }

  &:hover {
    opacity: 1;
    transform: scale(1.2);
  }
`;

function Header(props) {
  const wallets = useContext(WalletContext);

  const mode = useStore(s => s.mode);
  const fromAccount = useStore(s => s.fromAccount);
  const fromLayer = useStore(s => s.fromLayer);
  const overallClaimingStatus = useStore(s => s.overallClaimingStatus);
  const dispatchFromAccountDeselected = useStore(s => s.dispatchFromAccountDeselected);
  const tokenIsRegistered = useStore(s => s.tokenIsRegistered);
  const dispatchTokenIsRegistered = useStore(s => s.dispatchTokenIsRegistered);

  const [swayBalance, setSwayBalance] = useState(null);

  useEffect(() => {
    if (mode.substr(0, 5) === 'claim' && [0,3].includes(overallClaimingStatus)) {
      if (wallets?.l1 && fromLayer === 'l1') {
        wallets.l1.tx.call('GET_SWAY_BALANCE').then((balance) => {
          setSwayBalance(balance)
        });
      } else if (wallets?.l2 && fromLayer === 'l2') {
        wallets.l2.tx.call('GET_SWAY_BALANCE').then((balance) => {
          console.log('balance', balance);
          setSwayBalance(balance)
        });
      }
    }
  }, [wallets?.l1, wallets?.l2, fromLayer, mode, overallClaimingStatus]);

  const shortAccount = useMemo(() => {
    return fromAccount && `${fromAccount.substr(0, 6)}...${fromAccount.substr(-4)}`;
  }, [fromAccount]);

  const registerToken = useCallback(async () => {
    try {
      const wasAdded = await window.ethereum.request({
        method: 'wallet_watchAsset',
        params: {
          type: 'ERC20',
          options: {
            address: process.env.REACT_APP_ETHEREUM_SWAY_TOKEN,
            symbol: 'SWAY',
            decimals: 6,
            image: `${process.env.REACT_APP_CLOUDFRONT_IMAGE_URL}/images/icons/sway/SWAYLogo.png`
          },
        },
      });
      if (wasAdded) {
        dispatchTokenIsRegistered(true);
      }
    } catch (error) {
      console.warn(error);
    }
  }, [dispatchTokenIsRegistered]);

  const handleDisconnect = useCallback(() => {
    if (wallets[fromLayer]) {
      wallets[fromLayer].disconnect();
      dispatchFromAccountDeselected();
    }
  }, [dispatchFromAccountDeselected, fromLayer, wallets]);

  useEffect(() => ReactTooltip.rebuild(), [shortAccount]);

  return (
    <Main in={props.visible ? 1 : 0}>
      <LogoLink
        onClick={dispatchFromAccountDeselected}
        data-tip="Back to Home"
        data-place="right">
        <Logo />
      </LogoLink>
      <MiddleFlex>
        {fromLayer && mode.substr(0, 5) === 'claim' && swayBalance !== null && (
          <Balance layer={fromLayer}>
            <label>Wallet Balance:</label>
            <SwayIcon /> <span>{Math.round(swayBalance).toLocaleString()}</span>
            {!tokenIsRegistered && window.ethereum && fromLayer !== 'l2' && (
              <AddToken
                onClick={registerToken}
                data-tip="Register SWAY in Wallet"
                data-place="right">
                <AddIcon />
              </AddToken>
            )}
          </Balance>
        )}
        {fromLayer && mode === 'bridge' && (
          <Direction
            layer={fromLayer}
            onClick={dispatchFromAccountDeselected}
            data-tip="Switch Chain"
            data-place="right">
            {fromLayer === 'l1'
              ? <div><DirectionLogo alt="Ethereum" src={EthereumLogo} /><DirectionIcon alt="Ethereum" src={EthereumIcon} /></div>
              : <div><DirectionLogo alt="StarkNet" src={StarknetLogo} /><DirectionIcon alt="StarkNet" src={StarknetIcon} /></div>
            }
          </Direction>
        )}
      </MiddleFlex>
      <RightSide>
        {fromAccount && (
          <>
            {fromLayer === 'l1'
              ? <ConnectedLayerIcon alt="Ethereum" src={EthereumIcon} />
              : <ConnectedLayerIcon alt="Starknet" src={StarknetIcon} />
            }
            <Connected
              onClick={handleDisconnect}
              data-tip="Click to Disconnect"
              data-place="left">
              <div>{shortAccount}</div>
              <CloseIcon />
            </Connected>
          </>
        )}
      </RightSide>
    </Main>
  );
};

export default Header;
