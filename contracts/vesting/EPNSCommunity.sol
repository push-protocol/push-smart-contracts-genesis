// SPDX-License-Identifier: MIT

pragma solidity 0.6.11;

import "../openzeppelin/TokenVesting.sol";
import "@openzeppelin/contracts/token/ERC20/IERC20.sol";

contract EPNSCommunity is TokenVesting {
    /**
     * @notice Contruct a new Community Contract
     * @param beneficiary address of the beneficiary to whom vested tokens are transferred
     * @param cliffDuration duration in seconds of the cliff in which tokens will begin to vest
     * @param start the time (as Unix time) at which point vesting starts
     * @param duration duration in seconds of the period in which the tokens will vest
     * @param revocable whether the vesting is revocable or not
     */
    constructor(
        address beneficiary,
        uint256 start,
        uint256 cliffDuration,
        uint256 duration,
        bool revocable
    )
        public
        TokenVesting(beneficiary, start, cliffDuration, duration, revocable)
    {}

    /**
     * @notice Change the beneficiary of the contract
     * @param newBeneficiary The new beneficiary address for the Contract
     * @return Whether or not the transfer succeeded
     */
    function setBeneficiary(address newBeneficiary) external returns (bool) {
        require(
            msg.sender == _beneficiary,
            "Push::setBeneficiary: Not contract beneficiary"
        );
        require(
            _beneficiary != newBeneficiary,
            "Push::setBeneficiary: Same beneficiary address as old"
        );
        _beneficiary = newBeneficiary;
    }

    function release(address beneficiary, IERC20 token) public override {
        uint256 unreleased = _releasableAmount(token);

        require(unreleased > 0, "TokenVesting: no tokens are due");

        _released[address(token)] = _released[address(token)].add(unreleased);

        token.safeTransfer(_beneficiary, unreleased);

        emit TokensReleased(address(token), unreleased);
    }
}
