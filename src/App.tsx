import { useEffect, useRef, useState } from 'react';
import reactLogo from './assets/react.svg';
import viteLogo from '/vite.svg';
import './App.css';

import { BrowserProvider, Contract, ethers } from 'ethers';
import { RelayProvider } from '@opengsn/provider';
import daiAbi from './assets/DaiABI.json';

const daiContractAddress = '0x11fE4B6AE13d2a6055C8D9cF65c55bac32B5d844'; // Replace with the actual address of the Dai contract
const acceptEverythingPaymasterGoerli = '0x7e4123407707516bD7a3aFa4E3ebCeacfcbBb107';

async function connect() {
  const ethereum = (window as any).ethereum;

  if (ethereum) {
    await ethereum.request({ method: 'eth_requestAccounts' });
    return ethereum.selectedAddress;
  } else {
    console.log('No MetaMask wallet to connect to');
    return null;
  }
}

function App() {
  const [ready, setReady] = useState(false);
  const [account1, setAccount1] = useState<string | null>(null);
  const [account2, setAccount2] = useState<string>(''); // User input for account2

  const contract = useRef<Contract | null>(null);

  useEffect(() => {
    const init = async () => {
      const selectedAccount = await connect();

      if (selectedAccount) {
        setAccount1(selectedAccount);

        const { gsnSigner } = await RelayProvider.newEthersV6Provider({
          provider: new BrowserProvider((window as any).ethereum),
          config: {
            paymasterAddress: acceptEverythingPaymasterGoerli,
          },
        });

        console.log('RelayProvider init success');
        contract.current = new ethers.Contract(daiContractAddress, JSON.stringify(daiAbi), gsnSigner);
        setReady(true);
      }
    };

    init();
  }, []);

   const ethSignTypedData = async () => {
      const nonce = await contract.current?.nonces(account1 as string); // Assuming signers are available
      console.log("nonce", nonce)
      const expiry = 120; // Set to 0 for no expiry
      const domainName = "Dai Stablecoin" // put your token name 
      const domainVersion = "1" 
      const chainId = 5 // this is the chain ID of the chain you are using
      const contractAddress = daiContractAddress
    
      // eth_signTypedData_v4 parameters. All of these parameters affect the resulting signature.
      const msgParams = JSON.stringify({
        domain: {
          chainId: 5,
          name: 'Dai StableCoin',
          verifyingContract: daiContractAddress,
          version: '1',
        },
    
        // This defines the message you're proposing the user to sign, is dapp-specific, and contains
        // anything you want. There are no required fields. Be as explicit as possible when building out
        // the message schema.
        message: {
          holder: account1 as string,
          spender: account2,
          nonce: Number(nonce),
          expiry: expiry.toString(),
          allowed: true,
        },

        // message: {
        //   contents: 'Hello, Bob!',
        //   attachedMoneyInEth: 4.2,
        //   from: {
        //     name: 'Cow',
        //     wallets: [
        //       '0xCD2a3d9F938E13CD947Ec05AbC7FE734Df8DD826',
        //       '0xDeaDbeefdEAdbeefdEadbEEFdeadbeEFdEaDbeeF',
        //     ],
        //   },
        //   to: [
        //     {
        //       name: 'Bob',
        //       wallets: [
        //         '0xbBbBBBBbbBBBbbbBbbBbbbbBBbBbbbbBbBbbBBbB',
        //         '0xB0BdaBea57B0BDABeA57b0bdABEA57b0BDabEa57',
        //         '0xB0B0b0b0b0b0B000000000000000000000000000',
        //       ],
        //     },
        //   ],
        // },

          types: {
            EIP712Domain: [
              { name: "name", type: "string" },
              { name: "version", type: "string" },
              { name: "chainId", type: "uint256" },
              { name: "verifyingContract", type: "address" },
            ],
            Permit: [
              { name: "holder", type: "address" },
              { name: "spender", type: "address" },
              { name: "nonce", type: "uint256" },
              { name: "expiry", type: "uint256" },
              { name: "allowed", type: "bool" },
            ],
          },
          primaryType: "Permit",
        
      });
    
      var from = account1;
    
      var params = [account1, msgParams];
      var method = 'eth_signTypedData_v4';
    
      await (window as any).ethereum.request(
        {
          method,
          params,
          from: account1,
        })

      // const signature = await (window as any).ethereum.request({
      //   method: 'eth_signTypedData_v4',
      //   params: [message, typedData],
      //   from: message.holder,
      // });
    
  }

  const handlePermit = async () => {
    try {

    
    const nonce = await contract.current?.nonces(account1 as string); // Assuming signers are available
    console.log("nonce", nonce)
    const expiry = 120; // Set to 0 for no expiry
    const domainName = "Dai Stablecoin" // put your token name 
    const domainVersion = "1" 
    const chainId = 5 // this is the chain ID of the chain you are using
    const contractAddress = daiContractAddress
  
    const message = {
      holder: account1 as string,
      spender: account2,
      nonce: Number(nonce),
      expiry: expiry.toString(),
      allowed: true,
    };

    console.log("message", message)
  
    const typedData = [
      {
        type: 'uint256',
        name: 'nonce',
        value: message.nonce,
      },
      {
        type: 'address',
        name: 'holder',
        value: message.holder,
      },
      {
        type: 'address',
        name: 'spender',
        value: message.spender,
      },
      {
        type: 'uint256',
        name: 'expiry',
        value: message.expiry,
      },
      {
        type: 'bool',
        name: 'allowed',
        value: message.allowed,
      },
    ];
  
    const signature = await (window as any).ethereum.request({
      method: 'eth_signTypedData_v4',
      params: [message.holder, typedData],
      from: message.holder,
    });
  
    // Call the permit function
    // await contract.current?.permit(message.holder, message.spender, message.nonce, message.expiry, message.allowed, signature);

    // console.log(await contract.current?.allowance(account1, account2))

    } catch (error) {
      console.error("Error in permit process:", error);
    }

  };
  

  return (
    <>
      <div>
        <a href="https://vitejs.dev" target="_blank" rel="noopener noreferrer">
          <img src={viteLogo} className="logo" alt="Vite logo" />
        </a>
        <a href="https://react.dev" target="_blank" rel="noopener noreferrer">
          <img src={reactLogo} className="logo react" alt="React logo" />
        </a>
      </div>
      <h1>Gasless Permit</h1>

      <h2>Sign typed data v4</h2>
      <button onClick={ethSignTypedData}>Sign</button>
      <div className="card">
        {ready ? (
          <>
            <p>Connected Account: {account1}</p>
            <label>
              Enter Account2 Address:
              <input type="text" value={account2} onChange={(e) => setAccount2(e.target.value)} />
            </label>
            <button onClick={handlePermit}>Permit Account2</button>
          </>
        ) : (
          <div> Initializing GSN Provider</div>
        )}
      </div>
    </>
  );
}

export default App;
