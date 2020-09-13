const EPNSServer = artifacts.require("EPNSServer");

module.exports = function(deployer) {
  deployer.deploy(EPNSServer);
};
