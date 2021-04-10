// We import Chai to use its asserting functions here.
const { expect } = require("chai");
const {
  DISTRIBUTION_INFO,
  META_INFO
} = require("../../scripts/constants/constants");

// `describe` is a Mocha function that allows you to organize your tests. It's
// not actually needed, but having your tests organized makes debugging them
// easier. All Mocha functions are available in the global scope.

// `describe` receives the name of a section of your test suite, and a callback.
// The callback must define the tests of that section. This callback can't be
// an async function.
describe("FundsDistributor Contract", function () {
  // Mocha has four functions that let you hook into the the test runner's
  // lifecyle. These are: `before`, `beforeEach`, `after`, `afterEach`.

  // They're very useful to setup the environment for tests, and to clean it
  // up after they run.

  // A common pattern is to declare some variables, and assign them in the
  // `before` and `beforeEach` callbacks.

  let Token;
  let token;
  let owner;
  let beneficiary;
  let addr1;
  let addrs;
  let start;
  let cliffDuration;
  let duration;
  let Contract;
  let contract;

  // `beforeEach` will run before each test, re-deploying the contract every
  // time. It receives a callback, which can be async.
  beforeEach(async function () {
    // Get the ContractFactory and Signers here.
    Token = await ethers.getContractFactory("EPNS");
    Contract = await ethers.getContractFactory("FundsDistributorFactory");

    [owner, beneficiary, addr1, ...addrs] = await ethers.getSigners()

    const now = (await ethers.provider.getBlock()).timestamp
    start = now + 60
    cliffDuration = 31536000 // 1 Year
    duration = cliffDuration + 31536000 // 2 Years

    token = await Token.deploy(owner.address)
    contract = await Contract.deploy(
      token.address,
      start,
      cliffDuration,
      "FundsDistributorAlpha"
    )

    token.transfer(contract.address, DISTRIBUTION_INFO.team)
  })

  afterEach(async function () {
    token = null
    contract = null
  })

  it("Should deploy Contract Contract", async function () {
    expect(contract.address).to.not.equal(null)
  })

  it("Should revert when trying to put in zero address for pushtoken", async function () {
    const contractInstance = Contract.deploy(
      "0x0000000000000000000000000000000000000000",
      start,
      cliffDuration,
      "FundsDistributorAlpha"
    )

    await expect(contractInstance)
      .to.revertedWith("FundsDistributorFactory::constructor: pushtoken is the zero address")
  })

  it("Should revert when trying to set cliff Duration 0", async function () {
    const contractInstance = Contract.deploy(
      token.address,
      start,
      0,
      "FundsDistributorAlpha"
    )

    await expect(contractInstance)
      .to.revertedWith("FundsDistributorFactory::constructor: cliff duration is 0")
  })

  it("Should revert when trying to set cliff time before current time", async function () {
    const oldDate = Math.floor(new Date("1 JAN 2020") / 1000)
    const oneMinuteCliff = 60
    const contractInstance = Contract.deploy(
      token.address,
      oldDate,
      oneMinuteCliff,
      "FundsDistributorAlpha"
    )

    await expect(contractInstance)
      .to.revertedWith("FundsDistributorFactory::constructor: cliff time is before current time")
  })

  it("Should assign sum of start and cliff duration to cliff of contract", async function () {
    const cliff = await contract.cliff()
    expect(cliff).to.equal(start + cliffDuration)
  })

  it("Should assign push token address to contract", async function () {
    const pushAddress = await contract.pushToken()
    expect(pushAddress).to.equal(token.address)
  })

  it("Should deploy a team vesting contract", async function () {
    const tx = await contract.deployFundee(
      addr1.address,
      start,
      cliffDuration,
      duration,
      true,
      DISTRIBUTION_INFO.team,
      "teamVesting1"
    )
    expect(tx)
  })

  it("Should revoke the team contract by owner and get tokens refunded", async function () {
    await contract.deployFundee(
      addr1.address,
      start,
      cliffDuration,
      duration,
      true,
      DISTRIBUTION_INFO.team,
      "teamVesting1"
    )
    const eventEmitted = (
      await contract.queryFilter("DeployFundee")
    )[0]

    await contract.revokeFundeeTokens(eventEmitted.args.fundeeAddress)

    const balance = (await token.balanceOf(contract.address)).toString()

    expect(balance).to.equal(DISTRIBUTION_INFO.team)
  })

  it("Should revert when trying to withdraw tokens before cliff time", async function () {
    const balanceTeam = (await token.balanceOf(contract.address)).toString()
    const tx = contract.withdrawTokens(balanceTeam)

    await expect(tx)
      .to.revertedWith("FundsDistributorFactory::withdrawTokens: cliff period not complete")
  })

  it("Should transfer tokens to owner when withdrawing after cliff time", async function () {
    await ethers.provider.send("evm_setNextBlockTimestamp", [
      start + cliffDuration + 86400, // 1 Day after cliffDuration
    ])

    const balanceTeam = (await token.balanceOf(contract.address)).toString()
    await contract.withdrawTokens(balanceTeam)
    const balanceOwner = (await token.balanceOf(owner.address)).toString()
    await ethers.provider.send("evm_mine")
    expect(balanceOwner).to.equal(DISTRIBUTION_INFO.total)
  })

  it("should return the correct identifier", async function () {
    expect(await contract.identifier()).to.equal("FundsDistributorAlpha")
  })
})
