#Gasless DAI Token Transfer And Conversion
This project enables you to transfer your DAI tokens or swap them without having any ETH in your wallet.
It's not gas free of course, it uses Gas Station Network to relay your transaction to the network. These relayers don't do it for free, you pay them directly with your DAI. All of this is possible thanks to the PermitERC20UniswapPaymaster contract, it allows the relayers to collect your DAI and swap it for ETH on uniswap to pay for the gas and fees. 
It is fully working but it's still experimental, it has not been audited and is not production ready!

##Potential use cases and limits
This project was built for DAI, but it could work with any token that implements a permit function.
No, USDT does not work as it does not have any permit mechanic.

##How it works
The user can choose between transferring DAI to another address or swapping them for ETH on Uniswap.
There are two distinct functions:
- transferDAI: presents the permit signed by the user to the DAI contract and transfers the funds to the provided recipient address 
- exactOutputSwapDAIforETH: it derives from Uniswap's exactOutputSingleSwap function, it implements the same mechanic as transferDAI but the recipient will be the swapper contract. Once it has the funds, it will perform the swap and return the user excess DAI tokens if there are any, then it will unwrap the wETH obtained from the swap and sent ETH to the user.

###Key features
This project is based on some key features provided by DAI and GSN.
DAI supports the permit function, this allows a user to sign a permit off-chain and lets whoever is in possession of this permit access the funds of the user. This of course is a major security risk and needs to be handled properly.
GSN supports relaying of transactions in a simple enough way to be extremely helpful, it allows you to create your own custom paymaster so you can create complex mechanics to pay the relayers. Having an already built PermitERC20UniswapPaymaster paymaster was extremely helpful and a time saver, but it would still be possible to build another one to make it more efficient.

###What happens under the hood
First of all, the user signs a permit to grant the Swapper contract access to his funds for a predetermind amount of time. Unfortunately, ther is no way to only allow access to a specific amount, that would have been great and far less concerning security-wise, the way it is built you can only grant access to all of your funds.
This permit then gets passed to the Swapper contract function so it can interact with the DAI token contract and get access to the user's funds. It then transfers the funds to the recipient address. If the user called transferDAI function this recipient will be the address he provided, the funds will be transfered and it will be done.
Otherwise if the user wants to perform a swap, the recipient will be the Swapper contract itself.
Once it has the funds, it will approve the Uniswap V3 Router to spend his funds and then call the swapping function of Uniswap Router.
Once the swap completes, there could still be some DAI tokens left that have not been spent, they will be returned to the user.
If the swap is successfull, the contract will receive wETH which then will need to we unwrapped to ETH before being sent to the user.

