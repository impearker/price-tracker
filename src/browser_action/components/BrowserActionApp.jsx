/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */

import autobind from 'autobind-decorator';
import pt from 'prop-types';
import React from 'react';
import {connect} from 'react-redux';

import {SUPPORT_URL} from 'commerce/config';
import EmptyOnboarding from 'commerce/browser_action/components/EmptyOnboarding';
import TrackedProductList from 'commerce/browser_action/components/TrackedProductList';
import {extractedProductShape, getAllProducts, productShape} from 'commerce/state/products';
import * as syncActions from 'commerce/state/sync';
import {removeMarkedProducts} from 'commerce/state/products';

import 'commerce/browser_action/components/BrowserActionApp.css';

/**
 * Base component for the entire panel. Handles loading state and whether to
 * display the empty state.
 */
@connect(
  state => ({
    products: getAllProducts(state),
  }),
  {
    loadStateFromStorage: syncActions.loadStateFromStorage,
    removeMarkedProducts,
  },
)
@autobind
export default class BrowserActionApp extends React.Component {
  static propTypes = {
    // Direct props
    extractedProduct: extractedProductShape, // Product detected on the current page, if any

    // State props
    products: pt.arrayOf(productShape).isRequired,

    // Dispatch props
    loadStateFromStorage: pt.func.isRequired,
    removeMarkedProducts: pt.func.isRequired,
  }

  static defaultProps = {
    extractedProduct: null,
  }

  constructor(props) {
    super(props);
    this.state = {
      extractedProduct: props.extractedProduct,
    };
  }

  componentDidMount() {
    this.props.loadStateFromStorage();
    window.addEventListener('unload', this.handleUnload);

    browser.runtime.onMessage.addListener((message) => {
      if (message.subject === 'extracted-product') {
        this.setState({extractedProduct: message.extractedProduct});
      }
    });
  }

  componentWillUnmount() {
    window.removeEventListener('unload', this.handleUnload);
  }

  /**
   * When the popup closes, delete any products from the store marked for removal.
   */
  handleUnload() {
    this.props.removeMarkedProducts();
  }

  /**
   * Open the support page and close the panel when the help icon is clicked.
   */
  handleClickHelp() {
    browser.tabs.create({url: SUPPORT_URL});
    window.close();
  }

  render() {
    const {products} = this.props;
    const {extractedProduct} = this.state;
    return (
      <React.Fragment>
        <div className="title-bar">
          <h1 className="title">Price Watcher List</h1>
          <button className="help-button button-ghost" type="button" onClick={this.handleClickHelp}>
            <img className="icon" src={browser.extension.getURL('img/help.svg')} alt="Help" />
          </button>
        </div>
        {products.length < 1
          ? (
            <EmptyOnboarding extractedProduct={extractedProduct} />
          )
          : (
            <TrackedProductList products={products} extractedProduct={extractedProduct} />
          )}
      </React.Fragment>
    );
  }
}
