import { useCallback, useContext, useEffect, useMemo, useState } from 'react';
import styled from 'styled-components';

import BrightButton from '~/components/BrightButton';
import WalletContext from '~/contexts/WalletContext';

import { Address } from '@influenceth/sdk';

const Container = styled.div`
  color: #777;
  display: flex;
  flex-direction: column;
  height: calc(100vh - 175px);
  justify-content: flex-start;
  overflow: hidden;
  width: 100%;

  & a {
    color: white;
  }

  & a:hover {
    text-decoration: none;
  }
`;

const BeneficiaryInfo = styled.div`
  align-self: flex-start;
  padding: 20px 0;

  & a {
    margin-left: 10px;
    text-overflow: ellipsis;
  }
`;

const Content = styled.div`
  align-items: center;
  color: #777;
  display: flex;
  flex-direction: column;
  padding: 20px 100px;
  width: 100%;
`;

const Header = styled.h2`
  color: #fff;
  text-transform: uppercase;
`;

const Info = styled.div`
  line-height: 1.5em;
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
`;

const Success = styled.div`
  line-height: 1.5em;

  & a {
    color: #fff;
    margin-left: 5px;
  }
`;

const Designate = () => {
  const wallets = useContext(WalletContext);

  const [designee, setDesignee] = useState('');
  const [complete, setComplete] = useState(false);
  const [txHash, setTxHash] = useState(null);
  const [designated, setDesignated] = useState('');

  const inputLooksGood = useMemo(() => {
    if (designee.length < 64) return false;

    try {
      Address.toStandard(designee, 'starknet');
      return true;
    } catch (e) {
      return false;
    }
  }, [designee]);

  const onConfirm = useCallback((designee) => {
    async function call() {
      const res = await wallets.l2.tx.execute('DESIGNATE', { designee });

      if (!!res) {
        setComplete(true);
        setTxHash(res);
        setDesignee('');
      }
    }

    call();
  }, [ wallets.l2?.tx ]);

  useEffect(() => {
    if (wallets.l2.address) {
      wallets.l2.tx.call('GET_DESIGNEE', { designator: wallets.l2.address }).then((res) => {
        setDesignated(Address.toStandard(res));
      });
    }
  }, [wallets.l2]);

  return (
    <Container>
      <Content>
        <Header>Designate Beneficiary</Header>
        {designated && BigInt(designated) > 0n && (
          <>
            <BeneficiaryInfo>Current beneficiary:
              <a href={`https://starkscan.co/contract/${designated}`} target="_blank" rel="noreferrer">{designated}</a>
            </BeneficiaryInfo>
            <Info>
              {`Your account has already designated a beneficiary. You can update your designee at any time prior to Exploitation launch.`}
            </Info>
          </>
        )}
        {!designated && (
          <Info>Designate a Starknet Mainnet account address to receive SWAY claims from your testnet participation:</Info>
        )}
        <FancyInput>
          <div>
            Starknet Mainnet Account Address
          </div>
          <div>
            <input
              type="text"
              onChange={(e) => setDesignee(e.target.value)}
              placeholder={"0x..."}
              value={designee} />
          </div>
        </FancyInput>
        {!complete && (
          <BrightButton
            disabled={!inputLooksGood}
            onClick={() => onConfirm(designee)}
            style={{ width: 240 }}>
            Confirm
          </BrightButton>
        )}
        {complete && (
          <Success>
            {`Designee has been successfully set! You can update your designee at any time prior to
            the conclusion of pre-release.`}
            <a href={`https://sepolia.starkscan.co/tx/${txHash}`} target="_blank" rel="noreferrer">
              View Transaction
            </a>
          </Success>
        )}
      </Content>
    </Container>
  );
};

export default Designate;
