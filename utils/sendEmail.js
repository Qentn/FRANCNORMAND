const mailjet = require('node-mailjet').connect(
  process.env.MJ_API_KEY,
  process.env.MJ_API_SECRET
);

async function sendVerificationEmail(to, token) {
  const verificationUrl = `http://localhost:3000/verify?token=${token}`;

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
          <p>Clique ci-dessous pour valider ton compte :</p>
          <a href="${verificationUrl}" style="padding: 10px 20px; background: #c8102e; color: white; text-decoration: none; border-radius: 4px;">Valider mon compte</a>
          <p>Ou copie ce lien : <code>${verificationUrl}</code></p>
        `,
      },
    ],
  });
}

module.exports = sendVerificationEmail;
