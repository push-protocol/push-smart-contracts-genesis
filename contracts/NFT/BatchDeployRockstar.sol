// SPDX-License-Identifier: MIT

pragma solidity 0.6.11;
pragma experimental ABIEncoderV2;

/**
 * @dev Required interface of an ERC721 compliant contract.
 */
interface IRockstar {
  /**
   * @dev mints a unique NFT
   */
  function safeMint(address recipient, string memory metadata) external returns (bool);

  /**
   * @dev burns NFT
   */
  function burn(uint256 tokenId) external returns (bool);

  /**
   * @dev renounces ownership
   */
  function renounceOwnership() external;
}

/**
 * @title Rockstar
 * @dev Script to deploy batch transactions of NFTs
 */
contract BatchDeployRockstar {

  function batchDeployNFTs(address nfttoken, address[] memory recipients, string[] memory metadatas) public {
    require(recipients.length == 100, "BatchDeploy::batchDeployNFTs: Needs 100 recipients");
    require(recipients.length == metadatas.length, "BatchDeploy::batchDeployNFTs: recipients and metaddata count mismatch");

    IRockstar rockstar = IRockstar(nfttoken);

    for (uint i=0; i<recipients.length; i++) {
      // Deploy NFTs
      rockstar.safeMint(recipients[i], metadatas[i]);
    }
  }
}
