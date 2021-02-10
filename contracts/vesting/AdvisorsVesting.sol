// SPDX-License-Identifier: MIT

pragma solidity 0.6.11;

import "../openzeppelin/TokenVesting.sol";

contract AdvisorsVesting is TokenVesting {
    
    /**
     * @notice Contruct a new Advisors Contract
     * @param beneficiary address of the beneficiary to whom vested tokens are transferred
     * @param cliffDuration duration in seconds of the cliff in which tokens will begin to vest
     * @param start the time (as Unix time) at which point vesting starts
     * @param duration duration in seconds of the period in which the tokens will vest
     * @param revocable whether the vesting is revocable or not
     */
    constructor(address beneficiary, uint256 start, uint256 cliffDuration, uint256 duration, bool revocable) TokenVesting(beneficiary, start, cliffDuration, duration, revocable) public {}

    /**
     * @notice Change the beneficiary of the contract
     * @param newBeneficiary The new beneficiary address for the Contract
     * @return Whether or not the transfer succeeded
     */
    function setBeneficiary(address newBeneficiary) external returns (bool) {
        require(msg.sender == _beneficiary, "Push::setBeneficiary: Not contract beneficiary");
        require(_beneficiary != newBeneficiary, "Push::setBeneficiary: Same beneficiary address as old");
        _beneficiary = newBeneficiary;
    }
}