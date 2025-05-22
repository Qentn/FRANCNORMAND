const mailjet = require('node-mailjet')
  .connect(process.env.MJ_API_KEY, process.env.MJ_API_SECRET);

async function sendVerificationEmail(to, token) {
  const verificationUrl = `http://localhost:3000/verify?token=${token}`;

  try {
    await mailjet.post('send', { version: 'v3.1' }).request({
      Messages: [
        {
          From: {
            Email: process.env.MJ_SENDER,
            Name: "FrancNormand",
          },
          To: [
            {
              Email: to,
            },
          ],
          Subject: "Confirme ton email – FrancNormand",
          HTMLPart: `
            <h2>Bienvenue sur FrancNormand !</h2>
            <p>Clique sur le bouton ci-dessous pour valider ton compte :</p>
            <a href="${verificationUrl}" style="padding: 10px 20px; background: #c8102e; color: white; text-decoration: none; border-radius: 4px;">Valider mon compte</a>
            <p>Ou copie-colle ce lien dans ton navigateur :<br><code>${verificationUrl}</code></p>
          `,
        },
      ],
    });
    console.log(`✅ Email de vérification envoyé à ${to}`);
  } catch (err) {
    console.error(`❌ Erreur d'envoi d'email :`, err);
    throw err;
  }
}

module.exports = sendVerificationEmail;
