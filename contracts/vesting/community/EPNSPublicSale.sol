// SPDX-License-Identifier: MIT
pragma solidity 0.6.11;

import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/token/ERC20/SafeERC20.sol";
import "@openzeppelin/contracts/token/ERC20/IERC20.sol";

contract EPNSPublicSale is Ownable {

    event TokensWithdrawn(address receiver, uint amount);

    address public pushToken;

    /**
     * @notice Contruct a new Public Sale Contract
     * @param _pushToken Push token address
     */
    constructor(address _pushToken) public {
        pushToken = _pushToken;
    }

    /**
     * @dev Withdraw remaining tokens after the cliff period has ended
     * @param receiver Address of account to withdraw from
     * @param amount Amount of tokens to withdraw 
     */
    function withdrawTokensToAddress(address receiver, uint amount) external onlyOwner {
        require(receiver != address(0), "EPNSAdvisors::withdrawTokens: receiver is zero address");
        require(amount > 0, "EPNSAdvisors::withdrawTokens: amount is zero");
        IERC20 pushTokenInstance = IERC20(pushToken);
        uint balance = pushTokenInstance.balanceOf(address(this));
        require(amount <= balance, "EPNSAdvisors::withdrawTokens: amount greater than balance");
        pushTokenInstance.transfer(receiver, amount);
        
        emit TokensWithdrawn(receiver, amount);
    }
}
