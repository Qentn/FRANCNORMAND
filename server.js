// === DEPENDANCES PRINCIPALES ===
const express = require('express');
const mongoose = require('mongoose');
const bcrypt = require('bcrypt');
const path = require('path');
const session = require('express-session');
require('dotenv').config(); // ← charge les variables du fichier .env

const app = express();

// === MIDDLEWARE ===
app.use(express.urlencoded({ extended: true }));

// 🔐 Middleware session
app.use(session({
  secret: 'secretFrancNormand',
  resave: false,
  saveUninitialized: false,
  cookie: { secure: false } // true si HTTPS (ex. Vercel avec certificat SSL)
}));

// 🔒 Protéger la page dashboard
app.use((req, res, next) => {
  if (req.path === '/dashboard.html' && !req.session.user) {
    return res.redirect('/auth.html');
  }
  next();
});

// 🌐 Servir les fichiers statiques (HTML/CSS/JS/images)
app.use(express.static(path.join(__dirname, 'public')));

// === ROUTE ACCUEIL ===
app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

// === CONNEXION À MONGODB ===
mongoose.connect(process.env.MONGO_URI, {
  useNewUrlParser: true,
  useUnifiedTopology: true
})
.then(() => console.log('✅ Connecté à MongoDB'))
.catch(err => console.error('❌ Erreur MongoDB :', err));

// === MODÈLE UTILISATEUR ===
const User = require('./models/user'); // 👈 nom corrigé ici

// === ROUTES ===

// ▶️ Inscription
app.post('/register', async (req, res) => {
  const { username, email, password, wallet } = req.body;
  try {
    const hashedPassword = await bcrypt.hash(password, 10);
    await new User({ username, email, password: hashedPassword, wallet }).save();
    req.session.user = email;
    res.redirect('/dashboard.html');
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
app.get('/me', async (req, res) => {
  if (!req.session.user) return res.status(401).json({ error: 'Non connecté' });

  try {
    const user = await User.findById(req.session.user).select('-password'); // retire le mot de passe
    if (!user) return res.status(404).json({ error: 'Utilisateur introuvable' });

    res.json(user);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Erreur serveur' });
  }
});

// 🔓 Déconnexion
app.get('/logout', (req, res) => {
  req.session.destroy(() => {
    res.redirect('/auth.html');
  });
});

// === LANCEMENT SERVEUR ===
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`🚀 Serveur lancé sur http://localhost:${PORT}`));
