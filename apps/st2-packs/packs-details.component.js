import _ from 'lodash';
import React from 'react';
import { PropTypes } from 'prop-types';
import { connect } from 'react-redux';
import store from './store';

// import api from '@stackstorm/module-api';
import apiPacks from './api';
import notification from '@stackstorm/module-notification';
import setTitle from '@stackstorm/module-title';

import { Link } from 'react-router-dom';
import AutoForm from '@stackstorm/module-auto-form';
import Button from '@stackstorm/module-forms/button.component';
import Highlight from '@stackstorm/module-highlight';
import {
  PanelDetails,
  DetailsHeader,
  DetailsBody,
  DetailsPanel,
  DetailsButtonsPanel,
  DetailsToolbar,
  DetailsToolbarSeparator,
} from '@stackstorm/module-panel';
import St2PortionBar from '@stackstorm/module-portion-bar';
import Table from './table.component';

@connect((state) => {
  const { pack } = state;
  return { pack };
})
export default class PacksPanel extends React.Component {
  static propTypes = {
    handleInstall: PropTypes.func.isRequired,
    handleRemove: PropTypes.func.isRequired,
    handleSave: PropTypes.func.isRequired,
    handleFilterChange: PropTypes.func.isRequired,

    id: PropTypes.string,
    pack: PropTypes.object,
  }

  state = {
    config: null,
    configPreview: false,
  }

  componentDidMount() {
    const { id } = this.props;

    if (id) {
      this.fetchPack(id);
    }
  }

  componentWillReceiveProps(nextProps) {
    const { id } = nextProps;

    if (id && (id !== this.props.id)) {
      this.fetchPack(id);
    }
  }

  shouldComponentUpdate(nextProps) {
    if (nextProps.id !== this.props.id) {
      return false;
    }

    return true;
  }

  refresh() {
    const { id } = this.props;

    this.fetchPack(id);
  }

  fetchPack(id) {
    store.dispatch({
      type: 'FETCH_PACK',
      promise: apiPacks.get(id)
        .then((pack) => {
          this.setState({ config: pack.config || {} });
          return pack;
        })
        .catch((err) => {
          notification.error(`Unable to retrieve pack "${id}".`, { err });
          throw err;
        }),
    });
  }

  handleInstall() {
    const { id } = this.props;
    return this.props.handleInstall(id);
  }

  handleRemove(ref) {
    const { id } = this.props;
    return this.props.handleRemove(id);
  }

  handleSave(e) {
    e.preventDefault();

    const { id } = this.props;
    const { config } = this.state;
    return this.props.handleSave(id, config);
  }

  handleToggleConfigPreview() {
    let { configPreview } = this.state;

    configPreview = !configPreview;

    this.setState({ configPreview });
  }

  handleTagClick(word) {
    this.props.handleFilterChange(word);
  }

  get packMeta() {
    const { pack } = this.props;

    const packMeta = {
      version: pack.version,
      author: pack.author,
    };

    if (pack.installedVersion && pack.installedVersion !== pack.version) {
      packMeta.installed = pack.installedVersion;
    }

    if (pack.email) {
      packMeta.email = (
        <a href={`mailto:${pack.email}`}>{pack.email}</a>
      );
    }

    if (pack.keywords && pack.keywords.length > 0) {
      packMeta.keywords = (
        <div>
          { pack.keywords.map((word) => (
            <span
              key={word} className="st2-details__panel-body-tag"
              onClick={() => this.handleTagClick(word)}
            >
              { word }
            </span>
          )) }
        </div>
      );
    }

    if (pack.repo_url) {
      packMeta['Repo URL'] = (
        <div className="st2-details__panel-body-pocket">
          <a href={pack.repo_url} title={pack.repo_url}>{pack.repo_url}</a>
        </div>
      );
    }

    return packMeta;
  }

  render() {
    const { pack } = this.props;

    if (!pack) {
      return null;
    }

    setTitle([ pack.name, 'Packs' ]);

    return (
      <PanelDetails data-test="details">
        <DetailsHeader
          title={( <Link to={`/packs/${pack.ref}`}>{pack.name}</Link> )}
          subtitle={pack.description}
        />
        <DetailsBody>
          <DetailsPanel>
            <Table content={this.packMeta} data-test="pack_info" />
          </DetailsPanel>
          { pack.content ? (
            <DetailsPanel>
              <St2PortionBar content={_.mapValues(pack.content, 'count')} data-test="pack_content" />
            </DetailsPanel>
          ) : null }
          { pack.config_schema ? (
            <DetailsPanel data-test="pack_config" >
              <form onSubmit={(e) => this.handleSave(e)}>
                <AutoForm
                  spec={pack.config_schema}
                  data={this.state.config}
                  onChange={(config) => this.setState({ config })}
                />

                <DetailsButtonsPanel>
                  <Button flat value="Preview" onClick={() => this.handleToggleConfigPreview()} />
                  <Button submit value="Save" />
                </DetailsButtonsPanel>
                { this.state.configPreview ? (
                  <Highlight lines={20} code={this.state.config} />
                ) : null  }
              </form>
            </DetailsPanel>
          ) : null }
        </DetailsBody>
        <DetailsToolbar>
          { pack.status === 'available' ? (
            <Button small value="Install" onClick={() => this.handleInstall()} />
          ) : null }
          { pack.status === 'installing' ? (
            <Button small value="Install" disabled />
          ) : null }
          { pack.status === 'installed' ? (
            <Button small value="Remove" onClick={() => this.handleRemove()} />
          ) : null }
          { pack.status === 'uninstalling' ? (
            <Button small value="Remove" disabled />
          ) : null }
          <DetailsToolbarSeparator />
        </DetailsToolbar>
      </PanelDetails>
    );
  }
}
