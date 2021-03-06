import { IframePostOfficeWindow } from '../../../windowTypes'
import {
  ConstantsType,
  FetchWindow,
  SetTimeoutWindow,
  WalletServiceType,
  Web3ServiceType,
  BlockchainData,
} from '../../../data-iframe/blockchainHandler/blockChainTypes'
import Mailbox from '../../../data-iframe/Mailbox'
import {
  setupTestDefaults,
  MailboxTestDefaults,
} from '../../test-helpers/setupMailboxHelpers'
import FakeWindow from '../../test-helpers/fakeWindowHelpers'
import {
  getWalletService,
  getWeb3Service,
  lockAddresses,
  blockchainDataLocked,
} from '../../test-helpers/setupBlockchainHelpers'
import { PaywallConfig } from '../../../unlockTypes'

let mockWalletService: WalletServiceType
let mockWeb3Service: Web3ServiceType
jest.mock('@unlock-protocol/unlock-js', () => {
  return {
    WalletService: () => {
      mockWalletService = getWalletService({})
      mockWalletService.connect = jest.fn((provider: any) => {
        mockWalletService.provider = provider
        return Promise.resolve()
      })
      return mockWalletService
    },
    Web3Service: () => {
      mockWeb3Service = getWeb3Service({})
      return mockWeb3Service
    },
  }
})

describe('Mailbox - saveCacheInLocalStorage', () => {
  let constants: ConstantsType
  let win: FetchWindow & SetTimeoutWindow & IframePostOfficeWindow
  let fakeWindow: FakeWindow
  let mailbox: Mailbox
  let defaults: MailboxTestDefaults

  // all locks have had their addresses normalized before arriving
  const blockchainData: BlockchainData = blockchainDataLocked

  function setupDefaults(killLocalStorage = false) {
    defaults = setupTestDefaults()
    constants = defaults.constants
    win = defaults.fakeWindow
    fakeWindow = win as FakeWindow
    if (killLocalStorage) {
      fakeWindow.throwOnLocalStorageSet()
    }
    mailbox = new Mailbox(constants, fakeWindow)
    testingMailbox().useLocalStorageCache = true
    ;(testingMailbox().configuration as PaywallConfig) = {
      locks: {
        [lockAddresses[1]]: { name: '' },
        [lockAddresses[2]]: { name: '' },
      },
      callToAction: {
        default: '',
        pending: '',
        expired: '',
        confirmed: '',
      },
    }
  }

  function testingMailbox() {
    return mailbox as any
  }

  function expectCacheToContain(value: BlockchainData) {
    const key = mailbox.getCacheKey()
    const cache = JSON.stringify(value)

    expect(fakeWindow.storage).toEqual({
      [key]: cache,
    })
  }

  describe('error conditions', () => {
    describe('localStorage is not available', () => {
      beforeEach(() => {
        setupDefaults(true)
        fakeWindow.localStorage.setItem = jest.fn()
      })

      it('should do nothing if localStorage is not available', () => {
        expect.assertions(1)

        mailbox.saveCacheInLocalStorage()

        expect(fakeWindow.localStorage.setItem).not.toHaveBeenCalled()
      })
    })

    describe('configuration not received/not saved because it was invalid', () => {
      beforeEach(() => {
        setupDefaults()
        fakeWindow.localStorage.setItem = jest.fn()
        testingMailbox().configuration = undefined
      })

      it('should do nothing if configuration is not set', () => {
        expect.assertions(1)

        mailbox.saveCacheInLocalStorage()

        expect(fakeWindow.localStorage.setItem).not.toHaveBeenCalled()
      })
    })

    describe('localStorage throws on attempting to setItem', () => {
      beforeEach(() => {
        setupDefaults()
        fakeWindow.localStorage.clear = jest.fn()
        fakeWindow.throwOnLocalStorageSet()
      })

      afterEach(() => {
        // reset to avoid affecting other tests
        process.env.UNLOCK_ENV = 'prod'
      })

      it('in dev, it should log the error', () => {
        expect.assertions(1)

        process.env.UNLOCK_ENV = 'dev'
        mailbox.saveCacheInLocalStorage()

        expect(fakeWindow.console.error).toHaveBeenCalledWith(expect.any(Error))
      })

      it('in other envs, it should not log the error', () => {
        expect.assertions(1)

        mailbox.saveCacheInLocalStorage()

        expect(fakeWindow.console.error).not.toHaveBeenCalled()
      })

      it('should clear the entire localStorage cache to be safe', () => {
        expect.assertions(1)

        mailbox.saveCacheInLocalStorage()

        expect(fakeWindow.localStorage.clear).toHaveBeenCalled()
      })
    })
  })

  describe('normal operation', () => {
    beforeEach(() => {
      setupDefaults()
      ;(testingMailbox().blockchainData as BlockchainData) = blockchainData
    })

    it('should save a serialized representation of current data to the cache', () => {
      expect.assertions(1)

      mailbox.saveCacheInLocalStorage()

      expectCacheToContain(blockchainData)
    })
  })

  describe('localStorage cache disabled', () => {
    beforeEach(() => {
      setupDefaults()
      testingMailbox().useLocalStorageCache = false
      ;(testingMailbox().blockchainData as BlockchainData) = blockchainData
    })

    it('should not save a serialized representation of current data to the cache', () => {
      expect.assertions(1)

      mailbox.saveCacheInLocalStorage()

      expect(fakeWindow.storage).toEqual({})
    })
  })
})
