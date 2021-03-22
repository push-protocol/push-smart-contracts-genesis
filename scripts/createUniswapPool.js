const ethers = require("ethers")
const EPNS_PUSH_ABI = require("../ABIs/epns.json")
require('dotenv').config()
const IUniswapV2Router02 = require('@uniswap/v2-periphery/build/IUniswapV2Router02.json');
const NETWORK_TO_MONITOR = process.env.ROPSTEN_WEB3_PROVIDER;
const provider = ethers.getDefaultProvider(NETWORK_TO_MONITOR, {
      infura:  {
        projectID: process.env.INFURA_PROJECT_ID,
        projectSecret: process.env.INFURA_PROJECT_SECRET,
    },
});
const UniswapV2Router = new ethers.Contract("0x7a250d5630B4cF539739dF2C5dAcb4c659F2488D", IUniswapV2Router02.abi, provider);
const EPNS_PUSH = new ethers.Contract(process.env.PUSH_CONTRACT_ADDRESS, EPNS_PUSH_ABI, provider);

const wallet = new ethers.Wallet(process.env.UNI_WALLET_PK, provider);

const UniswapV2RouterWithSigner = UniswapV2Router.connect(wallet);
const EPNS_PUSHWithSigner = EPNS_PUSH.connect(wallet);

const options = { gasPrice: 110000000000, gasLimit: 8000000 }
const deadline = ethers.constants.MaxUint256

/**
 * @description set allowance of UniswapV2Router to the number of push tokens
 */
async function prepare() {
    let EPNSBal = await EPNS_PUSHWithSigner.balanceOf(wallet.address)
    const allowance = await EPNS_PUSHWithSigner.allowance(wallet.address, UniswapV2Router.address)
    const approve = await EPNS_PUSHWithSigner.approve(UniswapV2Router.address, EPNSBal, options)
    const result = await approve.wait()
    console.log({ EPNSBal: ethers.utils.formatEther(EPNSBal), allowance, result })
    const new_allowance = await EPNS_PUSHWithSigner.allowance(wallet.address, UniswapV2Router.address)
    console.log({new_allowance: ethers.utils.formatEther(new_allowance)})
}

/**
 * @description adds to liquidity pool (creates if pool does not exist)
 */
async function deploy() {
    options.value = ethers.utils.parseEther("1.0")
    const addLiquidity = await UniswapV2RouterWithSigner.addLiquidityETH(process.env.PUSH_CONTRACT_ADDRESS, ethers.utils.parseEther("100000.0"), ethers.utils.parseEther("100.0"), ethers.utils.parseEther("0.000001"), wallet.address, deadline, options)
    const result = await addLiquidity.wait()
    console.log({result})
}

try {
    deploy()
} catch (error) {
    console.log(error)
}

module.exports = {
    prepare,
    deploy
}

