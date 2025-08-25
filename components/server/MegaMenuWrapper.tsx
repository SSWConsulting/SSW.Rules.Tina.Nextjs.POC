"use client";

import classNames from "classnames";
import { MegaMenuLayout } from "ssw.megamenu";
import useAppInsights from '../hooks/useAppInsights';
import Tooltip from '../tooltip/tooltip';
// import GPTIcon from '-!svg-react-loader!../../public/chatgpt_icon.svg';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import {
  faPlusCircle,
  faQuestionCircle,
} from '@fortawesome/free-solid-svg-icons';
import SignIn from "../auth/SignIn";

export function MegaMenuWrapper(props) {
  return (
    <MegaMenuLayout
      title="Rules"
      menuBarItems={props.menu}
      subtitle='Secret ingredients to quality software'
      rightSideActionsOverride={() => <ActionButtons />}
      linkComponent={({ className, children, ...props }) => (
        <a {...props} className={classNames('unstyled', className)}>
          {children}
        </a>
      )}
      url="/rules"
      searchUrl="https://www.ssw.com.au/rules"
    />
  );
}

const ActionButtons = () => {
  const { trackEvent } = useAppInsights();

  return (
    <div className="action-btn-container max-sm:order-2 flex justify-items-end align-middle">
      <Tooltip text="Try out RulesGPT" showDelay={3000} hideDelay={18000}>
        <a
          target="_blank"
          rel="noopener noreferrer"
          href="https://rulesgpt.ssw.com.au"
          className="action-btn-link-underlined"
          onClick={() => {
            trackEvent('RulesGPTButtonPressed');
          }}
        >
          {/* <GPTIcon className="group group-hover:[&>circle]:fill-ssw-red" /> */}
        </a>
      </Tooltip>

      <Tooltip text="Create an SSW Rule">
        <a
          target="_blank"
          rel="noopener noreferrer"
          href={`/rules/admin/#/collections/rule/new`}
          className="action-btn-link-underlined"
        >
          <FontAwesomeIcon
            icon={faPlusCircle}
            className="header-icon"
            size="2x"
          />
        </a>
      </Tooltip>

      <Tooltip text="SSW Rules wiki">
        <a
          target="_blank"
          rel="noopener noreferrer"
          href="https://github.com/SSWConsulting/SSW.Rules.Content/wiki"
          className="action-btn-link-underlined"
        >
          <FontAwesomeIcon
            icon={faQuestionCircle}
            className="header-icon"
            size="2x"
          />
        </a>
      </Tooltip>
      <SignIn />
    </div>
  );
};