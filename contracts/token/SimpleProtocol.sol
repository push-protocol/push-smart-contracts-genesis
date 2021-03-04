// SPDX-License-Identifier: Apache-2.0
pragma solidity ^0.6.11;

import "@openzeppelin/contracts/token/ERC20/IERC20.sol";

/**
 * @dev Required interface of an ERC721 compliant contract.
 */
interface IEPNS {
  /**
   * @dev resets holder weight for the callee
   */
  function resetHolderWeight(address holder) external;
}

contract SimpleProtocol {
  constructor () public {}

  // To claim reward and reset token holder weight
  function claimReward(address token, address simpleToken, uint amount) external {
    IEPNS epns = IEPNS(token);
    epns.resetHolderWeight(msg.sender);

    IERC20 simpleToken = IERC20(simpleToken);
    simpleToken.transfer(msg.sender, amount);
  }

}
