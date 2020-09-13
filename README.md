# epns-smart-contract
The contract that powers Ethereum Push Notification Service (EPNS).


#### Useful tidbits
**Verify Contract** (Not using since comments aren't allowed on top, manually use npm run build-contracts to flatten contracts and verify on etherscan )
> truffle run verify EPNSCore --network ropsten

**Deploy using OpenZeppelint**


**Ganche fork kovan**
./target/release/openethereum --chain kovan --jsonrpc-port=8540 --jsonrpc-apis="all"
ganache-cli --fork http://localhost:8540