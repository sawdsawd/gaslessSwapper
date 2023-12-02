import { useEffect, useRef, useState } from 'react';
import reactLogo from './assets/react.svg';
import viteLogo from '/vite.svg';
import './App.css';

import { BrowserProvider, Contract, ethers } from 'ethers';
import { RelayProvider } from '@opengsn/provider';
import daiAbi from './assets/DaiABI.json';
import swapperAbi from './assets/GaslessSwapperGoerliABI.json';

const daiContractAddress = '0x11fE4B6AE13d2a6055C8D9cF65c55bac32B5d844'; // Replace with the actual address of the Dai contract
const acceptEverythingPaymasterGoerli = '0x7e4123407707516bD7a3aFa4E3ebCeacfcbBb107';
const swapperContractAddress = "0x41ce61E9b34A2145DC33B4d659254DfCb00FaD3D";

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
  const [account1, setAccount1] = useState<string>('');
  const [account2, setAccount2] = useState<string>('');

  const daiContract = useRef<Contract | null>(null);
  const swapperContract = useRef<Contract | null>(null);


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

        const ethersProvider = new ethers.BrowserProvider((window as any).ethereum);
        const signer = await ethersProvider.getSigner();

        console.log('RelayProvider init success');
        daiContract.current = new ethers.Contract(daiContractAddress, JSON.stringify(daiAbi), gsnSigner);
        swapperContract.current = new ethers.Contract(swapperContractAddress, JSON.stringify(swapperAbi), gsnSigner);
        setReady(true);
      }
    };

    init();
  }, []);

  const SECOND = 1000;
  // JavaScript dates have millisecond resolution
  const expiry = Math.trunc((Date.now() + 120 * SECOND) / SECOND);
  let nonce: any;
  // NONCE declared below

  let fromAddress: string;
  let spender: string;

  if (account1 && account2) {
    fromAddress = ethers.getAddress(account1 as string);
    spender = ethers.getAddress(account2 as string);
  }

  const createPermitMessageData = function (nonce: any) {
    const message = {
      holder: fromAddress,
      spender: spender,
      nonce: nonce,
      expiry: expiry,
      allowed: true,
    };
  
    const typedData = JSON.stringify({
      types: {
        EIP712Domain: [
          {
            name: "name",
            type: "string",
          },
          {
            name: "version",
            type: "string",
          },
          {
            name: "chainId",
            type: "uint256",
          },
          {
            name: "verifyingContract",
            type: "address",
          },
        ],
        Permit: [
          {
            name: "holder",
            type: "address",
          },
          {
            name: "spender",
            type: "address",
          },
          {
            name: "nonce",
            type: "uint256",
          },
          {
            name: "expiry",
            type: "uint256",
          },
          {
            name: "allowed",
            type: "bool",
          },
        ],
      },
      primaryType: "Permit",
      domain: {
        name: "Dai Stablecoin",
        version: "1",
        chainId: 5,
        verifyingContract: daiContractAddress,
      },
      message: message,
    });
  
    return {
      typedData,
      message,
    };
  };

  const signData = async function (fromAddress: string, typeData: any) {
    const result = await (window as any).ethereum.request({
      id: 1,
      method: "eth_signTypedData_v3",
      params: [fromAddress, typeData],
      from: fromAddress,
    });
    
    const r = result.slice(0, 66);
    const s = "0x" + result.slice(66, 130);
    const v = Number("0x" + result.slice(130, 132));
    
    return { v, r, s };
  };

  const signTransferPermit = async function () {
    //overwrite nonce
    nonce = await daiContract.current?.nonces(fromAddress);

    const messageData = createPermitMessageData(nonce);
    const sig = await signData(fromAddress, messageData.typedData);
    return sig;
  };

  const permit = async function () {
    const sig = await signTransferPermit();
    console.log(expiry)
    console.log(sig)
    await daiContract.current?.permit(fromAddress, spender, nonce, expiry, true, sig.v, sig.r, sig.s)
    checkAllowance();

    
  }

  const checkAllowance = async () => {
    console.log("allowance: ", await daiContract.current?.allowance(account1, account2))
  }
 
  return (
    <>
      <div>
          <img src={viteLogo} className="logo" alt="Vite logo" />
          <img src={reactLogo} className="logo react" alt="React logo" />
      </div>
      <h1>Gasless Permit</h1>

      <p>Account 2 : 0x253D9a3b25ed6b062519a1b5555A76Cd1fe2A6C8</p>
      <br/>
      <p>Swapper Goerli: 0x41ce61E9b34A2145DC33B4d659254DfCb00FaD3D</p>

      <h2>Sign typed data v4</h2>
      
      <div className="card">
        {ready ? (
          <>
            <p>Connected Account: {ethers.getAddress(account1 as string)}</p>
            <label>
              Enter Account2 Address:
              <input type="text" value={(account2)} onChange={(e) => setAccount2(e.target.value)} />
            </label>
            <button onClick={permit}>Sign</button>
          </>
        ) : (
          <div> Initializing GSN Provider</div>
        )}
      </div>
    </>
  );
}

export default App;
