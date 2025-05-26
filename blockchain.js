// blockchain.js
import { ethers } from "ethers";
import dotenv from "dotenv";
dotenv.config();

const provider = new ethers.JsonRpcProvider(process.env.RPC_URL);
const wallet = new ethers.Wallet(process.env.PRIVATE_KEY, provider);

export async function getBalance() {
  const balance = await provider.getBalance(wallet.address);
  return ethers.formatEther(balance);
}

export async function sendEth(to, amountInEth) {
  const tx = await wallet.sendTransaction({
    to,
    value: ethers.parseEther(amountInEth),
  });
  await tx.wait();
  return tx.hash;
}
