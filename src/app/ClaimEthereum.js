import { useCallback, useContext, useEffect, useState } from 'react';
import styled from 'styled-components';

import useStore from '~/hooks/useStore';
import BrightButton from '~/components/BrightButton';
import WalletContext from '~/contexts/WalletContext';

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

const Info = styled.div`
  color: #bbb;
  line-height: 1.5em;
  margin-bottom: 20px;
`;

const ClaimEthereum = () => {
  const wallets = useContext(WalletContext);
  const createAlert = useStore(s => s.dispatchAlertLogged);

  const [claiming, setClaiming] = useState(false);
  const [claim, setClaim] = useState();

  const onConfirm = useCallback(({ proof, amount }) => {
    async function call() {
      setClaiming(true);

      try {
        const tx = await wallets.l1.tx.execute('CLAIM_TESTNET', { proof, amount });
        await tx.wait();

        setClaim(Object.assign({}, claim, { claimed: true, amount }));
        setClaiming(false);
        createAlert({
          content: `Successfully claimed ${amount.toLocaleString()} SWAY.`
        });
      } catch (e) {
        setClaiming(false);
        createAlert({
          level: 'warning',
          content: 'Claiming failed',
          duration: 5000
        });
      }
    }

    call();
  }, [ wallets.l2?.tx ]);

  useEffect(() => {
    if (wallets.l1?.address) {
      api.getSwayClaims(wallets.l1.address).then((res) => {
        setClaim(res.find((claim) => claim.phase === 'Testnet 1') || null);
      });
    }
  }, [ wallets.l1?.address ]);

  return (
    <Container>
      <Content>
        <Header>Ethereum Testnet SWAY</Header>
        {!claim && (
          <Info>{`Your account is ineligible to claim SWAY for this phase.`}</Info>
        )}
        {!!claim && claim?.claimed && (
          <Info>{`You have already claimed ${claim.amount.toLocaleString()} SWAY for this phase.`}</Info>
        )}
        {!!claim && !claim?.claimed && (
          <>
            <Info>{`Your account can claim ${claim.amount.toLocaleString()} SWAY for this phase!`}</Info>
            <BrightButton
              loading={claiming}
              onClick={() => onConfirm(claim)}
              style={{ width: 240 }}>
              Claim Now
            </BrightButton>
          </>
        )}
      </Content>
    </Container>
  );
};

export default ClaimEthereum;
