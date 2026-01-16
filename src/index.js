import { Suspense } from 'react';
import ReactDOM from 'react-dom';
import { QueryClient, QueryClientProvider } from 'react-query';
import { Web3ReactProvider } from '@web3-react/core';
import LoadingAnimation from 'react-spinners/PropagateLoader';
import styled from 'styled-components';

import App from './App';
import connectors from './lib/blockchain/connectors';
import './index.css';
import reportWebVitals from './reportWebVitals';
import * as serviceWorkerRegistration from './serviceWorkerRegistration';

// polyfill buffer for walletconnect
window.Buffer = window.Buffer || require('buffer').Buffer;

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      refetchOnMount: false,
      staleTime: 60000 * 5
    }
  }
});

const Loader = styled.div`
  align-items: center;
  background-color: black;
  display: flex;
  height: 100%;
  justify-content: center;
  position: absolute;
  width: 100%;
  z-index: 10000;
`;

ReactDOM.render(
  <Suspense fallback={<Loader><LoadingAnimation color={'white'} loading={true} /></Loader>}>
    <Web3ReactProvider connectors={connectors}>
      <QueryClientProvider client={queryClient} contextSharing={true}>
        <App />
      </QueryClientProvider>
    </Web3ReactProvider>
  </Suspense>,
  document.getElementById('root')
);

// listen for installprompt (should keep this before serviceworker registration)
window.addEventListener('beforeinstallprompt', (e) => {
  e.preventDefault();
  window.installPrompt = e;
});

// Learn more about service workers: https://cra.link/PWA
serviceWorkerRegistration.register();

// If you want to start measuring performance in your app, pass a function
// to log results (for example: reportWebVitals(console.log))
// or send to an analytics endpoint. Learn more: https://bit.ly/CRA-vitals
reportWebVitals();
