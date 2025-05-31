// === script.js corrigé ===

// Vérifie la connexion à MetaMask et initialise les variables
let provider;
let signer;
let contract;

const contractABI = [
  "function balanceOf(address) view returns (uint)",
  "function transfer(address to, uint amount) returns (bool)"
];

const contractAddress = "0xTonAdresseDeContrat"; // Remplace par ton adresse réelle !

// Initialisation de la connexion à MetaMask et affichage des informations principales
async function initBlockchainConnection() {
  if (typeof window.ethereum === 'undefined') {
    document.getElementById('solde').textContent = "MetaMask non détecté";
    return;
  }

  provider = new ethers.providers.Web3Provider(window.ethereum);
  try {
    await provider.send("eth_requestAccounts", []);
    signer = provider.getSigner();
    const walletAddress = await signer.getAddress();
    document.getElementById('walletAddress').textContent = walletAddress;

    contract = new ethers.Contract(contractAddress, contractABI, signer);

    await updateBalance(walletAddress);
    generateQrCode(walletAddress);
  } catch (err) {
    console.error(err);
    alert("Erreur lors de la connexion à MetaMask.");
  }
}

// Met à jour le solde à partir de la blockchain
async function updateBalance(address) {
  const balance = await contract.balanceOf(address);
  document.getElementById('solde').textContent = ethers.utils.formatUnits(balance, 18) + " NORM";
}

// Génère un QR code pour le wallet connecté
function generateQrCode(address) {
  document.getElementById('walletQrCode').src =
    `https://api.qrserver.com/v1/create-qr-code/?data=${encodeURIComponent(address)}&size=100x100`;
  document.getElementById('qrPlaceholder').textContent = "";
}

// Copie l'adresse du portefeuille
function copyWallet() {
  const walletText = document.getElementById('walletAddress').textContent;
  if (walletText !== "Connecter votre portefeuille") {
    navigator.clipboard.writeText(walletText).then(() => {
      alert("Adresse copiée !");
    }).catch(err => {
      console.error("Erreur lors de la copie :", err);
    });
  } else {
    alert("Aucune adresse à copier. Veuillez connecter votre portefeuille.");
  }
}

// Déconnecte l'utilisateur
function deconnexion() {
  window.location.href = "/logout";
}

// Envoie des tokens via le smart contract
async function sendTokens() {
  const to = prompt("Adresse de destination :");
  const amount = prompt("Montant à envoyer :");

  if (!to || !amount) {
    alert("Destinataire et montant requis.");
    return;
  }

  try {
    const tx = await contract.transfer(to, ethers.utils.parseUnits(amount, 18));
    await tx.wait();
    alert("✅ Transfert confirmé sur la blockchain !");
    location.reload();
  } catch (err) {
    console.error(err);
    alert("❌ Erreur lors du transfert : " + err.message);
  }
}

// Achat de NORM (envoi d'ETH au contrat)
async function buyNorm() {
  const amount = prompt("Montant d'ETH à échanger contre du NORM ?");
  if (!amount) {
    alert("Montant requis.");
    return;
  }

  try {
    const tx = await signer.sendTransaction({
      to: contractAddress,
      value: ethers.utils.parseEther(amount)
    });
    await tx.wait();
    alert("✅ Achat confirmé sur la blockchain !");
    location.reload();
  } catch (err) {
    console.error(err);
    alert("❌ Erreur lors de l'achat : " + err.message);
  }
}

// Initialiser la connexion à la blockchain au chargement de la page
document.addEventListener('DOMContentLoaded', initBlockchainConnection);

// Associer les boutons aux fonctions
document.getElementById('sendNorm').addEventListener('click', sendTokens);
document.getElementById('buyNorm').addEventListener('click', buyNorm);
document.getElementById('walletAddress').addEventListener('click', copyWallet);
