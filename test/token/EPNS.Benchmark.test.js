// Import helper functions
const { bn } = require('../../helpers/helpers');

// We import Chai to use its asserting functions here.
const { expect } = require("chai");

describe("Benchmaking Contracts", async function () {
  const tokens = function (amount) { return bn(amount).mul(bn(10).pow(18)) }

  // Get addresses
  let owner
  let alice
  let bob
  let charles

  // To load benchmarks
  let EPNSBenchmarks

  // Initialize
  before(async function () {
    [owner, alice, bob, charles] = await ethers.getSigners()

    // Define all benchmarks
    EPNSBenchmarks = [
      {
        name: "EPNS",
        changes: "ERC20 + Governance + Reward Sharing + Events",
        args: [owner.address],
        functions: [
          {
            call: `approve('${alice.address}', '${tokens(1).toString()}')`,
            from: owner
          },
          {
            call: `transfer('${alice.address}', '${tokens(1).toString()}')`,
            from: owner
          },
          {
            call: `transferFrom('${owner.address}', '${alice.address}', '${tokens(1).toString()}')`,
            from: owner
          },
          {
            call: `burn('${tokens(1).toString()}')`,
            from: owner
          },
        ]
      },
      {
        name: "EPNSBenchmarkV3",
        changes: "ERC20 + Governance + Reward Sharing",
        args: [owner.address],
        functions: [
          {
            call: `approve('${alice.address}', '${tokens(1).toString()}')`,
            from: owner
          },
          {
            call: `transfer('${alice.address}', '${tokens(1).toString()}')`,
            from: owner
          },
          {
            call: `transferFrom('${owner.address}', '${alice.address}', '${tokens(1).toString()}')`,
            from: owner
          },
          {
            call: `burn('${tokens(1).toString()}')`,
            from: owner
          },
        ]
      },
      {
        name: "EPNSBenchmarkV2",
        changes: "ERC20 + Governance",
        args: [owner.address],
        functions: [
          {
            call: `approve('${alice.address}', '${tokens(1).toString()}')`,
            from: owner
          },
          {
            call: `transfer('${alice.address}', '${tokens(1).toString()}')`,
            from: owner
          },
          {
            call: `transferFrom('${owner.address}', '${alice.address}', '${tokens(1).toString()}')`,
            from: owner
          },
          {
            call: `burn('${tokens(1).toString()}')`,
            from: owner
          },
        ]
      },
      {
        name: "EPNSBenchmarkV1",
        changes: "ERC20",
        args: [owner.address],
        functions: [
          {
            call: `approve('${alice.address}', '${tokens(1).toString()}')`,
            from: owner
          },
          {
            call: `transfer('${alice.address}', '${tokens(1).toString()}')`,
            from: owner
          },
          {
            call: `transferFrom('${owner.address}', '${alice.address}', '${tokens(1).toString()}')`,
            from: owner
          },
          {
            call: `burn('${tokens(1).toString()}')`,
            from: owner
          },
        ]
      }
    ]
  })

  // Prepare benchmarks
  describe("Running Benchmark on EPNS.sol", async function () {
    let deployments = []

    beforeEach(async function () {
      for (const item of EPNSBenchmarks) {
        const Contract = await ethers.getContractFactory(`${item.name}`)
        const deployedContract = await Contract.deploy(`${item.args.join(',')}`)
        const deployed = {
          name: item.name,
          contract: deployedContract,
          calls: item.functions
        }

        deployments.push(deployed)
      }

    })

    afterEach(async function () {
      //deployments = []
    })

    it(`Benchmarking...`, async function () {
      for (const item of deployments) {
        const contract = item.contract
        for (const func of item.calls) {
          const AsyncFunction = Object.getPrototypeOf(async function(){}).constructor;

          let execute = new AsyncFunction('contract', 'func', `await contract.${func.call}`)
          const tx = await execute(contract, func)
        }
      }
    })

  })

})
