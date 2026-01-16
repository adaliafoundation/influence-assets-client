import { useCallback, useContext, useEffect, useMemo, useState } from 'react';
import styled from 'styled-components';
import {
  FaCheckCircle as CheckedIcon,
  FaArrowRight as ArrowIcon,
  FaArrowRight as UncheckedIcon
} from 'react-icons/fa';
import {
  BsExclamationOctagon as TitleIcon
} from 'react-icons/bs';
import LoadingIcon from 'react-spinners/PuffLoader';
import { Address } from '@influenceth/sdk';

import Button from '~/components/Button';
import Dialog from '~/components/Dialog';
import WalletConnectDialog from '~/components/WalletConnectDialog';
import WalletContext from '~/contexts/WalletContext';
import useStore from '../hooks/useStore';

const Container = styled.div`
  padding: 25px 40px;
  max-width: 95vw;
  width: 600px;
  & h3 {
    margin: 0 0 10px;
  }
  & > p {
    margin: 0;
    font-size: 85%;
    line-height: 1.25em;
  }
  a {
    color: white;
    opacity: 0.9;
    text-decoration: underline;
    &:hover {
      opacity: 1;
    }
  }
`;

const Steps = styled.div`
  background: #111;
  border: solid ${p => p.theme.colors.main};
  border-width: 2px 0;
  margin: 20px 0;
  padding: 20px;
`;

const StepBody = styled.div`
  display: flex;
  flex-direction: row;
  justify-content: space-between;
  font-size: 90%;
  overflow: hidden;
  max-height: 0;
  padding-top: 0;
  transition: max-height 300ms linear, padding-top 300ms linear;

  ${p => p.step === 2 && `
    @media (max-width: 540px) {
      display: none;
    }
  `}
`;

const Wait = styled.span`
  background: ${p => p.theme.colors.error};
  border-radius: 10px;
  font-size: 75%;
  line-height: 1.4em;
  padding: 0 8px;
  @media (max-width: 600px) {
    display: none !important;
  }
`;
const Substep = styled.div`
  opacity: ${p => p.active ? 1 : 0.25};
  & ${Wait} {
    ${p => p.active ? '' : 'filter: grayscale(100%);'}
  }
`;


const Step = styled.div`
  align-items: center;
  display: flex;
  flex-direction: row;
  line-height: 1.25em;
  opacity: ${p => p.status === 'current' ? 1 : 0.25};
  & > div:first-child {
    color: ${p => p.status === 'current' ? p.theme.colors.main : '#999'};
    line-height: 0;
    text-align: center;
    width: 50px;
    & > span {
      display: inline-block;
    }
  }
  & > div:last-child {
    flex: 1;
  }

  &:not(:last-child) {
    margin-bottom: 20px;
  }

  & ${StepBody} {
    ${p => p.status === 'current' && `
      max-height: 100px;
      padding-top: 8px;
    `}
  }
`;
const StepNumber = styled.div`

`;
const StepContent = styled.div``;
const StepTitle = styled.div`
  font-weight: bold;
`;
const Note = styled.p`
  opacity: 0.5;
`;

const loadingIcon = <LoadingIcon color="currentColor" size={24} />;

const L2L1Dialog = ({ handleComplete, onClose, status, l1Address }) => {
  const wallets = useContext(WalletContext);
  const l2l1DelayEstimate = useStore(s => s.l2l1DelayEstimate);

  const [reconnecting, setReconnecting] = useState(false);

  const currentStep = ['ACCEPTED_ON_L1', 'STUCK_ON_L1'].includes(status) ? 3 : 2;

  const tryToComplete = useCallback((noReconnect) => {
    if (wallets.l1.address && Address.areEqual(wallets.l1.address, l1Address)) {
      setTimeout(() => handleComplete(), 0);
    } else if (wallets.l1.address) {
      wallets.l1.disconnect();
      if (!noReconnect) setReconnecting(true);
    } else {
      wallets.l1.reconnect((acct) => {
        if (acct && Address.areEqual(acct, l1Address)) {
          setTimeout(handleComplete, 0);
        } else {
          wallets.l1.disconnect();
          if (!noReconnect) setReconnecting(true);
        }
      }, l1Address);
    }
  }, [handleComplete, l1Address, wallets.l1.address]); // eslint-disable-line react-hooks/exhaustive-deps

  const reattemptCompletion = useCallback(() => {
    setReconnecting(false);
    tryToComplete(true);
  }, [tryToComplete]);


  // automatically try to finish if currentStep just changed to last step
  // not sure why the delay is necessary, but it seems to be
  useEffect(() => {
    if (currentStep === 3 && wallets.l1.address) {
      setTimeout(() => handleComplete(), 1000);
    }
  }, [currentStep]);  // eslint-disable-line react-hooks/exhaustive-deps

  const l2l1DelayEstimatePretty = useMemo(() => {
    if (l2l1DelayEstimate) {
      return Math.ceil(2 * l2l1DelayEstimate / 3600) / 2;
    }
    return 6;
  }, [l2l1DelayEstimate]);

  return (
    <>
      <Dialog onClose={currentStep < 3 ? onClose : null}>
        <Container>
          <h3>
            <TitleIcon style={{ float: 'right' }} /> Attention
          </h3>
          <p>
            Bridging from Starknet to Ethereum takes up to several hours and will require an additional
            Ethereum transaction to complete (
              <a
                href="https://wiki.influenceth.io/en/docs/user-guides/bridging"
                target="_blank"
                rel="noreferrer">
                read more
              </a>
            ). Follow along below, and watch for the prompts to complete the process:
          </p>
          <Steps>
            <Step status={'done'}>
              <StepNumber>
                <CheckedIcon />
              </StepNumber>
              <StepContent>
                <StepTitle>Approve assets bridging from your L2 wallet</StepTitle>
              </StepContent>
            </Step>
            <Step status={currentStep === 2 ? 'current' : 'done'}>
              <StepNumber>
                {currentStep === 2 ? loadingIcon : <CheckedIcon />}
              </StepNumber>
              <StepContent>
                <StepTitle>Wait for assets to arrive on L1 side of bridge</StepTitle>
                <StepBody step={2}>
                  <Substep active={status === 'RECEIVED'}>Pending <Wait>~1 min</Wait></Substep>
                  <Substep><ArrowIcon /></Substep>
                  <Substep active={status === 'ACCEPTED_ON_L2'}>Confirmed on L2 <Wait>~{l2l1DelayEstimatePretty}+ hr</Wait></Substep>
                  <Substep><ArrowIcon /></Substep>
                  <Substep active={status === 'ACCEPTED_ON_L1'}>Confirmed on L1</Substep>
                </StepBody>
              </StepContent>
            </Step>
            <Step status={currentStep === 3 ? 'current' : 'todo'}>
              <StepNumber>
                {currentStep === 3 ? <UncheckedIcon /> : '—'}
              </StepNumber>
              <StepContent>
                <StepTitle>Approve assets bridging into your L1 wallet</StepTitle>
                <StepBody style={{ justifyContent: 'center' }}>
                  <Button
                    disabled={status !== 'STUCK_ON_L1'}
                    onClick={() => tryToComplete()}
                    style={{ marginTop: 0 }}>
                    Approve on L1
                  </Button>
                </StepBody>
              </StepContent>
            </Step>
          </Steps>

          <Note>
            <b>Note</b>: If you are disconnected during this process, reconnect to
            the Bridge with your Ethereum wallet and you will be automatically
            prompted to finalize the transfer of your assets.
          </Note>
        </Container>
      </Dialog>
      {reconnecting && (
        <WalletConnectDialog
          layer="l1"
          onClose={reattemptCompletion}
          targetAddress={l1Address} />
      )}
    </>
  );
};

export default L2L1Dialog;