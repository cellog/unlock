import reducer from '../../reducers/cartReducer'
import { addToCart, updatePrice } from '../../actions/keyPurchase'

describe('cartReducer', () => {
  it('should set state when receiving ADD_TO_CART', () => {
    expect.assertions(1)
    const lock = 'a lock'
    const tip = 'a tip'
    expect(reducer(undefined, addToCart({ lock, tip }))).toEqual({
      lock,
      tip,
    })
  })

  it('should update existing state with a price when receiving UPDATE_PRICE', () => {
    expect.assertions(1)
    const lock = 'a lock'
    const tip = 'a tip'
    const currentState = {
      lock,
      tip,
    }
    const price = 5.5
    expect(reducer(currentState, updatePrice(5.5))).toEqual({
      lock,
      tip,
      price,
    })
  })

  it('should return current state for other actions', () => {
    expect.assertions(1)
    const currentState = {
      lock: 'another lock',
      tip: 'another tip',
    }
    expect(reducer(currentState, { type: 'JUST_SOME_ACTION' })).toEqual(
      currentState
    )
  })
})
