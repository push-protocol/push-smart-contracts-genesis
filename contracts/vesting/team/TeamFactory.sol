// SPDX-License-Identifier: MIT

pragma solidity 0.6.11;

import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/token/ERC20/SafeERC20.sol";
import "@openzeppelin/contracts/math/SafeMath.sol";
import "./Team.sol";

contract TeamFactory is Ownable{

    using SafeERC20 for IERC20;
    using SafeMath for uint256;

    /// @notice PUSH token address
    address public pushToken;

    /// @notice Cliff time to withdraw tokens back
    uint256 public cliff;

    /// @notice An event thats emitted when team contract is deployed
    event DeployTeam(address indexed teamAddress, address indexed beneficiaryAddress, uint256 amount);

    /// @notice An event thats emitted when an team is revoked
    event RevokeTeam(address indexed teamAddress);

    /**
     * @notice Construct Team Factory
     * @param _pushToken The push token address
     * @param _start The start time for cliff
     * @param _cliffDuration The cliff duration
     */
    constructor(address _pushToken, uint256 _start, uint256 _cliffDuration) public {
        require(_pushToken != address(0), "TeamFactory::constructor: pushtoken is the zero address");
        require(_cliffDuration > 0, "TeamFactory::constructor: cliff duration is 0");
        require(_start.add(_cliffDuration) > block.timestamp, "TeamFactory::constructor: cliff time is before current time");
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
     * @param amount amount to send to team vesting contract
     */
    function deployTeam(address beneficiary, uint256 start, uint256 cliffDuration, uint256 duration, bool revocable, uint256 amount) external onlyOwner returns(bool){
        Team teamContract = new Team(beneficiary, start, cliffDuration, duration, revocable);
        IERC20 pushTokenInstance = IERC20(pushToken);
        pushTokenInstance.safeTransfer(address(teamContract), amount);
        emit DeployTeam(address(teamContract), beneficiary, amount);
        return true;
    }

    /**
     * @dev Revokes the tokens from an team and sends back to this contract
     * @param teamVestingAdddress address of the beneficiary vesting contract
     */
    function revokeTeamTokens(Team teamVestingAdddress) external onlyOwner returns(bool){
        teamVestingAdddress.revoke(IERC20(pushToken));
        emit RevokeTeam(address(teamVestingAdddress));
        return true;
    }

    /**
     * @dev Withdraw remaining tokens after the cliff period has ended
     * @param amount Amount of tokens to withdraw
     */
    function withdrawTokens(uint amount) external onlyOwner returns(bool){
        require(block.timestamp > cliff, "TeamFactory::withdrawTokens: cliff period not complete");
        IERC20 pushTokenInstance = IERC20(pushToken);
        uint256 balance = pushTokenInstance.balanceOf(address(this));
        require(amount <= balance, "TeamFactory::withdrawTokens: amount greater than balance");
        pushTokenInstance.safeTransfer(owner(), amount);
        return true;
    }
}
