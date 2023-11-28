import {useEffect, useRef, useState} from 'react'
import './App.css'

import daiAbi from './assets/DaiABI.json';

import { BrowserProvider, Contract, ethers } from 'ethers'
import { RelayProvider } from '@opengsn/provider'

const targetFunctionAbiEntry = {
    "inputs": [],
    "name": "captureTheFlag",
    "outputs": [],
    "stateMutability": "nonpayable",
    "type": "function"
}

const daiTargetFunctionAbiEntry = {
  "inputs": [],
  "name": "permit",
  "outputs": [],
  "stateMutability": "nonpayable",
  "type": "function"
}

const acceptEverythingPaymasterGoerli = '0x7e4123407707516bD7a3aFa4E3ebCeacfcbBb107'
const sampleErc2771RecipientAddress = '0xD1cfA489F7eABf322C5EE1B3779ca6Be9Ce08a8e'
const DaiContractGoerli = "0x11fE4B6AE13d2a6055C8D9cF65c55bac32B5d844"

async function connect() {
  const injected = (window as any).ethereum
  if (injected) {
    await injected.request({ method: "eth_requestAccounts" });
  } else {
    console.log("No MetaMask wallet to connect to");
  }
}

function App() {
  const [ready, setReady] = useState(false)

  const daiContract = useRef<Contract | null>(null)
  // const daiTokenContract = new ethers.Contract("0x11fE4B6AE13d2a6055C8D9cF65c55bac32B5d844", JSON.stringify(daiAbi), provider);

  connect()

  useEffect(() => {
    // @ts-ignore
    const ethereum = window.ethereum;
    const ethersProvider = new BrowserProvider(ethereum)
      RelayProvider.newEthersV6Provider({
      provider: ethersProvider,
      config: {
        paymasterAddress: acceptEverythingPaymasterGoerli
      }
    }).then(
      ({gsnSigner}) => {
        console.log('RelayProvider init success')
        // contract.current = new Contract(sampleErc2771RecipientAddress, [targetFunctionAbiEntry], gsnSigner)
        daiContract.current = new Contract(DaiContractGoerli, JSON.stringify(daiAbi), gsnSigner)
        setReady(true)
      })
  }, [])

  return (
    <>
      <div className="card">
          {
              ready ? <button onClick={
                  () => {
                      daiContract.current?.permit()
                  }
              }> permit()
              </button> : <div> Initializing GSN Provider</div>
          }

      </div>

     


    </>
  )
}

export default App
