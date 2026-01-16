import { useCallback, useContext, useState } from 'react';
import styled from 'styled-components';

import useStore from '~/hooks/useStore';
import DestinationConfirm from '~/components/DestinationConfirm';
import BrightButton from '~/components/BrightButton';
import WalletContext from '~/contexts/WalletContext';

const Container = styled.div`
  color: #777;
  display: flex;
  flex-direction: column;
  justify-content: flex-start;
  overflow: hidden;
  width: 100%;
`;

const Content = styled.div`
  align-items: center;
  color: #777;
  display: flex;
  flex-direction: column;
  padding: 50px 100px;
  width: 100%;
`;

const Header = styled.h2`
  color: #fff;
  text-transform: uppercase;
`;

const FancyInput = styled.div`
  background: #333;
  border: 1px solid rgba(${p => p.theme.colors.mainRGB}, 0.3);
  border-radius: 10px;
  cursor: ${p => p.theme.cursors.active};
  margin: 15px 0;
  padding: 8px 16px 2px;
  position: relative;
  text-align: left;
  transition: border-color 100ms linear;
  width: 350px;

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
    font-size: 16px;
    font-weight: thin;
    outline: 0;
    padding: 8px;
    padding-left: 0;
    width: 100%;
    &::placeholder {
      font-size: 1.15em;
    }
  }

  & input:disabled {
    color: #999;
  }

  & span {
    align-items: center;
    height: 100%;
    display: inline-flex;
    position: absolute;
    right: 10px;
    top: 0;
  }

  & span:hover {
    color: white;
    cursor: ${p => p.theme.cursors.active};
  }
`;

const Buttons = styled.div`
  display: flex;
  flex-direction: column;
  justify-content: space-between;
  height: 115px;
`;

const TransactionInfo = styled.div`
  display: flex;
  flex-direction: column;
  justify-content: space-between;
  height: 40px;
  margin-top: 20px;

  & a {
    color: #bbb;
    font-size: 14px;
  }

  & a:hover {
    color: #fff;
    text-decoration: none;
  }
`;

const explorers = {
  1: {
    l1: 'https://etherscan.io/tx',
    l2: 'https://starkscan.co/tx'
  },
  5: {
    l1: 'https://goerli.etherscan.io/tx',
    l2: 'https://testnet.starkscan.co/tx'
  },
  11155111: {
    l1: 'https://sepolia.etherscan.io/tx',
    l2: 'https://sepolia.starkscan.co/tx'
  }
};

const l2ExplorerUrl = explorers[process.env.REACT_APP_ETH_CHAIN_ID]?.l2;

const BridgeSwayEthereum = () => {
  const wallets = useContext(WalletContext);
  const createAlert = useStore(s => s.dispatchAlertLogged);

  const [amount, setAmount] = useState(0);
  const [step, setStep] = useState();
  const [txHash, setTxHash] = useState();

  const setMax = useCallback(() => {
    wallets.l2.tx.call('GET_SWAY_BALANCE').then((balance) => setAmount(balance));
  }, [wallets.l2?.tx]);

  const handleConfirmationResponse = useCallback(async (confirmedDestAddress) => {
    // If the user cancels the confirmation, reset the step
    if (confirmedDestAddress === false) {
      setStep(null);
      return;
    }

    setStep('bridging');

    if (!confirmedDestAddress || !amount) {
      setStep(null);
      createAlert({
        level: 'warning',
        content: 'Invalid destination address or amount',
        duration: 5000
      });

      return;
    }

    try {
      const txHash = await wallets.l2.tx.execute('BRIDGE_SWAY', { amount, recipient: confirmedDestAddress });
      setTxHash(txHash);
      await wallets.l2.provider.waitForTransaction(txHash);

      setStep('bridged');
      setAmount(0);
      createAlert({
        content: `Bridging ${amount.toLocaleString()} SWAY. Please return after about 12 hours to claim your SWAY on Ethereum`
      });

      setAmount(0);
    } catch (e) {
      setStep(null);
      console.log(e);
      createAlert({
        level: 'warning',
        content: 'Bridge request failed',
        duration: 5000
      });
    }
  }, [ amount, wallets.l2?.address, wallets.l2?.tx ]);

  return (
    <Container>
      <Content>
        <Header>Bridge SWAY to Ethereum</Header>
        <FancyInput>
          <div>
            Amount to Bridge
          </div>
          <div>
            <input
              disabled={step !== 'bridged' && !!step}
              type="number"
              onChange={(e) => setAmount(e.target.value)}
              value={amount} />
          </div>
          <span onClick={setMax}>MAX</span>
        </FancyInput>
        <Buttons>
          <BrightButton
            disabled={!!step || !amount}
            loading={step === 'bridging'}
            onClick={() => setStep('confirming')}
            style={{ width: 240 }}>
            Bridge
          </BrightButton>
        </Buttons>
        <TransactionInfo>
          {['bridging', 'bridged'].includes(step) && !!txHash && (
            <a href={`${l2ExplorerUrl}/${txHash}`} target="_blank" rel="noreferrer">
              View bridge transaction on Starkscan
            </a>
          )}
        </TransactionInfo>

        {step === 'confirming' && <DestinationConfirm fromLayer={'l2'} onConfirm={handleConfirmationResponse} />}
      </Content>
    </Container>
  );
};

export default BridgeSwayEthereum;
