import { useEffect, useRef, useState } from 'react';
import reactLogo from './assets/react.svg';
import viteLogo from '/vite.svg';
import './App.css';

import { GSNConfig } from '@opengsn/provider'
import { PaymasterType, ether } from '@opengsn/common'
import { TokenPaymasterProvider } from '@opengsn/paymasters'

import { Contract, Signer, ethers } from 'ethers';
import { RelayProvider } from '@opengsn/provider';
import gaslessMiddlemanABI from './assets/gaslessMiddlemanABI.json';
import ctfAbi from './assets/CtfABI.json'
import daiAbi from './assets/DaiABI.json'
import swapperAbi from './assets/GaslessSwapperGoerliABI.json';

const daiContractAddress = '0x11fE4B6AE13d2a6055C8D9cF65c55bac32B5d844'; // Replace with the actual address of the Dai contract
const ctfContractAddress = '0xD1cfA489F7eABf322C5EE1B3779ca6Be9Ce08a8e';
const gaslessMiddlemanAddress = '0x909fB2b2BA2167a4284F4ECfDc54a8997171BA16'

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
  const [account1, setAccount1] = useState<string>('');
  const [account2, setAccount2] = useState<string>('');

  const daiContract = useRef<Contract | null>(null);

  const ctfContract = useRef<Contract | null>(null);
  const gaslessMiddleman = useRef<Contract | null>(null);

  const SECOND = 1000;
  const fromAddress = account1;
  // JavaScript dates have millisecond resolution
  const expiry = Math.trunc((Date.now() + 120 * SECOND) / SECOND);
  let nonce: any;
  const spender = gaslessMiddlemanAddress;

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

    console.log("Result: ",result)
    
    const r = result.slice(0, 66);
    const s = "0x" + result.slice(66, 130);
    const v = Number("0x" + result.slice(130, 132));
    
    return { v, r, s };
  };

  useEffect(() => {
    const initContracts = async () => {
      const selectedAccount = await connect();

      if (!selectedAccount) {
        console.log('No selected account');
        return;
      }

      setAccount1(selectedAccount);

      // Initialize daiContract and swapperContract here if needed

      const gsnConfig: Partial<GSNConfig> = {
        loggerConfiguration: { logLevel: 'debug' },
        paymasterAddress: PaymasterType.PermitERC20UniswapV3Paymaster,
      };

      const gsnProvider = TokenPaymasterProvider.newProvider({
        provider: (window as any).ethereum,
        config: gsnConfig,
      });
      await gsnProvider.init(daiContractAddress);

      const provider2 = new ethers.providers.Web3Provider(gsnProvider);
      console.log('Ethers Provider:', provider2);

      console.log('DAI Balance of account: ', await provider2.getBalance(selectedAccount));

      const signer = provider2.getSigner();
      console.log('Signer:', signer);

      daiContract.current = new ethers.Contract(daiContractAddress, JSON.stringify(daiAbi), signer);
      ctfContract.current = new ethers.Contract(ctfContractAddress, JSON.stringify(ctfAbi), signer);
      gaslessMiddleman.current = new ethers.Contract(gaslessMiddlemanAddress, JSON.stringify(gaslessMiddlemanABI), signer);
    };

    initContracts();
  }, []);

  const capture = async function () {
    const tx = await ctfContract.current?.captureTheFlag();
    await tx.wait()
  }

  async function signTransferPermit() {
    let bigNonce = await daiContract.current?.nonces(fromAddress);

    nonce = bigNonce.toNumber()

    console.log("Nonce: ", nonce)

    const messageData = createPermitMessageData(nonce);
    const sig = await signData(fromAddress, messageData.typedData);
    return sig;
  }

  const transfer =async function() {
    const sig = await signTransferPermit();

    const tx = await gaslessMiddleman.current?.transferDAI(fromAddress, spender, nonce, expiry, true, sig.v, sig.r, sig.s, account2, ethers.utils.parseEther("100"));
    await tx.wait();
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

      <label>
        Enter Account2 Address:
        <input type="text" value={(account2)} onChange={(e) => setAccount2(e.target.value)} />
      </label>
      <button onClick={transfer}>Transfer</button>
      <br/>
      <button onClick={capture}>Capture</button>
    </>
  );
}

export default App;
