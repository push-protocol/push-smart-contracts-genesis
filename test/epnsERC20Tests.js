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
		describe('totalSupply()', function () {
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

    describe('balanceOf(_owner)', function () {
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

    describe('allowance(_owner, _spender)', function () {
      // Sub section
      describe(when('_owner != _spender'), function() {
        it('should return the correct allowance', async function () {
          await contract.connect(alice).approve(bob.address, tokens(1))
          expect(await contract.allowance(alice.address, bob.address)).to.equal(tokens(1))
        })
      })

      // Sub section
      describe(when('_owner == _spender'), function() {
        it('should return the correct allowance', async function () {
          await contract.connect(alice).approve(alice.address, tokens(1))
          expect(await contract.allowance(alice.address, alice.address)).to.equal(tokens(1))
        })
      })

  		it('should have correct initial allowance', async function () {
  			for (let i = 0; i < initialAllowances.length; i++) {
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
  	})

    describe('approve(_spender, _value)', function () {
      describe(when('_spender != sender'), function () {
        let from;
        let to;

        before(async function () {
          from = alice;
          to = bob;
        });

        it('should execute when approving 0', async function () {
          expect(await contract.connect(from).approve(to.address, 0));
        })

        it('should execute when approving', async function () {
          expect(await contract.connect(from).approve(to.address, tokens(3)));
        })

        it('should execute when updating approval', async function () {
          expect(await contract.connect(from).approve(to.address, tokens(2)));
          await contract.connect(from).approve(to.address, tokens(2))

          // test decreasing approval
          expect(await contract.connect(from).approve(to.address, tokens(1)));

          // test not-updating approval
          expect(await contract.connect(from).approve(to.address, tokens(2)));

          // test increasing approval
          expect(await contract.connect(from).approve(to.address, tokens(3)));
        })

        it('should execute when revoking approval', async function () {
          await contract.connect(from).approve(to.address, tokens(3))
          expect(await contract.connect(from).approve(to.address, tokens(0)));
        })

        it('should update allowance accordingly', async function () {
          await contract.connect(from).approve(to.address, tokens(1))
          expect(await contract.connect(from).allowance(from.address, to.address)).to.equal(tokens(1))

          await contract.connect(from).approve(to.address, tokens(3))
          expect(await contract.connect(from).allowance(from.address, to.address)).to.equal(tokens(3))

          await contract.connect(from).approve(to.address, 0)
          expect(await contract.connect(from).allowance(from.address, to.address)).to.equal(tokens(0))
        })

        it('should fire Approval when allowance was set to 0', async function () {
          await expect(contract.connect(from).approve(to.address, tokens(3)))
            .to.emit(contract, 'Approval')
            .withArgs(from.address, to.address, tokens(3));
        })

        it(`should fire Approval when allowance didn't change`, async function () {
          await contract.connect(from).approve(to.address, tokens(3));
          await expect(contract.connect(from).approve(to.address, tokens(3)))
            .to.emit(contract, 'Approval')
            .withArgs(from.address, to.address, tokens(3));
        })

        describe('Randomized Repeating tests', function () {
          const retries = 5;

          // Retry all tests in this suite up to 4 times
          this.retries(retries);

          for (var i=0; i < retries; i++) {
            const random = Math.floor(Math.random() * Math.floor(tokenInfo.supply));

            it(`should fire Approval event correctly: (${random} tokens approval)`, async function () {
              await expect(contract.connect(from).approve(to.address, tokens(random)))
                .to.emit(contract, 'Approval')
                .withArgs(from.address, to.address, tokens(random));
            })
          }
        })
      })

      describe(when('testing _spender == sender'), function () {
        let from;
        let to;

        before(async function () {
          from = alice;
          to = alice;
        });

        it('should execute when approving 0', async function () {
          expect(await contract.connect(from).approve(to.address, 0));
        })

        it('should execute when approving', async function () {
          expect(await contract.connect(from).approve(to.address, tokens(3)));
        })

        it('should execute when updating approval', async function () {
          expect(await contract.connect(from).approve(to.address, tokens(2)));
          await contract.connect(from).approve(to.address, tokens(2))

          // test decreasing approval
          expect(await contract.connect(from).approve(to.address, tokens(1)));

          // test not-updating approval
          expect(await contract.connect(from).approve(to.address, tokens(2)));

          // test increasing approval
          expect(await contract.connect(from).approve(to.address, tokens(3)));
        })

        it('should execute when revoking approval', async function () {
          await contract.connect(from).approve(to.address, tokens(3))
          expect(await contract.connect(from).approve(to.address, tokens(0)));
        })

        it('should update allowance accordingly', async function () {
          await contract.connect(from).approve(to.address, tokens(1))
          expect(await contract.connect(from).allowance(from.address, to.address)).to.equal(tokens(1))

          await contract.connect(from).approve(to.address, tokens(3))
          expect(await contract.connect(from).allowance(from.address, to.address)).to.equal(tokens(3))

          await contract.connect(from).approve(to.address, 0)
          expect(await contract.connect(from).allowance(from.address, to.address)).to.equal(tokens(0))
        })

        it('should fire Approval when allowance was set to 0', async function () {
          await expect(contract.connect(from).approve(to.address, tokens(3)))
            .to.emit(contract, 'Approval')
            .withArgs(from.address, to.address, tokens(3));
        })

        it(`should fire Approval when allowance didn't change`, async function () {
          await contract.connect(from).approve(to.address, tokens(3));
          await expect(contract.connect(from).approve(to.address, tokens(3)))
            .to.emit(contract, 'Approval')
            .withArgs(from.address, to.address, tokens(3));
        })

        describe('Randomized Repeating tests', function () {
          const retries = 5;

          // Retry all tests in this suite up to 4 times
          this.retries(retries);

          for (var i=0; i < retries; i++) {
            const random = Math.floor(Math.random() * Math.floor(tokenInfo.supply));

            it(`should fire Approval event correctly: (${random} tokens approval)`, async function () {
              await expect(contract.connect(from).approve(to.address, tokens(random)))
                .to.emit(contract, 'Approval')
                .withArgs(from.address, to.address, tokens(random));
            })
          }
        })
      })
    })

    describe('transfer(_to, _value)', function () {
      describe(when('_spender != sender'), function () {
        let from;
        let to;

        before(async function () {
          from = alice;
          to = bob;
        });

        it('should execute when called with amount of 0', async function () {
					expect(await contract.connect(from).transfer(to.address, 0));
				})

        it('should return true when transfer can be made, false otherwise', async function () {
          expect(await contract.connect(from).transfer(to.address, tokens(0)))

          await contract.transfer(from.address, tokens(3))

          expect(await contract.connect(from).transfer(to.address, tokens(1)))
          expect(await contract.connect(from).transfer(to.address, tokens(2)))

          await expect(contract.connect(from).transfer(to.address, tokens(10))).to.be.reverted;
          expect(await contract.connect(to).transfer(from.address, tokens(3)))
				})

        it('should revert when trying to transfer something while having nothing', async function () {
          await expect(contract.connect(from).transfer(to.address, tokens(10)))
            .to.be.revertedWith('Push::_transferTokens: transfer amount exceeds balance');
				})

        it('should revert when trying to transfer more than balance', async function () {
					await contract.transfer(from.address, tokens(3))
          await expect(contract.connect(from).transfer(to.address, tokens(10)))
            .to.be.revertedWith('Push::_transferTokens: transfer amount exceeds balance');

					await contract.connect(from).transfer('0x0000000000000000000000000000000000000001', tokens(1))
          await expect(contract.connect(from).transfer(to.address, tokens(10)))
            .to.be.revertedWith('Push::_transferTokens: transfer amount exceeds balance');
				})

        it('should revert when trying to transfer something while having nothing', async function () {
          await expect(contract.connect(from).transfer(to.address, tokens(10)))
            .to.be.revertedWith('Push::_transferTokens: transfer amount exceeds balance');
				})

        it('should not affect totalSupply', async function () {
					await contract.transfer(from.address, tokens(3))

					let supply1 = await contract.totalSupply()
					await contract.connect(from).transfer(to.address, tokens(3))

					let supply2 = await contract.totalSupply()
					expect(supply2).to.be.equal(supply1)
				})

        it('should update balances accordingly', async function () {
						await contract.transfer(from.address, tokens(3))

						let fromBalance1 = await contract.balanceOf(from.address)
						let toBalance1 = await contract.balanceOf(to.address)

						await contract.connect(from).transfer(to.address, tokens(1))
						let fromBalance2 = await contract.balanceOf(from.address)
						let toBalance2 = await contract.balanceOf(to.address)

						if (from == to) {
							expect(fromBalance2).to.equal(fromBalance1)
						}
						else {
							expect(fromBalance2).to.equal(fromBalance1.sub(tokens(1)))
							expect(toBalance2).to.equal(toBalance1.add(tokens(1)))
						}

						await contract.connect(from).transfer(to.address, tokens(2))
						let fromBalance3 = await contract.balanceOf(from.address)
						let toBalance3 = await contract.balanceOf(to.address)

						if (from == to) {
							expect(fromBalance3).to.equal(fromBalance2)
						}
						else {
							expect(fromBalance3).to.equal(fromBalance2.sub(tokens(2)))
							expect(toBalance3).to.equal(toBalance2.add(tokens(2)))
						}
					})

          it('should fire Transfer event', async function () {
            await contract.transfer(from.address, tokens(3))

            await expect(contract.connect(from).transfer(to.address, tokens(3)))
              .to.emit(contract, 'Transfer')
              .withArgs(from.address, to.address, tokens(3));
					})

					it('should fire Transfer event when transferring amount of 0', async function () {
            await expect(contract.connect(from).transfer(to.address, tokens(0)))
              .to.emit(contract, 'Transfer')
              .withArgs(from.address, to.address, tokens(0));
					})
      })

      describe(when('_spender == sender'), function () {
        let from;
        let to;

        before(async function () {
          from = alice;
          to = alice;
        });

        it('should execute when called with amount of 0', async function () {
					expect(await contract.connect(from).transfer(to.address, 0));
				})

        it('should return true when transfer can be made, false otherwise', async function () {
          expect(await contract.connect(from).transfer(to.address, tokens(0)))

          await contract.transfer(from.address, tokens(3))

          expect(await contract.connect(from).transfer(to.address, tokens(1)))
          expect(await contract.connect(from).transfer(to.address, tokens(2)))

          await expect(contract.connect(from).transfer(to.address, tokens(100))).to.be.reverted;
          expect(await contract.connect(to).transfer(from.address, tokens(3)))
				})

        it('should revert when trying to transfer something while having nothing', async function () {
          await expect(contract.connect(from).transfer(to.address, tokens(10)))
            .to.be.revertedWith('Push::_transferTokens: transfer amount exceeds balance');
				})

        it('should revert when trying to transfer from 0x0', async function () {
          await expect(contract.connect(from).transfer('0x0000000000000000000000000000000000000000', tokens(10)))
            .to.be.revertedWith('Push::_transferTokens: cannot transfer to the zero address');
				})

        it('should revert when trying to transfer more than balance', async function () {
					await contract.transfer(from.address, tokens(3))
          await expect(contract.connect(from).transfer(to.address, tokens(10)))
            .to.be.revertedWith('Push::_transferTokens: transfer amount exceeds balance');

					await contract.connect(from).transfer('0x0000000000000000000000000000000000000001', tokens(1))
          await expect(contract.connect(from).transfer(to.address, tokens(10)))
            .to.be.revertedWith('Push::_transferTokens: transfer amount exceeds balance');
				})

        it('should revert when trying to transfer something while having nothing', async function () {
          await expect(contract.connect(from).transfer(to.address, tokens(10)))
            .to.be.revertedWith('Push::_transferTokens: transfer amount exceeds balance');
				})

        it('should not affect totalSupply', async function () {
					await contract.transfer(from.address, tokens(3))

					let supply1 = await contract.totalSupply()
					await contract.connect(from).transfer(to.address, tokens(3))

					let supply2 = await contract.totalSupply()
					expect(supply2).to.be.equal(supply1)
				})

        it('should update balances accordingly', async function () {
					await contract.transfer(from.address, tokens(3))

					let fromBalance1 = await contract.balanceOf(from.address)
					let toBalance1 = await contract.balanceOf(to.address)

					await contract.connect(from).transfer(to.address, tokens(1))
					let fromBalance2 = await contract.balanceOf(from.address)
					let toBalance2 = await contract.balanceOf(to.address)

					if (from == to) {
						expect(fromBalance2).to.equal(fromBalance1)
					}
					else {
						expect(fromBalance2).to.equal(fromBalance1.sub(tokens(1)))
						expect(toBalance2).to.equal(toBalance1.add(tokens(1)))
					}

					await contract.connect(from).transfer(to.address, tokens(2))
					let fromBalance3 = await contract.balanceOf(from.address)
					let toBalance3 = await contract.balanceOf(to.address)

					if (from == to) {
						expect(fromBalance3).to.equal(fromBalance2)
					}
					else {
						expect(fromBalance3).to.equal(fromBalance2.sub(tokens(2)))
						expect(toBalance3).to.equal(toBalance2.add(tokens(2)))
					}
				})

        it('should fire Transfer event', async function () {
          await contract.transfer(from.address, tokens(3))

          await expect(contract.connect(from).transfer(to.address, tokens(3)))
            .to.emit(contract, 'Transfer')
            .withArgs(from.address, to.address, tokens(3));
				})

				it('should fire Transfer event when transferring amount of 0', async function () {
          await expect(contract.connect(from).transfer(to.address, tokens(0)))
            .to.emit(contract, 'Transfer')
            .withArgs(from.address, to.address, tokens(0));
				})
      })
    })
  })

  describe('transferFrom(_to, _value)', function () {
    describe(when('_from != _to and _to != sender'), function () {
      let a;
      let b;
      let c;

      beforeEach(async function () {
        a = alice;
        b = bob;
        c = charles;
      });

      afterEach(async function () {
        a = null;
        b = null;
        c = null;
      });

      it('should revert when trying to transfer while not allowed at all', async function () {
        await contract.transfer(a.address, tokens(3))

				await expect(contract.connect(b).transferFrom(a.address, b.address, tokens(1)))
          .to.be.revertedWith('Push::transferFrom: transfer amount exceeds spender allowance');

        await expect(contract.connect(b).transferFrom(a.address, c.address, tokens(1)))
          .to.be.revertedWith('Push::transferFrom: transfer amount exceeds spender allowance');
			})

      it('should fire Transfer event when transferring amount of 0 and sender is not approved', async function () {
        await expect(contract.connect(a).transferFrom(b.address, b.address, tokens(0)))
          .to.emit(contract, 'Transfer')
          .withArgs(b.address, b.address, tokens(0))
			})

      describe('Always approved sender', function () {
        beforeEach(async function () {
          await contract.connect(a).approve(b.address, tokens(3))
        });

        it('should return true when called with amount of 0 and sender is approved', async function () {
  				expect(await contract.connect(b).transferFrom(a.address, c.address, 0))
  			})

        it('should return true when called with amount of 0 and sender is not approved', async function () {
          expect(await contract.connect(b).transferFrom(c.address, a.address, 0))
        })

        it('should revert when amount is non-zero and sender is not approved', async function () {
          await contract.transfer(c.address, tokens(1))

          if (b.address == c.address) {
            b = owner;
          }

          await expect(contract.connect(b).transferFrom(c.address, a.address, tokens(1)))
            .to.be.revertedWith('Push::transferFrom: transfer amount exceeds spender allowance')
        })

        it('should return true when transfer can be made, fail otherwise', async function () {
          await contract.transfer(a.address, tokens(3))

          expect(await contract.connect(b).transferFrom(a.address, c.address, tokens(1)))
          expect(await contract.connect(b).transferFrom(a.address, c.address, tokens(2)))

          await expect(contract.connect(b).transferFrom(a.address, c.address, tokens(1)))
            .to.be.revertedWith('Push::transferFrom: transfer amount exceeds spender allowance')

          if (b.address == c.address) {
            b = owner;
          }

          await expect(contract.connect(b).transferFrom(c.address, a.address, tokens(1)))
            .to.be.revertedWith('Push::transferFrom: transfer amount exceeds spender allowance')

          if (b.address == owner.address) {
            b = bob;
          }

          await contract.connect(c).approve(b.address, tokens(3));
          expect(await contract.connect(b).transferFrom(c.address, a.address, tokens(1)))
          expect(await contract.connect(b).transferFrom(c.address, a.address, tokens(2)))

          if (b.address == c.address) {
            b = owner;
          }

          await expect(contract.connect(b).transferFrom(c.address, a.address, tokens(1)))
            .to.be.revertedWith('Push::transferFrom: transfer amount exceeds spender allowance')
				})

        it('should revert when trying to transfer something while sender having nothing', async function () {
          await expect(contract.connect(a).transferFrom(b.address, c.address, tokens(1)))
            .to.be.revertedWith('Push::transferFrom: transfer amount exceeds spender allowance')
				})

        it('should revert when trying to transfer more than balance of _from', async function () {
					await contract.transfer(a.address, tokens(2))
          await expect(contract.connect(a).transferFrom(a.address, b.address, tokens(3)))
            .to.be.revertedWith('Push::_transferTokens: transfer amount exceeds balance')
				})

        it('should revert when trying to transfer more than allowed', async function () {
					await contract.transfer(a.address, tokens(4))
          expect(await contract.connect(b).transferFrom(a.address, c.address, tokens(3)))

          await contract.connect(c).transfer(a.address, tokens(3))
          await expect(contract.connect(b).transferFrom(a.address, c.address, tokens(4)))
            .to.be.revertedWith('Push::transferFrom: transfer amount exceeds spender allowance')

          await contract.connect(a).approve(b.address, tokens(3))
          expect(await contract.connect(b).transferFrom(a.address, c.address, tokens(1)))
          expect(await contract.connect(b).transferFrom(a.address, c.address, tokens(1)))
          expect(await contract.connect(b).transferFrom(a.address, c.address, tokens(1)))
          await expect(contract.connect(b).transferFrom(a.address, c.address, tokens(1)))
            .to.be.revertedWith('Push::transferFrom: transfer amount exceeds spender allowance')
				})

        it('should not affect totalSupply', async function () {
          await contract.transfer(a.address, tokens(3))
          let supply1 = await contract.totalSupply()

          await contract.connect(b).transferFrom(a.address, c.address, tokens(3))
          let supply2 = await contract.totalSupply()

          expect(supply2).to.be.equal(supply1)
        })

        it('should update balances accordingly', async function () {
          await contract.transfer(a.address, tokens(3))

          let aBalance1 = await contract.balanceOf(a.address)
          let bBalance1 = await contract.balanceOf(b.address)
          let cBalance1 = await contract.balanceOf(c.address)

          await contract.connect(b).transferFrom(a.address, c.address, tokens(1))
          let aBalance2 = await contract.balanceOf(a.address)
          let bBalance2 = await contract.balanceOf(b.address)
          let cBalance2 = await contract.balanceOf(c.address)

          if (a.address == c.address) {
            expect(aBalance2).to.equal(aBalance1)
          }
          else {
            expect(aBalance2).to.equal(aBalance1.sub(tokens(1)))
            expect(cBalance2).to.equal(cBalance1.add(tokens(1)))
          }

          if (b.address != a.address && b.address != c.address) {
            expect(bBalance2).to.equal(bBalance1)
          }

          await contract.connect(b).transferFrom(a.address, c.address, tokens(2))
          let fromBalance3 = await contract.balanceOf(a.address)
          let viaBalance3 = await contract.balanceOf(b.address)
          let toBalance3 = await contract.balanceOf(c.address)

          if (a.address == c.address) {
            expect(fromBalance3).to.equal(aBalance2)
          }
          else {
            expect(fromBalance3).to.equal(aBalance2.sub(tokens(2)))
            expect(toBalance3).to.equal(cBalance2.add(tokens(2)))
          }

          if (b.address != a.address && b.address != c.address) {
            expect(viaBalance3).to.equal(bBalance2)
          }
        })

        it('should update allowances accordingly', async function () {
          await contract.transfer(a.address, tokens(3))

          let bAllowance1 = await contract.allowance(a.address, b.address)
          let cAllowance1 = await contract.allowance(a.address, c.address)

          await contract.connect(b).transferFrom(a.address, c.address, tokens(2))
          let bAllowance2 = await contract.allowance(a.address, b.address)
          let cAllowance2 = await contract.allowance(a.address, c.address)

          expect(bAllowance2).to.equal(bAllowance1.sub(tokens(2)))

          if (c.address != b.address) {
            expect(cAllowance2).to.equal(cAllowance1)
          }

          await contract.connect(b).transferFrom(a.address, c.address, tokens(1))
          let bAllowance3 = await contract.allowance(a.address, b.address)
          let cAllowance3 = await contract.allowance(a.address, c.address)

          expect(bAllowance3).to.equal(bAllowance2.sub(tokens(1)))

          if (c.address != b.address) {
            expect(cAllowance3).to.equal(cAllowance1)
          }
        })

        describe('Randomized Repeating tests', function () {
          const retries = 5;
          for (var i=0; i < retries; i++) {
            const random = Math.floor(Math.random() * Math.floor(tokenInfo.supply));

            it(`should fire Transfer event for ${random} tokens`, async function () {
              await contract.transfer(a.address, tokens(random))
              await contract.connect(a).approve(b.address, tokens(random))

              await expect(contract.connect(b).transferFrom(a.address, c.address, tokens(random)))
                .to.emit(contract, 'Transfer')
                .withArgs(a.address, c.address, tokens(random))
            })
          }
        })

        it('should fire Transfer event when transferring amount of 0', async function () {
          await expect(contract.connect(b).transferFrom(a.address, c.address, tokens(0)))
            .to.emit(contract, 'Transfer')
            .withArgs(a.address, c.address, tokens(0))
        })
      })
    })

    describe(when('_from != _to and _to == sender'), function () {
      let a;
      let b;
      let c;

      beforeEach(async function () {
        a = alice;
        b = bob;
        c = bob;
      });

      afterEach(async function () {
        a = alice;
        b = bob;
        c = bob;
      });

      it('should revert when trying to transfer while not allowed at all', async function () {
        await contract.transfer(a.address, tokens(3))

				await expect(contract.connect(b).transferFrom(a.address, b.address, tokens(1)))
          .to.be.revertedWith('Push::transferFrom: transfer amount exceeds spender allowance');

        await expect(contract.connect(b).transferFrom(a.address, c.address, tokens(1)))
          .to.be.revertedWith('Push::transferFrom: transfer amount exceeds spender allowance');
			})

      it('should fire Transfer event when transferring amount of 0 and sender is not approved', async function () {
        await expect(contract.connect(a).transferFrom(b.address, b.address, tokens(0)))
          .to.emit(contract, 'Transfer')
          .withArgs(b.address, b.address, tokens(0))
			})

      describe('Always approved sender', function () {
        beforeEach(async function () {
          await contract.connect(a).approve(b.address, tokens(3))
        });

        it('should return true when called with amount of 0 and sender is approved', async function () {
  				expect(await contract.connect(b).transferFrom(a.address, c.address, 0))
  			})

        it('should return true when called with amount of 0 and sender is not approved', async function () {
          expect(await contract.connect(b).transferFrom(c.address, a.address, 0))
        })

        it('should revert when amount is non-zero and sender is not approved', async function () {
          await contract.transfer(c.address, tokens(1))

          if (b.address == c.address) {
            b = owner;
          }

          await expect(contract.connect(b).transferFrom(c.address, a.address, tokens(1)))
            .to.be.revertedWith('Push::transferFrom: transfer amount exceeds spender allowance')
        })

        it('should return true when transfer can be made, fail otherwise', async function () {
          await contract.transfer(a.address, tokens(3))

          expect(await contract.connect(b).transferFrom(a.address, c.address, tokens(1)))
          expect(await contract.connect(b).transferFrom(a.address, c.address, tokens(2)))

          await expect(contract.connect(b).transferFrom(a.address, c.address, tokens(1)))
            .to.be.revertedWith('Push::transferFrom: transfer amount exceeds spender allowance')

          if (b.address == c.address) {
            b = owner;
          }

          await expect(contract.connect(b).transferFrom(c.address, a.address, tokens(1)))
            .to.be.revertedWith('Push::transferFrom: transfer amount exceeds spender allowance')

          if (b.address == owner.address) {
            b = bob;
          }

          await contract.connect(c).approve(b.address, tokens(3));
          expect(await contract.connect(b).transferFrom(c.address, a.address, tokens(1)))
          expect(await contract.connect(b).transferFrom(c.address, a.address, tokens(2)))

          if (b.address == c.address) {
            b = owner;
          }

          await expect(contract.connect(b).transferFrom(c.address, a.address, tokens(1)))
            .to.be.revertedWith('Push::transferFrom: transfer amount exceeds spender allowance')
				})

        it('should revert when trying to transfer something while sender having nothing', async function () {
          await expect(contract.connect(a).transferFrom(b.address, c.address, tokens(1)))
            .to.be.revertedWith('Push::transferFrom: transfer amount exceeds spender allowance')
				})

        it('should revert when trying to transfer more than balance of _from', async function () {
					await contract.transfer(a.address, tokens(2))
          await expect(contract.connect(a).transferFrom(a.address, b.address, tokens(3)))
            .to.be.revertedWith('Push::_transferTokens: transfer amount exceeds balance')
				})

        it('should revert when trying to transfer more than allowed', async function () {
					await contract.transfer(a.address, tokens(4))
          expect(await contract.connect(b).transferFrom(a.address, c.address, tokens(3)))

          await contract.connect(c).transfer(a.address, tokens(3))
          await expect(contract.connect(b).transferFrom(a.address, c.address, tokens(4)))
            .to.be.revertedWith('Push::transferFrom: transfer amount exceeds spender allowance')

          await contract.connect(a).approve(b.address, tokens(3))
          expect(await contract.connect(b).transferFrom(a.address, c.address, tokens(1)))
          expect(await contract.connect(b).transferFrom(a.address, c.address, tokens(1)))
          expect(await contract.connect(b).transferFrom(a.address, c.address, tokens(1)))
          await expect(contract.connect(b).transferFrom(a.address, c.address, tokens(1)))
            .to.be.revertedWith('Push::transferFrom: transfer amount exceeds spender allowance')
				})

        it('should not affect totalSupply', async function () {
          await contract.transfer(a.address, tokens(3))
          let supply1 = await contract.totalSupply()

          await contract.connect(b).transferFrom(a.address, c.address, tokens(3))
          let supply2 = await contract.totalSupply()

          expect(supply2).to.be.equal(supply1)
        })

        it('should update balances accordingly', async function () {
          await contract.transfer(a.address, tokens(3))

          let aBalance1 = await contract.balanceOf(a.address)
          let bBalance1 = await contract.balanceOf(b.address)
          let cBalance1 = await contract.balanceOf(c.address)

          await contract.connect(b).transferFrom(a.address, c.address, tokens(1))
          let aBalance2 = await contract.balanceOf(a.address)
          let bBalance2 = await contract.balanceOf(b.address)
          let cBalance2 = await contract.balanceOf(c.address)

          if (a.address == c.address) {
            expect(aBalance2).to.equal(aBalance1)
          }
          else {
            expect(aBalance2).to.equal(aBalance1.sub(tokens(1)))
            expect(cBalance2).to.equal(cBalance1.add(tokens(1)))
          }

          if (b.address != a.address && b.address != c.address) {
            expect(bBalance2).to.equal(bBalance1)
          }

          await contract.connect(b).transferFrom(a.address, c.address, tokens(2))
          let fromBalance3 = await contract.balanceOf(a.address)
          let viaBalance3 = await contract.balanceOf(b.address)
          let toBalance3 = await contract.balanceOf(c.address)

          if (a.address == c.address) {
            expect(fromBalance3).to.equal(aBalance2)
          }
          else {
            expect(fromBalance3).to.equal(aBalance2.sub(tokens(2)))
            expect(toBalance3).to.equal(cBalance2.add(tokens(2)))
          }

          if (b.address != a.address && b.address != c.address) {
            expect(viaBalance3).to.equal(bBalance2)
          }
        })

        it('should update allowances accordingly', async function () {
          await contract.transfer(a.address, tokens(3))

          let bAllowance1 = await contract.allowance(a.address, b.address)
          let cAllowance1 = await contract.allowance(a.address, c.address)

          await contract.connect(b).transferFrom(a.address, c.address, tokens(2))
          let bAllowance2 = await contract.allowance(a.address, b.address)
          let cAllowance2 = await contract.allowance(a.address, c.address)

          expect(bAllowance2).to.equal(bAllowance1.sub(tokens(2)))

          if (c.address != b.address) {
            expect(cAllowance2).to.equal(cAllowance1)
          }

          await contract.connect(b).transferFrom(a.address, c.address, tokens(1))
          let bAllowance3 = await contract.allowance(a.address, b.address)
          let cAllowance3 = await contract.allowance(a.address, c.address)

          expect(bAllowance3).to.equal(bAllowance2.sub(tokens(1)))

          if (c.address != b.address) {
            expect(cAllowance3).to.equal(cAllowance1)
          }
        })

        describe('Randomized Repeating tests', function () {
          const retries = 5;
          for (var i=0; i < retries; i++) {
            const random = Math.floor(Math.random() * Math.floor(tokenInfo.supply));

            it(`should fire Transfer event for ${random} tokens`, async function () {
              await contract.transfer(a.address, tokens(random))
              await contract.connect(a).approve(b.address, tokens(random))

              await expect(contract.connect(b).transferFrom(a.address, c.address, tokens(random)))
                .to.emit(contract, 'Transfer')
                .withArgs(a.address, c.address, tokens(random))
            })
          }
        })

        it('should fire Transfer event when transferring amount of 0', async function () {
          await expect(contract.connect(b).transferFrom(a.address, c.address, tokens(0)))
            .to.emit(contract, 'Transfer')
            .withArgs(a.address, c.address, tokens(0))
        })
      })
    })

    describe(when('_from == _to and _to != sender'), function () {
      let a;
      let b;
      let c;

      beforeEach(async function () {
        a = alice;
        b = alice;
        c = bob;
      });

      afterEach(async function () {
        a = null;
        b = null;
        c = null;
      });

      it('should revert when trying to transfer while not allowed at all', async function () {
        await contract.transfer(a.address, tokens(3))

				await expect(contract.connect(b).transferFrom(a.address, b.address, tokens(1)))
          .to.be.revertedWith('Push::transferFrom: transfer amount exceeds spender allowance');

        await expect(contract.connect(b).transferFrom(a.address, c.address, tokens(1)))
          .to.be.revertedWith('Push::transferFrom: transfer amount exceeds spender allowance');
			})

      it('should fire Transfer event when transferring amount of 0 and sender is not approved', async function () {
        await expect(contract.connect(a).transferFrom(b.address, b.address, tokens(0)))
          .to.emit(contract, 'Transfer')
          .withArgs(b.address, b.address, tokens(0))
			})

      describe('Always approved sender', function () {
        beforeEach(async function () {
          await contract.connect(a).approve(b.address, tokens(3))
        });

        it('should return true when called with amount of 0 and sender is approved', async function () {
  				expect(await contract.connect(b).transferFrom(a.address, c.address, 0))
  			})

        it('should return true when called with amount of 0 and sender is not approved', async function () {
          expect(await contract.connect(b).transferFrom(c.address, a.address, 0))
        })

        it('should revert when amount is non-zero and sender is not approved', async function () {
          await contract.transfer(c.address, tokens(1))

          if (b.address == c.address) {
            b = owner;
          }

          await expect(contract.connect(b).transferFrom(c.address, a.address, tokens(1)))
            .to.be.revertedWith('Push::transferFrom: transfer amount exceeds spender allowance')
        })

        it('should return true when transfer can be made, fail otherwise', async function () {
          await contract.transfer(a.address, tokens(3))

          expect(await contract.connect(b).transferFrom(a.address, c.address, tokens(1)))
          expect(await contract.connect(b).transferFrom(a.address, c.address, tokens(2)))

          await expect(contract.connect(b).transferFrom(a.address, c.address, tokens(1)))
            .to.be.revertedWith('Push::transferFrom: transfer amount exceeds spender allowance')

          if (b.address == c.address) {
            b = owner;
          }

          await expect(contract.connect(b).transferFrom(c.address, a.address, tokens(1)))
            .to.be.revertedWith('Push::transferFrom: transfer amount exceeds spender allowance')

          if (b.address == owner.address) {
            b = bob;
          }

          await contract.connect(c).approve(b.address, tokens(3));
          expect(await contract.connect(b).transferFrom(c.address, a.address, tokens(1)))
          expect(await contract.connect(b).transferFrom(c.address, a.address, tokens(2)))

          if (b.address == c.address) {
            b = owner;
          }

          await expect(contract.connect(b).transferFrom(c.address, a.address, tokens(1)))
            .to.be.revertedWith('Push::transferFrom: transfer amount exceeds spender allowance')
				})

        it('should revert when trying to transfer something while sender having nothing', async function () {
          await expect(contract.connect(a).transferFrom(b.address, c.address, tokens(1)))
            .to.be.revertedWith('Push::transferFrom: transfer amount exceeds spender allowance')
				})

        it('should revert when trying to transfer more than balance of _from', async function () {
					await contract.transfer(a.address, tokens(2))
          await expect(contract.connect(a).transferFrom(a.address, b.address, tokens(3)))
            .to.be.revertedWith('Push::_transferTokens: transfer amount exceeds balance')
				})

        it('should revert when trying to transfer more than allowed', async function () {
					await contract.transfer(a.address, tokens(4))
          expect(await contract.connect(b).transferFrom(a.address, c.address, tokens(3)))

          await contract.connect(c).transfer(a.address, tokens(3))
          await expect(contract.connect(b).transferFrom(a.address, c.address, tokens(4)))
            .to.be.revertedWith('Push::transferFrom: transfer amount exceeds spender allowance')

          await contract.connect(a).approve(b.address, tokens(3))
          expect(await contract.connect(b).transferFrom(a.address, c.address, tokens(1)))
          expect(await contract.connect(b).transferFrom(a.address, c.address, tokens(1)))
          expect(await contract.connect(b).transferFrom(a.address, c.address, tokens(1)))
          await expect(contract.connect(b).transferFrom(a.address, c.address, tokens(1)))
            .to.be.revertedWith('Push::transferFrom: transfer amount exceeds spender allowance')
				})

        it('should not affect totalSupply', async function () {
          await contract.transfer(a.address, tokens(3))
          let supply1 = await contract.totalSupply()

          await contract.connect(b).transferFrom(a.address, c.address, tokens(3))
          let supply2 = await contract.totalSupply()

          expect(supply2).to.be.equal(supply1)
        })

        it('should update balances accordingly', async function () {
          await contract.transfer(a.address, tokens(3))

          let aBalance1 = await contract.balanceOf(a.address)
          let bBalance1 = await contract.balanceOf(b.address)
          let cBalance1 = await contract.balanceOf(c.address)

          await contract.connect(b).transferFrom(a.address, c.address, tokens(1))
          let aBalance2 = await contract.balanceOf(a.address)
          let bBalance2 = await contract.balanceOf(b.address)
          let cBalance2 = await contract.balanceOf(c.address)

          if (a.address == c.address) {
            expect(aBalance2).to.equal(aBalance1)
          }
          else {
            expect(aBalance2).to.equal(aBalance1.sub(tokens(1)))
            expect(cBalance2).to.equal(cBalance1.add(tokens(1)))
          }

          if (b.address != a.address && b.address != c.address) {
            expect(bBalance2).to.equal(bBalance1)
          }

          await contract.connect(b).transferFrom(a.address, c.address, tokens(2))
          let fromBalance3 = await contract.balanceOf(a.address)
          let viaBalance3 = await contract.balanceOf(b.address)
          let toBalance3 = await contract.balanceOf(c.address)

          if (a.address == c.address) {
            expect(fromBalance3).to.equal(aBalance2)
          }
          else {
            expect(fromBalance3).to.equal(aBalance2.sub(tokens(2)))
            expect(toBalance3).to.equal(cBalance2.add(tokens(2)))
          }

          if (b.address != a.address && b.address != c.address) {
            expect(viaBalance3).to.equal(bBalance2)
          }
        })

        it('should update allowances accordingly', async function () {
          await contract.transfer(a.address, tokens(3))

          let bAllowance1 = await contract.allowance(a.address, b.address)
          let cAllowance1 = await contract.allowance(a.address, c.address)

          await contract.connect(b).transferFrom(a.address, c.address, tokens(2))
          let bAllowance2 = await contract.allowance(a.address, b.address)
          let cAllowance2 = await contract.allowance(a.address, c.address)

          expect(bAllowance2).to.equal(bAllowance1.sub(tokens(2)))

          if (c.address != b.address) {
            expect(cAllowance2).to.equal(cAllowance1)
          }

          await contract.connect(b).transferFrom(a.address, c.address, tokens(1))
          let bAllowance3 = await contract.allowance(a.address, b.address)
          let cAllowance3 = await contract.allowance(a.address, c.address)

          expect(bAllowance3).to.equal(bAllowance2.sub(tokens(1)))

          if (c.address != b.address) {
            expect(cAllowance3).to.equal(cAllowance1)
          }
        })

        describe('Randomized Repeating tests', function () {
          const retries = 5;
          for (var i=0; i < retries; i++) {
            const random = Math.floor(Math.random() * Math.floor(tokenInfo.supply));

            it(`should fire Transfer event for ${random} tokens`, async function () {
              await contract.transfer(a.address, tokens(random))
              await contract.connect(a).approve(b.address, tokens(random))

              await expect(contract.connect(b).transferFrom(a.address, c.address, tokens(random)))
                .to.emit(contract, 'Transfer')
                .withArgs(a.address, c.address, tokens(random))
            })
          }
        })

        it('should fire Transfer event when transferring amount of 0', async function () {
          await expect(contract.connect(b).transferFrom(a.address, c.address, tokens(0)))
            .to.emit(contract, 'Transfer')
            .withArgs(a.address, c.address, tokens(0))
        })
      })
    })

    describe(when('_from == _to and _to == sender'), function () {
      let a;
      let b;
      let c;

      beforeEach(async function () {
        a = alice;
        b = alice;
        c = alice;
      });

      afterEach(async function () {
        a = null;
        b = null;
        c = null;
      });

      it('should revert when trying to transfer while not allowed at all', async function () {
        await contract.transfer(a.address, tokens(3))

        const allow = await contract.allowance(a.address, b.address);
        console.log(allow);
        
				await expect(contract.connect(b).transferFrom(a.address, b.address, tokens(1)))
          .to.be.revertedWith('Push::transferFrom: transfer amount exceeds spender allowance');

        await expect(contract.connect(b).transferFrom(a.address, c.address, tokens(1)))
          .to.be.revertedWith('Push::transferFrom: transfer amount exceeds spender allowance');
			})

      it('should fire Transfer event when transferring amount of 0 and sender is not approved', async function () {
        await expect(contract.connect(a).transferFrom(b.address, b.address, tokens(0)))
          .to.emit(contract, 'Transfer')
          .withArgs(b.address, b.address, tokens(0))
			})

      describe('Always approved sender', function () {
        beforeEach(async function () {
          await contract.connect(a).approve(b.address, tokens(3))
        });

        it('should return true when called with amount of 0 and sender is approved', async function () {
  				expect(await contract.connect(b).transferFrom(a.address, c.address, 0))
  			})

        it('should return true when called with amount of 0 and sender is not approved', async function () {
          expect(await contract.connect(b).transferFrom(c.address, a.address, 0))
        })

        it('should revert when amount is non-zero and sender is not approved', async function () {
          await contract.transfer(c.address, tokens(1))

          if (b.address == c.address) {
            b = owner;
          }

          await expect(contract.connect(b).transferFrom(c.address, a.address, tokens(1)))
            .to.be.revertedWith('Push::transferFrom: transfer amount exceeds spender allowance')
        })

        it('should return true when transfer can be made, fail otherwise', async function () {
          await contract.transfer(a.address, tokens(3))

          expect(await contract.connect(b).transferFrom(a.address, c.address, tokens(1)))
          expect(await contract.connect(b).transferFrom(a.address, c.address, tokens(2)))

          await expect(contract.connect(b).transferFrom(a.address, c.address, tokens(1)))
            .to.be.revertedWith('Push::transferFrom: transfer amount exceeds spender allowance')

          if (b.address == c.address) {
            b = owner;
          }

          await expect(contract.connect(b).transferFrom(c.address, a.address, tokens(1)))
            .to.be.revertedWith('Push::transferFrom: transfer amount exceeds spender allowance')

          if (b.address == owner.address) {
            b = bob;
          }

          await contract.connect(c).approve(b.address, tokens(3));
          expect(await contract.connect(b).transferFrom(c.address, a.address, tokens(1)))
          expect(await contract.connect(b).transferFrom(c.address, a.address, tokens(2)))

          if (b.address == c.address) {
            b = owner;
          }

          await expect(contract.connect(b).transferFrom(c.address, a.address, tokens(1)))
            .to.be.revertedWith('Push::transferFrom: transfer amount exceeds spender allowance')
				})

        it('should revert when trying to transfer something while sender having nothing', async function () {
          await expect(contract.connect(a).transferFrom(b.address, c.address, tokens(1)))
            .to.be.revertedWith('Push::transferFrom: transfer amount exceeds spender allowance')
				})

        it('should revert when trying to transfer more than balance of _from', async function () {
					await contract.transfer(a.address, tokens(2))
          await expect(contract.connect(a).transferFrom(a.address, b.address, tokens(3)))
            .to.be.revertedWith('Push::_transferTokens: transfer amount exceeds balance')
				})

        it('should revert when trying to transfer more than allowed', async function () {
					await contract.transfer(a.address, tokens(4))
          expect(await contract.connect(b).transferFrom(a.address, c.address, tokens(3)))

          await contract.connect(c).transfer(a.address, tokens(3))
          await expect(contract.connect(b).transferFrom(a.address, c.address, tokens(4)))
            .to.be.revertedWith('Push::transferFrom: transfer amount exceeds spender allowance')

          await contract.connect(a).approve(b.address, tokens(3))
          expect(await contract.connect(b).transferFrom(a.address, c.address, tokens(1)))
          expect(await contract.connect(b).transferFrom(a.address, c.address, tokens(1)))
          expect(await contract.connect(b).transferFrom(a.address, c.address, tokens(1)))
          await expect(contract.connect(b).transferFrom(a.address, c.address, tokens(1)))
            .to.be.revertedWith('Push::transferFrom: transfer amount exceeds spender allowance')
				})

        it('should not affect totalSupply', async function () {
          await contract.transfer(a.address, tokens(3))
          let supply1 = await contract.totalSupply()

          await contract.connect(b).transferFrom(a.address, c.address, tokens(3))
          let supply2 = await contract.totalSupply()

          expect(supply2).to.be.equal(supply1)
        })

        it('should update balances accordingly', async function () {
          await contract.transfer(a.address, tokens(3))

          let aBalance1 = await contract.balanceOf(a.address)
          let bBalance1 = await contract.balanceOf(b.address)
          let cBalance1 = await contract.balanceOf(c.address)

          await contract.connect(b).transferFrom(a.address, c.address, tokens(1))
          let aBalance2 = await contract.balanceOf(a.address)
          let bBalance2 = await contract.balanceOf(b.address)
          let cBalance2 = await contract.balanceOf(c.address)

          if (a.address == c.address) {
            expect(aBalance2).to.equal(aBalance1)
          }
          else {
            expect(aBalance2).to.equal(aBalance1.sub(tokens(1)))
            expect(cBalance2).to.equal(cBalance1.add(tokens(1)))
          }

          if (b.address != a.address && b.address != c.address) {
            expect(bBalance2).to.equal(bBalance1)
          }

          await contract.connect(b).transferFrom(a.address, c.address, tokens(2))
          let fromBalance3 = await contract.balanceOf(a.address)
          let viaBalance3 = await contract.balanceOf(b.address)
          let toBalance3 = await contract.balanceOf(c.address)

          if (a.address == c.address) {
            expect(fromBalance3).to.equal(aBalance2)
          }
          else {
            expect(fromBalance3).to.equal(aBalance2.sub(tokens(2)))
            expect(toBalance3).to.equal(cBalance2.add(tokens(2)))
          }

          if (b.address != a.address && b.address != c.address) {
            expect(viaBalance3).to.equal(bBalance2)
          }
        })

        it('should update allowances accordingly', async function () {
          await contract.transfer(a.address, tokens(3))

          let bAllowance1 = await contract.allowance(a.address, b.address)
          let cAllowance1 = await contract.allowance(a.address, c.address)

          await contract.connect(b).transferFrom(a.address, c.address, tokens(2))
          let bAllowance2 = await contract.allowance(a.address, b.address)
          let cAllowance2 = await contract.allowance(a.address, c.address)

          expect(bAllowance2).to.equal(bAllowance1.sub(tokens(2)))

          if (c.address != b.address) {
            expect(cAllowance2).to.equal(cAllowance1)
          }

          await contract.connect(b).transferFrom(a.address, c.address, tokens(1))
          let bAllowance3 = await contract.allowance(a.address, b.address)
          let cAllowance3 = await contract.allowance(a.address, c.address)

          expect(bAllowance3).to.equal(bAllowance2.sub(tokens(1)))

          if (c.address != b.address) {
            expect(cAllowance3).to.equal(cAllowance1)
          }
        })

        describe('Randomized Repeating tests', function () {
          const retries = 5;
          for (var i=0; i < retries; i++) {
            const random = Math.floor(Math.random() * Math.floor(tokenInfo.supply));

            it(`should fire Transfer event for ${random} tokens`, async function () {
              await contract.transfer(a.address, tokens(random))
              await contract.connect(a).approve(b.address, tokens(random))

              await expect(contract.connect(b).transferFrom(a.address, c.address, tokens(random)))
                .to.emit(contract, 'Transfer')
                .withArgs(a.address, c.address, tokens(random))
            })
          }
        })

        it('should fire Transfer event when transferring amount of 0', async function () {
          await expect(contract.connect(b).transferFrom(a.address, c.address, tokens(0)))
            .to.emit(contract, 'Transfer')
            .withArgs(a.address, c.address, tokens(0))
        })
      })
    })
  })

	describe('ERC-20 optional', function () {
		describe('name()', function () {
			if (tokenInfo.name != null ) {
				it("should return '" + tokenInfo.name + "'", async function () {
          expect(await contract.name()).to.equal(tokenInfo.name);
				})
			}
		})

    describe('symbol()', function () {
			if (tokenInfo.symbol != null ) {
				it("should return '" + tokenInfo.symbol + "'", async function () {
          expect(await contract.symbol()).to.equal(tokenInfo.symbol);
				})
			}
		})

    describe('decimals()', function () {
			if (tokenInfo.decimals != null ) {
				it("should return '" + tokenInfo.decimals + "'", async function () {
          expect(await contract.decimals()).to.equal(tokenInfo.decimals);
				})
			}
		})
  })
});

// Helpers
function when(name) {
	return 'when (' + name + ')'
}
