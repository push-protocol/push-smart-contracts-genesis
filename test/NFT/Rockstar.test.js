// Import helper functions
const { bn } = require('../../helpers/helpers');

const { BN, constants, expectEvent, expectRevert } = require('@openzeppelin/test-helpers');
const { ZERO_ADDRESS } = constants;

// We import Chai to use its asserting functions here.
const { expect } = require("chai");

describe("NFT Contract test cases", () => {

    let NFT;
    let owner;
    let NFTInstance;

    const tokenInfo = {
      name: 'Rockstars of EPNS',
      symbol: 'ROCKSTAR',
    }

    const firstTokenId = 1; 
    const secondTokenId = 2;
    const nonExistentTokenId = 150;
    const firstMetadata = 'abc';
    const secondMetadata = 'def';

    const RECEIVER_MAGIC_VALUE = '0x150b7a02';

    beforeEach(async() => {
        NFT = await ethers.getContractFactory("Rockstar");
        NFTInstance = await NFT.deploy();
        [owner, alice, bob, charles, dany, other] = await ethers.getSigners();
    })

    describe("On deployment", function () {
      describe('owner()', () => {
        it("Should set the right owner for contract", async function () {
          expect(await NFTInstance.owner()).to.equal(owner.address);
        });
      })
      describe('name()', function () {
        it(`should have the name as ${tokenInfo.name}`, async function () {
          expect(await NFTInstance.name()).to.equal(tokenInfo.name);
        })
      })
      describe('symbol()', function () {
        it(`should have the symbol as ${tokenInfo.symbol}`, async function () {
          expect(await NFTInstance.symbol()).to.equal(tokenInfo.symbol);
        })
      })
      describe('totalSupply()', function () {
        it(`should have the totalSupply as 0`, async function () {
          expect(await NFTInstance.totalSupply()).to.equal(0);
        })
      })
    })

    describe("safeMint()", function () {

      it("Should mint a token if caller is contractOwner", async function () {
        const tx = await NFTInstance.safeMint(alice.address, 'abc');
        const newTokenID = await tx.wait()
        const tokenOwner = await NFTInstance.ownerOf(newTokenID['events'][0].topics[3]);
        expect(tokenOwner).to.equal(alice.address);
        expect(await NFTInstance.totalSupply()).to.equal(1);
        expect(await NFTInstance.balanceOf(alice.address)).to.equal(1);
      });

      it("Should revert if caller is not contractOwner", async function () {
        await expect(NFTInstance.connect(alice).safeMint(alice.address, 'abc')).to.be.revertedWith("Ownable: caller is not the owner");
      });

      it("Should revert if hash is already in use", async function () {
        const tx = await NFTInstance.safeMint(alice.address, 'abc');
        await expect(NFTInstance.safeMint(alice.address, 'abc')).to.be.revertedWith("Rockstar::safeMint: hash already in use");
      });

    })

    describe("burn()", function () {

      it("Should burn a token if caller is tokenOwner", async function () {
        const promise_1 = await NFTInstance.safeMint(alice.address, 'abc');
        const tx_1 = await promise_1.wait();
        const tokenId = tx_1['events'][0].topics[3];
        expect(await NFTInstance.balanceOf(alice.address)).to.equal(1);

        const promise_2 = await NFTInstance.connect(alice).burn(tokenId);
        const tx_2 = await promise_2.wait();
        expect(await NFTInstance.balanceOf(alice.address)).to.equal(0);

      });

      it("Should revert if caller is not tokenOwner", async function () {
        const promise = await NFTInstance.safeMint(alice.address, 'abc');
        const tx = await promise.wait();
        const tokenId = tx['events'][0].topics[3];
        await expect(NFTInstance.connect(bob).burn(tokenId)).to.be.revertedWith("Rockstar::burn: caller is neither owner nor approved");
      });

    })


  context('with minted tokens', function () {
    beforeEach(async function () {
      await NFTInstance.safeMint(alice.address, firstMetadata);
      await NFTInstance.safeMint(alice.address, secondMetadata);
    });

    describe('balanceOf()', function () {
      context('when the given address owns some tokens', function () {
        it('should return the amount of tokens owned by the given address', async function () {
          expect(await NFTInstance.balanceOf(alice.address)).to.equal(bn(2));
        });
      });
      context('when the given address does not own any tokens', function () {
        it('should return 0', async function () {
          expect(await NFTInstance.balanceOf(bob.address)).to.equal(0);
        });
      });
      context('when querying the zero address', function () {
        it('should revert', async function () {
          await expect(NFTInstance.balanceOf(ZERO_ADDRESS)).to.be.revertedWith("ERC721: balance query for the zero address");
        });
      });
    });

    describe('ownerOf()', function () {
      context('when the given token ID was tracked by this token', function () {
        const tokenId = firstTokenId;
        it('should return the owner of the given token ID', async function () {
          expect(await NFTInstance.ownerOf(tokenId)).to.be.equal(alice.address);
        });
      });
      context('when the given token ID was not tracked by this token', function () {
        const tokenId = nonExistentTokenId;
        it('should revert', async function () {
          await expect(NFTInstance.ownerOf(tokenId)).to.be.revertedWith("ERC721: owner query for nonexistent token");
        });
      });
    });

    describe('transfers', function () {
      const tokenId = firstTokenId;
      const data = '0x42';

      let approved;
      let operator;
      let toWhom;
      let receiverContract;
      let receiver;

      beforeEach(async function () {
        approved = bob;
        operator = charles;
        toWhom = dany;
        
        await NFTInstance.connect(alice).approve(approved.address, tokenId);
        await NFTInstance.connect(alice).setApprovalForAll(operator.address, true);
      });

      describe('transferFrom()', function () {
        context('when called by owner', function () {
          it('transfers the ownership of the given token ID to the given address', async function () {
            await NFTInstance.connect(alice).transferFrom(alice.address, toWhom.address, tokenId);
            expect(await NFTInstance.ownerOf(tokenId)).to.equal(toWhom.address);
          });

          it('emits a Transfer event', async function () {
            await expect(NFTInstance.connect(alice).transferFrom(alice.address, toWhom.address, tokenId))
            .to.emit(NFTInstance, 'Transfer')
            .withArgs(alice.address, toWhom.address, tokenId)
          });
  
          it('clears the approval for the token ID', async function () {
            await NFTInstance.connect(alice).transferFrom(alice.address, toWhom.address, tokenId);
            expect(await NFTInstance.getApproved(tokenId)).to.be.equal(ZERO_ADDRESS);
          });

          it('emits an Approval event', async function () {
            await expect(NFTInstance.connect(alice).transferFrom(alice.address, toWhom.address, tokenId))
            .to.emit(NFTInstance, 'Approval')
            .withArgs(alice.address, ZERO_ADDRESS, tokenId)
          });
  
          it('adjusts owners balances', async function () {
            await NFTInstance.connect(alice).transferFrom(alice.address, toWhom.address, tokenId);
            expect(await NFTInstance.balanceOf(alice.address)).to.be.equal('1');
          });
  
          it('adjusts owners tokens by index', async function () {
            await NFTInstance.connect(alice).transferFrom(alice.address, toWhom.address, tokenId);
            if (!NFTInstance.tokenOfOwnerByIndex) return;
            expect(await NFTInstance.tokenOfOwnerByIndex(toWhom.address, 0)).to.be.equal(tokenId);
            expect(await NFTInstance.tokenOfOwnerByIndex(alice.address, 0)).to.not.equal(tokenId);
          });
        });

        context('when called by approved individual', function () {
          it('transfers the ownership of the given token ID to the given address', async function () {
            await NFTInstance.connect(approved).transferFrom(alice.address, toWhom.address, tokenId);
            expect(await NFTInstance.ownerOf(tokenId)).to.equal(toWhom.address);
          });

          it('emits a Transfer event', async function () {
            await expect(NFTInstance.connect(approved).transferFrom(alice.address, toWhom.address, tokenId))
            .to.emit(NFTInstance, 'Transfer')
            .withArgs(alice.address, toWhom.address, tokenId)
          });
  
          it('clears the approval for the token ID', async function () {
            await NFTInstance.connect(approved).transferFrom(alice.address, toWhom.address, tokenId);
            expect(await NFTInstance.getApproved(tokenId)).to.be.equal(ZERO_ADDRESS);
          });

          it('emits an Approval event', async function () {
            await expect(NFTInstance.connect(approved).transferFrom(alice.address, toWhom.address, tokenId))
            .to.emit(NFTInstance, 'Approval')
            .withArgs(alice.address, ZERO_ADDRESS, tokenId)
          });
  
          it('adjusts owners balances', async function () {
            await NFTInstance.connect(approved).transferFrom(alice.address, toWhom.address, tokenId);
            expect(await NFTInstance.balanceOf(alice.address)).to.be.equal('1');
          });
  
          it('adjusts owners tokens by index', async function () {
            await NFTInstance.connect(approved).transferFrom(alice.address, toWhom.address, tokenId);
            if (!NFTInstance.tokenOfOwnerByIndex) return;
            expect(await NFTInstance.tokenOfOwnerByIndex(toWhom.address, 0)).to.be.equal(tokenId);
            expect(await NFTInstance.tokenOfOwnerByIndex(alice.address, 0)).to.not.equal(tokenId);
          });
        });

        context('when called by operator', function () {
          it('transfers the ownership of the given token ID to the given address', async function () {
            await NFTInstance.connect(operator).transferFrom(alice.address, toWhom.address, tokenId);
            expect(await NFTInstance.ownerOf(tokenId)).to.equal(toWhom.address);
          });

          it('emits a Transfer event', async function () {
            await expect(NFTInstance.connect(operator).transferFrom(alice.address, toWhom.address, tokenId))
            .to.emit(NFTInstance, 'Transfer')
            .withArgs(alice.address, toWhom.address, tokenId)
          });
  
          it('clears the approval for the token ID', async function () {
            await NFTInstance.connect(operator).transferFrom(alice.address, toWhom.address, tokenId);
            expect(await NFTInstance.getApproved(tokenId)).to.be.equal(ZERO_ADDRESS);
          });

          it('emits an Approval event', async function () {
            await expect(NFTInstance.connect(operator).transferFrom(alice.address, toWhom.address, tokenId))
            .to.emit(NFTInstance, 'Approval')
            .withArgs(alice.address, ZERO_ADDRESS, tokenId)
          });
  
          it('adjusts owners balances', async function () {
            await NFTInstance.connect(operator).transferFrom(alice.address, toWhom.address, tokenId);
            expect(await NFTInstance.balanceOf(alice.address)).to.be.equal('1');
          });
  
          it('adjusts owners tokens by index', async function () {
            await NFTInstance.connect(operator).transferFrom(alice.address, toWhom.address, tokenId);
            if (!NFTInstance.tokenOfOwnerByIndex) return;
            expect(await NFTInstance.tokenOfOwnerByIndex(toWhom.address, 0)).to.be.equal(tokenId);
            expect(await NFTInstance.tokenOfOwnerByIndex(alice.address, 0)).to.not.equal(tokenId);
          });
        });

        context('when called by operator without an approved user', function () {
          beforeEach(async function () {
            await NFTInstance.connect(alice).approve(ZERO_ADDRESS, tokenId);
          });
          it('transfers the ownership of the given token ID to the given address', async function () {
            await NFTInstance.connect(operator).transferFrom(alice.address, toWhom.address, tokenId);
            expect(await NFTInstance.ownerOf(tokenId)).to.be.equal(toWhom.address);
          });

          it('emits a Transfer event', async function () {
            await expect(NFTInstance.connect(operator).transferFrom(alice.address, toWhom.address, tokenId))
            .to.emit(NFTInstance, 'Transfer')
            .withArgs(alice.address, toWhom.address, tokenId)
          });
  
          it('clears the approval for the token ID', async function () {
            await NFTInstance.connect(operator).transferFrom(alice.address, toWhom.address, tokenId);
            expect(await NFTInstance.getApproved(tokenId)).to.be.equal(ZERO_ADDRESS);
          });

          it('emits an Approval event', async function () {
            await expect(NFTInstance.connect(operator).transferFrom(alice.address, toWhom.address, tokenId))
            .to.emit(NFTInstance, 'Approval')
            .withArgs(alice.address, ZERO_ADDRESS, tokenId)
          });
  
          it('adjusts owners balances', async function () {
            await NFTInstance.connect(operator).transferFrom(alice.address, toWhom.address, tokenId);
            expect(await NFTInstance.balanceOf(alice.address)).to.be.equal('1');
          });
  
          it('adjusts owners tokens by index', async function () {
            await NFTInstance.connect(operator).transferFrom(alice.address, toWhom.address, tokenId);
            if (!NFTInstance.tokenOfOwnerByIndex) return;
            expect(await NFTInstance.tokenOfOwnerByIndex(toWhom.address, 0)).to.be.equal(tokenId);
            expect(await NFTInstance.tokenOfOwnerByIndex(alice.address, 0)).to.not.equal(tokenId);
          });
        });

        context('when sent to the owner', function () {
          it('keeps ownership of the token', async function () {
            await NFTInstance.connect(alice).transferFrom(alice.address, alice.address, tokenId);
            expect(await NFTInstance.ownerOf(tokenId)).to.be.equal(alice.address);
          });

          it('clears the approval for the token ID', async function () {
            await NFTInstance.connect(alice).transferFrom(alice.address, alice.address, tokenId);
            expect(await NFTInstance.getApproved(tokenId)).to.be.equal(ZERO_ADDRESS);
          });

          it('emits only a transfer event', async function () {
            await expect(NFTInstance.connect(alice).transferFrom(alice.address, alice.address, tokenId))
            .to.emit(NFTInstance, 'Transfer')
            .withArgs(alice.address, alice.address, tokenId)
          });

          it('keeps the owner balance', async function () {
            await NFTInstance.connect(alice).transferFrom(alice.address, alice.address, tokenId);
            expect(await NFTInstance.balanceOf(alice.address)).to.be.equal('2');
          });

          it('keeps same tokens by index', async function () {
            await NFTInstance.connect(alice).transferFrom(alice.address, alice.address, tokenId);
            if (!NFTInstance.tokenOfOwnerByIndex) return;
            const tokensListed = await Promise.all(
              [0, 1].map(i => NFTInstance.tokenOfOwnerByIndex(alice.address, i)),
            );
            expect(tokensListed.map(t => t.toNumber())).to.have.members(
              [firstTokenId, secondTokenId],
            );
          });
        });

        context('when the address of the owner is incorrect', function () {
          it('should revert', async function () {
            await expect(NFTInstance.connect(alice).transferFrom(other.address, other.address, tokenId)).to.be.revertedWith("ERC721: transfer of token that is not own");
          });
        });

        context('when the sender is not authorized for the token id', function () {
          it('reverts', async function () {
            await expect(NFTInstance.connect(other).transferFrom(alice.address, other.address, tokenId)).to.be.revertedWith("ERC721: transfer caller is not owner nor approved");
          });
        });

        context('when the given token ID does not exist', function () {
          it('should revert', async function () {
            await expect(NFTInstance.connect(alice).transferFrom(alice.address, other.address, nonExistentTokenId)).to.be.revertedWith("ERC721: operator query for nonexistent token");
          });
        });

        context('when the address to transfer the token to is the zero address', function () {
          it('should revert', async function () {
          await expect(NFTInstance.connect(alice).transferFrom(alice.address, ZERO_ADDRESS, tokenId)).to.be.revertedWith("ERC721: transfer to the zero address");
          });
        });
      });

      describe('safeTransferFrom()', function () {
        describe('with data', function () {
          describe('to a user account', function () {
            context('when called by owner', function () {
              it('transfers the ownership of the given token ID to the given address', async function () {
                await NFTInstance.connect(alice)['safeTransferFrom(address,address,uint256,bytes)'](alice.address, toWhom.address, tokenId, data);
                expect(await NFTInstance.ownerOf(tokenId)).to.equal(toWhom.address);
              });

              it('emits a Transfer event', async function () {
                await expect(NFTInstance.connect(alice)['safeTransferFrom(address,address,uint256,bytes)'](alice.address, toWhom.address, tokenId, data))
                .to.emit(NFTInstance, 'Transfer')
                .withArgs(alice.address, toWhom.address, tokenId)
              });
      
              it('clears the approval for the token ID', async function () {
                await NFTInstance.connect(alice)['safeTransferFrom(address,address,uint256,bytes)'](alice.address, toWhom.address, tokenId, data);
                expect(await NFTInstance.getApproved(tokenId)).to.be.equal(ZERO_ADDRESS);
              });

              it('emits an Approval event', async function () {
                await expect(NFTInstance.connect(alice)['safeTransferFrom(address,address,uint256,bytes)'](alice.address, toWhom.address, tokenId, data))
                .to.emit(NFTInstance, 'Approval')
                .withArgs(alice.address, ZERO_ADDRESS, tokenId)
              });
      
              it('adjusts owners balances', async function () {
                await NFTInstance.connect(alice)['safeTransferFrom(address,address,uint256,bytes)'](alice.address, toWhom.address, tokenId, data);
                expect(await NFTInstance.balanceOf(alice.address)).to.be.equal('1');
              });
      
              it('adjusts owners tokens by index', async function () {
                await NFTInstance.connect(alice)['safeTransferFrom(address,address,uint256,bytes)'](alice.address, toWhom.address, tokenId, data);
                if (!NFTInstance.tokenOfOwnerByIndex) return;
                expect(await NFTInstance.tokenOfOwnerByIndex(toWhom.address, 0)).to.be.equal(tokenId);
                expect(await NFTInstance.tokenOfOwnerByIndex(alice.address, 0)).to.not.equal(tokenId);
              });
            });

            context('when called by approved individual', function () {
              it('transfers the ownership of the given token ID to the given address', async function () {
                await NFTInstance.connect(approved)['safeTransferFrom(address,address,uint256,bytes)'](alice.address, toWhom.address, tokenId, data);
                expect(await NFTInstance.ownerOf(tokenId)).to.equal(toWhom.address);
              });
    
              it('emits a Transfer event', async function () {
                await expect(NFTInstance.connect(approved)['safeTransferFrom(address,address,uint256,bytes)'](alice.address, toWhom.address, tokenId, data))
                .to.emit(NFTInstance, 'Transfer')
                .withArgs(alice.address, toWhom.address, tokenId)
              });
      
              it('clears the approval for the token ID', async function () {
                await NFTInstance.connect(approved)['safeTransferFrom(address,address,uint256,bytes)'](alice.address, toWhom.address, tokenId, data);
                expect(await NFTInstance.getApproved(tokenId)).to.be.equal(ZERO_ADDRESS);
              });
    
              it('emits an Approval event', async function () {
                await expect(NFTInstance.connect(approved)['safeTransferFrom(address,address,uint256,bytes)'](alice.address, toWhom.address, tokenId, data))
                .to.emit(NFTInstance, 'Approval')
                .withArgs(alice.address, ZERO_ADDRESS, tokenId)
              });
      
              it('adjusts owners balances', async function () {
                await NFTInstance.connect(approved)['safeTransferFrom(address,address,uint256,bytes)'](alice.address, toWhom.address, tokenId, data);
                expect(await NFTInstance.balanceOf(alice.address)).to.be.equal('1');
              });
      
              it('adjusts owners tokens by index', async function () {
                await NFTInstance.connect(approved)['safeTransferFrom(address,address,uint256,bytes)'](alice.address, toWhom.address, tokenId, data);
                if (!NFTInstance.tokenOfOwnerByIndex) return;
                expect(await NFTInstance.tokenOfOwnerByIndex(toWhom.address, 0)).to.be.equal(tokenId);
                expect(await NFTInstance.tokenOfOwnerByIndex(alice.address, 0)).to.not.equal(tokenId);
              });
            });
    
            context('when called by operator', function () {
              it('transfers the ownership of the given token ID to the given address', async function () {
                await NFTInstance.connect(operator)['safeTransferFrom(address,address,uint256,bytes)'](alice.address, toWhom.address, tokenId, data);
                expect(await NFTInstance.ownerOf(tokenId)).to.equal(toWhom.address);
              });
    
              it('emits a Transfer event', async function () {
                await expect(NFTInstance.connect(operator)['safeTransferFrom(address,address,uint256,bytes)'](alice.address, toWhom.address, tokenId, data))
                .to.emit(NFTInstance, 'Transfer')
                .withArgs(alice.address, toWhom.address, tokenId)
              });
      
              it('clears the approval for the token ID', async function () {
                await NFTInstance.connect(operator)['safeTransferFrom(address,address,uint256,bytes)'](alice.address, toWhom.address, tokenId, data);
                expect(await NFTInstance.getApproved(tokenId)).to.be.equal(ZERO_ADDRESS);
              });
    
              it('emits an Approval event', async function () {
                await expect(NFTInstance.connect(operator)['safeTransferFrom(address,address,uint256,bytes)'](alice.address, toWhom.address, tokenId, data))
                .to.emit(NFTInstance, 'Approval')
                .withArgs(alice.address, ZERO_ADDRESS, tokenId)
              });
      
              it('adjusts owners balances', async function () {
                await NFTInstance.connect(operator)['safeTransferFrom(address,address,uint256,bytes)'](alice.address, toWhom.address, tokenId, data);
                expect(await NFTInstance.balanceOf(alice.address)).to.be.equal('1');
              });
      
              it('adjusts owners tokens by index', async function () {
                await NFTInstance.connect(operator)['safeTransferFrom(address,address,uint256,bytes)'](alice.address, toWhom.address, tokenId, data);
                if (!NFTInstance.tokenOfOwnerByIndex) return;
                expect(await NFTInstance.tokenOfOwnerByIndex(toWhom.address, 0)).to.be.equal(tokenId);
                expect(await NFTInstance.tokenOfOwnerByIndex(alice.address, 0)).to.not.equal(tokenId);
              });
            });
    
            context('when called by operator without an approved user', function () {
              beforeEach(async function () {
                await NFTInstance.connect(alice).approve(ZERO_ADDRESS, tokenId);
              });
              it('transfers the ownership of the given token ID to the given address', async function () {
                await NFTInstance.connect(operator)['safeTransferFrom(address,address,uint256,bytes)'](alice.address, toWhom.address, tokenId, data);
                expect(await NFTInstance.ownerOf(tokenId)).to.be.equal(toWhom.address);
              });
    
              it('emits a Transfer event', async function () {
                await expect(NFTInstance.connect(operator)['safeTransferFrom(address,address,uint256,bytes)'](alice.address, toWhom.address, tokenId, data))
                .to.emit(NFTInstance, 'Transfer')
                .withArgs(alice.address, toWhom.address, tokenId)
              });
      
              it('clears the approval for the token ID', async function () {
                await NFTInstance.connect(operator)['safeTransferFrom(address,address,uint256,bytes)'](alice.address, toWhom.address, tokenId, data);
                expect(await NFTInstance.getApproved(tokenId)).to.be.equal(ZERO_ADDRESS);
              });
    
              it('emits an Approval event', async function () {
                await expect(NFTInstance.connect(operator)['safeTransferFrom(address,address,uint256,bytes)'](alice.address, toWhom.address, tokenId, data))
                .to.emit(NFTInstance, 'Approval')
                .withArgs(alice.address, ZERO_ADDRESS, tokenId)
              });
      
              it('adjusts owners balances', async function () {
                await NFTInstance.connect(operator)['safeTransferFrom(address,address,uint256,bytes)'](alice.address, toWhom.address, tokenId, data);
                expect(await NFTInstance.balanceOf(alice.address)).to.be.equal('1');
              });
      
              it('adjusts owners tokens by index', async function () {
                await NFTInstance.connect(operator)['safeTransferFrom(address,address,uint256,bytes)'](alice.address, toWhom.address, tokenId, data);
                if (!NFTInstance.tokenOfOwnerByIndex) return;
                expect(await NFTInstance.tokenOfOwnerByIndex(toWhom.address, 0)).to.be.equal(tokenId);
                expect(await NFTInstance.tokenOfOwnerByIndex(alice.address, 0)).to.not.equal(tokenId);
              });
            });
    
            context('when sent to the owner', function () {
              it('keeps ownership of the token', async function () {
                await NFTInstance.connect(alice)['safeTransferFrom(address,address,uint256,bytes)'](alice.address, alice.address, tokenId, data);
                expect(await NFTInstance.ownerOf(tokenId)).to.be.equal(alice.address);
              });
    
              it('clears the approval for the token ID', async function () {
                await NFTInstance.connect(alice)['safeTransferFrom(address,address,uint256,bytes)'](alice.address, alice.address, tokenId, data);
                expect(await NFTInstance.getApproved(tokenId)).to.be.equal(ZERO_ADDRESS);
              });
    
              it('emits only a transfer event', async function () {
                await expect(NFTInstance.connect(alice)['safeTransferFrom(address,address,uint256,bytes)'](alice.address, alice.address, tokenId, data))
                .to.emit(NFTInstance, 'Transfer')
                .withArgs(alice.address, alice.address, tokenId)
              });
    
              it('keeps the owner balance', async function () {
                await NFTInstance.connect(alice)['safeTransferFrom(address,address,uint256,bytes)'](alice.address, alice.address, tokenId, data);
                expect(await NFTInstance.balanceOf(alice.address)).to.be.equal('2');
              });
    
              it('keeps same tokens by index', async function () {
                await NFTInstance.connect(alice)['safeTransferFrom(address,address,uint256,bytes)'](alice.address, alice.address, tokenId, data);
                if (!NFTInstance.tokenOfOwnerByIndex) return;
                const tokensListed = await Promise.all(
                  [0, 1].map(i => NFTInstance.tokenOfOwnerByIndex(alice.address, i)),
                );
                expect(tokensListed.map(t => t.toNumber())).to.have.members(
                  [firstTokenId, secondTokenId],
                );
              });
            });
    
            context('when the address of the owner is incorrect', function () {
              it('should revert', async function () {
                await expect(NFTInstance.connect(alice)['safeTransferFrom(address,address,uint256,bytes)'](other.address, other.address, tokenId, data)).to.be.revertedWith("ERC721: transfer of token that is not own");
              });
            });
    
            context('when the sender is not authorized for the token id', function () {
              it('reverts', async function () {
                await expect(NFTInstance.connect(other)['safeTransferFrom(address,address,uint256,bytes)'](alice.address, other.address, tokenId, data)).to.be.revertedWith("ERC721: transfer caller is not owner nor approved");
              });
            });
    
            context('when the given token ID does not exist', function () {
              it('should revert', async function () {
                await expect(NFTInstance.connect(alice)['safeTransferFrom(address,address,uint256,bytes)'](alice.address, other.address, nonExistentTokenId, data)).to.be.revertedWith("ERC721: operator query for nonexistent token");
              });
            });
    
            context('when the address to transfer the token to is the zero address', function () {
              it('should revert', async function () {
              await expect(NFTInstance.connect(alice)['safeTransferFrom(address,address,uint256,bytes)'](alice.address, ZERO_ADDRESS, tokenId, data)).to.be.revertedWith("ERC721: transfer to the zero address");
              });
            });
          });

          describe('to a valid receiver contract', function () {
            beforeEach(async function () {
              receiverContract = await ethers.getContractFactory("ERC721ReceiverMock");
              toWhom = await receiverContract.deploy(RECEIVER_MAGIC_VALUE, false);
            });

            context('when called by owner', function () {
              it('transfers the ownership of the given token ID to the given address', async function () {
                await NFTInstance.connect(alice)['safeTransferFrom(address,address,uint256,bytes)'](alice.address, toWhom.address, tokenId, data);
                expect(await NFTInstance.ownerOf(tokenId)).to.equal(toWhom.address);
              });

              it('emits a Transfer event', async function () {
                await expect(NFTInstance.connect(alice)['safeTransferFrom(address,address,uint256,bytes)'](alice.address, toWhom.address, tokenId, data))
                .to.emit(NFTInstance, 'Transfer')
                .withArgs(alice.address, toWhom.address, tokenId)
              });
      
              it('clears the approval for the token ID', async function () {
                await NFTInstance.connect(alice)['safeTransferFrom(address,address,uint256,bytes)'](alice.address, toWhom.address, tokenId, data);
                expect(await NFTInstance.getApproved(tokenId)).to.be.equal(ZERO_ADDRESS);
              });

              it('emits an Approval event', async function () {
                await expect(NFTInstance.connect(alice)['safeTransferFrom(address,address,uint256,bytes)'](alice.address, toWhom.address, tokenId, data))
                .to.emit(NFTInstance, 'Approval')
                .withArgs(alice.address, ZERO_ADDRESS, tokenId)
              });
      
              it('adjusts owners balances', async function () {
                await NFTInstance.connect(alice)['safeTransferFrom(address,address,uint256,bytes)'](alice.address, toWhom.address, tokenId, data);
                expect(await NFTInstance.balanceOf(alice.address)).to.be.equal('1');
              });
      
              it('adjusts owners tokens by index', async function () {
                await NFTInstance.connect(alice)['safeTransferFrom(address,address,uint256,bytes)'](alice.address, toWhom.address, tokenId, data);
                if (!NFTInstance.tokenOfOwnerByIndex) return;
                expect(await NFTInstance.tokenOfOwnerByIndex(toWhom.address, 0)).to.be.equal(tokenId);
                expect(await NFTInstance.tokenOfOwnerByIndex(alice.address, 0)).to.not.equal(tokenId);
              });
            });

            context('when called by approved individual', function () {
              it('transfers the ownership of the given token ID to the given address', async function () {
                await NFTInstance.connect(approved)['safeTransferFrom(address,address,uint256,bytes)'](alice.address, toWhom.address, tokenId, data);
                expect(await NFTInstance.ownerOf(tokenId)).to.equal(toWhom.address);
              });
    
              it('emits a Transfer event', async function () {
                await expect(NFTInstance.connect(approved)['safeTransferFrom(address,address,uint256,bytes)'](alice.address, toWhom.address, tokenId, data))
                .to.emit(NFTInstance, 'Transfer')
                .withArgs(alice.address, toWhom.address, tokenId)
              });
      
              it('clears the approval for the token ID', async function () {
                await NFTInstance.connect(approved)['safeTransferFrom(address,address,uint256,bytes)'](alice.address, toWhom.address, tokenId, data);
                expect(await NFTInstance.getApproved(tokenId)).to.be.equal(ZERO_ADDRESS);
              });
    
              it('emits an Approval event', async function () {
                await expect(NFTInstance.connect(approved)['safeTransferFrom(address,address,uint256,bytes)'](alice.address, toWhom.address, tokenId, data))
                .to.emit(NFTInstance, 'Approval')
                .withArgs(alice.address, ZERO_ADDRESS, tokenId)
              });
      
              it('adjusts owners balances', async function () {
                await NFTInstance.connect(approved)['safeTransferFrom(address,address,uint256,bytes)'](alice.address, toWhom.address, tokenId, data);
                expect(await NFTInstance.balanceOf(alice.address)).to.be.equal('1');
              });
      
              it('adjusts owners tokens by index', async function () {
                await NFTInstance.connect(approved)['safeTransferFrom(address,address,uint256,bytes)'](alice.address, toWhom.address, tokenId, data);
                if (!NFTInstance.tokenOfOwnerByIndex) return;
                expect(await NFTInstance.tokenOfOwnerByIndex(toWhom.address, 0)).to.be.equal(tokenId);
                expect(await NFTInstance.tokenOfOwnerByIndex(alice.address, 0)).to.not.equal(tokenId);
              });
            });
    
            context('when called by operator', function () {
              it('transfers the ownership of the given token ID to the given address', async function () {
                await NFTInstance.connect(operator)['safeTransferFrom(address,address,uint256,bytes)'](alice.address, toWhom.address, tokenId, data);
                expect(await NFTInstance.ownerOf(tokenId)).to.equal(toWhom.address);
              });
    
              it('emits a Transfer event', async function () {
                await expect(NFTInstance.connect(operator)['safeTransferFrom(address,address,uint256,bytes)'](alice.address, toWhom.address, tokenId, data))
                .to.emit(NFTInstance, 'Transfer')
                .withArgs(alice.address, toWhom.address, tokenId)
              });
      
              it('clears the approval for the token ID', async function () {
                await NFTInstance.connect(operator)['safeTransferFrom(address,address,uint256,bytes)'](alice.address, toWhom.address, tokenId, data);
                expect(await NFTInstance.getApproved(tokenId)).to.be.equal(ZERO_ADDRESS);
              });
    
              it('emits an Approval event', async function () {
                await expect(NFTInstance.connect(operator)['safeTransferFrom(address,address,uint256,bytes)'](alice.address, toWhom.address, tokenId, data))
                .to.emit(NFTInstance, 'Approval')
                .withArgs(alice.address, ZERO_ADDRESS, tokenId)
              });
      
              it('adjusts owners balances', async function () {
                await NFTInstance.connect(operator)['safeTransferFrom(address,address,uint256,bytes)'](alice.address, toWhom.address, tokenId, data);
                expect(await NFTInstance.balanceOf(alice.address)).to.be.equal('1');
              });
      
              it('adjusts owners tokens by index', async function () {
                await NFTInstance.connect(operator)['safeTransferFrom(address,address,uint256,bytes)'](alice.address, toWhom.address, tokenId, data);
                if (!NFTInstance.tokenOfOwnerByIndex) return;
                expect(await NFTInstance.tokenOfOwnerByIndex(toWhom.address, 0)).to.be.equal(tokenId);
                expect(await NFTInstance.tokenOfOwnerByIndex(alice.address, 0)).to.not.equal(tokenId);
              });
            });
    
            context('when called by operator without an approved user', function () {
              beforeEach(async function () {
                await NFTInstance.connect(alice).approve(ZERO_ADDRESS, tokenId);
              });
              it('transfers the ownership of the given token ID to the given address', async function () {
                await NFTInstance.connect(operator)['safeTransferFrom(address,address,uint256,bytes)'](alice.address, toWhom.address, tokenId, data);
                expect(await NFTInstance.ownerOf(tokenId)).to.be.equal(toWhom.address);
              });
    
              it('emits a Transfer event', async function () {
                await expect(NFTInstance.connect(operator)['safeTransferFrom(address,address,uint256,bytes)'](alice.address, toWhom.address, tokenId, data))
                .to.emit(NFTInstance, 'Transfer')
                .withArgs(alice.address, toWhom.address, tokenId)
              });
      
              it('clears the approval for the token ID', async function () {
                await NFTInstance.connect(operator)['safeTransferFrom(address,address,uint256,bytes)'](alice.address, toWhom.address, tokenId, data);
                expect(await NFTInstance.getApproved(tokenId)).to.be.equal(ZERO_ADDRESS);
              });
    
              it('emits an Approval event', async function () {
                await expect(NFTInstance.connect(operator)['safeTransferFrom(address,address,uint256,bytes)'](alice.address, toWhom.address, tokenId, data))
                .to.emit(NFTInstance, 'Approval')
                .withArgs(alice.address, ZERO_ADDRESS, tokenId)
              });
      
              it('adjusts owners balances', async function () {
                await NFTInstance.connect(operator)['safeTransferFrom(address,address,uint256,bytes)'](alice.address, toWhom.address, tokenId, data);
                expect(await NFTInstance.balanceOf(alice.address)).to.be.equal('1');
              });
      
              it('adjusts owners tokens by index', async function () {
                await NFTInstance.connect(operator)['safeTransferFrom(address,address,uint256,bytes)'](alice.address, toWhom.address, tokenId, data);
                if (!NFTInstance.tokenOfOwnerByIndex) return;
                expect(await NFTInstance.tokenOfOwnerByIndex(toWhom.address, 0)).to.be.equal(tokenId);
                expect(await NFTInstance.tokenOfOwnerByIndex(alice.address, 0)).to.not.equal(tokenId);
              });
            });
    
            it('calls onERC721Received', async function () {
              await expect(NFTInstance.connect(alice)['safeTransferFrom(address,address,uint256,bytes)'](alice.address, toWhom.address, tokenId, data))
              .to.emit(toWhom, 'Received')
            });

            it('calls onERC721Received from approved', async function () {
               await expect(NFTInstance.connect(approved)['safeTransferFrom(address,address,uint256,bytes)'](alice.address, toWhom.address, tokenId, data))
              .to.emit(toWhom, 'Received')
            });

            describe('with an invalid token id', function () {
              it('reverts', async function () {
                await expect(NFTInstance.connect(alice)['safeTransferFrom(address,address,uint256,bytes)'](alice.address, toWhom.address, nonExistentTokenId, data)).to.be.revertedWith("ERC721: operator query for nonexistent token");
              });
            });
          });
        });

        describe('without data', function () {
          describe('to a user account', function () {
            context('when called by owner', function () {
              it('transfers the ownership of the given token ID to the given address', async function () {
                await NFTInstance.connect(alice)['safeTransferFrom(address,address,uint256)'](alice.address, toWhom.address, tokenId);
                expect(await NFTInstance.ownerOf(tokenId)).to.equal(toWhom.address);
              });

              it('emits a Transfer event', async function () {
                await expect(NFTInstance.connect(alice)['safeTransferFrom(address,address,uint256)'](alice.address, toWhom.address, tokenId))
                .to.emit(NFTInstance, 'Transfer')
                .withArgs(alice.address, toWhom.address, tokenId)
              });
      
              it('clears the approval for the token ID', async function () {
                await NFTInstance.connect(alice)['safeTransferFrom(address,address,uint256)'](alice.address, toWhom.address, tokenId);
                expect(await NFTInstance.getApproved(tokenId)).to.be.equal(ZERO_ADDRESS);
              });

              it('emits an Approval event', async function () {
                await expect(NFTInstance.connect(alice)['safeTransferFrom(address,address,uint256)'](alice.address, toWhom.address, tokenId))
                .to.emit(NFTInstance, 'Approval')
                .withArgs(alice.address, ZERO_ADDRESS, tokenId)
              });
      
              it('adjusts owners balances', async function () {
                await NFTInstance.connect(alice)['safeTransferFrom(address,address,uint256)'](alice.address, toWhom.address, tokenId);
                expect(await NFTInstance.balanceOf(alice.address)).to.be.equal('1');
              });
      
              it('adjusts owners tokens by index', async function () {
                await NFTInstance.connect(alice)['safeTransferFrom(address,address,uint256)'](alice.address, toWhom.address, tokenId);
                if (!NFTInstance.tokenOfOwnerByIndex) return;
                expect(await NFTInstance.tokenOfOwnerByIndex(toWhom.address, 0)).to.be.equal(tokenId);
                expect(await NFTInstance.tokenOfOwnerByIndex(alice.address, 0)).to.not.equal(tokenId);
              });
            });

            context('when called by approved individual', function () {
              it('transfers the ownership of the given token ID to the given address', async function () {
                await NFTInstance.connect(approved)['safeTransferFrom(address,address,uint256)'](alice.address, toWhom.address, tokenId);
                expect(await NFTInstance.ownerOf(tokenId)).to.equal(toWhom.address);
              });
    
              it('emits a Transfer event', async function () {
                await expect(NFTInstance.connect(approved)['safeTransferFrom(address,address,uint256)'](alice.address, toWhom.address, tokenId))
                .to.emit(NFTInstance, 'Transfer')
                .withArgs(alice.address, toWhom.address, tokenId)
              });
      
              it('clears the approval for the token ID', async function () {
                await NFTInstance.connect(approved)['safeTransferFrom(address,address,uint256)'](alice.address, toWhom.address, tokenId);
                expect(await NFTInstance.getApproved(tokenId)).to.be.equal(ZERO_ADDRESS);
              });
    
              it('emits an Approval event', async function () {
                await expect(NFTInstance.connect(approved)['safeTransferFrom(address,address,uint256)'](alice.address, toWhom.address, tokenId))
                .to.emit(NFTInstance, 'Approval')
                .withArgs(alice.address, ZERO_ADDRESS, tokenId)
              });
      
              it('adjusts owners balances', async function () {
                await NFTInstance.connect(approved)['safeTransferFrom(address,address,uint256)'](alice.address, toWhom.address, tokenId);
                expect(await NFTInstance.balanceOf(alice.address)).to.be.equal('1');
              });
      
              it('adjusts owners tokens by index', async function () {
                await NFTInstance.connect(approved)['safeTransferFrom(address,address,uint256)'](alice.address, toWhom.address, tokenId);
                if (!NFTInstance.tokenOfOwnerByIndex) return;
                expect(await NFTInstance.tokenOfOwnerByIndex(toWhom.address, 0)).to.be.equal(tokenId);
                expect(await NFTInstance.tokenOfOwnerByIndex(alice.address, 0)).to.not.equal(tokenId);
              });
            });
    
            context('when called by operator', function () {
              it('transfers the ownership of the given token ID to the given address', async function () {
                await NFTInstance.connect(operator)['safeTransferFrom(address,address,uint256)'](alice.address, toWhom.address, tokenId);
                expect(await NFTInstance.ownerOf(tokenId)).to.equal(toWhom.address);
              });
    
              it('emits a Transfer event', async function () {
                await expect(NFTInstance.connect(operator)['safeTransferFrom(address,address,uint256)'](alice.address, toWhom.address, tokenId))
                .to.emit(NFTInstance, 'Transfer')
                .withArgs(alice.address, toWhom.address, tokenId)
              });
      
              it('clears the approval for the token ID', async function () {
                await NFTInstance.connect(operator)['safeTransferFrom(address,address,uint256)'](alice.address, toWhom.address, tokenId);
                expect(await NFTInstance.getApproved(tokenId)).to.be.equal(ZERO_ADDRESS);
              });
    
              it('emits an Approval event', async function () {
                await expect(NFTInstance.connect(operator)['safeTransferFrom(address,address,uint256)'](alice.address, toWhom.address, tokenId))
                .to.emit(NFTInstance, 'Approval')
                .withArgs(alice.address, ZERO_ADDRESS, tokenId)
              });
      
              it('adjusts owners balances', async function () {
                await NFTInstance.connect(operator)['safeTransferFrom(address,address,uint256)'](alice.address, toWhom.address, tokenId);
                expect(await NFTInstance.balanceOf(alice.address)).to.be.equal('1');
              });
      
              it('adjusts owners tokens by index', async function () {
                await NFTInstance.connect(operator)['safeTransferFrom(address,address,uint256)'](alice.address, toWhom.address, tokenId);
                if (!NFTInstance.tokenOfOwnerByIndex) return;
                expect(await NFTInstance.tokenOfOwnerByIndex(toWhom.address, 0)).to.be.equal(tokenId);
                expect(await NFTInstance.tokenOfOwnerByIndex(alice.address, 0)).to.not.equal(tokenId);
              });
            });
    
            context('when called by operator without an approved user', function () {
              beforeEach(async function () {
                await NFTInstance.connect(alice).approve(ZERO_ADDRESS, tokenId);
              });
              it('transfers the ownership of the given token ID to the given address', async function () {
                await NFTInstance.connect(operator)['safeTransferFrom(address,address,uint256)'](alice.address, toWhom.address, tokenId);
                expect(await NFTInstance.ownerOf(tokenId)).to.be.equal(toWhom.address);
              });
    
              it('emits a Transfer event', async function () {
                await expect(NFTInstance.connect(operator)['safeTransferFrom(address,address,uint256)'](alice.address, toWhom.address, tokenId))
                .to.emit(NFTInstance, 'Transfer')
                .withArgs(alice.address, toWhom.address, tokenId)
              });
      
              it('clears the approval for the token ID', async function () {
                await NFTInstance.connect(operator)['safeTransferFrom(address,address,uint256)'](alice.address, toWhom.address, tokenId);
                expect(await NFTInstance.getApproved(tokenId)).to.be.equal(ZERO_ADDRESS);
              });
    
              it('emits an Approval event', async function () {
                await expect(NFTInstance.connect(operator)['safeTransferFrom(address,address,uint256)'](alice.address, toWhom.address, tokenId))
                .to.emit(NFTInstance, 'Approval')
                .withArgs(alice.address, ZERO_ADDRESS, tokenId)
              });
      
              it('adjusts owners balances', async function () {
                await NFTInstance.connect(operator)['safeTransferFrom(address,address,uint256)'](alice.address, toWhom.address, tokenId);
                expect(await NFTInstance.balanceOf(alice.address)).to.be.equal('1');
              });
      
              it('adjusts owners tokens by index', async function () {
                await NFTInstance.connect(operator)['safeTransferFrom(address,address,uint256)'](alice.address, toWhom.address, tokenId);
                if (!NFTInstance.tokenOfOwnerByIndex) return;
                expect(await NFTInstance.tokenOfOwnerByIndex(toWhom.address, 0)).to.be.equal(tokenId);
                expect(await NFTInstance.tokenOfOwnerByIndex(alice.address, 0)).to.not.equal(tokenId);
              });
            });
    
            context('when sent to the owner', function () {
              it('keeps ownership of the token', async function () {
                await NFTInstance.connect(alice)['safeTransferFrom(address,address,uint256)'](alice.address, alice.address, tokenId);
                expect(await NFTInstance.ownerOf(tokenId)).to.be.equal(alice.address);
              });
    
              it('clears the approval for the token ID', async function () {
                await NFTInstance.connect(alice)['safeTransferFrom(address,address,uint256)'](alice.address, alice.address, tokenId);
                expect(await NFTInstance.getApproved(tokenId)).to.be.equal(ZERO_ADDRESS);
              });
    
              it('emits only a transfer event', async function () {
                await expect(NFTInstance.connect(alice)['safeTransferFrom(address,address,uint256)'](alice.address, alice.address, tokenId))
                .to.emit(NFTInstance, 'Transfer')
                .withArgs(alice.address, alice.address, tokenId)
              });
    
              it('keeps the owner balance', async function () {
                await NFTInstance.connect(alice)['safeTransferFrom(address,address,uint256)'](alice.address, alice.address, tokenId);
                expect(await NFTInstance.balanceOf(alice.address)).to.be.equal('2');
              });
    
              it('keeps same tokens by index', async function () {
                await NFTInstance.connect(alice)['safeTransferFrom(address,address,uint256)'](alice.address, alice.address, tokenId);
                if (!NFTInstance.tokenOfOwnerByIndex) return;
                const tokensListed = await Promise.all(
                  [0, 1].map(i => NFTInstance.tokenOfOwnerByIndex(alice.address, i)),
                );
                expect(tokensListed.map(t => t.toNumber())).to.have.members(
                  [firstTokenId, secondTokenId],
                );
              });
            });
    
            context('when the address of the owner is incorrect', function () {
              it('should revert', async function () {
                await expect(NFTInstance.connect(alice)['safeTransferFrom(address,address,uint256)'](other.address, other.address, tokenId)).to.be.revertedWith("ERC721: transfer of token that is not own");
              });
            });
    
            context('when the sender is not authorized for the token id', function () {
              it('reverts', async function () {
                await expect(NFTInstance.connect(other)['safeTransferFrom(address,address,uint256)'](alice.address, other.address, tokenId)).to.be.revertedWith("ERC721: transfer caller is not owner nor approved");
              });
            });
    
            context('when the given token ID does not exist', function () {
              it('should revert', async function () {
                await expect(NFTInstance.connect(alice)['safeTransferFrom(address,address,uint256)'](alice.address, other.address, nonExistentTokenId)).to.be.revertedWith("ERC721: operator query for nonexistent token");
              });
            });
    
            context('when the address to transfer the token to is the zero address', function () {
              it('should revert', async function () {
              await expect(NFTInstance.connect(alice)['safeTransferFrom(address,address,uint256)'](alice.address, ZERO_ADDRESS, tokenId)).to.be.revertedWith("ERC721: transfer to the zero address");
              });
            });

          });

          describe('to a valid receiver contract', function () {
            beforeEach(async function () {
              receiverContract = await ethers.getContractFactory("ERC721ReceiverMock");
              toWhom = await receiverContract.deploy(RECEIVER_MAGIC_VALUE, false);
            });

            context('when called by owner', function () {
              it('transfers the ownership of the given token ID to the given address', async function () {
                await NFTInstance.connect(alice)['safeTransferFrom(address,address,uint256)'](alice.address, toWhom.address, tokenId);
                expect(await NFTInstance.ownerOf(tokenId)).to.equal(toWhom.address);
              });

              it('emits a Transfer event', async function () {
                await expect(NFTInstance.connect(alice)['safeTransferFrom(address,address,uint256)'](alice.address, toWhom.address, tokenId))
                .to.emit(NFTInstance, 'Transfer')
                .withArgs(alice.address, toWhom.address, tokenId)
              });
      
              it('clears the approval for the token ID', async function () {
                await NFTInstance.connect(alice)['safeTransferFrom(address,address,uint256)'](alice.address, toWhom.address, tokenId);
                expect(await NFTInstance.getApproved(tokenId)).to.be.equal(ZERO_ADDRESS);
              });

              it('emits an Approval event', async function () {
                await expect(NFTInstance.connect(alice)['safeTransferFrom(address,address,uint256)'](alice.address, toWhom.address, tokenId))
                .to.emit(NFTInstance, 'Approval')
                .withArgs(alice.address, ZERO_ADDRESS, tokenId)
              });
      
              it('adjusts owners balances', async function () {
                await NFTInstance.connect(alice)['safeTransferFrom(address,address,uint256)'](alice.address, toWhom.address, tokenId);
                expect(await NFTInstance.balanceOf(alice.address)).to.be.equal('1');
              });
      
              it('adjusts owners tokens by index', async function () {
                await NFTInstance.connect(alice)['safeTransferFrom(address,address,uint256)'](alice.address, toWhom.address, tokenId);
                if (!NFTInstance.tokenOfOwnerByIndex) return;
                expect(await NFTInstance.tokenOfOwnerByIndex(toWhom.address, 0)).to.be.equal(tokenId);
                expect(await NFTInstance.tokenOfOwnerByIndex(alice.address, 0)).to.not.equal(tokenId);
              });
            });

            context('when called by approved individual', function () {
              it('transfers the ownership of the given token ID to the given address', async function () {
                await NFTInstance.connect(approved)['safeTransferFrom(address,address,uint256)'](alice.address, toWhom.address, tokenId);
                expect(await NFTInstance.ownerOf(tokenId)).to.equal(toWhom.address);
              });
    
              it('emits a Transfer event', async function () {
                await expect(NFTInstance.connect(approved)['safeTransferFrom(address,address,uint256)'](alice.address, toWhom.address, tokenId))
                .to.emit(NFTInstance, 'Transfer')
                .withArgs(alice.address, toWhom.address, tokenId)
              });
      
              it('clears the approval for the token ID', async function () {
                await NFTInstance.connect(approved)['safeTransferFrom(address,address,uint256)'](alice.address, toWhom.address, tokenId);
                expect(await NFTInstance.getApproved(tokenId)).to.be.equal(ZERO_ADDRESS);
              });
    
              it('emits an Approval event', async function () {
                await expect(NFTInstance.connect(approved)['safeTransferFrom(address,address,uint256)'](alice.address, toWhom.address, tokenId))
                .to.emit(NFTInstance, 'Approval')
                .withArgs(alice.address, ZERO_ADDRESS, tokenId)
              });
      
              it('adjusts owners balances', async function () {
                await NFTInstance.connect(approved)['safeTransferFrom(address,address,uint256)'](alice.address, toWhom.address, tokenId);
                expect(await NFTInstance.balanceOf(alice.address)).to.be.equal('1');
              });
      
              it('adjusts owners tokens by index', async function () {
                await NFTInstance.connect(approved)['safeTransferFrom(address,address,uint256)'](alice.address, toWhom.address, tokenId);
                if (!NFTInstance.tokenOfOwnerByIndex) return;
                expect(await NFTInstance.tokenOfOwnerByIndex(toWhom.address, 0)).to.be.equal(tokenId);
                expect(await NFTInstance.tokenOfOwnerByIndex(alice.address, 0)).to.not.equal(tokenId);
              });
            });
    
            context('when called by operator', function () {
              it('transfers the ownership of the given token ID to the given address', async function () {
                await NFTInstance.connect(operator)['safeTransferFrom(address,address,uint256)'](alice.address, toWhom.address, tokenId);
                expect(await NFTInstance.ownerOf(tokenId)).to.equal(toWhom.address);
              });
    
              it('emits a Transfer event', async function () {
                await expect(NFTInstance.connect(operator)['safeTransferFrom(address,address,uint256)'](alice.address, toWhom.address, tokenId))
                .to.emit(NFTInstance, 'Transfer')
                .withArgs(alice.address, toWhom.address, tokenId)
              });
      
              it('clears the approval for the token ID', async function () {
                await NFTInstance.connect(operator)['safeTransferFrom(address,address,uint256)'](alice.address, toWhom.address, tokenId);
                expect(await NFTInstance.getApproved(tokenId)).to.be.equal(ZERO_ADDRESS);
              });
    
              it('emits an Approval event', async function () {
                await expect(NFTInstance.connect(operator)['safeTransferFrom(address,address,uint256)'](alice.address, toWhom.address, tokenId))
                .to.emit(NFTInstance, 'Approval')
                .withArgs(alice.address, ZERO_ADDRESS, tokenId)
              });
      
              it('adjusts owners balances', async function () {
                await NFTInstance.connect(operator)['safeTransferFrom(address,address,uint256)'](alice.address, toWhom.address, tokenId);
                expect(await NFTInstance.balanceOf(alice.address)).to.be.equal('1');
              });
      
              it('adjusts owners tokens by index', async function () {
                await NFTInstance.connect(operator)['safeTransferFrom(address,address,uint256)'](alice.address, toWhom.address, tokenId);
                if (!NFTInstance.tokenOfOwnerByIndex) return;
                expect(await NFTInstance.tokenOfOwnerByIndex(toWhom.address, 0)).to.be.equal(tokenId);
                expect(await NFTInstance.tokenOfOwnerByIndex(alice.address, 0)).to.not.equal(tokenId);
              });
            });
    
            context('when called by operator without an approved user', function () {
              beforeEach(async function () {
                await NFTInstance.connect(alice).approve(ZERO_ADDRESS, tokenId);
              });
              it('transfers the ownership of the given token ID to the given address', async function () {
                await NFTInstance.connect(operator)['safeTransferFrom(address,address,uint256)'](alice.address, toWhom.address, tokenId);
                expect(await NFTInstance.ownerOf(tokenId)).to.be.equal(toWhom.address);
              });
    
              it('emits a Transfer event', async function () {
                await expect(NFTInstance.connect(operator)['safeTransferFrom(address,address,uint256)'](alice.address, toWhom.address, tokenId))
                .to.emit(NFTInstance, 'Transfer')
                .withArgs(alice.address, toWhom.address, tokenId)
              });
      
              it('clears the approval for the token ID', async function () {
                await NFTInstance.connect(operator)['safeTransferFrom(address,address,uint256)'](alice.address, toWhom.address, tokenId);
                expect(await NFTInstance.getApproved(tokenId)).to.be.equal(ZERO_ADDRESS);
              });
    
              it('emits an Approval event', async function () {
                await expect(NFTInstance.connect(operator)['safeTransferFrom(address,address,uint256)'](alice.address, toWhom.address, tokenId))
                .to.emit(NFTInstance, 'Approval')
                .withArgs(alice.address, ZERO_ADDRESS, tokenId)
              });
      
              it('adjusts owners balances', async function () {
                await NFTInstance.connect(operator)['safeTransferFrom(address,address,uint256)'](alice.address, toWhom.address, tokenId);
                expect(await NFTInstance.balanceOf(alice.address)).to.be.equal('1');
              });
      
              it('adjusts owners tokens by index', async function () {
                await NFTInstance.connect(operator)['safeTransferFrom(address,address,uint256)'](alice.address, toWhom.address, tokenId);
                if (!NFTInstance.tokenOfOwnerByIndex) return;
                expect(await NFTInstance.tokenOfOwnerByIndex(toWhom.address, 0)).to.be.equal(tokenId);
                expect(await NFTInstance.tokenOfOwnerByIndex(alice.address, 0)).to.not.equal(tokenId);
              });
            });
    
            it('calls onERC721Received', async function () {
              await expect(NFTInstance.connect(alice)['safeTransferFrom(address,address,uint256)'](alice.address, toWhom.address, tokenId))
              .to.emit(toWhom, 'Received')
            });

            it('calls onERC721Received from approved', async function () {
               await expect(NFTInstance.connect(approved)['safeTransferFrom(address,address,uint256)'](alice.address, toWhom.address, tokenId))
              .to.emit(toWhom, 'Received')
            });

            describe('with an invalid token id', function () {
              it('reverts', async function () {
                await expect(NFTInstance.connect(alice)['safeTransferFrom(address,address,uint256)'](alice.address, toWhom.address, nonExistentTokenId)).to.be.revertedWith("ERC721: operator query for nonexistent token");
              });
            });
          });

        });

        describe('to a receiver contract receiving unexpected value', function () {
          it('reverts', async function () {
            const invalidReceiverContract = await ethers.getContractFactory("ERC721ReceiverMock");
            const invalidReceiver = await invalidReceiverContract.deploy('0x150b7b23', false);
            await expect(NFTInstance.connect(alice)['safeTransferFrom(address,address,uint256)'](alice.address, invalidReceiver.address, tokenId)).to.be.revertedWith("ERC721: transfer to non ERC721Receiver implementer");
          });
        });

        describe('to a receiver contract that reverts', function () {
          it('reverts', async function () {
            const revertingReceiverContract = await ethers.getContractFactory("ERC721ReceiverMock");
            const revertingReceiver = await revertingReceiverContract.deploy(RECEIVER_MAGIC_VALUE, true);
            await expect(NFTInstance.connect(alice)['safeTransferFrom(address,address,uint256)'](alice.address, revertingReceiver.address, tokenId)).to.be.revertedWith("ERC721ReceiverMock: reverting");
          });
        });

        describe('to a contract that does not implement the required function', function () {
          it('reverts', async function () {
            const nonReceiver = NFTInstance;
            await expect(NFTInstance.connect(alice)['safeTransferFrom(address,address,uint256)'](alice.address, nonReceiver.address, tokenId)).to.be.revertedWith("ERC721: transfer to non ERC721Receiver implementer");
          });
        });
      });
    });

    describe('safeMint()', function () {
      const thirdTokenId = new BN(3);
      const tokenId = thirdTokenId;
      const data = '0x42';

      describe('via safeMint', function () { 
        it('calls onERC721Received — with data', async function () {
          const receiverContract = await ethers.getContractFactory("ERC721ReceiverMock");
          const receiver = await receiverContract.deploy(RECEIVER_MAGIC_VALUE, false);
          await expect(NFTInstance.safeMint(receiver.address, data))
          .to.emit(receiver, 'Received')
        });

        context('to a receiver contract returning unexpected value', function () {
          it('reverts', async function () {
            const invalidReceiverContract = await ethers.getContractFactory("ERC721ReceiverMock");
            const invalidReceiver = await invalidReceiverContract.deploy('0x150b7b23', false);
            await expect(NFTInstance.safeMint(invalidReceiver.address, data)).to.be.revertedWith("ERC721: transfer to non ERC721Receiver implementer");
          });
        });

        context('to a receiver contract that throws', function () {
          it('reverts', async function () {
            const revertingReceiverContract = await ethers.getContractFactory("ERC721ReceiverMock");
            const revertingReceiver = await revertingReceiverContract.deploy(RECEIVER_MAGIC_VALUE, true);
            await expect(NFTInstance.safeMint(revertingReceiver.address, data)).to.be.revertedWith("ERC721ReceiverMock: reverting");
          });
        });

        context('to a contract that does not implement the required function', function () {
          it('reverts', async function () {
            const nonReceiver = NFTInstance;
            await expect(NFTInstance.safeMint(nonReceiver.address, data)).to.be.revertedWith("ERC721: transfer to non ERC721Receiver implementer");
          });
        });
      });
    });

    describe('approve()', function () {
      const tokenId = firstTokenId;
      let approved;
      let anotherApproved;
      let operator;

      beforeEach(async function(){
        approved = bob;
        anotherApproved = charles;
        operator = dany;
      })

      context('when clearing approval', function () {
        context('when there was no prior approval', function () {
          it('clears approval for the token', async function () {
            const tx = await NFTInstance.connect(alice).approve(ZERO_ADDRESS, tokenId);
            expect(await NFTInstance.getApproved(tokenId)).to.be.equal(ZERO_ADDRESS);
          });
          it('emits an approval event', async function () {
            await expect(NFTInstance.connect(alice).approve(ZERO_ADDRESS, tokenId))
            .to.emit(NFTInstance, 'Approval')
            .withArgs(alice.address, ZERO_ADDRESS, tokenId)
          });
        });

        context('when there was a prior approval', function () {
          it('clears approval for the token', async function () {
            await NFTInstance.connect(alice).approve(approved.address, tokenId);
            const tx = await NFTInstance.connect(alice).approve(ZERO_ADDRESS, tokenId);
            expect(await NFTInstance.getApproved(tokenId)).to.be.equal(ZERO_ADDRESS);
          });
          it('emits an approval event', async function () {
            await NFTInstance.connect(alice).approve(approved.address, tokenId);
            await expect(NFTInstance.connect(alice).approve(ZERO_ADDRESS, tokenId))
            .to.emit(NFTInstance, 'Approval')
            .withArgs(alice.address, ZERO_ADDRESS, tokenId)
          });
        });
      });

      context('when approving a non-zero address', function () {
        context('when there was no prior approval', function () {
          it('sets the approval for the target address', async function () {
            await NFTInstance.connect(alice).approve(approved.address, tokenId);
            expect(await NFTInstance.getApproved(tokenId)).to.be.equal(approved.address);
          });
          it('emits an approval event', async function () {
            await expect(NFTInstance.connect(alice).approve(approved.address, tokenId))
            .to.emit(NFTInstance, 'Approval')
            .withArgs(alice.address, approved.address, tokenId)
          });
        });
        context('when there was a prior approval to the same address', function () {
          it('sets the approval for the target address', async function () {
            await NFTInstance.connect(alice).approve(approved.address, tokenId);
            await NFTInstance.connect(alice).approve(approved.address, tokenId);
            expect(await NFTInstance.getApproved(tokenId)).to.be.equal(approved.address);
          });
          it('emits an approval event', async function () {
            await NFTInstance.connect(alice).approve(approved.address, tokenId);
            await expect(NFTInstance.connect(alice).approve(approved.address, tokenId))
            .to.emit(NFTInstance, 'Approval')
            .withArgs(alice.address, approved.address, tokenId)
          });
        });

        context('when there was a prior approval to a different address', function () {
          it('sets the approval for the target address', async function () {
            await NFTInstance.connect(alice).approve(approved.address, tokenId);
            await NFTInstance.connect(alice).approve(anotherApproved.address, tokenId);
            expect(await NFTInstance.getApproved(tokenId)).to.be.equal(anotherApproved.address);
          });
          it('emits an approval event', async function () {
            await NFTInstance.connect(alice).approve(approved.address, tokenId);
            await expect(NFTInstance.connect(alice).approve(anotherApproved.address, tokenId))
            .to.emit(NFTInstance, 'Approval')
            .withArgs(alice.address, anotherApproved.address, tokenId)
          });

        });
      });

      context('when the address that receives the approval is the owner', function () {
        it('reverts', async function () {
          await expect(NFTInstance.connect(alice).approve(alice.address, tokenId)).to.be.revertedWith("ERC721: approval to current owner");
        });
      });

      context('when the sender does not own the given token ID', function () {
        it('reverts', async function () {
          await expect(NFTInstance.connect(other).approve(approved.address, tokenId)).to.be.revertedWith("ERC721: approve caller is not owner nor approved");
        });
      });

      context('when the sender is approved for the given token ID', function () {
        it('reverts', async function () {
          await NFTInstance.connect(alice).approve(approved.address, tokenId)
          await expect(NFTInstance.connect(approved).approve(anotherApproved.address, tokenId)).to.be.revertedWith("ERC721: approve caller is not owner nor approved for all");
        });
      });

      context('when the sender is an operator', function () {
        it('sets the approval for the target address', async function () {
          await NFTInstance.connect(alice).setApprovalForAll(operator.address, true);
          await NFTInstance.connect(operator).approve(approved.address, tokenId);
          expect(await NFTInstance.getApproved(tokenId)).to.be.equal(approved.address);
        });
        it('emits an approval event', async function () {
          await NFTInstance.connect(alice).setApprovalForAll(operator.address, tokenId);
          await expect(NFTInstance.connect(operator).approve(approved.address, tokenId))
          .to.emit(NFTInstance, 'Approval')
          .withArgs(alice.address, approved.address, tokenId)
        });
      });

      context('when the given token ID does not exist', function () {
        it('reverts', async function () {
          await expect(NFTInstance.connect(operator).approve(approved.address, nonExistentTokenId)).to.be.revertedWith("ERC721: owner query for nonexistent token");
        });
      });
    });

    describe('setApprovalForAll()', function () {
      let operator;

      beforeEach(async function(){
        operator = dany;
      })
      context('when the operator willing to approve is not the owner', function () {
        context('when there is no operator approval set by the sender', function () {
          it('approves the operator', async function () {
            await NFTInstance.connect(alice).setApprovalForAll(operator.address, true);
            expect(await NFTInstance.isApprovedForAll(alice.address, operator.address)).to.equal(true);
          });
          it('emits an approval event', async function () {
            await expect(NFTInstance.connect(alice).setApprovalForAll(operator.address, true))
            .to.emit(NFTInstance, 'ApprovalForAll')
            .withArgs(alice.address, operator.address, true)
          });
        });

        context('when the operator was set as not approved', function () {
          beforeEach(async function () {
            await NFTInstance.connect(alice).setApprovalForAll(operator.address, false);
          });

          it('approves the operator', async function () {
            await NFTInstance.connect(alice).setApprovalForAll(operator.address, true);
            expect(await NFTInstance.isApprovedForAll(alice.address, operator.address)).to.equal(true);
          });

          it('emits an approval event', async function () {
            await expect(NFTInstance.connect(alice).setApprovalForAll(operator.address, true))
            .to.emit(NFTInstance, 'ApprovalForAll')
            .withArgs(alice.address, operator.address, true)
          });

          it('can unset the operator approval', async function () {
            await NFTInstance.connect(alice).setApprovalForAll(operator.address, false);
            expect(await NFTInstance.isApprovedForAll(alice.address, operator.address)).to.equal(false);
          });
        });

        context('when the operator was already approved', function () {
          beforeEach(async function () {
            await NFTInstance.connect(alice).setApprovalForAll(operator.address, true);
          });

          it('keeps the approval to the given address', async function () {
            await NFTInstance.connect(alice).setApprovalForAll(operator.address, true);
            expect(await NFTInstance.isApprovedForAll(alice.address, operator.address)).to.equal(true);
          });

          it('emits an approval event', async function () {
            await expect(NFTInstance.connect(alice).setApprovalForAll(operator.address, true))
            .to.emit(NFTInstance, 'ApprovalForAll')
            .withArgs(alice.address, operator.address, true)
          });
        });
      });

      context('when the operator is the owner', function () {
        it('reverts', async function () {
          await expect(NFTInstance.connect(alice).setApprovalForAll(alice.address, true)).to.be.revertedWith("ERC721: approve to caller");
        });
      });
    });

    describe('getApproved()', async function () {
      let approved;

      beforeEach(async function(){
        approved = bob;
      })
      context('when token is not minted', async function () {
        it('reverts', async function () {
          await expect(NFTInstance.getApproved(nonExistentTokenId)).to.be.revertedWith("ERC721: approved query for nonexistent token");
        });
      });

      context('when token has been minted ', async function () {
        it('should return the zero address', async function () {
          expect(await NFTInstance.getApproved(firstTokenId)).to.be.equal(ZERO_ADDRESS);
        });

        context('when account has been approved', async function () {
          beforeEach(async function () {
            await NFTInstance.connect(alice).approve(approved.address, firstTokenId);
          });

          it('returns approved account', async function () {
            expect(await NFTInstance.getApproved(firstTokenId)).to.be.equal(approved.address);
          });
        });
      });
    });

    describe('totalSupply()', function () {
      it('returns total token supply', async function () {
        expect(await NFTInstance.totalSupply()).to.be.equal('2');
      });
    });

    describe('tokenOfOwnerByIndex()', function () {
      describe('when the given index is lower than the amount of tokens owned by the given address', function () {
        it('returns the token ID placed at the given index', async function () {
          expect(await NFTInstance.tokenOfOwnerByIndex(alice.address, 0)).to.be.equal(firstTokenId);
        });
      });

      describe('when the index is greater than or equal to the total tokens owned by the given address', function () {
        it('reverts', async function () {
          await expect(NFTInstance.tokenOfOwnerByIndex(alice.address, 2)).to.be.revertedWith("EnumerableSet: index out of bounds");
        });
      });

      describe('when the given address does not own any token', function () {
        it('reverts', async function () {
          await expect(NFTInstance.tokenOfOwnerByIndex(other.address, 0)).to.be.revertedWith("EnumerableSet: index out of bounds");
        });
      });

      describe('after transferring all tokens to another user', function () {
        beforeEach(async function () {
          await NFTInstance.connect(alice).transferFrom(alice.address, other.address, firstTokenId);
          await NFTInstance.connect(alice).transferFrom(alice.address, other.address, secondTokenId);
        });

        it('returns correct token IDs for target', async function () {
          expect(await NFTInstance.balanceOf(other.address)).to.be.equal('2');
          const tokensListed = await Promise.all(
            [0, 1].map(i => NFTInstance.tokenOfOwnerByIndex(other.address, i)),
          );
          expect(tokensListed.map(t => t.toNumber())).to.have.members([firstTokenId,
            secondTokenId]);
        });

        it('returns empty collection for original owner', async function () {
          expect(await NFTInstance.balanceOf(alice.address)).to.be.equal('0');
          await expect(NFTInstance.tokenOfOwnerByIndex(alice.address, 0)).to.be.revertedWith("EnumerableSet: index out of bounds");
        });
      });
    });

    describe('tokenByIndex()', function () {
      it('returns all tokens', async function () {
        const tokensListed = await Promise.all(
          [0, 1].map(i => NFTInstance.tokenByIndex(i)),
        );
        // expect(tokensListed.map(t => t)).to.have.members([firstTokenId,secondTokenId]);
      });

      it('reverts if index is greater than supply', async function () {
        await expect(NFTInstance.tokenByIndex(2)).to.be.revertedWith("EnumerableMap: index out of bounds");
      });

      [firstTokenId, secondTokenId].forEach(function (tokenId) {
        it(`returns all tokens after burning token ${tokenId} and minting new tokens`, async function () {
          const newTokenId = new BN(3);
          const anotherNewTokenId = new BN(4);
          const newData = '0x123';
          const anotherNewData = '0x456';

          await NFTInstance.connect(alice).burn(tokenId);
          await NFTInstance.safeMint(bob.address, newData);
          await NFTInstance.safeMint(bob.address, anotherNewData);

          expect(await NFTInstance.totalSupply()).to.be.equal('3');

          // const tokensListed = await Promise.all(
          //   [0, 1, 2].map(i => bn(NFTInstance.tokenByIndex(i))),
          // );
          // const expectedTokens = [firstTokenId, secondTokenId, newTokenId, anotherNewTokenId].filter(
          //   x => (x !== tokenId),
          // );
          // expect(tokensListed.map(t => t)).to.have.members(expectedTokens.map(t => t));
        });
      });
    });

})

describe('safeMint()', function () {
  const data = '0x123'
  it('reverts with a null destination address', async function () {
    await expect(NFTInstance.safeMint(ZERO_ADDRESS, data)).to.be.revertedWith("ERC721: mint to the zero address");
  });

  context('with minted token', async function () {
    it('emits a Transfer event', async function () {
      await expect(NFTInstance.safeMint(alice.address, data))
      .to.emit(NFTInstance, 'Transfer')
      .withArgs(ZERO_ADDRESS, alice.address, firstTokenId)
    });

    it('creates the token', async function () {
      await NFTInstance.safeMint(alice.address, data);
      expect(await NFTInstance.balanceOf(alice.address)).to.be.equal('1');
      expect(await NFTInstance.ownerOf(firstTokenId)).to.equal(alice.address);
    });

    it('adjusts owner tokens by index', async function () {
      await NFTInstance.safeMint(alice.address, data);
      expect(await NFTInstance.tokenOfOwnerByIndex(alice.address, 0)).to.be.equal(firstTokenId);
    });

    it('adjusts all tokens list', async function () {
      await NFTInstance.safeMint(alice.address, data);
      expect(await NFTInstance.tokenByIndex(0)).to.be.equal(firstTokenId);
    });

  });
});

describe('burn()', function () {
  it('reverts when burning a non-existent token id', async function () {
    await expect(NFTInstance.burn(firstTokenId)).to.be.revertedWith("ERC721: operator query for nonexistent token");
  });

  context('with minted tokens', function () {
    beforeEach(async function () {
      await NFTInstance.safeMint(alice.address, firstMetadata);
      await NFTInstance.safeMint(alice.address, secondMetadata);
    });

    context('with burnt token', function () {
      it('emits a Transfer event', async function () {
        await expect(NFTInstance.connect(alice).burn(firstTokenId))
        .to.emit(NFTInstance, 'Transfer')
        .withArgs(alice.address, ZERO_ADDRESS, firstTokenId)
      });

      it('emits an Approval event', async function () {
        await expect(NFTInstance.connect(alice).burn(firstTokenId))
        .to.emit(NFTInstance, 'Approval')
        .withArgs(alice.address, ZERO_ADDRESS, firstTokenId)
      });

      it('deletes the token', async function () {
        await NFTInstance.connect(alice).burn(firstTokenId);
        expect(await NFTInstance.balanceOf(alice.address)).to.be.equal('1');
        await expect(NFTInstance.ownerOf(firstTokenId)).to.be.revertedWith("ERC721: owner query for nonexistent token");
      });

      it('removes that token from the token list of the owner', async function () {
        await NFTInstance.connect(alice).burn(firstTokenId);
        expect(await NFTInstance.tokenOfOwnerByIndex(alice.address, 0)).to.be.equal(secondTokenId);
      });

      it('adjusts all tokens list', async function () {
        await NFTInstance.connect(alice).burn(firstTokenId);
        expect(await NFTInstance.tokenByIndex(0)).to.be.equal(secondTokenId);
      });

      it('burns all tokens', async function () {
        await NFTInstance.connect(alice).burn(firstTokenId);
        await NFTInstance.connect(alice).burn(secondTokenId);
        expect(await NFTInstance.totalSupply()).to.be.equal('0');
        await expect(NFTInstance.tokenByIndex(0)).to.be.revertedWith("EnumerableMap: index out of bounds");
      });

      it('reverts when burning a token id that has been deleted', async function () {
        await NFTInstance.connect(alice).burn(firstTokenId);
        await expect(NFTInstance.connect(alice).burn(firstTokenId)).to.be.revertedWith("ERC721: operator query for nonexistent token");
      });
    });
  });
});
    
})