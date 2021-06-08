const {
  STAKING_INFO
} = require("../../scripts/constants/constants")
const { tokensBN, bnToInt, vestedAmount, tokens } = require('../../helpers/utils')

const { expect } = require("chai")

describe("BatchTransferPUSH Contract tests", function () {
  let Token
  let token

  let Rockstar
  let rockstar

  let Contract
  let contract

  let owner
  let alice
  let bob
  let addrs

  let defaultAmount = tokensBN(1000000);

  // `beforeEach` will run before each test, re-deploying the contract every
  // time. It receives a callback, which can be async.
  beforeEach(async function () {
    // Get the ContractFactory and Signers here.
    [owner, alice, bob, ...addrs] = await ethers.getSigners()

    Token = await ethers.getContractFactory("EPNS")
    Contract = await ethers.getContractFactory("BatchTransferPUSH")

    token = await Token.deploy(owner.address)
    contract = await Contract.deploy()
    token.transfer(contract.address, defaultAmount)
  })

  afterEach(async function () {
    token = null
    contract = null
  })

  it("Should revert if someone else tries to send tokens", async function() {
    let individualTransferInfo = STAKING_INFO.stakingInfo.helpers.convertUserObjectToIndividualArrays(STAKING_INFO.stakingInfo.pushUsersMapping)

    const tx = contract.connect(alice).transferPUSH(token.address, individualTransferInfo.recipients, individualTransferInfo.amounts, 0, 340)

    await expect(tx).to.be.revertedWith('Ownable: caller is not the owner')
  });

  it("should revert if array of recipient is not equal to array of amounts", async function () {
    // get individual nfts array
    let individualTransferInfo = STAKING_INFO.stakingInfo.helpers.convertUserObjectToIndividualArrays(STAKING_INFO.stakingInfo.pushUsersMapping)
    individualTransferInfo.amounts.pop()

    expect(individualTransferInfo.recipients.length).to.be.equal(340)
    expect(individualTransferInfo.amounts.length).to.be.equal(339)

    await expect(contract.transferPUSH(token.address, individualTransferInfo.recipients, individualTransferInfo.amounts, 0, 340))
      .to.be.revertedWith('BatchTransferPUSH::transferPUSH: recipients and amounts count mismatch')
  });

  it("should run correctly (batched)", async function () {
    // get individual nfts array
    let individualTransferInfo = STAKING_INFO.stakingInfo.helpers.convertUserObjectToIndividualArrays(STAKING_INFO.stakingInfo.pushUsersMapping)

    let increment = 120
    let paged = 0
    let count = 0
    let max = 340
    
    let beforeBalance = []

    for (let i = 0; i < max; i++) {
      const balance = await token.balanceOf(individualTransferInfo.recipients[i])
      beforeBalance.push(balance)
    }

    while (paged != max) {
      if (paged + increment > max) {
        paged = max
      }
      else {
        paged = paged + increment
      }

      await contract.transferPUSH(token.address, individualTransferInfo.recipients, individualTransferInfo.amounts, count, paged)
      count = paged
    }

    for (let i = 0; i < max; i++) {
      const newBalance = await token.balanceOf(individualTransferInfo.recipients[i])
      expect(individualTransferInfo.amounts[i]).to.equal(newBalance)
    }
  });

  it("Should revert if someone else tries to withdraw tokens", async function() {
    const tx = contract.connect(alice).withdrawTokens(token.address, defaultAmount);

    expect(tx).to.revertedWith('Ownable: caller is not the owner')
  });

  it("Should withdraw tokens back to owner", async function() {
    const beforeBalance = await token.balanceOf(owner.address)

    await contract.withdrawTokens(token.address, defaultAmount);

    expect(beforeBalance.add(defaultAmount)).to.equal(await token.balanceOf(owner.address))
  });

})
