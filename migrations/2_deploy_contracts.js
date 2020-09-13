const EPNSCore = artifacts.require("EPNSCore");

const network = "ropsten"; // can be ropsten or kovan

// AAVE - https://docs.aave.com/developers/deployed-contracts/deployed-contract-instances
const lendingPoolProviderRopsten = "0x1c8756FD2B28e9426CDBDcC7E3c4d64fa9A54728";
const daiTokenRopsten = "0xf80A32A835F79D7787E8a8ee5721D0fEaFd78108";
const aDaiTokenRopsten = "0xcB1Fe6F440c49E9290c3eb7f158534c2dC374201";

const lendingPoolProviderKovan = "0x506B0B2CF20FAA8f38a4E2B524EE43e1f4458Cc5";
const daiTokenKovan = "0xFf795577d9AC8bD7D90Ee22b6C1703490b6512FD";
const aDaiTokenKovan = "0x58AD4cB396411B691A9AAb6F74545b2C5217FE6a";

const lendingPoolProvider = network == "ropsten" ? lendingPoolProviderRopsten : lendingPoolProviderKovan;
const daiToken = network == "ropsten" ? daiTokenRopsten : daiTokenKovan;
const aDaiToken = network == "ropsten" ? aDaiTokenRopsten : aDaiTokenKovan;

module.exports = function(deployer) {
  deployer.deploy(EPNSCore, lendingPoolProvider, daiToken, aDaiToken);
};
