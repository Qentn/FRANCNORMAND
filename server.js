// === DEPENDANCES PRINCIPALES ===
const express = require('express');
const mongoose = require('mongoose');
const bcrypt = require('bcrypt');
const path = require('path');
require('dotenv').config(); // ← charge les variables du fichier .env

const app = express();

// === MIDDLEWARE ===
app.use(express.urlencoded({ extended: true }));
app.use(express.static(path.join(__dirname, 'public', 'index.html'))); // ← sert tous les fichiers HTML/CSS/JS dans le dossier 'public'

// === CONNEXION À MONGODB ===
mongoose.connect(process.env.MONGO_URI, {
  useNewUrlParser: true,
  useUnifiedTopology: true
})
.then(() => console.log('✅ Connecté à MongoDB'))
.catch(err => console.error('❌ Erreur MongoDB :', err));

// === MODÈLE UTILISATEUR ===
const User = require('./user'); // Assure-toi que ton fichier user.js est dans un dossier 'models'

// === ROUTES ===

// ▶️ Inscription
app.post('/register', async (req, res) => {
  const { username, email, password } = req.body;
  try {
    const hashedPassword = await bcrypt.hash(password, 10);
    await new User({ username, email, password: hashedPassword }).save();
    res.redirect('/index.html'); // Redirige vers la page d'accueil après inscription
  } catch (err) {
    console.error(err);
    res.status(500).send("Erreur lors de l'inscription.");
  }
});

// ▶️ Connexion
app.post('/login', async (req, res) => {
  const { email, password } = req.body;
  try {
    const user = await User.findOne({ email });
    if (!user || !(await bcrypt.compare(password, user.password))) {
      return res.status(401).send("Identifiants incorrects.");
    }
    res.redirect('/index.html'); // Redirige vers la page d'accueil après connexion
  } catch (err) {
    console.error(err);
    res.status(500).send("Erreur lors de la connexion.");
  }
});

// === LANCEMENT SERVEUR ===
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`🚀 Serveur lancé sur http://localhost:${PORT}`));
