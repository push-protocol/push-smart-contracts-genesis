// We import Chai to use its asserting functions here.
const { expect } = require("chai");
const {
  TOKEN_INFO,
  META_INFO
} = require("../../scripts/constants");

// `describe` is a Mocha function that allows you to organize your tests. It's
// not actually needed, but having your tests organized makes debugging them
// easier. All Mocha functions are available in the global scope.

// `describe` receives the name of a section of your test suite, and a callback.
// The callback must define the tests of that section. This callback can't be
// an async function.
describe("Team Vesting Contract", function () {
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
  let TeamFactory;
  let teamFactory;

  // `beforeEach` will run before each test, re-deploying the contract every
  // time. It receives a callback, which can be async.
  beforeEach(async function () {
    // Get the ContractFactory and Signers here.
    Token = await ethers.getContractFactory("EPNS");
    TeamFactory = await ethers.getContractFactory("TeamFactory");

    [owner, beneficiary, addr1, ...addrs] = await ethers.getSigners()

    // To deploy our contract, we just have to call Token.deploy() and await
    // for it to be deployed(), which happens onces its transaction has been
    // mined.
    epnsToken = await Token.deploy(owner.address)

    const now = (await ethers.provider.getBlock()).timestamp
    start = now + 60
    cliffDuration = 31536000 // 1 Year
    duration = cliffDuration + 31536000 // 2 Years
  })

  // You can nest describe calls to create subsections.
  describe("Vesting Contracts Tests", function () {
    // `it` is another Mocha function. This is the one you use to define your
    // tests. It receives the test name, and a callback function.
    describe("TeamFactory Tests", function () {
      beforeEach(async function () {
        // To deploy our contract, we just have to call Token.deploy() and await
        // for it to be deployed(), which happens onces its transaction has been
        // mined.
        teamFactory = await TeamFactory.deploy(
          epnsToken.address,
          start,
          cliffDuration
        )
        epnsToken.transfer(teamFactory.address, TOKEN_INFO.team)
      })

      it("Should deploy TeamFactory Contract", async function () {
        expect(teamFactory.address).to.not.equal(null)
      })

      it("Should revert when trying to put in zero address for pushtoken", async function () {
        const teamFactoryInstance = TeamFactory.deploy(
          "0x0000000000000000000000000000000000000000",
          start,
          cliffDuration
        )

        await expect(teamFactoryInstance)
          .to.revertedWith("TeamFactory::constructor: pushtoken is the zero address")
      })

      it("Should revert when trying to set cliff Duration 0", async function () {
        const teamFactoryInstance = TeamFactory.deploy(
          epnsToken.address,
          start,
          0
        )

        await expect(teamFactoryInstance)
          .to.revertedWith("TeamFactory::constructor: cliff duration is 0")
      })

      it("Should revert when trying to set cliff time before current time", async function () {
        const oldDate = Math.floor(new Date("1 JAN 2020") / 1000)
        const oneMinuteCliff = 60
        const teamFactoryInstance = TeamFactory.deploy(
          epnsToken.address,
          oldDate,
          oneMinuteCliff
        )

        await expect(teamFactoryInstance)
          .to.revertedWith("TeamFactory::constructor: cliff time is before current time")
      })

      it("Should assign sum of start and cliff duration to cliff of contract", async function () {
        const cliff = await teamFactory.cliff()
        expect(cliff).to.equal(start + cliffDuration)
      })

      it("Should assign push token address to contract", async function () {
        const pushAddress = await teamFactory.pushToken()
        expect(pushAddress).to.equal(epnsToken.address)
      })

      it("Should deploy a team vesting contract", async function () {
        const tx = await teamFactory.deployTeam(
          addr1.address,
          start,
          cliffDuration,
          duration,
          true,
          TOKEN_INFO.team
        )
        expect(tx)
      })

      it("Should revoke the team contract by owner and get tokens refunded", async function () {
        await teamFactory.deployTeam(
          addr1.address,
          start,
          cliffDuration,
          duration,
          true,
          TOKEN_INFO.team
        )
        const eventEmitted = (
          await teamFactory.queryFilter("DeployTeam")
        )[0]

        await teamFactory.revokeTeamTokens(eventEmitted.args.teamAddress)

        const balance = (await epnsToken.balanceOf(teamFactory.address)).toString()

        expect(balance).to.equal(TOKEN_INFO.team)
      })

      it("Should revert when trying to withdraw tokens before cliff time", async function () {
        const balanceTeam = (await epnsToken.balanceOf(teamFactory.address)).toString()
        const tx = teamFactory.withdrawTokens(balanceTeam)

        await expect(tx)
          .to.revertedWith("TeamFactory::withdrawTokens: cliff period not complete")
      })

      it("Should transfer tokens to owner when withdrawing after cliff time", async function () {
        await ethers.provider.send("evm_setNextBlockTimestamp", [
          start + cliffDuration + 86400, // 1 Day after cliffDuration
        ])

        const balanceTeam = (await epnsToken.balanceOf(teamFactory.address)).toString()
        await teamFactory.withdrawTokens(balanceTeam)
        const balanceOwner = (await epnsToken.balanceOf(owner.address)).toString()
        await ethers.provider.send("evm_mine")
        expect(balanceOwner).to.equal(TOKEN_INFO.total)
      })
    })
  })
})
