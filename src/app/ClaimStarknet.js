import { useCallback, useContext, useEffect, useMemo, useState } from 'react';
import styled from 'styled-components';

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

const LAUNCH_TIME = 1719495000e3;

const ClaimStarknet = () => {
  const wallets = useContext(WalletContext);
  const [claiming, setClaiming] = useState(false);
  const [claim, setClaim] = useState();

  const onConfirm = useCallback(({ proof, amount }) => {
    async function call() {
      setClaiming(true);

      try {
        const res = await wallets.l2.tx.execute('CLAIM_TESTNET', { proof, amount });
        if (!!res) setClaim(Object.assign({}, claim, { claimed: true }));
      } catch (e) {
        setClaiming(false);
      }
    }

    call();
  }, [ wallets.l2?.tx ]);

  const launched = useMemo(() => {
    return process.env.REACT_APP_STARKNET_CHAIN_ID === '0x534e5f5345504f4c4941' || Date.now() >= LAUNCH_TIME;
  }, []);

  useEffect(() => {
    if (wallets.l2.address) {
      api.getSwayClaims(wallets.l2.address).then((res) => {
        setClaim(res.find((claim) => claim.phase === 'Testnet 2') || null);
      });
    }
  }, [ wallets.l2?.address ]);

  return (
    <Container>
      <Content>
        <Header>Starknet Testnet SWAY</Header>
        {!launched && (
          <Info>{`SWAY claims are not available until ${(new Date(LAUNCH_TIME)).toLocaleString()}`}</Info>
        )}
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
              disabled={!launched || claiming}
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

export default ClaimStarknet;
