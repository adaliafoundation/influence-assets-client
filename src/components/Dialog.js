import React from 'react';
import styled, { keyframes } from 'styled-components';
import { MdClose as CloseIcon } from 'react-icons/md';

const fadeIn = keyframes`
  0% { opacity: 0; }
  100% { opacity: 1; }
`;

const Backdrop = styled.div`
  animation: ${fadeIn} 200ms linear 1;
  backdrop-filter: blur(1.5px);
  pointer-events: auto;
  position: fixed;
  top: 0;
  right: 0;
  left: 0;
  bottom: 0;
  background-color: ${p => p.theme.colors.contentBackdrop};
  z-index: 88; /* walletconnect modal is 89 */
  display: flex;
  align-items: center;
  justify-content: center;
`;

const Modal = styled.div`
  background: rgba(0, 0, 0, 0.95);
  border: 1px solid #777;
  border-radius: 8px;
  color: white;
  min-width: 300px;
  min-height: 200px;
  max-width: 90%;
  max-height: 90%;
  outline: 18px solid rgba(255, 255, 255, 0.1);
  overflow: auto;
  position: relative;
`;

const CloseButton = styled.div`
  cursor: ${p => p.theme.cursors.active};
  position: absolute;
  top: 10px;
  right: 10px;
`;

const Dialog = (props) => (
  <Backdrop style={props.backdropStyles || {}}>
    <Modal style={props.modalStyles || {}}>
      {props.onClose && <CloseButton onClick={props.onClose}><CloseIcon /></CloseButton>}
      {props.children}
    </Modal>
  </Backdrop>
);

export default Dialog;