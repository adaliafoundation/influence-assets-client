import { BsChevronDoubleRight } from 'react-icons/bs';
import {
  MdAccountBalanceWallet,
  MdArrowDropDown,
} from 'react-icons/md';
import { RiLoginCircleFill, RiAlertFill } from 'react-icons/ri';
import { VscDebugDisconnect } from 'react-icons/vsc';

import SwaySVG from '~/assets/icons/SwayIcon.svg';
import SwayMonochromeSVG from '~/assets/icons/SwayMonoIcon.svg';

export const SwayIcon = () => <SwaySVG className="icon" />;
export const SwayMonochromeIcon = () => <SwayMonochromeSVG className="icon" />;

export {
  MdArrowDropDown as CaretIcon,
  BsChevronDoubleRight as ConnectionIcon,
  VscDebugDisconnect as DisconnectIcon,
  RiLoginCircleFill as LoginIcon,
  MdAccountBalanceWallet as WalletIcon,
  RiAlertFill as WarningIcon,
};
