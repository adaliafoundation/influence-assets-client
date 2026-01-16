import { useCallback, useContext, useEffect, useState } from 'react';
import styled from 'styled-components';
import LoadingAnimation from 'react-spinners/PulseLoader';

import useStore from '~/hooks/useStore';
import WalletContext from '~/contexts/WalletContext';
import OnClickLink from '~/components/OnClickLink';
import api from '~/lib/api';

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

const Subheading = styled.h3`
  color: #ccc;
  margin: 20px 0 0 0;
`;

const TxList = styled.div`
  margin: 20px -16px 0;
  width: 400px;

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

const Highlight = styled.span`
  color: #ccc;
`;

const ReceiveSwayEthereum = () => {
  const wallets = useContext(WalletContext);
  const createAlert = useStore(s => s.dispatchAlertLogged);

  const [processing, setProcessing] = useState();
  const [pending, setPending] = useState([]);
  const [ready, setReady] = useState([]);

  const shortAddress = (address) => {
    return address && `${address.substr(0, 6)}...${address.substr(-4)}`;
  };

  const getCrossings = useCallback(async () => {
    const res = await api.getSwayCrossings(wallets.l1.address);
    const pending = [];
    const ready = [];

    res.forEach((crossing) => {
      Array.from(Array(crossing.pendingCount)).forEach(i => pending.push({
        amount: crossing.amount,
        fromAddress: crossing.fromAddress
      }));

      Array.from(Array(crossing.readyCount)).forEach(i => ready.push({
        amount: crossing.amount,
        fromAddress: crossing.fromAddress
      }));
    });

    setReady(ready);
    setPending(pending);
  }, [wallets?.l1?.address]);

  useEffect(() => getCrossings(), [getCrossings, wallets?.l1?.address]);

  const receive = useCallback(async (i) => {
    setProcessing(i);

    if (!ready[i]) {
      createAlert({
        level: 'warning',
        content: 'Invalid transfer to receive',
        duration: 5000
      });

      return;
    }

    try {
      const { amount } = ready[i];
      const tx = await wallets.l1.tx.execute('RECEIVE_SWAY', { amount, recipient: wallets.l1.address });
      await tx.wait();

      ready.splice(i, 1);
      setReady(ready);
      setProcessing(null);
      createAlert({
        content: `Received ${(Number(amount) / 1e6).toLocaleString()} SWAY.`
      });

    } catch (e) {
      setProcessing(null);
      createAlert({
        level: 'warning',
        content: 'Receiving failed',
        duration: 5000
      });
    }
  }, [ createAlert, ready, wallets.l1?.address, wallets.l1?.tx ]);

  return (
    <Container>
      <Content>
        <Header>Receive SWAY from Starknet</Header>
        {ready.length === 0 && pending.length === 0 && (<div>No pending or ready transfers.</div>)}
        {ready?.length > 0 && (
          <>
            <Subheading>Ready to Receive</Subheading>
            <TxList>
              {ready.map((r, i) => {
                return (
                  <div key={i}>
                    <div>
                      <label>
                        <Highlight>{(Number(r.amount) / 1e6).toLocaleString()} SWAY </Highlight>
                        from {shortAddress(r.fromAddress)}
                      </label>
                    </div>
                    {processing === i && (<LoadingAnimation color="gray" size={7} margin={4} />)}
                    {processing !== i && (
                      <div>
                        <OnClickLink
                          disabled={!!processing}
                          noUnderline
                          onClick={() => receive(i)}
                          themeColor='main'>
                          Receive
                        </OnClickLink>
                      </div>
                    )}
                  </div>
                );
              })}
            </TxList>
          </>
        )}
        {pending?.length > 0 && (
          <>
            <Subheading>In-Transit</Subheading>
            <TxList>
              {pending.map((p, i) => {
                return (
                  <div key={i}>
                    <div>
                      <label>
                        <Highlight>{(Number(p.amount) / 1e6).toLocaleString()} SWAY </Highlight>
                        from {shortAddress(p.fromAddress)}
                      </label>
                    </div>
                  </div>
                );
              })}
            </TxList>
          </>
        )}
      </Content>
    </Container>
  );
};

export default ReceiveSwayEthereum;
