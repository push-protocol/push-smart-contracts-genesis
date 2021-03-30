// SPDX-License-Identifier: MIT
pragma solidity 0.6.11;

import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/token/ERC20/IERC20.sol";

contract Reserves is Ownable {

    /// @notice An event thats emitted when tokens are withdrawn to an address
    event TokensTransferred(address indexed receiver, uint amount);

    /// @notice PUSH token address
    address public immutable pushToken;

    /// @notice identifier for the contract
    string public identifier;

    /**
     * @notice Construct a new Public Sale Contract
     * @param _pushToken Push token address
     */
    constructor(address _pushToken, string memory _identifier) public {
        pushToken = _pushToken;
        identifier = _identifier;
    }

    /**
     * @dev Withdraw remaining tokens to an address
     * @param receiver Address of account to withdraw from
     * @param amount Amount of tokens to withdraw
     */
    function transferTokensToAddress(address receiver, uint amount) external onlyOwner {
        require(receiver != address(0), "Reserves::transferTokensToAddress: receiver is zero address");
        require(amount > 0, "Reserves::transferTokensToAddress: amount is zero");
        IERC20 pushTokenInstance = IERC20(pushToken);
        pushTokenInstance.transfer(receiver, amount);

        emit TokensTransferred(receiver, amount);
    }
}
