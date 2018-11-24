export const ADD_TRANSACTION = 'ADD_TRANSACTION'
export const UPDATE_TRANSACTION = 'UPDATE_TRANSACTION'
export const DELETE_TRANSACTION = 'DELETE_TRANSACTION'

export const addTransaction = transaction => ({
  type: ADD_TRANSACTION,
  transaction,
})

export const updateTransaction = (transaction, update) => ({
  type: UPDATE_TRANSACTION,
  transaction,
  update,
})

export const deleteTransaction = transaction => ({
  type: DELETE_TRANSACTION,
  transaction,
})
