// === CHARGER LES VARIABLES D'ENVIRONNEMENT EN PREMIER ===
require('dotenv').config();

// === DEPENDANCES PRINCIPALES ===
const express = require('express');
const mongoose = require('mongoose');
const bcrypt = require('bcrypt');
const path = require('path');
const session = require('express-session');
const MongoStore = require('connect-mongo');
const crypto = require('crypto');
const ethers = require('ethers'); // Pour la vérification de signature + blockchain
const sendVerificationEmail = require('./utils/sendEmail');

const app = express();

// === MIDDLEWARES ===
app.use(express.urlencoded({ extended: true }));
app.use(express.json());

app.use(session({
  secret: 'secretFrancNormand',
  resave: false,
  saveUninitialized: false,
  store: MongoStore.create({
    mongoUrl: process.env.MONGODB_URI
  }),
  cookie: { secure: false } // mettre true si HTTPS (en prod)
}));

// 🔒 Protection de la page dashboard
app.use((req, res, next) => {
  if (req.path === '/dashboard.html' && !req.session.user) {
    return res.redirect('/auth.html');
  }
  next();
});

// 🌐 Servir les fichiers statiques
app.use(express.static(path.join(__dirname, 'public')));

// === CONNEXION À MONGODB ===
mongoose.connect(process.env.MONGODB_URI)
  .then(() => console.log('✅ Connecté à MongoDB'))
  .catch(err => console.error('❌ Erreur MongoDB :', err));

// === MODÈLE UTILISATEUR ET TRANSACTION ===
const User = require('./models/user');
const Transaction = require('./models/transaction');

// === CONFIG Ethers.js POUR LA BLOCKCHAIN ===
const provider = new ethers.JsonRpcProvider(process.env.RPC_URL);
const wallet = new ethers.Wallet(process.env.PRIVATE_KEY, provider);

// === ROUTES ===

// Page d'accueil
app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

// Page de connexion (GET)
app.get('/login', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'auth.html'));
});

// Inscription
app.post('/register', async (req, res) => {
  let { username, email, password } = req.body;
  username = username.trim();
  email = email.trim();
  password = password.trim();

  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (!emailRegex.test(email)) return res.status(400).send("❌ Adresse email invalide.");

  try {
    const existingEmail = await User.findOne({ email });
    if (existingEmail) return res.status(400).send("Cet email est déjà utilisé.");

    const existingUsername = await User.findOne({ username });
    if (existingUsername) return res.status(400).send("Ce nom d'utilisateur est déjà pris.");

    const token = crypto.randomBytes(32).toString('hex');

    const newUser = await new User({
      username,
      email,
      password,
      verificationToken: token,
      isVerified: false
    }).save();

    await sendVerificationEmail(email, token);
    res.sendFile(path.join(__dirname, 'public', 'register-success.html'));
  } catch (err) {
    console.error(err);
    res.status(500).send("Erreur lors de l'inscription.");
  }
});

// Vérification du compte
app.get('/verify', async (req, res) => {
  const { token } = req.query;
  if (!token) return res.status(400).send("Lien invalide.");

  try {
    const user = await User.findOne({ verificationToken: token });
    if (!user) return res.status(400).send("Lien expiré ou déjà utilisé.");

    user.isVerified = true;
    user.verificationToken = undefined;
    await user.save();

    res.sendFile(path.join(__dirname, 'public', 'verify.html'));
  } catch (err) {
    console.error(err);
    res.status(500).send("Erreur de validation.");
  }
});

// Connexion
app.post('/login', async (req, res) => {
  let { email, password } = req.body;
  email = email.trim();
  password = password.trim();

  try {
    const user = await User.findOne({ email });
    if (!user) {
      return res.status(404).send('Cet email n’est pas encore inscrit. Inscrivez-vous !');
    }
    if (!user.isVerified) {
      return res.status(403).send('Compte non vérifié. Vérifie ta boîte mail.');
    }
    if (!user.isVerified) return res.status(403).send('Compte non vérifié. Vérifie ta boîte mail.');

    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) return res.status(400).send('Mot de passe incorrect');

    req.session.user = user._id;
    res.redirect('/dashboard.html');
  } catch (err) {
    console.error("❌ Erreur serveur lors de la connexion :", err);
    res.status(500).send('Erreur serveur');
  }
});

// 🔗 Infos utilisateur connecté + dernières transactions
app.get('/me', async (req, res) => {
  if (!req.session.user) return res.status(401).json({ error: 'Non connecté' });

  try {
    const user = await User.findById(req.session.user).select('-password');
    if (!user) return res.status(404).json({ error: 'Utilisateur introuvable' });

    const soldeNorm = user.solde || 0;

    const transactions = await Transaction.find({ userId: user._id })
      .sort({ date: -1 })
      .limit(3);

    res.json({
      wallet: user.wallet,
      solde: soldeNorm,
      transactions
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Erreur serveur' });
  }
});

// 🔗 Lier un wallet (avec vérification de signature)
app.post('/link-wallet', async (req, res) => {
  try {
    const userId = req.session.user;
    const { wallet: walletAddr, signature, message } = req.body;

    if (!userId || !walletAddr || !signature || !message) {
      return res.status(400).json({ error: "Requête incomplète" });
    }

    const recoveredAddress = ethers.verifyMessage(message, signature);

    if (recoveredAddress.toLowerCase() !== walletAddr.toLowerCase()) {
      return res.status(401).json({ error: "Signature invalide" });
    }

    await User.findByIdAndUpdate(userId, { wallet: walletAddr });
    res.status(200).json({ message: "Wallet lié avec succès et signature vérifiée !" });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Erreur serveur" });
  }
});

// ✅ NOUVELLES ROUTES BLOCKCHAIN

// Vérifier le solde ETH du wallet
app.get('/balance', async (req, res) => {
  try {
    const balance = await provider.getBalance(wallet.address);
    res.json({ address: wallet.address, balance: ethers.formatEther(balance) });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Erreur lors de la récupération du solde" });
  }
});

// Envoyer des ETH depuis le wallet (⚠️ testnet seulement)
app.post('/send', async (req, res) => {
  const { to, amount } = req.body;
  if (!to || !amount) return res.status(400).json({ error: "Destinataire et montant requis" });

  try {
    const tx = await wallet.sendTransaction({
      to,
      value: ethers.parseEther(amount),
    });
    await tx.wait();
    res.json({ txHash: tx.hash });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Erreur lors de l'envoi" });
  }
});

// Déconnexion
app.get('/logout', (req, res) => {
  req.session.destroy(() => {
    res.redirect('/auth.html');
  });
});

// LANCEMENT DU SERVEUR
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`🚀 Serveur lancé sur http://localhost:${PORT}!`));
