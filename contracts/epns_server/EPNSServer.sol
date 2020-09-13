pragma solidity ^0.6.0;

/**
 * @title Interface to interact with and enable socket capabilities of EPNS Server
 * @author EPNS Team (Harsh Rajat, Jude Dike, Jaffet Sandi)| https://github.com/ethereum-push-notification-service
 * @notice Provides Interface to coonect to EPNSServer contract and Emit events for socket of EPNS Server to listen
 * SPDX-License-Identifier: UNLICENSED
 */

import "@openzeppelin/contracts/access/Ownable.sol";

contract EPNSServer is Ownable {
    /* ***************
    * DEFINE EVENTS
    *************** */
    // Channel Related
    event AddChannel(address indexed channel, string ipfshash);
    event UpdateChannel(address indexed channel, string ipfshash);

    // Subscribe / Unsubscribe
    event Subscribe(address indexed channel, address user);
    event Unsubscribe(address indexed channel, address user);

    // Send Message
    event SendMessage(address indexed channel, address indexed recipient, uint16 msgType, string ipfshash, bool usePush);

    /* ***************
    * DEFINE FUNCTIONS
    *************** */
    constructor () public {

    }

    // CHANNEL RELATED
    function addChannel(address _channel, string calldata _ipfshash) external {
        emit AddChannel(_channel, _ipfshash);
    }

    function updateChannel(address _channel, string calldata _ipfshash) external {
        emit UpdateChannel(_channel, _ipfshash);
    }

    // SUBSCRIBE / UNSUBSCRIBE
    function subscribe(address _channel, address _user) external {
        emit Subscribe(_channel, _user);
    }

    function unsubscribe(address _channel, address _user) external {
        emit Unsubscribe(_channel, _user);
    }

    // MESSAGE RELATED
    function sendMessage(address _channel, address _recipient, uint16 _msgType, string calldata _ipfshash, bool _usePush) external {
        emit SendMessage(_channel, _recipient, _msgType, _ipfshash, _usePush);
    }
}