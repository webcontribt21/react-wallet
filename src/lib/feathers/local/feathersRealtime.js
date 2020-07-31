import client from 'lib/feathers/local/feathersClient'
import localServices from 'lib/feathers/local/feathersServices'
import store from 'redux/store'

const appType = /issuer/.test(window.location.hostname) ? 'issuer' : 'broker'

const tokenDetailRegexp = /^\/tokens\/[a-zA-Z0-9]+\/detail$/
const shareholderDetailRegexp = /^\/tokens\/[a-zA-Z0-9]+\/shareholders\/[a-zA-Z0-9-]+\/detail$/

export default {
  init () {
    if (appType === 'broker') {

    } else {
      client.service('shareholder').on('created', data => { // TODO: optimize
        if (tokenDetailRegexp.test(window.location.pathname)) {
          const address = window.location.pathname.split('/')[2]

          store.dispatch(localServices.shareholder.find({ query: { 'ethAddresses.issues.address': address, $limit: 1 } }))
        }
      })
      client.service('shareholder').on('patched', data => { // TODO: optimize
        if (tokenDetailRegexp.test(window.location.pathname)) {
          const address = window.location.pathname.split('/')[2]

          store.dispatch(localServices.shareholder.find({ query: { 'ethAddresses.issues.address': address, $limit: 1 } }))
        }

        if (shareholderDetailRegexp.test(window.location.pathname)) {
          const id = window.location.pathname.split('/')[4]

          store.dispatch(localServices.shareholder.find({ query: { id, $limit: 1 } }))
        }
      })
      client.service('transaction').on('created', data => { // TODO: optimize
        if (tokenDetailRegexp.test(window.location.pathname)) {
          const address = window.location.pathname.split('/')[2]

          store.dispatch(localServices.transaction.find({ query: { contractAddress: address } }))
        }
      })
    }
  }
}
