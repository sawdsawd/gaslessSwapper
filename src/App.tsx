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

      const SECOND = 1000;
      const expiry = 0 // Set to 0 for no expiry
      const allowed = true;
    
      // eth_signTypedData_v4 parameters. All of these parameters affect the resulting signature.
      const msgParams = JSON.stringify({
    
        // This defines the message you're proposing the user to sign, is dapp-specific, and contains
        // anything you want. There are no required fields. Be as explicit as possible when building out
        // the message schema.
        domain: {
          name: 'Dai StableCoin',
          version: '1',
          chainId: 5,
          verifyingContract: daiContractAddress,
        },
        types: {
          Permit: [
            { name: "holder", type: "address" },
            { name: "spender", type: "address" },
            { name: "nonce", type: "uint256" },
            { name: "expiry", type: "uint256" },
            { name: "allowed", type: "bool" },
          ],
        },
        message: {
          holder: ethers.getAddress(account1 as string),
          spender: ethers.getAddress(account2 as string),
          nonce: Number(nonce),
          expiry: expiry,
          allowed: allowed,
        },
        
      });
    
      var from = ethers.getAddress(account1 as string);
      var params = [from, msgParams];
      var method = 'eth_signTypedData_v4';
    
      const signature = await (window as any).ethereum.request(
        {
          id: 1,
          method,
          params,
          from: from,
        })

      const splitSig = ethers.Signature.from(signature)

      console.log("signature: ", signature)   
      console.log("from", from)
      console.log("account2: ", account2),
      console.log("nonce: ", nonce)
      console.log("expiry: ", expiry)
      console.log("v: ", splitSig.v)   
      console.log("r: ", splitSig.r)   
      console.log("s: ", splitSig.s)   


        // Check recovered address :
      const result = await verifySignature(ethers.getAddress(account1 as string), ethers.getAddress(account2), nonce, expiry, daiContractAddress, splitSig.v, splitSig.r, splitSig.s);
      console.log('Signature Verification Result:', result);

      // Call the permit function
      await contract.current?.permit(ethers.getAddress(account1 as string), ethers.getAddress(account2 as string), nonce, expiry, allowed, splitSig.v, splitSig.r, splitSig.s);

      checkAllowance()
  }


  async function verifySignature(account1: string, account2: string, nonce: number, expiry: number, daiContractAddress: string, v: number, r: string, s: string) {
    const msgParams = {
      domain: {
        chainId: 5,
        name: 'Dai StableCoin',
        verifyingContract: daiContractAddress,
        version: '1',
      },
      message: {
        holder: account1,
        spender: account2,
        nonce: nonce,
        expiry: expiry,
        allowed: true,
      },
      types: {
        Permit: [
          { name: "holder", type: "address" },
          { name: "spender", type: "address" },
          { name: "nonce", type: "uint256" },
          { name: "expiry", type: "uint256" },
          { name: "allowed", type: "bool" },
        ],
      },
      primaryType: "Permit",
    };

    // Convert string values to bytes
    msgParams.message.holder = ethers.getAddress(account1);
    msgParams.message.spender = ethers.getAddress(account2);

    // Verify the signature
    const recoveredAddress = await ethers.verifyTypedData(
      msgParams.domain,
      msgParams.types,
      msgParams.message,
      {v, r, s}
    );

    console.log('Recovered Address:', recoveredAddress);

    // Compare the recovered address with the expected address
    return recoveredAddress === (account1);
  }

  const checkAllowance = async () => {
    console.log("allowance: ", await contract.current?.allowance(account1, account2))
  }
 
  return (
    <>
      <div>
          <img src={viteLogo} className="logo" alt="Vite logo" />
          <img src={reactLogo} className="logo react" alt="React logo" />
      </div>
      <h1>Gasless Permit</h1>

      <p>Account 2 : 0x253D9a3b25ed6b062519a1b5555A76Cd1fe2A6C8</p>

      <h2>Sign typed data v4</h2>
      
      <div className="card">
        {ready ? (
          <>
            <p>Connected Account: {ethers.getAddress(account1 as string)}</p>
            <label>
              Enter Account2 Address:
              <input type="text" value={(account2)} onChange={(e) => setAccount2(e.target.value)} />
            </label>
            <button onClick={ethSignTypedData}>Sign</button>
          </>
        ) : (
          <div> Initializing GSN Provider</div>
        )}
      </div>
    </>
  );
}

export default App;
