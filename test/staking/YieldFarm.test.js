// Import helper functions
const { bn, tokensBN } = require('../../helpers/utils');

const { expect } = require('chai')

describe('YieldFarm Pool', function () {
    let yieldFarm
    let staking
    let user, communityVault, userAddr, communityVaultAddr, tokenOwner
    let pushToken, stakeToken, creatorAcc
    const startAmount = tokensBN(30000)
    const deprecation = tokensBN(100)
    let snapshotId
    const epochDuration = 1000
    const NR_OF_EPOCHS = 100
    const numEpochsBN = bn(100)

    //https://en.wikipedia.org/wiki/1_%2B_2_%2B_3_%2B_4_%2B_%E2%8B%AF
    const distributedAmount = startAmount.mul(numEpochsBN).sub(deprecation.mul(numEpochsBN.mul(numEpochsBN.add(1)).div(2)))

    const amount = ethers.BigNumber.from(100).mul(ethers.BigNumber.from(10).pow(18))
    beforeEach(async function () {
        snapshotId = await ethers.provider.send('evm_snapshot')
        const [creator, userSigner, owner] = await ethers.getSigners()
        user = userSigner
        creatorAcc = creator
        tokenOwner = owner
        userAddr = await user.getAddress()

        const Staking = await ethers.getContractFactory('Staking', creator)

        staking = await Staking.deploy(Math.floor(Date.now() / 1000) + 1000, epochDuration)
        await staking.deployed()

        const EPNS = await ethers.getContractFactory('EPNS')
        const CommunityVault = await ethers.getContractFactory('CommunityVault')

        pushToken = await EPNS.deploy(tokenOwner.address)
        stakeToken = await EPNS.deploy(tokenOwner.address)
        communityVault = await CommunityVault.deploy(pushToken.address)
        communityVaultAddr = communityVault.address
        const YieldFarm = await ethers.getContractFactory('YieldFarm')
        yieldFarm = await YieldFarm.deploy(
            pushToken.address,
            stakeToken.address,
            staking.address,
            communityVaultAddr,
            startAmount,
            deprecation,
            NR_OF_EPOCHS
        )
        await pushToken.connect(tokenOwner).transfer(communityVaultAddr, distributedAmount)
        await communityVault.connect(creator).setAllowance(yieldFarm.address, distributedAmount)
    })

    afterEach(async function () {
        await ethers.provider.send('evm_revert', [snapshotId])
    })

    describe('General Contract checks', function () {
        it('should be deployed', async function () {
            expect(staking.address).to.not.equal(0)
            expect(yieldFarm.address).to.not.equal(0)
            expect(pushToken.address).to.not.equal(0)
        })

        it('Get epoch PoolSize and distribute tokens', async function () {
            await depositStakeToken(amount)
            await moveAtEpoch(3)
            const totalAmount = amount

            expect(await yieldFarm.getPoolSize(1)).to.equal(totalAmount)
            expect(await yieldFarm.getEpochStake(userAddr, 1)).to.equal(totalAmount)
            expect(await pushToken.allowance(communityVaultAddr, yieldFarm.address)).to.equal(distributedAmount)
            expect(await yieldFarm.getCurrentEpoch()).to.equal(2) // epoch on yield is staking - 1

            await yieldFarm.connect(user).harvest(1)
            expect(await pushToken.balanceOf(userAddr)).to.equal(distributedAmount.div(NR_OF_EPOCHS))
        })
    })

    describe('Contract Tests', function () {
        it('User harvest and mass Harvest', async function () {
            await depositStakeToken(amount)
            const totalAmount = amount
            // initialize epochs meanwhile
            await moveAtEpoch(9)
            expect(await yieldFarm.getPoolSize(1)).to.equal(amount)

            expect(await yieldFarm.lastInitializedEpoch()).to.equal(0) // no epoch initialized
            await expect(yieldFarm.harvest(10)).to.be.revertedWith('This epoch is in the future')
            await expect(yieldFarm.harvest(3)).to.be.revertedWith('Harvest in order')
            await (await yieldFarm.connect(user).harvest(1)).wait()

            expect(await pushToken.balanceOf(userAddr)).to.equal(
                amount.mul(distributedAmount.div(NR_OF_EPOCHS)).div(totalAmount),
            )
            expect(await yieldFarm.connect(user).userLastEpochIdHarvested()).to.equal(1)
            expect(await yieldFarm.lastInitializedEpoch()).to.equal(1) // epoch 1 have been initialized

            await (await yieldFarm.connect(user).massHarvest()).wait()
            const totalDistributedAmount = amount.mul(distributedAmount.div(NR_OF_EPOCHS)).div(totalAmount).mul(7)
            expect(await pushToken.balanceOf(userAddr)).to.equal(totalDistributedAmount)
            expect(await yieldFarm.connect(user).userLastEpochIdHarvested()).to.equal(7)
            expect(await yieldFarm.lastInitializedEpoch()).to.equal(7) // epoch 7 have been initialized
        })
        it('Have nothing to harvest', async function () {
            await depositStakeToken(amount)
            await moveAtEpoch(30)
            expect(await yieldFarm.getPoolSize(1)).to.equal(amount)
            await yieldFarm.connect(creatorAcc).harvest(1)
            expect(await pushToken.balanceOf(await creatorAcc.getAddress())).to.equal(0)
            await yieldFarm.connect(creatorAcc).massHarvest()
            expect(await pushToken.balanceOf(await creatorAcc.getAddress())).to.equal(0)
        })
        it('harvest maximum 100 epochs', async function () {
            await depositStakeToken(amount)
            const totalAmount = amount
            await moveAtEpoch(300)

            expect(await yieldFarm.getPoolSize(1)).to.equal(totalAmount)
            await (await yieldFarm.connect(user).massHarvest()).wait()
            expect(await yieldFarm.lastInitializedEpoch()).to.equal(NR_OF_EPOCHS)
        })

        it('gives epochid = 0 for previous epochs', async function () {
            await moveAtEpoch(-2)
            expect(await yieldFarm.getCurrentEpoch()).to.equal(0)
        })
        it('it should return 0 if no deposit in an epoch', async function () {
            await moveAtEpoch(3)
            await yieldFarm.connect(user).harvest(1)
            expect(await pushToken.balanceOf(await user.getAddress())).to.equal(0)
        })
    })

    describe('Events', function () {
        it('Harvest emits Harvest', async function () {
            await depositStakeToken(amount)
            await moveAtEpoch(9)

            await expect(yieldFarm.connect(user).harvest(1))
                .to.emit(yieldFarm, 'Harvest')
        })

        it('MassHarvest emits MassHarvest', async function () {
            await depositStakeToken(amount)
            await moveAtEpoch(9)

            await expect(yieldFarm.connect(user).massHarvest())
                .to.emit(yieldFarm, 'MassHarvest')
        })
    })

    function getCurrentUnix () {
        return Math.floor(Date.now() / 1000)
    }

    async function setNextBlockTimestamp (timestamp) {
        const block = await ethers.provider.send('eth_getBlockByNumber', ['latest', false])
        const currentTs = block.timestamp
        const diff = timestamp - currentTs
        await ethers.provider.send('evm_increaseTime', [diff])
    }

    async function moveAtEpoch (epoch) {
        await setNextBlockTimestamp(getCurrentUnix() + epochDuration * epoch)
        await ethers.provider.send('evm_mine')
    }

    async function depositStakeToken (x, u = user) {
        const ua = await u.getAddress()
        await stakeToken.connect(tokenOwner).transfer(ua, x)
        await stakeToken.connect(u).approve(staking.address, x)
        return await staking.connect(u).deposit(stakeToken.address, x)
    }
})
