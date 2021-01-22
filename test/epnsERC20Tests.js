// Ported Test cases from --> https://github.com/mancze/token-test-suite

// Import helper functions
const { expectRevertOrFail, bn } = require('../helpers/helpers');

// We import Chai to use its asserting functions here.
const { expect } = require("chai");

describe("Token ERC-20 Test Cases", function () {
  const tokenInfo = {
    // token info to test
    name: 'Ethereum Push Notification Service',
    symbol: 'PUSH',
    decimals: 18,
    supply: 100000000, // 100 Million $PUSH
  }

  const initialSupply = bn(tokenInfo.supply, 0).mul(bn(10).pow(bn(tokenInfo.decimals))); // 100 Million Tokens

  // Define configuration initial
  let initialBalances;
  let initialAllowances;
  let create;

  let Token;
  let token;
  let accounts;
  let tokens;
  let uintMax;

  let contract;
  let decimals;

  let options;

  let owner;
  let alice;
  let bob;
  let charles;

  // `beforeEach` will run before each test, re-deploying the contract every
  // time. It receives a callback, which can be async.
  before(async function () {
    accounts = await ethers.provider.listAccounts();
    [owner, alice, bob, charles] = await ethers.getSigners();

    // Define Options
    options = {
      // factory method to create new token contract
      create: async function () {
      	Token = await ethers.getContractFactory("EPNS");
        return Token.deploy(owner.address);
      },

      // factory callbacks to mint the tokens
      // use "transfer" instead of "mint" for non-mintable tokens
      mint: async function (token, to, amount) {
      	return await token.transfer(to, amount, { from: accounts[0] });
      },

      // token info to test
      name: tokenInfo.name,
      symbol: tokenInfo.symbol,
      decimals: tokenInfo.decimals,

      // initial state to test
      initialBalances: [
      	[owner, initialSupply]
      ],
      initialAllowances: [
      	[owner, alice, 0]
      ]
    };

    // configure
  	initialBalances = options.initialBalances || []
  	initialAllowances = options.initialAllowances || []
  	create = options.create

  	// setup
    tokens = function (amount) { return bn(amount).mul(bn(10).pow(decimals)) }
  	uintMax = bn(2).pow(bn(256)).sub(1)

  	contract = null
  	decimals = 0
  });

  beforeEach(async function () {
  	contract = await create()
  	decimals = (contract.decimals ? await contract.decimals() : 0)

  	if (options.beforeEach) {
  		await options.beforeEach(contract)
  	}
  })

  afterEach(async function () {
  	if (options.afterEach) {
  		await options.afterEach(contract)
  	}
  	contract = null
  	decimals = 0
  })

  describe('ERC-20 Standard Calls', function () {
		describe('Function --> totalSupply()', function () {
			it(`should have initial supply of ${initialSupply.toString()}`, async function () {
				expect(await contract.totalSupply()).to.equal(initialSupply)
			})

			it('should return the correct supply', async function () {
				await contract.transfer(alice.address, tokens(1))
				expect(await contract.totalSupply()).to.equal(initialSupply)

				await contract.transfer(alice.address, tokens(2))
				expect(await contract.totalSupply()).to.equal(initialSupply)

				await contract.transfer(bob.address, tokens(3))
  			expect(await contract.totalSupply()).to.equal(initialSupply)
			})
		})

    describe('Function --> balanceOf(_owner)', function () {
      it('should have correct initial balances', async function () {
        for (let i = 0; i < initialBalances.length; i++) {
          let address = initialBalances[i][0].address
          let balance = initialBalances[i][1]
          expect(await contract.balanceOf(address)).to.equal(balance)
        }
      })

      it('should return the correct balances', async function () {
        await contract.transfer(alice.address, tokens(1))
        expect(await contract.balanceOf(alice.address)).to.equal(tokens(1))

        await contract.transfer(alice.address, tokens(2))
        expect(await contract.balanceOf(alice.address)).to.equal(tokens(3))

        await contract.transfer(bob.address, tokens(3))
        expect(await contract.balanceOf(bob.address)).to.equal(tokens(3))
      })
    })
  })

	describe('Function --> allowance(_owner, _spender)', function () {
		// describeIt(when('_owner != _spender'), alice, bob)
		// describeIt(when('_owner == _spender'), alice, alice)

		it('should have correct initial allowance', async function () {
			for (let i = 0; i < initialAllowances.length; i++) {
        console.log(initialAllowances[i]);
				let owner = initialAllowances[i][0]
				let spender = initialAllowances[i][1]
				let expectedAllowance = initialAllowances[i][2]
				expect(await contract.allowance(owner.address, spender.address)).to.equal(expectedAllowance)
			}
		})

		it('should return the correct allowance', async function () {
			await contract.connect(alice).approve(bob.address, tokens(1))
			await contract.connect(alice).approve(charles.address, tokens(2))
			await contract.connect(bob).approve(charles.address, tokens(3))
			await contract.connect(bob).approve(alice.address, tokens(4))
			await contract.connect(charles).approve(alice.address, tokens(5))
			await contract.connect(charles).approve(bob.address, tokens(6))

			expect(await contract.allowance(alice.address, bob.address)).to.equal(tokens(1))
			expect(await contract.allowance(alice.address, charles.address)).to.equal(tokens(2))
			expect(await contract.allowance(bob.address, charles.address)).to.equal(tokens(3))
			expect(await contract.allowance(bob.address, alice.address)).to.equal(tokens(4))
			expect(await contract.allowance(charles.address, alice.address)).to.equal(tokens(5))
			expect(await contract.allowance(charles.address, bob.address)).to.equal(tokens(6))
		})

		function describeIt(name, from, to) {
			describe(name, function () {
				it('should return the correct allowance', async function () {
					await contract.approve(to, tokens(1), { from: from })
					expect(await contract.allowance(from, to)).to.equal(tokens(1))
				})
			})
		}
	})

  //
	// 	// NOTE: assumes that approve should always succeed
	// 	describe('approve(_spender, _value)', function () {
	// 		describeIt(when('_spender != sender'), alice, bob)
	// 		describeIt(when('_spender == sender'), alice, alice)
  //
	// 		function describeIt(name, from, to) {
	// 			describe(name, function () {
	// 				it('should return true when approving 0', async function () {
	// 					assert.isTrue(await contract.approve(to, 0, { from: from }))
	// 				})
  //
	// 				it('should return true when approving', async function () {
	// 					assert.isTrue(await contract.approve(to, tokens(3), { from: from }))
	// 				})
  //
	// 				it('should return true when updating approval', async function () {
	// 					assert.isTrue(await contract.approve(to, tokens(2), { from: from }))
	// 					await contract.approve(to, tokens(2), { from: from })
  //
	// 					// test decreasing approval
	// 					assert.isTrue(await contract.approve(to, tokens(1), { from: from }))
  //
	// 					// test not-updating approval
	// 					assert.isTrue(await contract.approve(to, tokens(2), { from: from }))
  //
	// 					// test increasing approval
	// 					assert.isTrue(await contract.approve(to, tokens(3), { from: from }))
	// 				})
  //
	// 				it('should return true when revoking approval', async function () {
	// 					await contract.approve(to, tokens(3), { from: from })
	// 					assert.isTrue(await contract.approve(to, tokens(0), { from: from }))
	// 				})
  //
	// 				it('should update allowance accordingly', async function () {
	// 					await contract.approve(to, tokens(1), { from: from })
	// 					expect(await contract.allowance(from, to)).to.equal(tokens(1))
  //
	// 					await contract.approve(to, tokens(3), { from: from })
	// 					expect(await contract.allowance(from, to)).to.equal(tokens(3))
  //
	// 					await contract.approve(to, 0, { from: from })
	// 					expect(await contract.allowance(from, to)).to.equal('0')
	// 				})
  //
	// 				it('should fire Approval event', async function () {
	// 					await testApprovalEvent(from, to, tokens(1))
	// 					if (from != to) {
	// 						await testApprovalEvent(to, from, tokens(2))
	// 					}
	// 				})
  //
	// 				it('should fire Approval when allowance was set to 0', async function () {
	// 					await contract.approve(to, tokens(3), { from: from })
	// 					await testApprovalEvent(from, to, 0)
	// 				})
  //
	// 				it('should fire Approval even when allowance did not change', async function () {
	// 					// even 0 -> 0 should fire Approval event
	// 					await testApprovalEvent(from, to, 0)
  //
	// 					await contract.approve(to, tokens(3), { from: from })
	// 					await testApprovalEvent(from, to, tokens(3))
	// 				})
	// 			})
	// 		}
  //
	// 		async function testApprovalEvent(from, to, amount) {
	// 			let result = await contract.approve(to, amount, { from: from })
	// 			let log = result.logs[0]
	// 			assert.equal(log.event, 'Approval')
	// 			assert.equal(log.args.owner, from)
	// 			assert.equal(log.args.spender, to)
	// 			expect(log.args.value).to.equal(bn(amount))
	// 		}
	// 	})
  //
	// 	describe('transfer(_to, _value)', function () {
	// 		describeIt(when('_to != sender'), alice, bob)
	// 		describeIt(when('_to == sender'), alice, alice)
  //
	// 		function describeIt(name, from, to) {
	// 			describe(name, function () {
	// 				it('should return true when called with amount of 0', async function () {
	// 					assert.isTrue(await contract.transfer(to, 0, { from: from }))
	// 				})
  //
	// 				it('should return true when transfer can be made, false otherwise', async function () {
	// 					await credit(from, tokens(3))
	// 					assert.isTrue(await contract.transfer(to, tokens(1), { from: from }))
	// 					assert.isTrue(await contract.transfer(to, tokens(2), { from: from }))
	// 					assert.isTrue(await contract.transfer(to, tokens(3), { from: from }))
  //
	// 					await contract.transfer(to, tokens(1), { from: from })
	// 					assert.isTrue(await contract.transfer(to, tokens(1), { from: from }))
	// 					assert.isTrue(await contract.transfer(to, tokens(2), { from: from }))
	// 				})
  //
	// 				it('should revert when trying to transfer something while having nothing', async function () {
	// 					await expectRevertOrFail(contract.transfer(to, tokens(1), { from: from }))
	// 				})
  //
	// 				it('should revert when trying to transfer more than balance', async function () {
	// 					await credit(from, tokens(3))
	// 					await expectRevertOrFail(contract.transfer(to, tokens(4), { from: from }))
  //
	// 					await contract.transfer('0x0000000000000000000000000000000000000001', tokens(1), { from: from })
	// 					await expectRevertOrFail(contract.transfer(to, tokens(3), { from: from }))
	// 				})
  //
	// 				it('should not affect totalSupply', async function () {
	// 					await credit(from, tokens(3))
	// 					let supply1 = await contract.totalSupply()
	// 					await contract.transfer(to, tokens(3), { from: from })
	// 					let supply2 = await contract.totalSupply()
	// 					expect(supply2).to.be.be.bignumber.equal(supply1)
	// 				})
  //
	// 				it('should update balances accordingly', async function () {
	// 					await credit(from, tokens(3))
	// 					let fromBalance1 = await contract.balanceOf(from)
	// 					let toBalance1 = await contract.balanceOf(to)
  //
	// 					await contract.transfer(to, tokens(1), { from: from })
	// 					let fromBalance2 = await contract.balanceOf(from)
	// 					let toBalance2 = await contract.balanceOf(to)
  //
	// 					if (from == to) {
	// 						expect(fromBalance2).to.equal(fromBalance1)
	// 					}
	// 					else {
	// 						expect(fromBalance2).to.equal(fromBalance1.sub(tokens(1)))
	// 						expect(toBalance2).to.equal(toBalance1.add(tokens(1)))
	// 					}
  //
	// 					await contract.transfer(to, tokens(2), { from: from })
	// 					let fromBalance3 = await contract.balanceOf(from)
	// 					let toBalance3 = await contract.balanceOf(to)
  //
	// 					if (from == to) {
	// 						expect(fromBalance3).to.equal(fromBalance2)
	// 					}
	// 					else {
	// 						expect(fromBalance3).to.equal(fromBalance2.sub(tokens(2)))
	// 						expect(toBalance3).to.equal(toBalance2.add(tokens(2)))
	// 					}
	// 				})
  //
	// 				it('should fire Transfer event', async function () {
	// 					await testTransferEvent(from, to, tokens(3))
	// 				})
  //
	// 				it('should fire Transfer event when transferring amount of 0', async function () {
	// 					await testTransferEvent(from, to, 0)
	// 				})
	// 			})
	// 		}
  //
	// 		async function testTransferEvent(from, to, amount) {
	// 			if (amount > 0) {
	// 				await credit(from, amount)
	// 			}
  //
	// 			let result = await contract.transfer(to, amount, { from: from })
	// 			let log = result.logs[0]
	// 			assert.equal(log.event, 'Transfer')
	// 			assert.equal(log.args.from, from)
	// 			assert.equal(log.args.to, to)
	// 			expect(log.args.value).to.equal(bn(amount))
	// 		}
	// 	})
  //
	// 	describe('transferFrom(_from, _to, _value)', function () {
	// 		describeIt(when('_from != _to and _to != sender'), alice, bob, charles)
	// 		describeIt(when('_from != _to and _to == sender'), alice, bob, bob)
	// 		describeIt(when('_from == _to and _to != sender'), alice, alice, bob)
	// 		describeIt(when('_from == _to and _to == sender'), alice, alice, alice)
  //
	// 		it('should revert when trying to transfer while not allowed at all', async function () {
	// 			await credit(alice, tokens(3))
	// 			await expectRevertOrFail(contract.transferFrom(alice, bob, tokens(1), { from: bob }))
	// 			await expectRevertOrFail(contract.transferFrom(alice, charles, tokens(1), { from: bob }))
	// 		})
  //
	// 		it('should fire Transfer event when transferring amount of 0 and sender is not approved', async function () {
	// 			await testTransferEvent(alice, bob, bob, 0)
	// 		})
  //
	// 		function describeIt(name, from, via, to) {
	// 			describe(name, function () {
	// 				beforeEach(async function () {
	// 					// by default approve sender (via) to transfer
	// 					await contract.approve(via, tokens(3), { from: from })
	// 				})
  //
	// 				it('should return true when called with amount of 0 and sender is approved', async function () {
	// 					assert.isTrue(await contract.transferFrom(from, to, 0, { from: via }))
	// 				})
  //
	// 				it('should return true when called with amount of 0 and sender is not approved', async function () {
	// 					assert.isTrue(await contract.transferFrom(to, from, 0, { from: via }))
	// 				})
  //
	// 				it('should return true when transfer can be made, false otherwise', async function () {
	// 					await credit(from, tokens(3))
	// 					assert.isTrue(await contract.transferFrom(from, to, tokens(1), { from: via }))
	// 					assert.isTrue(await contract.transferFrom(from, to, tokens(2), { from: via }))
	// 					assert.isTrue(await contract.transferFrom(from, to, tokens(3), { from: via }))
  //
	// 					await contract.transferFrom(from, to, tokens(1), { from: via })
	// 					assert.isTrue(await contract.transferFrom(from, to, tokens(1), { from: via }))
	// 					assert.isTrue(await contract.transferFrom(from, to, tokens(2), { from: via }))
	// 				})
  //
	// 				it('should revert when trying to transfer something while _from having nothing', async function () {
	// 					await expectRevertOrFail(contract.transferFrom(from, to, tokens(1), { from: via }))
	// 				})
  //
	// 				it('should revert when trying to transfer more than balance of _from', async function () {
	// 					await credit(from, tokens(2))
	// 					await expectRevertOrFail(contract.transferFrom(from, to, tokens(3), { from: via }))
	// 				})
  //
	// 				it('should revert when trying to transfer more than allowed', async function () {
	// 					await credit(from, tokens(4))
	// 					await expectRevertOrFail(contract.transferFrom(from, to, tokens(4), { from: via }))
	// 				})
  //
	// 				it('should not affect totalSupply', async function () {
	// 					await credit(from, tokens(3))
	// 					let supply1 = await contract.totalSupply()
	// 					await contract.transferFrom(from, to, tokens(3), { from: via })
	// 					let supply2 = await contract.totalSupply()
	// 					expect(supply2).to.be.be.bignumber.equal(supply1)
	// 				})
  //
	// 				it('should update balances accordingly', async function () {
	// 					await credit(from, tokens(3))
	// 					let fromBalance1 = await contract.balanceOf(from)
	// 					let viaBalance1 = await contract.balanceOf(via)
	// 					let toBalance1 = await contract.balanceOf(to)
  //
	// 					await contract.transferFrom(from, to, tokens(1), { from: via })
	// 					let fromBalance2 = await contract.balanceOf(from)
	// 					let viaBalance2 = await contract.balanceOf(via)
	// 					let toBalance2 = await contract.balanceOf(to)
  //
	// 					if (from == to) {
	// 						expect(fromBalance2).to.equal(fromBalance1)
	// 					}
	// 					else {
	// 						expect(fromBalance2).to.equal(fromBalance1.sub(tokens(1)))
	// 						expect(toBalance2).to.equal(toBalance1.add(tokens(1)))
	// 					}
  //
	// 					if (via != from && via != to) {
	// 						expect(viaBalance2).to.equal(viaBalance1)
	// 					}
  //
	// 					await contract.transferFrom(from, to, tokens(2), { from: via })
	// 					let fromBalance3 = await contract.balanceOf(from)
	// 					let viaBalance3 = await contract.balanceOf(via)
	// 					let toBalance3 = await contract.balanceOf(to)
  //
	// 					if (from == to) {
	// 						expect(fromBalance3).to.equal(fromBalance2)
	// 					}
	// 					else {
	// 						expect(fromBalance3).to.equal(fromBalance2.sub(tokens(2)))
	// 						expect(toBalance3).to.equal(toBalance2.add(tokens(2)))
	// 					}
  //
	// 					if (via != from && via != to) {
	// 						expect(viaBalance3).to.equal(viaBalance2)
	// 					}
	// 				})
  //
	// 				it('should update allowances accordingly', async function () {
	// 					await credit(from, tokens(3))
	// 					let viaAllowance1 = await contract.allowance(from, via)
	// 					let toAllowance1 = await contract.allowance(from, to)
  //
	// 					await contract.transferFrom(from, to, tokens(2), { from: via })
	// 					let viaAllowance2 = await contract.allowance(from, via)
	// 					let toAllowance2 = await contract.allowance(from, to)
  //
	// 					expect(viaAllowance2).to.equal(viaAllowance1.sub(tokens(2)))
  //
	// 					if (to != via) {
	// 						expect(toAllowance2).to.equal(toAllowance1)
	// 					}
  //
	// 					await contract.transferFrom(from, to, tokens(1), { from: via })
	// 					let viaAllowance3 = await contract.allowance(from, via)
	// 					let toAllowance3 = await contract.allowance(from, to)
  //
	// 					expect(viaAllowance3).to.equal(viaAllowance2.sub(tokens(1)))
  //
	// 					if (to != via) {
	// 						expect(toAllowance3).to.equal(toAllowance1)
	// 					}
	// 				})
  //
	// 				it('should fire Transfer event', async function () {
	// 					await testTransferEvent(from, via, to, tokens(3))
	// 				})
  //
	// 				it('should fire Transfer event when transferring amount of 0', async function () {
	// 					await testTransferEvent(from, via, to, 0)
	// 				})
	// 			})
	// 		}
  //
	// 		async function testTransferEvent(from, via, to, amount) {
	// 			if (amount > 0) {
	// 				await credit(from, amount)
	// 			}
  //
	// 			let result = await contract.transferFrom(from, to, amount, { from: via })
	// 			let log = result.logs[0]
	// 			assert.equal(log.event, 'Transfer')
	// 			assert.equal(log.args.from, from)
	// 			assert.equal(log.args.to, to)
	// 			expect(log.args.value).to.equal(bn(amount))
	// 		}
	// 	})
	// })
  //
	// describe('ERC-20 optional', function () {
	// 	describe('name()', function () {
	// 		if (options.name != null ) {
	// 			it("should return '" + options.name + "'", async function () {
	// 				assert.equal(await contract.name(), options.name)
	// 			})
	// 		}
	// 	})
  //
	// 	describe('symbol()', function () {
	// 		if (options.symbol != null) {
	// 			it("should return '" + options.symbol + "'", async function () {
	// 				assert.equal(await contract.symbol(), options.symbol)
	// 			})
	// 		}
	// 	})
  //
	// 	describe('decimals()', function () {
	// 		if (options.decimals != null) {
	// 			it("should return '" + options.decimals + "'", async function () {
	// 				expect(await contract.decimals()).to.equal(bn(options.decimals))
	// 			})
	// 		}
	// 	})
	// })
  //
	// if (options.increaseDecreaseApproval) {
	// 	describe('approvals', function () {
	// 		describe('increaseApproval(_spender, _addedValue)', function () {
	// 			it('should return true when increasing approval', async function () {
	// 				assert.isTrue(await contract.increaseApproval(bob, 0, { from: alice }))
	// 				assert.isTrue(await contract.increaseApproval(bob, uintMax, { from: alice }))
  //
	// 				await contract.increaseApproval(bob, tokens(3), { from: alice })
	// 				assert.isTrue(await contract.increaseApproval(bob, 0, { from: alice }))
	// 				assert.isTrue(await contract.increaseApproval(bob, tokens(3), { from: alice }))
	// 			})
  //
	// 			it('should revert when approval cannot be increased', async function () {
	// 				await contract.increaseApproval(bob, tokens(1), { from: alice })
	// 				await expectRevertOrFail(contract.increaseApproval(bob, uintMax, { from: alice }))
	// 			})
  //
	// 			it('should update allowance accordingly', async function () {
	// 				await contract.increaseApproval(bob, tokens(1), { from: alice })
	// 				expect(await contract.allowance(alice, bob)).to.equal(tokens(1))
  //
	// 				await contract.increaseApproval(bob, tokens(2), { from: alice })
	// 				expect(await contract.allowance(alice, bob)).to.equal(tokens(3))
  //
	// 				await contract.increaseApproval(bob, 0, { from: alice })
	// 				expect(await contract.allowance(alice, bob)).to.equal(tokens(3))
	// 			})
  //
	// 			it('should fire Approval event', async function () {
	// 				await testApprovalEvent(alice, bob, 0, tokens(1))
	// 				await testApprovalEvent(alice, bob, tokens(1), tokens(2))
	// 			})
  //
	// 			it('should fire Approval even when allowance did not change', async function () {
	// 				await testApprovalEvent(alice, bob, 0, 0)
  //
	// 				await contract.increaseApproval(bob, tokens(3), { from: alice })
	// 				await testApprovalEvent(alice, bob, tokens(3), 0)
	// 			})
  //
	// 			async function testApprovalEvent(from, to, fromAmount, byAmount) {
	// 				let result = await contract.increaseApproval(to, byAmount, { from: from })
	// 				assert.equal(log.event, 'Approval')
	// 				assert.equal(log.args.owner, from)
	// 				assert.equal(log.args.spender, to)
	// 				expect(log.args.value).to.equal(bn(fromAmount).add(byAmount))
	// 			}
	// 		})
  //
	// 		describe('decreaseApproval(_spender, _subtractedValue)', function () {
	// 			beforeEach(async function () {
	// 				await contract.approve(bob, tokens(3), { from: alice })
	// 			})
  //
	// 			it('should return true when decreasing approval', async function () {
	// 				assert.isTrue(await contract.decreaseApproval(bob, 0, { from: alice }))
	// 				assert.isTrue(await contract.decreaseApproval(bob, tokens(3), { from: alice }))
	// 			})
  //
	// 			it('should return true when approval cannot be decreased', async function () {
	// 				assert.isTrue(await contract.decreaseApproval(bob, uintMax, { from: alice }))
	// 			})
  //
	// 			it('should update allowance accordingly', async function () {
	// 				await contract.decreaseApproval(bob, tokens(1), { from: alice })
	// 				expect(await contract.allowance(alice, bob)).to.equal(tokens(2))
  //
	// 				await contract.decreaseApproval(bob, tokens(3), { from: alice })
	// 				expect(await contract.allowance(alice, bob)).to.equal(0)
  //
	// 				await contract.decreaseApproval(bob, 0, { from: alice })
	// 				expect(await contract.allowance(alice, bob)).to.equal(0)
	// 			})
  //
	// 			it('should fire Approval event', async function () {
	// 				await testApprovalEvent(alice, bob, tokens(3), tokens(1))
	// 				await testApprovalEvent(alice, bob, tokens(2), tokens(2))
	// 			})
  //
	// 			it('should fire Approval even when allowance did not change', async function () {
	// 				await testApprovalEvent(alice, bob, tokens(3), 0)
  //
	// 				await contract.decreaseApproval(bob, tokens(3), { from: alice })
	// 				await testApprovalEvent(alice, bob, 0, 0)
	// 			})
  //
	// 			async function testApprovalEvent(from, to, fromAmount, byAmount) {
	// 				let result = await contract.decreaseApproval(to, byAmount, { from: from })
	// 				let log = result.logs[0]
	// 				assert.equal(log.event, 'Approval')
	// 				assert.equal(log.args.owner, from)
	// 				assert.equal(log.args.spender, to)
	// 				expect(log.args.value).to.equal(bn(fromAmount).sub(byAmount))
	// 			}
	// 		})
	// 	})
	// }
});
