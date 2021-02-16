// We import Chai to use its asserting functions here.
const { expect } = require("chai");
const {
  TOTAL_EPNS_TOKENS,
  EPNS_PUBLIC_SALE_FUNDS_AMOUNT
} = require("../../scripts/constants");
const { vestedAmount } = require('../utils');
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
  let PublicSale;
  let publicSale;
  let totalToken = ethers.BigNumber.from(TOTAL_EPNS_TOKENS);
  let amount = ethers.BigNumber.from(EPNS_PUBLIC_SALE_FUNDS_AMOUNT);

  // `beforeEach` will run before each test, re-deploying the contract every
  // time. It receives a callback, which can be async.
  beforeEach(async function () {
    // Get the ContractFactory and Signers here.
    Token = await ethers.getContractFactory("EPNS");
    PublicSale = await ethers.getContractFactory("PublicSale");

    [owner, beneficiary, addr1, ...addrs] = await ethers.getSigners();
    // To deploy our contract, we just have to call Token.deploy() and await
    // for it to be deployed(), which happens onces its transaction has been
    // mined.
    epnsToken = await Token.deploy(owner.address)
    // Run the ERC 20 Test Suite
  })

  // You can nest describe calls to create subsections.
  describe("Vesting Contracts Tests", function () {
    // `it` is another Mocha function. This is the one you use to define your
    // tests. It receives the test name, and a callback function.
    describe("PublicSale Tests", function () {
      beforeEach(async function () {
        publicSale = await PublicSale.deploy(
          epnsToken.address,
        )

        await epnsToken.transfer(publicSale.address, amount)
      })

      it("should revert if in transfer to address receiver is zero address", async function () {
        const amountInt = amount.div(ethers.BigNumber.from(10).pow(18)).toNumber()

        // Random Amount between 1 and max amount transferred to contract
        const transferAmount = Math.floor(Math.random() * (amountInt - 1 + 1)) + 1
        const transferAmountBig = ethers.BigNumber.from(transferAmount).mul(ethers.BigNumber.from(10).pow(18))
        const tx = publicSale.transferTokensToAddress(
          "0x0000000000000000000000000000000000000000",
          transferAmountBig.toString()
        )

        await expect(tx)
          .to.revertedWith("PublicSale::transferTokensToAddress: receiver is zero address")
      })

      it("should revert if in transfer to address amount is zero", async function () {
        const tx = publicSale.transferTokensToAddress(
          addr1.address,
          ethers.BigNumber.from(0)
        )

        await expect(tx)
          .to.revertedWith("PublicSale::transferTokensToAddress: amount is zero")
      })

      it("should transfer to address successfully if amount of tokens greater than balance", async function () {
        const amountInt = amount.div(ethers.BigNumber.from(10).pow(18)).toNumber()

        // Random Amount between 1 and max amount transferred to contract
        const transferAmount = Math.floor(Math.random() * (amountInt - 1 + 1)) + 1
        const transferAmountBig = ethers.BigNumber.from(transferAmount).mul(ethers.BigNumber.from(10).pow(18))
        await publicSale.transferTokensToAddress(addr1.address, transferAmountBig.toString())

        const balance = await epnsToken.balanceOf(addr1.address)
        expect(balance.toString()).to.equal(transferAmountBig.toString())
      })

      it("should emit TokensTransferred when tokens are transferred to address successfully", async function () {
        const amountInt = amount.div(ethers.BigNumber.from(10).pow(18)).toNumber()

        // Random Amount between 1 and max amount transferred to contract
        const transferAmount = Math.floor(Math.random() * (amountInt - 1 + 1)) + 1
        const transferAmountBig = ethers.BigNumber.from(transferAmount).mul(ethers.BigNumber.from(10).pow(18))
        const tx = publicSale.transferTokensToAddress(addr1.address, transferAmountBig.toString())
        
        await expect(tx)
          .to.emit(publicSale, 'TokensTransferred')
          .withArgs(addr1.address, transferAmountBig.toString())
      })

      it("should revert if amount of tokens to transfer to address greater than balance", async function () {
        const amountInt = amount.div(ethers.BigNumber.from(10).pow(18)).toNumber()
        const balance = await epnsToken.balanceOf(publicSale.address)
        const balanceInt = balance.div(ethers.BigNumber.from(10).pow(18)).toNumber() + 1
        // Random Amount between 1 and max amount transferred to contract
        const transferAmount = Math.floor(Math.random() * (amountInt - balanceInt + 1)) + balanceInt
        const transferAmountBig = ethers.BigNumber.from(transferAmount).mul(ethers.BigNumber.from(10).pow(18))
        const tx = publicSale.transferTokensToAddress(addr1.address, transferAmountBig.toString())

        await expect(tx)
          .to.revertedWith("PublicSale::transferTokensToAddress: amount greater than balance")
      })
    })
  })
})
