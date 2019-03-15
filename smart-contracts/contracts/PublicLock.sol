pragma solidity 0.5.6;

import './interfaces/IERC721.sol';
import './interfaces/ILockCore.sol';
import 'openzeppelin-eth/contracts/ownership/Ownable.sol';
import 'openzeppelin-solidity/contracts/introspection/ERC165.sol';
import 'openzeppelin-solidity/contracts/token/ERC721/IERC721Receiver.sol';
import './mixins/MixinApproval.sol';
import './mixins/MixinDisableAndDestroy.sol';
import './mixins/MixinFunds.sol';
import './mixins/MixinGrantKeys.sol';
import './mixins/MixinKeys.sol';
import './mixins/MixinLockCore.sol';
import './mixins/MixinLockMetadata.sol';
import './mixins/MixinNoFallback.sol';
import './mixins/MixinPurchase.sol';
import './mixins/MixinRefunds.sol';
import './mixins/MixinTransfer.sol';


/**
 * @title The Lock contract
 * @author Julien Genestoux (unlock-protocol.com)
 * Eventually: implement ERC721.
 * @dev ERC165 allows our contract to be queried to determine whether it implements a given interface.
 * Every ERC-721 compliant contract must implement the ERC165 interface.
 * https://eips.ethereum.org/EIPS/eip-721
 */
contract PublicLock is
  MixinNoFallback,
  IERC721,
  ILockCore,
  IERC721Receiver,
  ERC165,
  Ownable,
  MixinFunds,
  MixinDisableAndDestroy,
  MixinLockCore,
  MixinKeys,
  MixinGrantKeys,
  MixinApproval,
  MixinLockMetadata,
  MixinRefunds,
  MixinPurchase,
  MixinTransfer
{
  constructor(
    address _owner,
    uint _expirationDuration,
    address _tokenAddress,
    uint _keyPrice,
    uint _maxNumberOfKeys
  )
    public
    MixinFunds(_tokenAddress)
    MixinLockCore(_owner, _expirationDuration, _keyPrice, _maxNumberOfKeys, 1)
  {
    // registering the interface for erc721 with ERC165.sol using
    // the ID specified in the standard: https://eips.ethereum.org/EIPS/eip-721
    _registerInterface(0x80ac58cd);
    // We must manually initialize Ownable.sol
    Ownable.initialize(_owner);
  }
}
