import Web3 from 'web3'
import Web3ProviderEngine from 'web3-provider-engine'
import Web3Subprovider from 'web3-provider-engine/subproviders/web3'
import { promisifyAll } from 'bluebird'
import store from 'redux/store'

import whitelistContract from 'lib/contracts/IssuanceWhiteList'
import regDWhitelistContract from 'lib/contracts/RegulationDWhiteList'
import tokenContract from 'lib/contracts/RegulatedToken'
import regulatorServiceContract from 'lib/contracts/AboveboardRegDSWhitelistRegulatorService'
import constants from 'app_constants'

let web3
let currentAccount

export default {
  init ({
    walletHost = process.env.REACT_APP_WALLET_HOST || 'https://kovan.infura.io/V7nB2kBfEei6IhVFeI7W',
    walletPort = process.env.REACT_APP_WALLET_PORT || '443',
    mnemonic,
    account,
    password
  }) {
    const providerEngine = new Web3ProviderEngine()
    const walletConstants = constants.walletConstants

    if (window.web3 && window.web3.currentProvider) {
      const currentProvider = new Web3(window.web3.currentProvider)

      promisifyAll(currentProvider.eth)

      const injectedWeb3Provider = {
        setEngine () {},
        handleRequest (payload, next, end) {
          switch (payload.method) {
            case 'web3_clientVersion':
              currentProvider.version.getNode(end)
              return

            case 'eth_accounts':
              currentProvider.eth.getAccounts(end)
              return

            case 'eth_sendTransaction':
              const [txParams] = payload.params
              currentProvider.eth.sendTransactionAsync(txParams)
                .then(data => {
                  store.dispatch({ type: walletConstants.TRANSACTION_SUCCESS })
                  end(null, data)
                })
                .catch(error => {
                  store.dispatch({ type: walletConstants.TRANSACTION_ERROR, error: error.message || error })
                  end(error)
                })
              return

            case 'eth_sign':
              const [address, message] = payload.params
              currentProvider.eth.sign(address, message, end)
              return

            default:
              next()
          }
        }
      }

      providerEngine.addProvider(injectedWeb3Provider)
    } else if (account && password) {
      providerEngine.addProvider(new Web3Subprovider(new Web3.providers.HttpProvider(`${walletHost}:${walletPort}`)))
    }

    // Use an RPC provider to route all other requests
    if (process.env.REACT_APP_NODE_ENV === 'local-dev') {
      providerEngine.addProvider(new Web3Subprovider(new Web3.providers.HttpProvider(`${walletHost}:${walletPort}`)))
    } else {
      providerEngine.addProvider(new Web3Subprovider(new Web3.providers.HttpProvider('https://kovan.infura.io/O4y6ossOQVPXYvf8PDB4'))) // TODO: implement redundantRPC
    }

    providerEngine.start()

    web3 = new Web3(providerEngine)

    promisifyAll(web3.eth)

    return web3.eth.getAccountsAsync()
      .then(accounts => {
        currentAccount = account || accounts[0]

        if (account && password) {
          return web3.personal.unlockAccount(currentAccount, password)
        }
      })
      .then(() => {
        store.dispatch({ type: walletConstants.CONNECT_SUCCESS })
        store.dispatch({ type: walletConstants.SHOW_CONNECTION_ALERT, payload: true })
      })

      .catch(error => {
        console.error(`Error connecting to wallet on host ${walletHost}:${walletPort}, error: ${error}`)
        store.dispatch({ type: walletConstants.CONNECT_ERROR, error })
      })
  },

  getAccounts () {
    return web3.eth.getAccountsAsync()
  },

  setCurrentAccount (address) {
    currentAccount = address
    // TODO: implement handling password and connecting to different wallet
  },

  addInvestorToWhitelist (investorAddress, contractAddress) {
    const contract = web3.eth.contract(whitelistContract.abi).at(contractAddress)
    promisifyAll(contract.add)
    return contract.add.sendTransactionAsync(investorAddress, { from: currentAccount })
  },

  setRegDWhitelistReleaseDate (investorAddress, contractAddress, releaseDate) {
    const contract = web3.eth.contract(regDWhitelistContract.abi).at(contractAddress)
    promisifyAll(contract.setReleaseDate)
    return contract.setReleaseDate.sendTransactionAsync(investorAddress, releaseDate, { from: currentAccount })
  },

  setMessagingAddress (messagingAddress, tokenAddress) {
    const deployedTokenContract = web3.eth.contract(tokenContract.abi).at(tokenAddress)
    promisifyAll(deployedTokenContract._service)

    return deployedTokenContract._service.callAsync()
      .then(regulatorServiceAddress => {
        const deployedRegulatorServiceContract = web3.eth.contract(regulatorServiceContract.abi).at(regulatorServiceAddress)
        promisifyAll(deployedRegulatorServiceContract.getMessagingAddress)
        promisifyAll(deployedRegulatorServiceContract.setMessagingAddress)

        return deployedRegulatorServiceContract.getMessagingAddress.callAsync()
          .then(currentMessagingAddress => {
            if (currentMessagingAddress !== messagingAddress) {
              return deployedRegulatorServiceContract.setMessagingAddress.sendTransactionAsync(messagingAddress, { from: currentAccount })
            }
          })
      })
  }
}
