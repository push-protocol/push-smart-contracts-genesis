pragma solidity ^0.6.6;

/**
    @title ILendingPoolAddressesProvider interface
    @notice provides the interface to fetch the LendingPoolCore address
    @author EPNS Team (Harsh Rajat, Jude Dike, Jaffet Sandi)| https://github.com/ethereum-push-notification-service
 */

interface ILendingPoolAddressesProvider {
    function getLendingPoolCore() external view returns (address payable);
    function getLendingPool() external view returns (address);
}