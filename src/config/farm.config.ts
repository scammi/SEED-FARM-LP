const farmJSON = require('../contracts/cStarFarm.json');
const tokenJSON = require('../contracts/IERC20.json');
const pairJSON = require('../contracts/IUniswapV2Pair.json');

const FarmConfig = {
   tokenAddr: "0x23D50a056c5Dd62073600e1daDcE73D454Cfd391",
   farmAddr: "0x9C09E8307dB9D20B836Cb2bBF84D3BD503D61ee5",
   pairAddr: "0x23D50a056c5Dd62073600e1daDcE73D454Cfd391",
   farmABI: farmJSON.abi,
   tokenABI: tokenJSON.abi,
   pairABI: pairJSON.abi,
}

export default FarmConfig;
