// SPDX-License-Identifier: MIT

pragma solidity 0.6.11;
pragma experimental ABIEncoderV2;

import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/token/ERC20/IERC20.sol";

/**
 * @title Rockstar
 * @dev Script to deploy batch transactions of NFTs
 */
contract BatchTransferPUSH is Ownable {

  constructor() public {}

  /**
   * @notice Mass transfers Tokens in a batched transaction
   * @param token the address of the NFT token that needs to be mintedd
   * @param recipients the array of address of recipients who will receive these tokens
   * @param amounts the array of amounts to be transferred
   * @param startpos the start position in NFT order
   * @param num the number of tokens to be minted
   */
  function transferPUSH(address token, address[] memory recipients, uint256[] memory amounts, uint256 startpos, uint256 num) public onlyOwner {
    // require(recipients.length == 100, "BatchDeploy::batchDeployNFTs: Needs exact 100 recipients");
    require(recipients.length == amounts.length, "BatchTransferPUSH::transferPUSH: recipients and amounts count mismatch");

    IERC20 pushToken = IERC20(token);

    for (uint i=startpos; i<num; i++) {
      // Send Tokens
      pushToken.transfer(recipients[i], amounts[i]);
    }
  }

  /**
   * @notice Mass transfers Tokens in a batched transaction
   * @param token the address of the ERC20 token that needs to be transferred
   * @param amount the amount to be transferred
   */
  function withdrawTokens(address token, uint256 amount) public onlyOwner {
    IERC20 pushToken = IERC20(token);

    pushToken.transfer(owner(), amount);
  }
}
