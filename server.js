// === CHARGER LES VARIABLES D'ENVIRONNEMENT EN PREMIER ===
require('dotenv').config();

// === DEPENDANCES PRINCIPALES ===
const express = require('express');
const mongoose = require('mongoose');
const bcrypt = require('bcrypt');
const path = require('path');
const session = require('express-session');
const MongoStore = require('connect-mongo'); // ✅ pour les sessions Mongo

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

// === MODÈLE UTILISATEUR ===
const User = require('./models/user');

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
  const { username, email, password, wallet } = req.body;

  try {
    // Vérifie si l'email existe déjà
    const existingEmail = await User.findOne({ email });
    if (existingEmail) {
      return res.status(400).send("Cet email est déjà utilisé.");
    }

    // Vérifie si le pseudo existe déjà
    const existingUsername = await User.findOne({ username });
    if (existingUsername) {
      return res.status(400).send("Ce nom d'utilisateur est déjà pris.");
    }

    // Création du nouvel utilisateur
    const hashedPassword = await bcrypt.hash(password, 10);
    const newUser = await new User({ username, email, password: hashedPassword, wallet }).save();
    req.session.user = newUser._id;
    res.redirect('/dashboard.html');

  } catch (err) {
    console.error(err);
    res.status(500).send("Erreur lors de l'inscription.");
  }
});


// Connexion
app.post('/login', async (req, res) => {
  const { email, password } = req.body;
  try {
    const user = await User.findOne({ email });
    if (!user) return res.status(400).send('Utilisateur non trouvé');

    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) return res.status(400).send('Mot de passe incorrect');

    req.session.user = user._id;
    res.redirect('/dashboard.html');
  } catch (err) {
    console.error(err);
    res.status(500).send('Erreur serveur');
  }
});

// Infos utilisateur connecté
app.get('/me', async (req, res) => {
  if (!req.session.user) return res.status(401).json({ error: 'Non connecté' });

  try {
    const user = await User.findById(req.session.user).select('-password');
    if (!user) return res.status(404).json({ error: 'Utilisateur introuvable' });

    res.json(user);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Erreur serveur' });
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
app.listen(PORT, () => console.log(`🚀 Serveur lancé sur http://localhost:${PORT}`));
