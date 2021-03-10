// SPDX-License-Identifier: MIT

pragma solidity 0.6.11;

import "@openzeppelin/contracts/token/ERC721/ERC721.sol";
import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/utils/Counters.sol";

//import "hardhat/console.sol";

/**
 * @title Rockstar
 * @dev A Non Fungible Token (NFT) contract compliant to ERC721 standard
 */
contract Rockstar is ERC721, Ownable{

    /// @dev to track and update token ids
    using Counters for Counters.Counter;

    /// @dev to track token ids
    Counters.Counter private _tokenIds;

    /// @dev IPFShash check
    /// @dev points to `1` if hash is already used
    mapping(string => uint8) hashCheck;

    /**
     * @notice Construct a new ERC721 token
     * @notice "Rockstars of EPNS" is token name
     * @notice "ROCKSTAR" is token symbol
     */
    constructor() public ERC721("Rockstars of EPNS", "ROCKSTAR") Ownable() {}

    /**
     * @notice Safely mints a token, sets 'metadata' as TokenURI and transfer it to 'recipient'
     * @param recipient The address of the account to which token is transferred to
     * @param metadata The IPFS hash
     * @return Whether or not minting succeeded
     * Emits a {Transfer} event.
     */
    function safeMint (address recipient, string memory metadata) public onlyOwner returns (bool){
        require( hashCheck[metadata] != 1, "Rockstar::safeMint: hash already in use");
        hashCheck[metadata] = 1;
        _tokenIds.increment();
        uint256 newTokenId = _tokenIds.current();
        _safeMint(recipient, newTokenId);
        _setTokenURI(newTokenId, metadata);
        return true;
    }

    /**
     * @notice Destroys `tokenId`.
     * @dev The approval is cleared when the token is burned.
     * @param tokenId The `tokenID` to be destroyed
     * @return Whether or not burning succeeded
     * Emits a {Transfer} event.
     */
    function burn(uint256 tokenId) public returns (bool)  {
        require(_exists(tokenId), "Rockstar::burn: burn of nonexistent token");
        require(_isApprovedOrOwner(_msgSender(), tokenId), "Rockstar::burn: caller is not owner nor approved");
        _burn(tokenId);
        return true;
    }
}
