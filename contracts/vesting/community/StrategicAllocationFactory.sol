// SPDX-License-Identifier: MIT

pragma solidity 0.6.11;

import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/math/SafeMath.sol";
import "../Vesting.sol";
import "./StrategicAllocation.sol";


contract StrategicAllocationFactory is Ownable {

    using SafeMath for uint256;
    
    /// @notice PUSH token address 
    address public pushToken;

    /// @notice Cliff time to withdraw tokens back
    uint256 public cliff;

    /// @notice An event thats emitted when strategic allocation factory contract is deployed
    event DeployStrategicAllocation(address indexed strategicAllocationAddress, address indexed beneficiaryAddress, uint256 amount);

    /// @notice An event thats emitted when an strategic allocation factory is revoked
    event RevokeStrategicAllocation(address indexed strategicAllocationAddress);

    /// @notice An event thats emitted when tokens are withdrawn
    event WithdrawTokens(uint256 amount);

    /**
     * @notice Construct StrategicAllocationFactory
     * @param _pushToken The push token address
     * @param _start the time (as Unix time) at which point vesting starts
     * @param _cliffDuration duration in seconds of the cliff in which tokens will begin to vest
     */
    constructor(address _pushToken, uint256 _start, uint256 _cliffDuration) public {
        require(_pushToken != address(0), "StrategicAllocationFactory::constructor: pushtoken is the zero address");
        require(_cliffDuration > 0, "StrategicAllocationFactory::constructor: cliff duration is 0");
        require(_start.add(_cliffDuration) > block.timestamp, "StrategicAllocationFactory::constructor: cliff time is before current time");
        pushToken = _pushToken;
        cliff = _start.add(_cliffDuration);
    }

    /**
     * @notice Creates a vesting contract that vests its balance of any ERC20 token to the
     * beneficiary, gradually in a linear fashion until start + duration. By then all
     * of the balance will have vested.
     * @param beneficiary address of the beneficiary to whom vested tokens are transferred
     * @param cliffDuration duration in seconds of the cliff in which tokens will begin to vest
     * @param start the time (as Unix time) at which point vesting starts
     * @param duration duration in seconds of the period in which the tokens will vest
     * @param revocable whether the vesting is revocable or not
     * @param amount amount to send to strategic allocation contract
     */
    function deployStrategicAllocation(address beneficiary, uint256 start, uint256 cliffDuration, uint256 duration, bool revocable, uint256 amount) external onlyOwner {
        require(amount > 0, "StrategicAllocationFactory::deployStrategicAllocation: amount is zero");
        StrategicAllocation strategicAllocationContract = new StrategicAllocation(beneficiary, start, cliffDuration, duration, revocable);
        IERC20 pushTokenInstance = IERC20(pushToken);
        uint balance = pushTokenInstance.balanceOf(address(this));
        require(amount <= balance, "StrategicAllocationFactory::deployStrategicAllocation: amount greater than balance");

        pushTokenInstance.transfer(address(strategicAllocationContract), amount);
        emit DeployStrategicAllocation(address(strategicAllocationContract), beneficiary, amount);        
    }

    /**
     * @notice Revokes the tokens from an strategic allocation contract and sends back to this contract
     * @param strategicAllocationAddress address of the beneficiary vesting contract
     */
    function revokeStrategicAllocationTokens(StrategicAllocation strategicAllocationAddress) external onlyOwner {
        strategicAllocationAddress.revoke(IERC20(pushToken));
        emit RevokeStrategicAllocation(address(strategicAllocationAddress));
    }

    /**
     * @notice Withdraw remaining tokens after the cliff period has ended
     * @param amount Amount of tokens to withdraw 
     */
    function withdrawTokens(uint256 amount) external onlyOwner {
        require(block.timestamp > cliff, "StrategicAllocationFactory::withdrawTokens: cliff period not complete");
        IERC20 pushTokenInstance = IERC20(pushToken);
        uint256 balance = pushTokenInstance.balanceOf(address(this));
        require(amount <= balance, "StrategicAllocationFactory::withdrawTokens: amount greater than balance");
        pushTokenInstance.transfer(owner(), amount);
        emit WithdrawTokens(amount);
    }
}