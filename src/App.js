import { useEffect, useState } from 'react';
import styled, { createGlobalStyle } from 'styled-components';
import { ThemeProvider } from 'styled-components';
import { BrowserRouter as Router, Switch, Route } from 'react-router-dom';
import ReactTooltip from 'react-tooltip';

import Manager from '~/app/Manager';
import useServiceWorker from '~/hooks/useServiceWorker';
import useStore from '~/hooks/useStore';
import theme from '~/theme';
import Alerts from './components/Alerts';

const StyledMain = styled.main`
  bottom: 0;
  display: flex;
  min-height: 100%;
  overflow: hidden;
  position: absolute;
  top: 0;
  width: 100%;
`;

// for starknet modals
const GlobalStyle = createGlobalStyle`
  .s-dialog {
    z-index: 1010 !important;
  }
  .s-overlay {
    z-index: 1009 !important;
  }
`;

const App = (props) => {
  const { updateNeeded, onUpdateVersion } = useServiceWorker();

  const createAlert = useStore(s => s.dispatchAlertLogged);

  useEffect(() => {
    if (updateNeeded) {
      createAlert({
        content: 'A new version of the Influence Asset Manager is now available! Click here to update your experience.',
        level: 'warning',
        duration: 0,
        hideCloseIcon: true,
        onRemoval: onUpdateVersion
      });
    }
  }, [createAlert, updateNeeded, onUpdateVersion]);

  // (give metamask a chance to inject itself)
  const [ready, setReady] = useState();
  useEffect(() => {
    setTimeout(() => setReady(true), 0);
  }, []);

  if (!ready) return null;
  return (
    <ThemeProvider theme={theme}>
      <GlobalStyle />
      <Alerts />
      <Router>
        <Switch>
          <Route>
            <StyledMain>
              <Manager />
            </StyledMain>
          </Route>
        </Switch>
      </Router>
      <ReactTooltip place="left" effect="solid" />
    </ThemeProvider>
  );
};

export default App;
