import { useEffect, useRef, useState } from 'react';
import reactLogo from './assets/react.svg';
import viteLogo from '/vite.svg';
import './App.css';

import { GSNConfig } from '@opengsn/provider'
import { PaymasterType, ether } from '@opengsn/common'
import { TokenPaymasterProvider } from '@opengsn/paymasters'

import { Contract, Signer, ethers } from 'ethers';
import { RelayProvider } from '@opengsn/provider';
import daiAbi from './assets/DaiABI.json';
import ctfAbi from './assets/CtfABI.json'
import swapperAbi from './assets/GaslessSwapperGoerliABI.json';

const daiContractAddress = '0x11fE4B6AE13d2a6055C8D9cF65c55bac32B5d844'; // Replace with the actual address of the Dai contract
const acceptEverythingPaymasterGoerli = '0x7e4123407707516bD7a3aFa4E3ebCeacfcbBb107';
const swapperContractAddress = "0x41ce61E9b34A2145DC33B4d659254DfCb00FaD3D";
const permitERC20UniswapPaymaster = '0xc7709b37C63E116Cc973842aE902462580d76104';
const ctfContractAddress = '0xD1cfA489F7eABf322C5EE1B3779ca6Be9Ce08a8e';

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

      // daiContract.current = new ethers.Contract(daiContractAddress, JSON.stringify(daiAbi), signer);

      ctfContract.current = new ethers.Contract(ctfContractAddress, JSON.stringify(ctfAbi), signer);
    };

    initContracts();
  }, []);

  const capture = async function () {
    const tx = await ctfContract.current?.captureTheFlag();
    await tx.wait()
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
      <br/>
      <button onClick={capture}>Capture</button>
    </>
  );
}

export default App;
