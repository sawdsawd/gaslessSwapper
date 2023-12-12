import { useEffect, useRef, useState } from 'react';
import './App.scss';

import { GSNConfig } from '@opengsn/provider'
import { PaymasterType } from '@opengsn/common'
import { TokenPaymasterProvider } from '@opengsn/paymasters'

import { Contract, ethers } from 'ethers';
import ctfAbi from './assets/CtfABI.json'
import daiAbi from './assets/DaiABI.json'
import swapperABI from './assets/swapperABI.json'

const daiContractAddress = '0x11fE4B6AE13d2a6055C8D9cF65c55bac32B5d844'; // Replace with the actual address of the Dai contract
const ctfContractAddress = '0xD1cfA489F7eABf322C5EE1B3779ca6Be9Ce08a8e';
const gaslessMiddlemanAddress = '0xeA3406bb7D2EC5A8b05A3700CF77178f95738037';

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
  const [amount, setAmount] = useState<string>()
  const [ethAmountOut, setEthAmountOut] = useState<string>()
  const [daiAmountInMaximum, setDaiAmountInMaximum] = useState<string>()
  const [selectedAction, setSelectedAction] = useState<string>('swap'); // Default to swap
  const [txHash, setTxHash] = useState<string>()


  const handleActionChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    setSelectedAction(event.target.value);
  };

  

  const daiContract = useRef<Contract | null>(null);
  const ctfContract = useRef<Contract | null>(null);
  const gaslessMiddleman = useRef<Contract | null>(null);

  const SECOND = 1000;
  const fromAddress = account1;
  // JavaScript dates have millisecond resolution
  const expiry = Math.trunc((Date.now() + 120 * SECOND) / SECOND);
  let nonce: number;
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

    console.log("v: ", v);
    console.log("r: ", r);
    console.log("s: ", s)
    
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
      gaslessMiddleman.current = new ethers.Contract(gaslessMiddlemanAddress, JSON.stringify(swapperABI), signer);
    };

    initContracts();
  }, []);

  async function signTransferPermit() {
    const bigNonce = await daiContract.current?.nonces(fromAddress);
    nonce = bigNonce?.toNumber() || 0;

    const messageData = createPermitMessageData(nonce);
    const sig = await signData(fromAddress, messageData.typedData);
    return sig;
  }

  const transfer = async function() {
    const sig = await signTransferPermit();

    const parsedAmount = amount ? (amount.toString()) : (0).toString();
    const tx = await gaslessMiddleman.current?.transferDAI(fromAddress, spender, nonce, expiry, true, sig.v, sig.r, sig.s, account2, ethers.utils.parseEther(parsedAmount));
    await tx.wait();
  }

  const swap = async function() {
    const sig = await signTransferPermit();

    const parsedEthAmount = ethAmountOut ? (ethAmountOut.toString()) : (0).toString();
    const parsedDaiAmount = daiAmountInMaximum ? (daiAmountInMaximum.toString()) : (0).toString();

    const tx = await gaslessMiddleman.current?.exactOutputSwapDAIforETH(fromAddress, spender, nonce, expiry, true, sig.v, sig.r, sig.s, ethers.utils.parseEther(parsedEthAmount), ethers.utils.parseEther(parsedDaiAmount));
    setTxHash(tx.hash)
    await tx.wait();
    console.log(tx)
  }

  const capture = async function () {
    const tx = await ctfContract.current?.captureTheFlag();
    setTxHash(tx.hash)
    await tx.wait()
  }

  const renderForm = () => {
    switch (selectedAction) {
      case 'transfer':
        return (
          <>
            <h2>Transfer DAI gaslessly</h2>
            <form>
              <label>
                Enter recipient Address:
              </label>
              <input type="text" value={(account2)} onChange={(e) => setAccount2(e.target.value)} />

              <label>
                Enter DAI amount to transfer:
              </label>
              <input type="number" value={(amount)} onChange={(e) => setAmount(e.target.value)} />
            </form>
            <button onClick={transfer}>Transfer</button>
          </>
        );
      case 'swap':
        return (
          <>
            <h2>Swap DAI for ETH gaslessly</h2>
            <form>
              <label>
                Recipient Address: {gaslessMiddlemanAddress}
              </label>

              <label>
                Enter ETH amount you wish to receive:
              </label>
              <input type="number" value={(ethAmountOut)} onChange={(e) => setEthAmountOut(e.target.value)} />

              <label>
                Enter maximum DAI amount to swap:
              </label>
              <input type="number" value={(daiAmountInMaximum)} onChange={(e) => setDaiAmountInMaximum(e.target.value)} />
              <h3 className='beware'>Beware!<br/> Rates for this swap are messed up on uniswap, 1GoerliETH = 205000 Goerli DAI</h3>
            </form>
            <button onClick={swap}>Swap</button>
          </>
        );
      case 'capture':
        return (
          <>
            <h2>Capture the flag on ctf contract</h2>
            <form>
              <h5>CTF Contract Address: <a href={`https://etherscan.io/address/${ctfContractAddress}`} target='_blank' rel='noopener noreferrer'>{ctfContractAddress}</a></h5>
              <p>This is for testing purposes, it interacts with the Capture The Flag demo contract</p>
            </form>
            <button onClick={capture}>Capture the flag</button>
          </>
        );
      default:
        return null;
    }
  };
 
  return (
    <>
      <h1 className='title'>Gasless Swapper</h1>

      <div className='logos_container'>
          <img src="https://cryptologos.cc/logos/ethereum-eth-logo.svg?v=029" className="logo ETH" alt="ETH logo" />
          <img src="https://global.discourse-cdn.com/standard14/uploads/opengsn/original/1X/a946efc7d2b522a26812a5076e4da126cfdbb830.svg" className='logo GSN' alt='GSN logo' />
          <img src="https://cryptologos.cc/logos/multi-collateral-dai-dai-logo.svg?v=029" className='logo DAI' alt='logo DAI' />
      </div>

      {account1 && <h4>Connected account: <a href={`https://etherscan.io/address/${account1}`} target='_blank' rel='noopener noreferrer'>{account1}</a></h4>}

      <h4>Open your browser console too see all logs!</h4>
      {txHash && <h4>Complete transaction hash: {txHash}</h4>}

      <h5>Goerli DAI Contract Address: <a href={`https://goerli.etherscan.io/address/${daiContractAddress}`} target='_blank' rel='noopener noreferrer'>{daiContractAddress}</a></h5>
      <h5>Swapper Middleman Contract Address: <a href={`https://goerli.etherscan.io/address/${gaslessMiddlemanAddress}`} target='_blank' rel='noopener noreferrer'>{gaslessMiddlemanAddress}</a></h5>

      <div className='action_buttons'>
        <label className='action_button'>
          <input type="radio" value="transfer" checked={selectedAction === 'transfer'} onChange={handleActionChange} />
          Transfer
        </label>

        <label className='action_button'>
          <input type="radio" value="swap" checked={selectedAction === 'swap'} onChange={handleActionChange}/>
          Swap
        </label>

        <label className='action_button'>
          <input type="radio" value="capture" checked={selectedAction === 'capture'} onChange={handleActionChange}/>
          Capture
        </label>
      </div>

      <div className='form'>
        {renderForm()}
      </div>
    </>
  );
}

export default App;
