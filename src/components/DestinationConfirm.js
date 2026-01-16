import { useCallback, useContext, useEffect, useMemo, useState } from 'react';
import styled from 'styled-components';
import {
  BiChevronRight as ChevronRightIcon,
  BiWallet as WalletIcon
} from 'react-icons/bi';
import ReactTooltip from 'react-tooltip';

import EthereumLogo from '~/assets/images/ethereum-logo.png';
import StarknetLogo from '~/assets/images/starknet-logo.png';
import BrightButton from '~/components/BrightButton';
import Dialog from '~/components/Dialog';
import WalletConnectDialog from '~/components/WalletConnectDialog';
import WalletContext from '~/contexts/WalletContext';

const DialogContainer = styled.div`
  align-items: center;
  display: flex;
  flex-direction: column;
  margin: 20px;
  text-align: center;
  width: 640px;
  max-width: calc(100% - 40px);
`;
const DialogTitle = styled.div`
  border-bottom: 1px solid #222;
  font-size: 25px;
  padding-bottom: 12px;
  text-align: center;
  text-transform: uppercase;
  width: 100%;
`;
const DialogContent = styled.div`
  align-items: center;
  color: #777;
  display: flex;
  flex-direction: column;
  padding: 20px 0;
  width: 100%;
`;
const Clickable = styled.span`
  color: white;
  cursor: ${p => p.theme.cursors.active};
  text-decoration: none;
  &:hover {
    text-decoration: underline;
  }
`;

const FancyInput = styled.div`
  background: #333;
  border: 1px solid rgba(${p => p.theme.colors.mainRGB}, 0.3);
  border-radius: 10px;
  cursor: ${p => p.theme.cursors.active};
  margin: 15px 0;
  padding: 8px 16px 2px;
  text-align: left;
  transition: border-color 100ms linear;
  width: 100%;

  &:hover {
    border-color: rgba(${p => p.theme.colors.mainRGB}, 0.9);
  }

  & > div:first-child {
    font-size: 12px;
    text-transform: uppercase;
  }
  & > div:last-child {
    align-items: stretch;
    display: flex;
    flex-direction: row;
    margin-right: -16px;
  }

  & input {
    background: transparent;
    border: 0;
    color: white;
    cursor: ${p => p.theme.cursors.active};
    font-family: 'Jura', sans-serif;
    font-size: 14px;
    font-weight: thin;
    outline: 0;
    padding: 8px;
    padding-left: 0;
    width: 100%;
    &::placeholder {
      font-size: 1.15em;
    }
  }
`;

const WalletConnectButton = styled.button`
  align-items: center;
  background: transparent;
  border: 0;
  color: white;
  display: flex;
  font-size: 22px;
`;

const Note = styled.div`
  display: ${p => p.isAddressSet ? 'none' : 'block'};
  font-size: 80%;
  height: 32px;
  margin-bottom: 28px;
`;

const Warning = styled(Note)`
  color: orange;
  display: ${p => p.isAddressSet ? 'block' : 'none'};
`;

const LogoContainer = styled.div`
  padding: 5px 0 0;
  & > img {
    max-height: 48px;
    max-width: 250px;
  }
`;

function DestinationConfirm({ fromLayer, onConfirm }) {
  const wallets = useContext(WalletContext);

  const [copyingAddress, setCopyingAddress] = useState(false);

  const destinationLayer = fromLayer === 'l1' ? 'l2' : 'l1';
  const dWallet = wallets[destinationLayer];

  // try to get a default wallet on mount
  useEffect(() => {
    if (dWallet && !dWallet.address) {
      dWallet.reconnect();
    }
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    if (copyingAddress && dWallet.address) {
      setCopyingAddress(false);
    }
  }, [dWallet.address, copyingAddress]);

  const copyFromExtension = useCallback(() => {
    dWallet.disconnect();
    setCopyingAddress(true);
  }, [dWallet]);

  const inputLooksGood = useMemo(() => {
    return /^0x[a-z0-9]{64}/.test(dWallet.address)  // starknet style
      || /^0x[a-zA-Z0-9]{40}/.test(dWallet.address);  // ethereum style
  }, [dWallet.address]);

  useEffect(() => ReactTooltip.rebuild(), [dWallet.walletName]);

  return (
    <Dialog onClose={() => onConfirm(false)}>
      <DialogContainer>
        <DialogTitle>Bridge to Wallet</DialogTitle>
        <DialogContent>
          <LogoContainer>
            {destinationLayer === 'l1' && <img src={EthereumLogo} alt="Ethereum" />}
            {destinationLayer === 'l2' && <img src={StarknetLogo} alt="StarkNet" />}
          </LogoContainer>

          <FancyInput onClick={copyFromExtension}>
            <div>
              {destinationLayer === 'l2' ? 'StarkNet' : 'Ethereum'} Wallet Address
            </div>
            <div>
              <input
                disabled
                type="text"
                placeholder={`Click here to copy from ${dWallet.walletName || 'browser extension'}`}
                style={{ pointerEvents: 'none' }}
                value={dWallet.address || ''} />
              <WalletConnectButton>
                <WalletIcon />
                <ChevronRightIcon />
              </WalletConnectButton>
            </div>
          </FancyInput>

          <Note isAddressSet={!!dWallet.address?.length}>
            {destinationLayer === 'l1' && `An Ethereum-compatible wallet is required for this step.`}
            {destinationLayer === 'l2' && (
              <>
                NOTE: ArgentX or another StarkNet-compatible wallet is required.<br/>
                <Clickable onClick={dWallet.openHostedConnectionModal}>
                  Install Wallet
                </Clickable>.
              </>
            )}
          </Note>

          <Warning isAddressSet={!!dWallet.address?.length}>
            WARNING: Bridging assets to the wrong address is irreversible. Always double-check.
          </Warning>

          <BrightButton
            disabled={!inputLooksGood}
            onClick={() => onConfirm(dWallet.address)}
            style={{ width: 240 }}>
            Confirm
          </BrightButton>

          {copyingAddress && !dWallet.address && (
            <WalletConnectDialog
              layer={destinationLayer}
              onClose={() => setCopyingAddress(false)} />
          )}
        </DialogContent>
      </DialogContainer>
    </Dialog>
  );
}

export default DestinationConfirm;