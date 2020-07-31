import { connect } from 'react-redux'
import { each } from 'bluebird'
import localServices from 'lib/feathers/local/feathersServices'
import SettingsView from './SettingsView'
import ethereum from 'lib/ethereum'
import constants from 'app_constants'

const walletConstants = constants.walletConstants

const mapStateToProps = state => ({
  appType: state.config.appType,
  connected: state.wallet.connected,
  showConnectionAlert: state.wallet.showConnectionAlert,
  currentUser: state.currentUser,
  tokens: state.token.queryResult ? state.token.queryResult.data : [],
  watchingTokens: state.localToken.queryResult ? state.localToken.queryResult.data : [],
  loaded: state.currentUser.id && state.localToken.isFinished && state.token.isFinished
})

const mapDispatchToProps = (dispatch, ownProps) => {
  return {
    connectWallet (account, password) {
      return ethereum.init({ account, password })
        .then(() => {
          dispatch(localServices.user.patch(null, { walletAccountName: account }, { query: { email: 'local@local.com' } }))
          dispatch({ type: walletConstants.SHOW_CONNECTION_ALERT, payload: true })
        })
    },
    startWatchingToken (token) {
      return dispatch(localServices.localToken.create(token))
        .then(() => dispatch(localServices.localToken.find()))
    },
    stopWatchingToken (token) {
      return dispatch(localServices.localToken.remove(null, { query: { address: token.address } }))
        .then(() => dispatch(localServices.localToken.find()))
    },
    setMessagingAddress (messagingAddress, tokens) {
      return each(tokens, token => ethereum.setMessagingAddress(messagingAddress, token.address))
        .then(() => localServices.user.patch(null, { messagingAddress }, { query: { email: 'local@local.com' } }))
    },
    dismissConnectionMessage () {
      dispatch({ type: walletConstants.SHOW_CONNECTION_ALERT, payload: false })
    }
  }
}

export default connect(mapStateToProps, mapDispatchToProps)(SettingsView)
