import {useEffect, useState} from 'react';
import {Contract, ethers} from 'ethers';

import {Row, Col, Form} from 'react-bootstrap';

import {BigNumber} from 'bignumber.js';
import {useCookies} from 'react-cookie';

import AppBar from '@mui/material/AppBar';
import Box from '@mui/material/Box';
import Toolbar from '@mui/material/Toolbar';
import Typography from '@mui/material/Typography';
import Button from '@mui/material/Button';
import Grid from '@mui/material/Grid';

import Card from '@mui/material/Card';
import CardActions from '@mui/material/CardActions';
import CardContent from '@mui/material/CardContent';

import TextField from '@mui/material/TextField';

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
               <Button color="inherit" variant="outlined" onClick={stakeSeed}>stake SEED</Button>
               <Button color="inherit" variant="outlined" onClick={exitSeed}>withdraw</Button>
            </>
         )
      } else {
         return(
            <>
               <Button color="inherit" variant="outlined" onClick={approveSeed}>approve SEED</Button>
               <Button color="inherit" variant="outlined" onClick={exitSeed}>withdraw</Button>
            </>
         );
      }
   }

   return (
      <>
         <Box sx={{ flexGrow: 1 }}>
            <AppBar position="static">
               <Toolbar>
                  <Typography variant="h6" component="div" sx={{ flexGrow: 1 }}>
                     <span className="priceField">{"1 SEED = " + (tokenPrice.toFixed(5)) + " FTM"}</span>
                  </Typography>
                  {accounts 
                     ? (<Button color="inherit" variant="outlined" onClick={disconnectWallet}>{shortenAddress(accounts)}</Button>)
                     : (<Button color="inherit" variant="outlined" onClick={connectWallet}>connect</Button>)
                  }
               </Toolbar>
            </AppBar>
         </Box>
         
         <Grid sx={{ flexGrow: 1 }} container spacing={2}>
            <Grid item xs={12}>
               <Grid container justifyContent="center">

                  <Card sx={{ maxWidth: 500, minWidth: 600, margin: "2rem", p:2}}>
                     <CardContent>
                        <Typography gutterBottom variant="h4" component="div" sx={{mb:4}}>
                           Seed Farming !
                        </Typography>
                        <div>
                           <div>
                              <b>Balance in your wallet: </b>
                              {new BigNumber(farmData.userBalance.toString()).shiftedBy(-18).toFixed(3).toString() +  " SEED/FTM spLP"}
                           </div>

                           <br />

                           <div>
                              <b>Your Stake: </b> 
                              {new BigNumber(farmData.userStake.toString()).shiftedBy(-18).toFixed(5).toString()} 
                              {" SEED/FTM spLP"}
                           </div>

                           <br />

                           <div>
                              <b>Your Reward:</b>  
                              {new BigNumber(farmData.userReward.toString()).shiftedBy(-18).toFixed(5).toString()}
                              {" SEED"}
                           </div>

                           <br />

                           <div>
                              <b>Farm APY:</b>
                              {new BigNumber(apr.toString()).toFixed(0).toString()}
                              {" %"}
                           </div>
                        </div>

                        <TextField 
                           label="Value to stake" 
                           variant="outlined" 
                           onChange={(event) => {setStake(event.target.value)}} 
                           sx={{mt:6, width: '100%'}}
                        />

                     </CardContent>
                     <CardActions>
                        {renderButton()}
                     </CardActions>
                  </Card>
                  
               </Grid>
            </Grid>
         </Grid>


      </>
   );
}

export default App;
