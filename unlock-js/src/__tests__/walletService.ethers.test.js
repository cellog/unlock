import { ethers } from 'ethers'
import http from 'http'
import NockHelper from './helpers/nockHelper'

import v0 from '../v0'
import v01 from '../v01'
import v02 from '../v02'

import WalletService from '../walletService'

const endpoint = 'http://127.0.0.1:8545'
const nock = new NockHelper(endpoint, false /** debug */, true /** ethers */)

let walletService

let unlockAddress = '0xD8C88BE5e8EB88E38E6ff5cE186d764676012B0b'
describe('WalletService (ethers)', () => {
  function resetTests() {
    nock.cleanAll()
    walletService = new WalletService({
      unlockAddress,
    })
  }
  const netVersion = Math.floor(Math.random() * 100000)
  async function resetTestsAndConnect(provider = endpoint) {
    nock.cleanAll()
    walletService = new WalletService({
      unlockAddress,
    })
    nock.netVersionAndYield(netVersion)

    await walletService.ethers_connect(provider)
    await nock.resolveWhenAllNocksUsed()
  }

  describe('ethers_connect', () => {
    beforeEach(() => {
      resetTests()
    })

    it('properly connects to the ethers jsonRpcProvider', async () => {
      expect.assertions(1)

      await resetTestsAndConnect()
      expect(walletService.provider).toBeInstanceOf(
        ethers.providers.JsonRpcProvider
      )
    })

    it('properly connects to the ethers Web3Provider', async () => {
      expect.assertions(1)

      await resetTestsAndConnect({
        sendAsync(params, callback) {
          const data = JSON.stringify(params)
          const options = {
            host: '127.0.0.1',
            port: 8545,
            method: 'POST',
            path: '/',
            headers: {
              'Content-Type': 'application/json',
              'Content-Length': data.length,
            },
          }
          const req = http.request(options, res => {
            var responseString = ''

            res.on('data', data => {
              responseString += data
              // save all the data from response
            })
            res.on('end', () => {
              callback(null, JSON.parse(responseString))
              // print to console when response ends
            })
          })
          req.write(JSON.stringify(params))
          req.end()
        }, // a web3 provider must have sendAsync as a minimum
      })
      expect(walletService.provider).toBeInstanceOf(
        ethers.providers.Web3Provider
      )
    })
  })

  describe('once connected', () => {
    describe('ethers_isUnlockContractDeployed', () => {
      it('should yield true if the opCode is not 0x', async done => {
        expect.assertions(2)
        await resetTestsAndConnect()
        nock.ethGetCodeAndYield(unlockAddress, '0xdeadbeef')

        walletService.ethers_isUnlockContractDeployed((error, isDeployed) => {
          expect(error).toBe(null)
          expect(isDeployed).toBe(true)
          done()
        })
      })

      it('should yield false if the opCode is 0x', async done => {
        expect.assertions(2)
        await resetTestsAndConnect()
        nock.ethGetCodeAndYield(unlockAddress, '0x')

        walletService.ethers_isUnlockContractDeployed((error, isDeployed) => {
          expect(error).toBe(null)
          expect(isDeployed).toBe(false)
          done()
        })
      })

      it('should yield an error if we could not retrieve the opCode', async done => {
        expect.assertions(2)
        await resetTestsAndConnect()
        const err = new Error('getCode failed')

        nock.ethGetCodeAndYield(unlockAddress, '0x', err)
        walletService.ethers_isUnlockContractDeployed((error, isDeployed) => {
          expect(error).toBeInstanceOf(Error)
          expect(isDeployed).toBe(undefined)
          done()
        })
      })
    })

    describe('ethers_getAccount', () => {
      describe('when the node has an unlocked account', () => {
        it('should load a local account and emit the ready event', async done => {
          expect.assertions(2)
          await resetTestsAndConnect()
          const unlockAccountsOnNode = [
            '0xaaadeed4c0b861cb36f4ce006a9c90ba2e43fdc2',
          ]

          nock.accountsAndYield(unlockAccountsOnNode)

          walletService.once('ready', () => {
            expect(walletService.ready).toBe(true)
            done()
          })

          walletService.on('account.changed', address => {
            expect(address).toEqual(
              '0xAaAdEED4c0B861cB36f4cE006a9C90BA2E43fdc2' // checksum-ed address
            )
          })

          walletService.ethers_getAccount()
        })
      })

      describe('when the node has no unlocked account', () => {
        it('should leave the service in a non-ready state', async () => {
          expect.assertions(1)
          await resetTestsAndConnect()

          // this test checks to make sure we create a new account if the node
          // returns no accounts, and so the accountsAndYield call must return []
          nock.accountsAndYield([])

          walletService.ethers_getAccount()
          expect(walletService.ready).toBe(false)
        })
      })
    })

    describe('_handleMethodCall', () => {
      const transaction = {
        hash: 'hash',
        from: 'from',
        to: 'to',
        data: 'data',
      }

      it('emits transaction.pending with transaction type', async () => {
        expect.assertions(1)

        await resetTestsAndConnect()
        walletService.on('transaction.pending', transactionType => {
          expect(transactionType).toBe('transactionType')
        })

        await walletService._handleMethodCall(
          Promise.resolve(transaction),
          'transactionType'
        )
      })

      it('retrieves transaction hash from the method call', async () => {
        expect.assertions(1)

        await resetTestsAndConnect()
        let myResolve
        const myPromise = new Promise(resolve => {
          myResolve = jest.fn(resolve)
          myResolve(transaction)
        })

        await walletService._handleMethodCall(myPromise, 'transactionType')

        expect(myResolve).toHaveBeenCalled()
      })

      it('emits transaction.new with the transaction information', async () => {
        expect.assertions(6)

        await resetTestsAndConnect()
        walletService.on(
          'transaction.new',
          (hash, from, to, data, transactionType, status) => {
            expect(hash).toBe(transaction.hash)
            expect(from).toBe(transaction.from)
            expect(to).toBe(transaction.to)
            expect(data).toBe(transaction.data)
            expect(transactionType).toBe('transactionType')
            expect(status).toBe('submitted')
          }
        )

        await walletService._handleMethodCall(
          Promise.resolve(transaction),
          'transactionType'
        )
      })

      it('throws on failure', async () => {
        expect.assertions(1)
        await resetTestsAndConnect()

        const oops = new Error('failed for some reason')

        try {
          await walletService._handleMethodCall(
            Promise.reject(oops),
            'transactionType'
          )
        } catch (e) {
          expect(e).toBe(oops)
        }
      })
    })

    describe('ethers_signData', () => {
      const account = '0x123'
      const result = 'RESULT'
      let data = 'please sign me'
      let metamask
      async function metamaskBeforeEach() {
        nock.netVersionAndYield(0)
        metamask = new ethers.providers.JsonRpcProvider(endpoint)
        // jerry-rig a fake web3 metamask provider
        metamask.sendAsync = (stuffToSend, cb) => {
          return ethers.utils
            .fetchJson(metamask.connection, JSON.stringify(stuffToSend))
            .then(thing => {
              cb(null, thing)
              return thing
            })
        }
        metamask.isMetaMask = true
        await nock.resolveWhenAllNocksUsed()
      }

      describe('if the provider is metamask', () => {
        it('should use eth_signTypedData_v3 and stringify the data for MetaMask', async () => {
          expect.assertions(1)
          await metamaskBeforeEach()
          await resetTestsAndConnect(metamask)
          data = []
          walletService.provider = {
            send: jest.fn(() =>
              Promise.resolve({
                result: {
                  result,
                },
              })
            ),
          }
          await walletService.ethers_signData(account, data, () => {})

          expect(walletService.provider.send).toHaveBeenCalledWith(
            'eth_signTypedData_v3',
            expect.arrayContaining([account, JSON.stringify(data)])
          )
        })
      })

      it('should use eth_signTypedData and stringify the data for json-rpc wallets', async () => {
        expect.assertions(1)

        await resetTestsAndConnect()
        data = []
        walletService.provider = {
          send: jest.fn(() =>
            Promise.resolve({
              result: {
                result,
              },
            })
          ),
        }
        await walletService.ethers_signData(account, data, () => {})

        expect(walletService.provider.send).toHaveBeenCalledWith(
          'eth_signTypedData',
          expect.arrayContaining([account, data])
        )
      })

      it('should use eth_signTypedData and stringify the data for non-MetaMask wallets', async () => {
        expect.assertions(1)

        await metamaskBeforeEach()
        await resetTestsAndConnect(metamask)

        walletService.web3Provider.isMetaMask = false
        data = []
        walletService.provider = {
          send: jest.fn(() =>
            Promise.resolve({
              result: {
                result,
              },
            })
          ),
        }
        await walletService.ethers_signData(account, data, () => {})

        expect(walletService.provider.send).toHaveBeenCalledWith(
          'eth_signTypedData',
          expect.arrayContaining([account, data])
        )
      })

      it('should return the signature', async () => {
        expect.assertions(1)

        await resetTestsAndConnect()
        data = []
        walletService.provider = {
          send: jest.fn(() =>
            Promise.resolve({
              result,
            })
          ),
        }
        let signature
        await walletService.ethers_signData(account, data, (error, output) => {
          signature = output
        })

        expect(signature).toBe(Buffer.from(result).toString('base64'))
      })

      it('should yield an error if there was a network error', async () => {
        expect.assertions(1)
        await resetTestsAndConnect()
        data = []
        const networkError = new Error('network')
        walletService.provider = {
          send: jest.fn(() => Promise.reject(networkError)),
        }
        let error
        await walletService.ethers_signData(account, data, e => {
          error = e
        })
        expect(error).toBe(networkError)
      })

      it('should yield an error if there was a signature error', async () => {
        expect.assertions(1)
        await resetTestsAndConnect()
        data = []
        const signatureError = new Error('signature')
        walletService.provider = {
          send: jest.fn(() =>
            Promise.resolve({
              error: signatureError,
            })
          ),
        }
        let error
        await walletService.ethers_signData(account, data, err => {
          error = err
        })

        expect(error).toBe(signatureError)
      })
    })

    describe('ethers_signDataPersonal', () => {
      it('dispatches the request to personally sign the data to the corresponding web3 method', async done => {
        expect.assertions(2)
        await resetTestsAndConnect()
        const data = 'data to be signed'
        const account = '0xd4bb4b501ac12f35db35d60c845c8625b5f28fd1'
        const hash =
          '0xdc8727bb847aebb19e4b2efa955b9b2c59192fd4656b6fe64bd61c09d8edb6d1'
        const returned = Buffer.from('stuff').toString('base64')

        nock.accountsAndYield([account])
        nock.personalSignAndYield(hash, account, 'stuff')

        walletService.ethers_signDataPersonal(
          account,
          data,
          (error, result) => {
            expect(result).toBe(returned)
            expect(error).toBe(null)
            done()
          }
        )
      })
    })
  })

  describe('versions', () => {
    const versionSpecificUnlockMethods = ['createLock']

    it.each(versionSpecificUnlockMethods)(
      'should invoke the implementation of the corresponding version of %s',
      async method => {
        const args = []
        const result = {}
        const version = {
          [`ethers_${method}`]: function(_args) {
            // Needs to be a function because it is bound to walletService
            expect(this).toBe(walletService)
            expect(_args).toBe(...args)
            return result
          },
        }
        walletService.ethers_unlockContractAbiVersion = jest.fn(() => version)
        const r = await walletService[`ethers_${method}`](...args)
        expect(r).toBe(result)
      }
    )

    const versionSpecificLockMethods = [
      'partialWithdrawFromLock',
      'purchaseKey',
      'withdrawFromLock',
      'updateKeyPrice',
    ]

    it.each(versionSpecificLockMethods)(
      'should invoke the implementation of the corresponding version of %s',
      async method => {
        const args = []
        const result = {}
        const version = {
          [`ethers_${method}`]: function(_args) {
            // Needs to be a function because it is bound to walletService
            expect(this).toBe(walletService)
            expect(_args).toBe(...args)
            return result
          },
        }
        walletService.ethers_lockContractAbiVersion = jest.fn(() => version)
        const r = await walletService[`ethers_${method}`](...args)
        expect(r).toBe(result)
      }
    )

    // for each supported version, let's make sure it implements all methods
    const supportedVersions = [v0, v01, v02]
    it.each(supportedVersions)(
      'should implement all the required methods',
      version => {
        versionSpecificUnlockMethods.forEach(method => {
          expect(version[`ethers_${method}`]).toBeInstanceOf(Function)
        })
        versionSpecificLockMethods.forEach(method => {
          expect(version[`ethers_${method}`]).toBeInstanceOf(Function)
        })
      }
    )
  })
})