import _ from 'lodash';
import React from 'react';
import { PropTypes } from 'prop-types';
import cx from 'classnames';
import api from '@stackstorm/module-api';

import { Link } from 'react-router-dom';

import './style.less';

class Icon extends React.Component {
  static propTypes = {
    name: PropTypes.string.isRequired,
  }

  render() {
    return (
      <i className={cx('st2-menu__icon', this.props.name)} />
    );
  }
}

export default class Menu extends React.Component {
  static propTypes = {
    className: PropTypes.string,
    location: PropTypes.shape({
      pathname: PropTypes.string.isRequired,
    }).isRequired,
    routes: PropTypes.arrayOf(PropTypes.shape({
      title: PropTypes.string.isRequired,
      href: PropTypes.string,
      url: PropTypes.string,
      target: PropTypes.string,
      icon: PropTypes.string,
      position: PropTypes.number,
    })).isRequired,
  }

  handleDisconnect() {
    api.disconnect();
    window.location.reload();
  }

  render() {
    const { className, location, routes: allRoutes, ...props } = this.props;

    const routes = _(allRoutes)
      .filter((e) => !!e.icon)
      .sortBy((e) => e.position)
      .value()
    ;

    const user = api.token.user;
    const server = api.server;

    return (
      <header {...props} className={cx('st2-menu', className)}>
        <a href="#" className="st2-menu__logo" />

        <div className="st2-menu__spacer" />

        <div className="st2-menu__nav">
          { _.map(routes, ({ title, href, url, target, icon }) => {
            if (href) {
              return (
                <a
                  key={title}
                  className="st2-menu__nav-item"
                  href={href}
                  target={target}
                >
                  <Icon name={icon} />
                  { title }
                </a>
              );
            }

            if (url) {
              return (
                <Link
                  key={title}
                  className={cx('st2-menu__nav-item', {
                    'st2-menu__nav-item--active': location.pathname.indexOf(url) === 0,
                  })}
                  to={url}
                  target={target}
                >
                  <Icon name={icon} />
                  { title }
                </Link>
              );
            }

            return null;
          }) }
        </div>

        <div className="st2-menu__spacer" />

        <div className="st2-menu__side">
          <label className="st2-menu__side-item">
            { user || 'Stanley' }@{ server.name }
            <i className="st2-menu__icon icon-user" />
            <input type="checkbox" />
            <div className="st2-menu__side-dropdown">
              <div className="st2-menu__side-dropdown-backdrop" />
              <div
                className="st2-menu__side-dropdown-item"
                onClick={() => this.handleDisconnect()}
              >
                Sign out
              </div>
            </div>
          </label>
        </div>

        <a href="https://docs.stackstorm.com/" className="st2-menu__side">
          Docs
        </a>

        <a href="mailto:support@stackstorm.com" className="st2-menu__side" data-reamaze-lightbox="contact">
          Contact
        </a>
      </header>
    );
  }
}
