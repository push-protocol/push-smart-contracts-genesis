// SPDX-License-Identifier: MIT

pragma solidity 0.6.11;

import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/token/ERC721/IERC721.sol";

/**
 * @title NFTRewards
 * @dev Contract to give rewards to owner of $ROCKSTAR
 */
contract NFTRewardsV2 {
  /// @dev to store address of $PUSH token
  address public tokenAddress;

  /// @dev to store amount of reward to be given out
  uint public rewardPerNFT;

  /// @dev to store address of $ROCKSTAR token
  address public nftAddress;

  /// @dev to track if rewards are claimed for a tokenID
  mapping(uint => bool) rewardsClaimed;

  /// @notice When a reward is claimed
  event RewardClaimed(address owner, uint256 nftId, uint256 amount);

  /**
   * @notice Construct NFT Rewards Mapping
   * @notice _pushAddress is push token address given out as rewards
   * @notice _nftAddress is the nft token adddress on whom reward is claimable
   */
  constructor(uint _rewardPerNFT, address _tokenAddress, address _nftAddress) public {
    rewardPerNFT = _rewardPerNFT;
    tokenAddress = _tokenAddress;
    nftAddress = _nftAddress;
  }

  function getClaimRewardStatus(uint tokenId) view external returns (bool claimable) {
    claimable = !rewardsClaimed[tokenId];
  }

  function claimReward(uint tokenId) external returns (bool result) {
    require(rewardsClaimed[tokenId] == false, 'NFTRewardsV2::claimReward: reward already claimed');

    IERC721 nft = IERC721(nftAddress);
    require(nft.ownerOf(tokenId) == msg.sender, 'NFTRewardsV2::claimReward: unauthorized non-owner of NFT');

    IERC20 token = IERC20(tokenAddress);
    require(token.balanceOf(address(this)) >= rewardPerNFT, 'NFTRewardsV2::claimReward: reward exceeds contract balance');

    result = true;
    rewardsClaimed[tokenId] = true;
    token.transfer(msg.sender, rewardPerNFT);

    emit RewardClaimed(msg.sender, tokenId, rewardPerNFT);

    if(token.balanceOf(address(this)) == 0) {
      selfdestruct(msg.sender);
    }
  }
}
