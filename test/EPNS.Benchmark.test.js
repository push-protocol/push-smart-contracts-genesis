// Import helper functions
const { expectRevertOrFail, bn } = require('../helpers/helpers');

// We import Chai to use its asserting functions here.
const { expect } = require("chai");

describe("Benchmaking EPNS Contracts", function () {
  before(async function () {
    // Get the ContractFactory and Signers here.x
    owner = await ethers.getSigner(0)

    const Benchmark0 = await ethers.getContractFactory("EPNS")
    await Benchmark0.deploy(owner.address)

    Benchmark1 = await ethers.getContractFactory("EPNSBenchmarkV1")
    await Benchmark1.deploy(owner.address)
  })

  it("Deploy all EPNS Contracts and Benchmark", async function (done) {
    done()
  })
})
