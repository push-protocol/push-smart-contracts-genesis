// SPDX-License-Identifier: Apache-2.0
pragma solidity ^0.6.11;

import "@openzeppelin/contracts/token/ERC20/ERC20.sol";

contract SimpleToken is ERC20 {
  /**
   * @dev Constructor that gives msg.sender all of existing tokens.
   */
  constructor () public ERC20("SimpleToken", "SIM") {
    _mint(msg.sender, 100000000 * (10 ** uint256(decimals())));
  }
}
