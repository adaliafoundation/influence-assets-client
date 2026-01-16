import { useEffect } from 'react';
import styled from 'styled-components';
import { ReactNotifications, Store as notify } from 'react-notifications-component';
import 'react-notifications-component/dist/theme.css';
import 'animate.css';
import {
  RiChat4Fill as InfoIcon,
  RiAlertFill as WarningIcon,
} from 'react-icons/ri';

import useStore from '~/hooks/useStore';

const defaults = {
  type: 'info',
  insert: 'top',
  container: 'top-center',
  // container: 'top-left',
  dismiss: { duration: 0, pauseOnHover: true, onScreen: true, showIcon: true },
  animationIn: ['animate__animated animate__fadeIn'],
  animationOut: ['animate__animated animate__fadeOut']
};

/**
 * Sends a notification and requires only a message (additional options can be provided)
 * @param message A string message to display in the notification
 * @param options An object specifcying default overrides or additional options
 */
const send = (message, options = {}) => {
  try {
    options.message = message;
    const mergedOptions = Object.assign({}, JSON.parse(JSON.stringify(defaults)), options);
    notify.addNotification(mergedOptions);
  } catch (e) {
    console.error(e);
  }
};

const StyledReactNotification = styled(ReactNotifications)`
  & .rnc__notification-container--top-center {
    top: 0 !important;
  }

  & .rnc__notification-item {
    background-color: rgba(0, 0, 0, 0.85);
    border-color: ${p => p.theme.colors.main};
    border-radius: 0;
    border-width: 6px;
    cursor: ${p => p.theme.cursors.active};
    min-height: 100px;
    display: flex;
    flex-direction: column;
    justify-content: center;

    width: 425px;
  }

  & .rnc__notification-item.rnc__notification-item--warning {
    border-color: ${p => p.theme.colors.error};
    & svg {
      color: ${p => p.theme.colors.error};
    }
  }

  & .rnc__notification-close-mark {
    background-color: transparent !important;
  }

  & .rnc__notification-close-mark:after {
    font-size: 20px !important;
  }

  @media (max-width: ${p => p.theme.breakpoints.mobile}px) {
    & .rnc__notification-item {
      background-color: black;
      width: 325px;
    }
  }
}
`;

const LogEntryItem = styled.li`
  align-items: center;
  color: ${p => p.theme.colors.mainText};
  display: flex;
  font-size: ${p => p.theme.fontSizes.mainText};
  margin: 12px 0;

  & > * {
    padding: 0 5px;
    &:first-child,
    &:last-child {
      padding: 0;
    }
  }
`;

const Icon = styled.div`
  color: ${p => p.theme.colors.main};
  flex: 0 0 1em;
  font-size: 20px;
  margin-left: 5px;
  margin-right: 15px;
`;

const Description = styled.div`
  flex: 1;
  & a {
    color: ${p => p.theme.colors.mainText};
    display: inline-block;
    text-overflow: ellipsis;
    max-width: 100px;
    overflow: hidden;
    vertical-align: top;
    white-space: nowrap;
  }
`;

const defaultIcons = {
  info: <InfoIcon />,
  warning: <WarningIcon />,
}
const Alerts = (props) => {
  const alerts = useStore(s => s.alerts);
  const notifyAlert = useStore(s => s.dispatchAlertNotified);

  useEffect(() => {
    if (alerts?.length === 0) return;
    alerts
      .filter(a => !a.notified)
      .forEach(a => {
        const { content, duration, hideCloseIcon, hideIcon, icon, level, onRemoval, ...params } = a;
        const options = { ...params };
        if (level) options.type = level;
        if (duration) options.dismiss = { duration: duration };
        if (hideCloseIcon) {
          options.dismiss = {
            ...(options.dismiss || defaults.dismiss),
            showIcon: false
          };
        }
        if (onRemoval) options.onRemoval = onRemoval;
        send((
          <LogEntryItem>
            {!hideIcon && <Icon>{icon || defaultIcons[level || 'info']}</Icon>}
            <Description>
              {typeof content === 'string' ? <span>{content}</span> : content}
            </Description>
          </LogEntryItem>
        ), options);

        notifyAlert(a);
      });
  }, [ alerts, notifyAlert ]);

  return (
    <StyledReactNotification />
  );
}

export default Alerts;
