document.addEventListener("DOMContentLoaded", () => {
  // Simuler les données utilisateur
  const user = {
    username: "JeanDupont",
    balance: 150.75,
    walletId: "NORM-239ABX091"
  };

  // Afficher les infos portefeuille si l'élément existe
  const walletInfoEl = document.getElementById("walletInfo");
  if (walletInfoEl) {
    walletInfoEl.innerHTML = `
      Bonjour <strong>${user.username}</strong> !<br>
      Solde : <strong>${user.balance} NORM</strong><br>
      ID Portefeuille : <code>${user.walletId}</code>
    `;
  }

  // Gestion du formulaire d’achat/vente si présent
  const tradeForm = document.getElementById("tradeForm");
  if (tradeForm) {
    tradeForm.addEventListener("submit", (e) => {
      e.preventDefault();

      const action = document.getElementById("action").value;
      const amount = parseFloat(document.getElementById("amount").value);

      if (isNaN(amount) || amount <= 0) {
        alert("Veuillez entrer un montant valide.");
        return;
      }

      if (action === "buy") {
        alert(`Vous avez acheté ${amount} NORM !`);
      } else if (action === "sell") {
        alert(`Vous avez vendu ${amount} NORM !`);
      }

      document.getElementById("amount").value = "";
    });
  }

  // Log pour vérification
  console.log("Script chargé. Utilisateur simulé :", user);
});
