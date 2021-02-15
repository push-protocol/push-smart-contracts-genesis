// SPDX-License-Identifier: MIT

pragma solidity 0.6.11;

import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/token/ERC20/SafeERC20.sol";
import "@openzeppelin/contracts/math/SafeMath.sol";
import "./EPNSAdvisorsVesting.sol";

contract EPNSAdvisors is Ownable{

    using SafeERC20 for IERC20;
    using SafeMath for uint256;

    /// @notice PUSH token address
    address public pushToken;

    /// @notice Cliff time to withdraw tokens back
    uint256 public cliff;

    /// @notice An event thats emitted when advisor contract is deployed
    event DeployAdvisor(address indexed advisorAddress, address indexed beneficiaryAddress, uint256 amount);

    /// @notice An event thats emitted when an advisor is revoked
    event RevokeAdvisor(address indexed advisorAddress);

    /**
     * @notice Construct EPNSAdvisors
     * @param _pushToken The push token address
     * @param _start The start time for cliff
     * @param _cliffDuration The cliff duration
     */
    constructor(address _pushToken, uint256 _start, uint256 _cliffDuration) public {
        require(_pushToken != address(0), "EPNSAdvisors::constructor: pushtoken is the zero address");
        require(_cliffDuration > 0, "EPNSAdvisors::constructor: cliff duration is 0");
        require(_start.add(_cliffDuration) > block.timestamp, "EPNSAdvisors::constructor: cliff time is before current time");
        pushToken = _pushToken;
        cliff = _start.add(_cliffDuration);
    }

    /**
     * @dev Creates a vesting contract that vests its balance of any ERC20 token to the
     * beneficiary, gradually in a linear fashion until start + duration. By then all
     * of the balance will have vested.
     * @param beneficiary address of the beneficiary to whom vested tokens are transferred
     * @param cliffDuration duration in seconds of the cliff in which tokens will begin to vest
     * @param start the time (as Unix time) at which point vesting starts
     * @param duration duration in seconds of the period in which the tokens will vest
     * @param revocable whether the vesting is revocable or not
     * @param amount amount to send to advisors vesting contract
     */
    function deployAdvisor(address beneficiary, uint256 start, uint256 cliffDuration, uint256 duration, bool revocable, uint256 amount) external onlyOwner returns(bool){
        EPNSAdvisorsVesting advisorContract = new EPNSAdvisorsVesting(beneficiary, start, cliffDuration, duration, revocable);
        IERC20 pushTokenInstance = IERC20(pushToken);
        pushTokenInstance.safeTransfer(address(advisorContract), amount);
        emit DeployAdvisor(address(advisorContract), beneficiary, amount);
        return true;
    }

    /**
     * @dev Revokes the tokens from an advisor and sends back to this contract
     * @param advisorVestingAddress address of the beneficiary vesting contract
     */
    function revokeAdvisorTokens(EPNSAdvisorsVesting advisorVestingAddress) external onlyOwner returns(bool){
        advisorVestingAddress.revoke(IERC20(pushToken));
        emit RevokeAdvisor(address(advisorVestingAddress));
        return true;
    }

    /**
     * @dev Withdraw remaining tokens after the cliff period has ended
     * @param amount Amount of tokens to withdraw
     */
    function withdrawTokens(uint amount) external onlyOwner returns(bool){
        require(block.timestamp > cliff, "EPNSAdvisors::withdrawTokens: cliff period not complete");
        IERC20 pushTokenInstance = IERC20(pushToken);
        uint256 balance = pushTokenInstance.balanceOf(address(this));
        require(amount <= balance, "EPNSAdvisors::withdrawTokens: amount greater than balance");
        pushTokenInstance.safeTransfer(owner(), amount);
        return true;
    }
}
