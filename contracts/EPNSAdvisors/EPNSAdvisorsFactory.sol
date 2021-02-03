// SPDX-License-Identifier: MIT

pragma solidity 0.6.11;

import "./EPNSAdvisors.sol";

contract EPNSAdvisorsFactory {

    /// @notice An event thats emitted when advisor contract is deployed
    event DeployAdvisor(address indexed advisorAddress, address indexed beneficiaryAddress);

    /**
     * @dev Creates a vesting contract that vests its balance of any ERC20 token to the
     * beneficiary, gradually in a linear fashion until start + duration. By then all
     * of the balance will have vested.
     * @param beneficiary address of the beneficiary to whom vested tokens are transferred
     * @param cliffDuration duration in seconds of the cliff in which tokens will begin to vest
     * @param start the time (as Unix time) at which point vesting starts
     * @param duration duration in seconds of the period in which the tokens will vest
     * @param revocable whether the vesting is revocable or not
     */
    function deployAdvisor(address beneficiary, uint256 start, uint256 cliffDuration, uint256 duration, bool revocable) external returns(bool){
        EPNSAdvisors advisorContract = new EPNSAdvisors(beneficiary, start, cliffDuration, duration, revocable);
        emit DeployAdvisor(address(advisorContract), beneficiary);
        return true;
    }
}