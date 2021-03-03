// SPDX-License-Identifier: MIT

pragma solidity 0.6.11;

import "./TokenVesting.sol";

contract VestedReserves is TokenVesting {
    /// @notice PUSH token address
    address public pushToken;

    /// @notice identifier for the contract
    string public identifier;

    /**
     * @notice Contruct a new Foundation Contract
     * @param beneficiary address of the beneficiary to whom vested tokens are transferred
     * @param cliffDuration duration in seconds of the cliff in which tokens will begin to vest
     * @param start the time (as Unix time) at which point vesting starts
     * @param duration duration in seconds of the period in which the tokens will vest
     * @param revocable whether the vesting is revocable or not
     */
    constructor(
      address _pushToken,
      address beneficiary,
      uint256 start,
      uint256 cliffDuration,
      uint256 duration,
      bool revocable,
      string memory _identifier
    ) TokenVesting(beneficiary, start, cliffDuration, duration, revocable) public {
        require(_pushToken != address(0), "VestedReserves::constructor: pushtoken is the zero address");
        pushToken = _pushToken;
        identifier = _identifier;
    }

    /**
     * @notice Withdraw vested tokens to given address.
     * @param receiver Address receiving the token
     * @param amount Amount of tokens to be transferred
     */

    function withdrawTokensToAddress(address receiver, uint256 amount) public onlyOwner {
        releaseToAddress(IERC20(pushToken), receiver, amount);
    }
}
