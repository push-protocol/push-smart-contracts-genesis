// SPDX-License-Identifier: MIT

pragma solidity 0.6.11;

import "../Vesting.sol";

contract StrategicAllocation is Vesting {
    
    /**
     * @notice Contruct a new StrategicAllocation Contract
     * @param beneficiary address of the beneficiary to whom vested tokens are transferred
     * @param cliffDuration duration in seconds of the cliff in which tokens will begin to vest
     * @param start the time (as Unix time) at which point vesting starts
     * @param duration duration in seconds of the period in which the tokens will vest
     * @param revocable whether the vesting is revocable or not
     */
    constructor(address beneficiary, uint256 start, uint256 cliffDuration, uint256 duration, bool revocable) Vesting(beneficiary, start, cliffDuration, duration, revocable) public {}
}