import {useEffect, useState} from 'react';
import {Contract, ethers} from 'ethers';
import {Card, Container, Row, Col, FloatingLabel, Form, ToastContainer} from 'react-bootstrap';
import {BigNumber} from 'bignumber.js';
import {useCookies} from 'react-cookie';
import './App.css';

import FarmConfig from './config/farm.config';

declare let window: any;

const provider = new ethers.providers.Web3Provider(window.ethereum);

interface FarmData {
   userBalance: number,
   userStake: number,
   userApproved: number,
   userReward: number,
}

const shortenAddress = (addr: string) => {
   const returnAddr = addr.substr(0, 5) +  " . . . " + addr.substr(addr.length - 5, 5);
   return returnAddr;
}

function App() {
   const [cookies, setCookies, removeCookies] = useCookies(['walletConnected']);
   const [apr, setAPR] = useState<number>(0);
   const [tokenPrice, setPrice] = useState<number>(0);
   const [accounts, setAccounts] = useState<string>("");
   const [stake, setStake] = useState<string>("");
   const [farmData, setFarmData] = useState<FarmData>({
      userBalance: 0,
      userStake: 0,
      userApproved: 0,
      userReward: 0,
   });

   const connectWallet = async () => {
      try {
         const acc = await window.ethereum.request({method: "wallet_requestPermissions",params: [{eth_accounts: {}}]}).then(() => window.ethereum.request({method: 'eth_requestAccounts'}));
         setAccounts(acc[0]);
         setCookies('walletConnected', 'true');
      } catch (error) {
         console.log(error);
      }
   }

   const reconnectWallet = async () => {
      try {
         const acc = await provider.send('eth_requestAccounts', []);
         setAccounts(acc[0]);
         setCookies('walletConnected', 'true');
      } catch (error) {
         console.log(error);
      }
   }

   const disconnectWallet = async () => {
      try {
         setAccounts("");
         removeCookies('walletConnected');
      } catch (error) {
         console.log(error);
      }
   }

   useEffect(() => {
      if(cookies.walletConnected == 'true') {
         reconnectWallet();
      }

      const fetchPrice = async () => {
         const contractPair = new ethers.Contract(FarmConfig.pairAddr, FarmConfig.pairABI, provider);
         const reserves = await contractPair.getReserves();
         setPrice(reserves[0] / reserves[1]);
         const contractFarm = new ethers.Contract(FarmConfig.farmAddr, FarmConfig.farmABI, provider);
         const totalSupply = await contractFarm.totalSupply();
         const rewRate = await contractFarm.rewardRate();
         const cAPR = (tokenPrice * (rewRate * 604800))/(tokenPrice*totalSupply);
         console.log(cAPR);
         setAPR(cAPR);
      }

      const fetchData = async () => {
         if(accounts) {
            console.log("fetching...");
            const contractToken = new ethers.Contract(FarmConfig.tokenAddr, FarmConfig.tokenABI, provider);
            const contractFarm = new ethers.Contract(FarmConfig.farmAddr, FarmConfig.farmABI, provider);
            const balance = await contractToken.balanceOf(accounts);
            const approval = await contractToken.allowance(accounts, FarmConfig.farmAddr);
            const stake = await contractFarm.balanceOf(accounts);
            const reward = await contractFarm.earned(accounts);
            setFarmData({
               ...farmData,
               userBalance: balance,
               userApproved: approval,
               userStake: stake,
               userReward: reward,
            });
         }
      }

      fetchData();

      const fetchTimer = setInterval(() => {
         fetchData();
         fetchPrice();
      }, 5000);

      return() => clearInterval(fetchTimer);
   }, [accounts, provider]);

   const approveSeed = async () => {
      if(accounts) {
         const signer = provider.getSigner();
         const contractToken = new ethers.Contract(FarmConfig.tokenAddr, FarmConfig.tokenABI, signer);
         const tx = await contractToken.approve(FarmConfig.farmAddr, new BigNumber(1000000000*10**18).toFixed(0).toString());
         tx.wait();
      } else {
         alert("Please connect your wallet!");
      }
   }

   const stakeSeed = async () => {
      if(accounts) {
         const signer = provider.getSigner();
         const contractToken = new ethers.Contract(FarmConfig.farmAddr, FarmConfig.farmABI, signer);
         const tx = await contractToken.stake(new BigNumber(stake).shiftedBy(18).toFixed(0).toString());
         tx.wait();
      } else {
         alert("Please connect your wallet!");
      }
   }

   const exitSeed = async () => {
      if(accounts) {
         const signer = provider.getSigner();
         const contractToken = new ethers.Contract(FarmConfig.farmAddr, FarmConfig.farmABI, signer);
         const tx = await contractToken.exit();
         tx.wait();
      } else {
         alert("Please connect your wallet!");
      }
   }

   const renderButton = () => {
      const approvel = new BigNumber(farmData.userApproved.toString());
      if(approvel > new BigNumber(100*10**18)){
         return(
            <>
               <Row>
                  <Col><button className="button-18" onClick={stakeSeed}>stake SEED</button></Col><Col><button className="button-18" onClick={exitSeed}>withdraw</button></Col>
               </Row>
            </>
         );
      } else {
         return(
            <>
               <Row>
                  <Col><button className="button-18" onClick={approveSeed}>approve SEED</button></Col><Col><button className="button-18" onClick={exitSeed}>withdraw</button></Col>
               </Row>
            </>
         );
      }
   }

   return (
      <>
         <Container id="mainContent" fluid>
            <Row>
               
               <Col><span className="priceField">{"1 SEED = " + (tokenPrice.toFixed(5)) + " FTM"}</span></Col>
               <Col><span className="connectSpan">{accounts ? (<button className="button-18" onClick={disconnectWallet}>{shortenAddress(accounts)}</button>):(<button className="button-18" onClick={connectWallet}>connect</button>)}</span></Col>
            </Row>
            <ToastContainer>

            </ToastContainer>
            <div className="farmCard">
               <span>{"Balance in your wallet: " + new BigNumber(farmData.userBalance.toString()).shiftedBy(-18).toFixed(3).toString() +  " SEED/FTM spLP"}</span>
               <div>
                  <Row>
                     <Col>{"Your Stake: "} <span className="cardValues">{new BigNumber(farmData.userStake.toString()).shiftedBy(-18).toFixed(5).toString()}</span>{" SEED/FTM spLP"}</Col>
                  </Row>
                  <Row>
                     <Col>{"Your Reward: "} <span className="cardValues">{new BigNumber(farmData.userReward.toString()).shiftedBy(-18).toFixed(5).toString()}</span>{" SEED"}</Col>
                  </Row>
                  <Row>
                     <Col>{"Farm APY: "} <span className="cardValues">{new BigNumber(apr.toString()).toFixed(0).toString()}</span>{" %"}</Col>
                  </Row>
               </div>
               <div>
                  <FloatingLabel controlId="floatingInput" label="Value to stake" className="mb-3">
                     <Form.Control type="number" onChange={(event) => {setStake(event.target.value)}}/>
                  </FloatingLabel>
                  {renderButton()}
               </div>
            </div>
         </Container>
      </>
   );
}

export default App;
