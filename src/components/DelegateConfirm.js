import { useMemo, useState } from 'react';
import styled from 'styled-components';

import BrightButton from '~/components/BrightButton';
import Dialog from '~/components/Dialog';

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

const Note = styled.div`
  display: ${p => p.isAddressSet ? 'none' : 'block'};
  font-size: 80%;
  height: 32px;
  margin-bottom: 10px;
`;

const Warning = styled(Note)`
  color: orange;
  display: ${p => p.isAddressSet && p.inputLooksGood ? 'block' : 'none'};
`;

const Error = styled(Note)`
  color: red;
  display: ${p => p.inputLooksGood || !p.isAddressSet ? 'none' : 'block'};
`;

function DelegateConfirm({ onConfirm }) {
  const [address, setAddress] = useState('');

  const inputLooksGood = useMemo(() => {
    return /^0x[A-Za-z0-9]{62}/.test(address);
  }, [address]);

  return (
    <Dialog onClose={() => onConfirm(false)}>
      <DialogContainer>
        <DialogTitle>Delegate Crews</DialogTitle>
        <DialogContent>
          <FancyInput>
            <div>
              StarkNet Account Address
            </div>
            <div>
              <input
                onChange={e => setAddress(e.target.value)}
                type="text"
                placeholder="0x..."
                value={address} />
            </div>
          </FancyInput>

          <Warning inputLooksGood={inputLooksGood} isAddressSet={!!address?.length}>
            NOTE: Crews may be re-delegated at any time.
          </Warning>

          <Error inputLooksGood={inputLooksGood} isAddressSet={!!address?.length}>
            Invalid Starknet account address.
          </Error>

          <BrightButton
            disabled={!inputLooksGood}
            onClick={() => onConfirm(address)}
            style={{ width: 240 }}>
            Delegate
          </BrightButton>
        </DialogContent>
      </DialogContainer>
    </Dialog>
  );
}

export default DelegateConfirm;