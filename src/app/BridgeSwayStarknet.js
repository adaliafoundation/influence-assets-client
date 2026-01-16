import { useCallback, useContext, useEffect, useState } from 'react';
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

const Info = styled.div`
  color: #bbb;
  line-height: 1.5em;
  margin-bottom: 20px;
`;

const explorers = {
  1: {
    l1: 'https://etherscan.io/tx',
    l2: 'https://starkscan.co/eth-tx'
  },
  5: {
    l1: 'https://goerli.etherscan.io/tx',
    l2: 'https://testnet.starkscan.co/eth-tx'
  },
  11155111: {
    l1: 'https://sepolia.etherscan.io/tx',
    l2: 'https://sepolia.starkscan.co/eth-tx'
  }
};

const l1ExplorerUrl = explorers[process.env.REACT_APP_ETH_CHAIN_ID]?.l1;
const l2ExplorerUrl = explorers[process.env.REACT_APP_ETH_CHAIN_ID]?.l2;

const BridgeSwayStarknet = () => {
  const wallets = useContext(WalletContext);
  const createAlert = useStore(s => s.dispatchAlertLogged);

  const [amount, setAmount] = useState(0);
  const [approved, setApproved] = useState(0);
  const [step, setStep] = useState();
  const [txHash, setTxHash] = useState();
  const [launched, setLaunched] = useState(true);

  const approve = useCallback(async () => {
    setStep('approving');

    try {
      const tx = await wallets.l1.tx.execute('APPROVE_SWAY', {
        amount,
        spender: process.env.REACT_APP_ETHEREUM_SWAY_BRIDGE
      });

      setTxHash(tx.hash);
      await tx.wait();

      setStep('approved');
      setApproved(amount);
      createAlert({
        content: `Approved ${amount.toLocaleString()} SWAY for bridging`
      });
    } catch (e) {
      console.error(e);
      setStep(null);
      createAlert({
        level: 'warning',
        content: 'Approval failed',
        duration: 5000
      });
    }
  }, [amount, createAlert]);

  useEffect(() => {
    const checkIfLaunched = async () => {
      const swayLaunched = await wallets.l1.tx.call('SWAY_LAUNCHED');

      if (!swayLaunched) {
        const transferrer = await wallets.l1.tx.call('IS_TRANSFERRER');
        setLaunched(transferrer);
      } else {
        setLaunched(swayLaunched);
      }
    };

    checkIfLaunched();
  }, [wallets.l1?.tx]);

  const setMax = useCallback(() => {
    wallets.l1.tx.call('GET_SWAY_BALANCE').then((balance) => setAmount(balance));
  }, [wallets.l1?.tx]);

  const handleConfirmationResponse = useCallback(async (confirmedDestAddress) => {
    setStep('bridging');

    if (!confirmedDestAddress || !amount || amount > approved) {
      setStep(null);
      setApproved(0);
      createAlert({
        level: 'warning',
        content: 'Invalid destination address or amount',
        duration: 5000
      });

      return;
    }

    const l1BridgeAddress = process.env.REACT_APP_ETHEREUM_SWAY_BRIDGE;
    const l2BridgeAddress = process.env.REACT_APP_STARKNET_SWAY_TOKEN;
    const payload = { amount, recipient: confirmedDestAddress };

    const messageFee = await wallets.l2.tx.call('ESTIMATE_L1_L2_MESSAGE_FEE', {
      l1Address: l1BridgeAddress,
      l2Address: l2BridgeAddress,
      entrypoint: 'handle_deposit',
      payload: [ confirmedDestAddress, (payload.amount * 1e6).toString(), '0', wallets.l1.address ]
    });

    payload.messageFee = messageFee?.overall_fee;

    try {
      const tx = await wallets.l1.tx.execute('BRIDGE_SWAY', payload);

      setTxHash(tx.hash);
      await tx.wait();

      setStep('bridged');
      setApproved(0);
      setAmount(0);
      createAlert({
        content: `Bridging ${amount.toLocaleString()} SWAY. Please allow several minutes for processing`
      });

      setAmount(0);
    } catch (e) {
      setStep('approved');
      createAlert({
        level: 'warning',
        content: 'Bridge request failed',
        duration: 5000
      });
    }
  }, [ amount, approved, wallets.l1?.address, wallets.l1?.tx, wallets.l2?.tx ]);

  return (
    <Container>
      <Content>
        <Header>Bridge SWAY to Starknet</Header>
        {!launched && (<Info>SWAY bridge is not yet launched</Info>)}
        {launched && (
        <>
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
              loading={step === 'approving'}
              onClick={() => approve()}
              style={{ width: 240 }}>
              1. Approve
            </BrightButton>
            <BrightButton
              disabled={step !== 'approved'}
              loading={step === 'bridging'}
              onClick={() => setStep('confirming')}
              style={{ width: 240 }}>
              2. Bridge
            </BrightButton>
          </Buttons>
          <TransactionInfo>
            {['approving', 'approved'].includes(step) && !!txHash && (
              <a href={`${l1ExplorerUrl}/${txHash}`} target="_blank" rel="noreferrer">
                View approve transaction on Etherscan
              </a>
            )}
            {['bridging', 'bridged'].includes(step) && !!txHash && (
              <>
                <a href={`${l1ExplorerUrl}/${txHash}`} target="_blank" rel="noreferrer">
                  View bridge transaction on Etherscan
                </a>
                <a href={`${l2ExplorerUrl}/${txHash}`} target="_blank" rel="noreferrer">
                  View bridge transaction on Starkscan
                </a>
              </>
            )}
          </TransactionInfo>

          {step === 'confirming' && <DestinationConfirm fromLayer={'l1'} onConfirm={handleConfirmationResponse} />}
        </>
        )}
      </Content>
    </Container>
  );
};

export default BridgeSwayStarknet;
