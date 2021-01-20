// We import Chai to use its asserting functions here.
const { expect } = require("chai");

// `describe` is a Mocha function that allows you to organize your tests. It's
// not actually needed, but having your tests organized makes debugging them
// easier. All Mocha functions are available in the global scope.

// `describe` receives the name of a section of your test suite, and a callback.
// The callback must define the tests of that section. This callback can't be
// an async function.
describe("Token contract", function () {
  // Mocha has four functions that let you hook into the the test runner's
  // lifecyle. These are: `before`, `beforeEach`, `after`, `afterEach`.

  // They're very useful to setup the environment for tests, and to clean it
  // up after they run.

  // A common pattern is to declare some variables, and assign them in the
  // `before` and `beforeEach` callbacks.

  let Token;
  let epnsToken;
  let owner;
  let addr1;
  let addr2;
  let addrs;

  // `beforeEach` will run before each test, re-deploying the contract every
  // time. It receives a callback, which can be async.
  before(async function () {
    // Get the ContractFactory and Signers here.
    Token = await ethers.getContractFactory("EPNS");
    [owner, addr1, addr2, ...addrs] = await ethers.getSigners();

    // To deploy our contract, we just have to call Token.deploy() and await
    // for it to be deployed(), which happens onces its transaction has been
    // mined.
    epnsToken = await Token.deploy(owner.address);

    // Run the ERC 20 Test Suite
  });

  // You can nest describe calls to create subsections.
  describe("Deployment", function () {
    // `it` is another Mocha function. This is the one you use to define your
    // tests. It receives the test name, and a callback function.

    it("Should deploy PUSH Token", async function () {
      expect(epnsToken.address).to.not.equal(null);
    });

    it("Should assign the total supply of tokens to the owner", async function () {
      const ownerBalance = await epnsToken.balanceOf(owner.address);
      expect(await epnsToken.totalSupply()).to.equal(ownerBalance);
    });
  });

  // You can nest describe calls to create subsections.
  describe("ERC-20 Test Suite", function () {
    // const suite = require('../node_modules/token-test-suite/lib/suite');
    // const EPNS = artifacts.require('EPNS');

  });
});
