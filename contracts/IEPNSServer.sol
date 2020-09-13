pragma solidity ^0.6.0;

/**
 * @title Interface to interact with and enable socket capabilities of EPNS Server
 * @author EPNS Team (Harsh Rajat, Jude Dike, Jaffet Sandi)| https://github.com/ethereum-push-notification-service
 * @notice Provides Interface to coonect to EPNSServer contract and Emit events for socket of EPNS Server to listen
 * SPDX-License-Identifier: UNLICENSED
 */

interface IEPNSServer {
    function addChannel(address _channel, string calldata _ipfshash) external;
    function updateChannel(address _channel, string calldata _ipfshash) external;
    function subscribe(address _channel, address _user) external;
    function unsubscribe(address _channel, address _user) external;
    function sendMessage(address _channel, address _recipient, uint16 _msgType, string calldata _ipfshash, bool _usePush) external;
}