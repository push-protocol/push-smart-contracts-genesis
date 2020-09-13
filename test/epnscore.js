const expect = require("chai").expect;
require("dotenv").config();
const Web3 = require("web3");
const contract = require("@truffle/contract");
const EPNSCoreJSON = require("../build/contracts/EPNSCore.json");
const ERC20ABI = require("./abi/erc20.json");
const provider = new Web3.providers.HttpProvider(
  `${process.env.WEB3_ENDPOINT}`
);
const web3 = new Web3(provider);
const EthereumTx = require("ethereumjs-tx");
const EPNSCoreContract = contract(EPNSCoreJSON);
EPNSCoreContract.setProvider(provider);
let EPNSCore;
let EPNSCoreDeployed;
let ERC20;
let DAIbal;
const DAI = "0xf80a32a835f79d7787e8a8ee5721d0feafd78108";
let channel;
// let blockNumber;

const user1 = {
  address: process.env.OWNER_ADDRESS,
  publicKey: process.env.OWNER_PUBLIC_KEY,
  privateKey: process.env.OWNER_PRIVATE_KEY,
};

const user2 = {
  address: process.env.ADDRESS_2_ADDRESS,
  publicKey: process.env.ADDRESS_2_PUBLIC_KEY,
  privateKey: process.env.ADDRESS_2_PRIVATE_KEY,
};

const user3 = {
  address: process.env.ADDRESS_3_ADDRESS,
  publicKey: process.env.ADDRESS_3_PUBLIC_KEY,
  privateKey: process.env.ADDRESS_3_PRIVATE_KEY,
};

const user4 = {
  address: process.env.ADDRESS_4_ADDRESS,
  publicKey: process.env.ADDRESS_4_PUBLIC_KEY,
  privateKey: process.env.ADDRESS_4_PRIVATE_KEY,
};

const user5 = {
  address: process.env.ADDRESS_5_ADDRESS,
  publicKey: process.env.ADDRESS_5_PUBLIC_KEY,
  privateKey: process.env.ADDRESS_5_PRIVATE_KEY,
};

const msgType = {
  group: 1,
  secret: 2,
};
const notificationFlag = {
  push: 1,
  nopush: 2,
  silent: 2,
};
const ipfshash = "QmcdzjicUnxv8ASKKSgEEYjhK7symwxqDG4BeCS82rdNBk";
async function signAndTransact(privateKey, details) {
  privateKey = privateKey.replace("0x", "");
  const transaction = new EthereumTx(details, { chain: "ropsten" });
  transaction.sign(Buffer.from(`${privateKey}`, "hex"));
  const serializedTransaction = transaction.serialize();
  const addr = transaction.from.toString("hex");
  // console.log(`Based on your private key, your wallet address is 0x${addr}`);
  const res = await web3.eth.sendSignedTransaction(
    `0x${serializedTransaction.toString("hex")}`
  );
  // console.log("TxHash ", `${res.transactionHash}`);
  return res;
}

async function formatAndSend(address, key, data, contract) {
  const nonce = await web3.eth.getTransactionCount(address, "latest");
  const details = {
    from: address,
    to: contract ? contract : EPNSCoreDeployed.address,
    nonce,
    gasPrice: web3.utils.toHex(web3.utils.toWei("165".toString(), "gwei")),
    gasLimit: web3.utils.toHex(8000000), // Raise the gas limit to a much higher amount
    data,
  };
  return signAndTransact(key, details);
}

async function approveAmount(user, amount) {
  return formatAndSend(
    user.address,
    user.privateKey,
    ERC20.methods
      .approve(EPNSCoreDeployed.address, web3.utils.toWei(`${amount}`, "ether"))
      .encodeABI(),
    DAI
  );
}

describe("EPNSCore initialization", () => {
  before(async () => {
    EPNSCoreDeployed = await EPNSCoreContract.deployed();
    console.log("deployed add ", EPNSCoreDeployed.address);
    EPNSCore = new web3.eth.Contract(
      EPNSCoreJSON.abi,
      EPNSCoreDeployed.address
    );
    ERC20 = new web3.eth.Contract(ERC20ABI, DAI);
    await Promise.all([
      approveAmount(user1, 10000),
      approveAmount(user2, 10000),
      approveAmount(user3, 10000),
      approveAmount(user4, 10000),
      approveAmount(user5, 10000),
    ]);
  });

  it("It broadcasts user public key", async () => {
    const result = await formatAndSend(
      user2.address,
      user2.privateKey,
      EPNSCore.methods.broadcastUserPublicKey(user2.publicKey).encodeABI()
    );
    expect(result);
  }).timeout(70000);

  it("It broadcasts user 2 public key", async () => {
    const result = await formatAndSend(
      user3.address,
      user3.privateKey,
      EPNSCore.methods.broadcastUserPublicKey(user3.publicKey).encodeABI()
    );
    expect(result);
  }).timeout(50000);

  it("It approves address to spend dai", async () => {
    const daiAllowance = await ERC20.methods
      .allowance(user2.address, EPNSCoreDeployed.address)
      .call();
    console.log("daiAllowance 2", daiAllowance);
  }).timeout(50000);

  it("It approves contract 2 to spend dai", async () => {
    const daiAllowance = await ERC20.methods
      .allowance(user3.address, EPNSCoreDeployed.address)
      .call();
    console.log("daiAllowance 3 ", daiAllowance);
  }).timeout(50000);

  it("It should add a user to Channelization Whitelist", async () => {
    const result = await formatAndSend(
      user1.address,
      user1.privateKey,
      EPNSCore.methods.addToChannelizationWhitelist(user2.address).encodeABI()
    );
    expect(result.transactionHash);
  }).timeout(50000);

  it("It should add a user 2 to Channelization Whitelist", async () => {
    const result = await formatAndSend(
      user1.address,
      user1.privateKey,
      EPNSCore.methods.addToChannelizationWhitelist(user3.address).encodeABI()
    );
    expect(result.transactionHash);
  }).timeout(50000);
});

describe("EPNSCore channel creation", () => {
  it("It should create a channel with fees and public key", async () => {
    const result = await formatAndSend(
      user3.address,
      user3.privateKey,
      EPNSCore.methods
        .createChannelWithFeesAndPublicKey(
          Web3.utils.stringToHex(ipfshash),
          user3.publicKey
        )
        .encodeABI()
    );
    console.log("result: %o ", result.transactionHash);
    expect(result.transactionHash);
  }).timeout(70000);

  it("It should create a channel with fees ", async () => {
    const result = await formatAndSend(
      user2.address,
      user2.privateKey,
      EPNSCore.methods
        .createChannelWithFees(Web3.utils.stringToHex(ipfshash))
        .encodeABI()
    );
    console.log("result: %o ", result.transactionHash);
    expect(result.transactionHash);
  }).timeout(70000);
});

describe("EPNSCore channel subscription", () => {
  it("It should subscribe to a delegated channel", async () => {
    const result = await formatAndSend(
      user1.address,
      user1.privateKey,
      EPNSCore.methods
        .subscribeDelegated(user2.address, user4.address)
        .encodeABI()
    );
    console.log("result: %o ", result.transactionHash);
    expect(result.transactionHash);
  }).timeout(70000);

  it("It should subscribe to a channel", async () => {
    const result = await formatAndSend(
      user5.address,
      user5.privateKey,
      EPNSCore.methods.subscribe(user2.address).encodeABI()
    );
    console.log("result: %o ", result.transactionHash);
    expect(result.transactionHash);
  }).timeout(70000);

  it("It should unsubscribe from a channel", async () => {
    const result = await formatAndSend(
      user4.address,
      user4.privateKey,
      EPNSCore.methods.unsubscribe(user2.address).encodeABI()
    );
    console.log("result: %o ", result.transactionHash);
    expect(result.transactionHash);
  }).timeout(70000);

  it("It should unsubscribe from a channel 2", async () => {
    const result = await formatAndSend(
      user5.address,
      user5.privateKey,
      EPNSCore.methods.unsubscribe(user2.address).encodeABI()
    );
    console.log("result: %o ", result.transactionHash);
    expect(result.transactionHash);
  }).timeout(70000);

  it("It should subscribe to a delegated channel with public key", async () => {
    const result = await formatAndSend(
      user5.address,
      user5.privateKey,
      EPNSCore.methods
        .subscribeWithPublicKeyDelegated(
          user3.address,
          user5.address,
          user5.publicKey
        )
        .encodeABI()
    );
    console.log("result: %o ", result.transactionHash);
    expect(result.transactionHash);
  }).timeout(70000);

  it("It should subscribe to a channel with public key", async () => {
    const result = await formatAndSend(
      user5.address,
      user5.privateKey,
      EPNSCore.methods
        .subscribeWithPublicKey(user2.address, user5.publicKey)
        .encodeABI()
    );
    console.log("result: %o ", result.transactionHash);
    expect(result.transactionHash);
  }).timeout(70000);
});

describe("EPNSCore channel send message", () => {
  it("It should send message to a reciepient of a group", async () => {
    const result = await formatAndSend(
      user2.address,
      user2.privateKey,
      EPNSCore.methods
        .sendMessage(
          user4.address,
          msgType.group,
          Web3.utils.stringToHex(
            `${msgType.group}+${notificationFlag.push}+${ipfshash}`
          )
        )
        .encodeABI()
    );
    console.log("result: %o ", result.transactionHash);
    expect(result.transactionHash);
  }).timeout(70000);

  it("It should send message to a reciepient of a group, overriding channel", async () => {
    const result = await formatAndSend(
      user1.address,
      user1.privateKey,
      EPNSCore.methods
        .sendMessageOverrideChannel(
          user2.address,
          user4.address,
          msgType.group,
          Web3.utils.stringToHex(
            `${msgType.group}+${notificationFlag.push}+${ipfshash}`
          )
        )
        .encodeABI()
    );
    console.log("result: %o ", result.transactionHash);
    expect(result.transactionHash);
  }).timeout(70000);
});

describe("EPNSCore contract utilities", () => {
  it("It should claim fair share", async () => {
    const result = await formatAndSend(
      user5.address,
      user5.privateKey,
      EPNSCore.methods.claimFairShare().encodeABI()
    );
    console.log("fair share result: %o ", result.transactionHash);
    expect(result.transactionHash);
  }).timeout(70000);

  it("It should check if member exists on a channel", async () => {
    const result = await EPNSCore.methods
      .memberExists(user5.address, user3.address)
      .call();
    console.log("member exists result: %o ", result);
    expect(result);
  }).timeout(70000);

  it("It should deactivate a channel", async () => {
    const result = await formatAndSend(
      user3.address,
      user3.privateKey,
      EPNSCore.methods.deactivateChannel().encodeABI()
    );
    console.log("result: %o ", result.transactionHash);
    expect(result.transactionHash);
  }).timeout(70000);

  it("It should get a channel's FS ratio per block", async () => {
    const blockNumber = await web3.eth.getBlockNumber();
    const result = EPNSCore.methods
      .getChannelFSRatio(user3.address, blockNumber)
      .call();
    console.log("getChannelFSRatio result: %o ", result.transactionHash);
    expect(result);
  }).timeout(100000);

  it("It should get a subscriber's FS ratio for a channel per block", async () => {
    const blockNumber = await web3.eth.getBlockNumber();
    const result = await EPNSCore.methods
      .getSubscriberFSRatio(user2.address, user5.address, blockNumber)
      .call();
    console.log("getSubscriberFSRatio result: %o ", result);
    expect(result);
  }).timeout(70000);

  it("It should get a subscriber's earn ratio for a channel per block (subscriber rate * channel FS)", async () => {
    const blockNumber = await web3.eth.getBlockNumber();
    const result = await EPNSCore.methods
      .calcSingleChannelEarnRatio(user2.address, user5.address, blockNumber)
      .call();
    console.log("calcSingleChannelEarnRatio result: %o ", result);
    expect(result);
  }).timeout(70000);

  it("It should get a subscriber's earn ratio for all channel per block (subscriber rate * channel FS)", async () => {
    const blockNumber = await web3.eth.getBlockNumber();
    const result = await EPNSCore.methods
      .calcAllChannelsRatio(user5.address, blockNumber)
      .call();
    console.log(" calcAllChannelsRatioresult: %o ", result);
    expect(result);
  }).timeout(70000);

  it("It should withdraw dai funds", async () => {
    const result = await formatAndSend(
      user1.address,
      user1.privateKey,
      EPNSCore.methods.withdrawDaiFunds().encodeABI()
    );
    console.log("withdraw dai result: %o ", result.transactionHash);
    expect(result.transactionHash);
  }).timeout(70000);

  it("It should withdraw ETH funds", async () => {
    const result = await formatAndSend(
      user1.address,
      user1.privateKey,
      EPNSCore.methods.withdrawEthFunds().encodeABI()
    );
    console.log("withdraw eth result: %o ", result.transactionHash);
    expect(result.transactionHash);
  }).timeout(70000);
});
