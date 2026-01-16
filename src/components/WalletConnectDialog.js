import { useContext, useEffect, useState } from 'react';
import LoadingAnimation from 'react-spinners/PulseLoader';
import styled from 'styled-components';
import { Address } from '@influenceth/sdk';

import Button from '~/components/Button';
import Dialog from '~/components/Dialog';
import { ConnectionIcon, WarningIcon } from '~/components/Icons';
import WalletContext from '~/contexts/WalletContext';

const Container = styled.div`
  align-items: center;
  display: flex;
  flex: 1;
  flex-direction: column;
  width: 500px;
`;

const TitleBar = styled.div`
  border-bottom: 1px solid #444;
  font-size: 22px;
  font-weight: normal;
  margin-bottom: 20px;
  padding-bottom: 20px;
  text-align: center;
  text-transform: uppercase;
  width: 100%;
`;

const TargetAddress = styled.span`
  color: #df4300; /* matches indicator */
  display: block;
  font-size: 80%;
  font-weight: bold;
  text-align: center;
`;

const Controls = styled.div`
  display: flex;
  flex: 0 0 auto;
  flex-direction: column;

  & > * {
    margin-right: 10px;
    &:first-child {
      margin-top: 0;
    }
    & > svg:first-child {
      height: 24px;
      width: 24px;
    }
  }
`;

const Info = styled.div`
  align-items: center;
  color: #AAA;
  display: flex;
  margin-bottom: 20px;
`;

const Error = styled.div`
  align-items: center;
  display: flex;
  justify-content: center;
  margin-bottom: 20px;
  & svg {
    vertical-align: middle;
  }
`;

const StyledErrorIcon = styled(WarningIcon)`
  color: ${p => p.theme.colors.error};
  height: 20px;
  margin-right: 5px;
  width: 20px;
`;

const WalletConnectDialog = ({ autoconnect, layer, targetAddress, onClose }) => {
  const wallets = useContext(WalletContext);
  const {
    address,
    connectionOptions,
    disconnect,
    error,
    isConnecting,
    isInstalling,
    openHostedConnectionModal,
    reconnect
  } = wallets[layer];

  const [initializing, setInitializing] = useState(true);
  useEffect(() => {
    if (!targetAddress && autoconnect) {
      reconnect();
    }
    setInitializing(false);
  }, [autoconnect, targetAddress]); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    if (address && !error) {
      if (!targetAddress || Address.areEqual(address, targetAddress)) {
        onClose();
      } else {
        disconnect();
      }
    }
  }, [address, !error, onClose, targetAddress]); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    const tryConnection = async () => {
      const result = await openHostedConnectionModal();
      if (result === null) onClose(); // User closed the modal
    };

    if (openHostedConnectionModal) tryConnection();
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  // if isConnecting or address, show loading
  const addressIsLoading = address && (!targetAddress || Address.areEqual(address, targetAddress));
  const showLoading = initializing || addressIsLoading || isConnecting;
  return (
    <Dialog
      modalStyles={{
        alignItems: 'center',
        display: layer === 'l2' && !error ? 'none' : 'flex',
        padding: '24px 40px 40px'
      }}
      onClose={onClose}>
      <Container>
        <TitleBar>
          Connect Wallet
        </TitleBar>
        {showLoading && <LoadingAnimation color="white" />}
        {!showLoading && (
          <>
            {(targetAddress || !error) && (
              <Info>
                {/* <Indicator>●</Indicator> */}
                {targetAddress
                  ? <span>Please reconnect to the following {layer === 'l2' ? 'Starknet' : 'Ethereum'} Wallet to continue: <TargetAddress>{targetAddress}</TargetAddress></span>
                  : <span>Please connect an {layer === 'l2' ? 'Starknet' : 'Ethereum'} wallet to continue.</span>
                }
              </Info>
            )}
            {error && (
              <Error>
                <span><StyledErrorIcon /></span>
                <span>Connection Error: {error}</span>
              </Error>
            )}
            {isInstalling && (
              <Error>
                <span><StyledErrorIcon /></span>
                <span>After installing a new extension, please perform a hard-refresh on the page and try again.</span>
              </Error>
            )}
            <Controls>
              {connectionOptions.map(({ label, logo, dataTip, onClick, showCaret, ...props }) => (
                <Button
                  key={label}
                  dataTip={dataTip}
                  dataPlace="left"
                  onClick={onClick}
                  showCaret={showCaret}
                  style={{ width: 230 }}
                  {...props}>
                  {logo} {label}
                </Button>
              ))}
              {layer === 'l2' && error && (
                <Button
                  onClick={openHostedConnectionModal}
                  style={{ justifyContent: 'center', width: 230 }}>
                  <ConnectionIcon style={{ display: 'none' }} />
                  Click to Connect...
                </Button>
              )}
            </Controls>
          </>
        )}
      </Container>
    </Dialog>
  );
};

export default WalletConnectDialog;
