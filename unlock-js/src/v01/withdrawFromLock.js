import * as UnlockV01 from 'unlock-abi-0-1'
import Errors from '../errors'
import TransactionTypes from '../transactionTypes'
import { GAS_AMOUNTS } from '../constants'

/**
 * Triggers a transaction to withdraw funds from the lock and assign them to the owner.
 * @param {PropTypes.address} lock
 * @param {PropTypes.address} account
 * @param {Function} callback TODO: implement...
 */
export default function(lock, account) {
  const lockContract = new this.web3.eth.Contract(
    UnlockV01.PublicLock.abi,
    lock
  )
  const data = lockContract.methods.withdraw().encodeABI()

  return this._sendTransaction(
    {
      to: lock,
      from: account,
      data,
      gas: GAS_AMOUNTS.withdraw,
      contract: UnlockV01.PublicLock,
    },
    TransactionTypes.WITHDRAWAL,
    error => {
      if (error) {
        return this.emit(
          'error',
          new Error(Errors.FAILED_TO_WITHDRAW_FROM_LOCK)
        )
      }
    }
  )
}
