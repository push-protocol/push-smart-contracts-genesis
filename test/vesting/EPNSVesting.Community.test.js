// We import Chai to use its asserting functions here.
const { expect } = require("chai");
const {
  EPNS_ADVISORS_FUNDS_AMOUNT,
  EPNS_COMMUNITY_FUNDS_AMOUNT,
  TOTAL_EPNS_TOKENS,
} = require("../../scripts/constants");

// `describe` is a Mocha function that allows you to organize your tests. It's
// not actually needed, but having your tests organized makes debugging them
// easier. All Mocha functions are available in the global scope.

// `describe` receives the name of a section of your test suite, and a callback.
// The callback must define the tests of that section. This callback can't be
// an async function.
describe("$PUSH Token contract", function () {
  // Mocha has four functions that let you hook into the the test runner's
  // lifecyle. These are: `before`, `beforeEach`, `after`, `afterEach`.

  // They're very useful to setup the environment for tests, and to clean it
  // up after they run.

  // A common pattern is to declare some variables, and assign them in the
  // `before` and `beforeEach` callbacks.

  let Token;
  let epnsToken;
  let owner;
  let beneficiary;
  let addr1;
  let addrs;
  let start;
  let cliffDuration;
  let duration;
  let EPNSAdvisors;
  let epnsAdvisors;
  let EPNSCommunity;
  let epnsCommunity;
  // `beforeEach` will run before each test, re-deploying the contract every
  // time. It receives a callback, which can be async.
  beforeEach(async function () {
    // Get the ContractFactory and Signers here.
    Token = await ethers.getContractFactory("EPNS");
    EPNSAdvisors = await ethers.getContractFactory("EPNSAdvisors");
    EPNSCommunity = await ethers.getContractFactory("EPNSCommunity");

    [owner, beneficiary, addr1, ...addrs] = await ethers.getSigners();
    // To deploy our contract, we just have to call Token.deploy() and await
    // for it to be deployed(), which happens onces its transaction has been
    // mined.
    epnsToken = await Token.deploy(owner.address);
    // Run the ERC 20 Test Suite
    const now = (await ethers.provider.getBlock()).timestamp;
    start = now + 60;
    cliffDuration = 31536000; // 1 Year
    duration = cliffDuration + 31536000; // 2 Years
  });

  // You can nest describe calls to create subsections.
  describe("Vesting Contracts Tests", function () {
    // `it` is another Mocha function. This is the one you use to define your
    // tests. It receives the test name, and a callback function.
    describe("EPNSCommunity Tests", function () {
      it("Should deploy EPNSCommunity Contract", async function () {
        epnsCommunity = await EPNSCommunity.deploy(
          addr1.address,
          start,
          cliffDuration,
          duration,
          true
        );

        expect(epnsCommunity.address).to.not.equal(null);
      });
    });
  });
});
