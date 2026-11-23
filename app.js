window.addEventListener("DOMContentLoaded", () => {
  const API_BASE = "https://punkapi.dev/api/v3";
  const TAILLE_PAGE = 10;
  const catalogue = document.querySelector("#catalogue");
  const statut = document.querySelector("#statut");
  const formulaire = document.querySelector("#recherche-form");
  const champNom = document.querySelector("#nom");
  const boutonCharger = document.querySelector("#charger");
  const boutonAleatoire = document.querySelector("#aleatoire");
  const boutons = document.querySelectorAll("button");
  const pagination = document.querySelector("#pagination");
  const pagePrecedente = document.querySelector("#page-precedente");
  const pageSuivante = document.querySelector("#page-suivante");
  const numeroPage = document.querySelector("#numero-page");
  let pageCourante = 1;

  function urlPage(page) {
    return `${API_BASE}/beers?page=${page}&per_page=${TAILLE_PAGE}`;
  }

  async function obtenirBieres(url) {
    const response = await fetch(url, { cache: "no-store" });
    if (!response.ok) throw new Error(`Erreur HTTP ${response.status}`);
    return response.json();
  }

  function creerLigne(libelle, valeur) {
    const p = document.createElement("p");
    const strong = document.createElement("strong");
    strong.textContent = libelle;
    p.append(strong, ` ${valeur}`);
    return p;
  }

  function creerCarte(biere) {
    const carte = document.createElement("div");
    carte.classList.add("carte");

    const titre = document.createElement("h2");
    titre.textContent = biere.name;

    const sousTitre = document.createElement("h3");
    const sousTitreFort = document.createElement("strong");
    sousTitreFort.textContent = biere.tagline;
    sousTitre.append(sousTitreFort);

    const description = document.createElement("p");
    description.textContent = biere.description;

    const tauxAlcool = creerLigne("Taux d'alcool :", `${biere.abv}%`);
    const ibu = creerLigne("IBU :", biere.ibu ?? "N/A");

    const img = document.createElement("img");
    img.src = `${API_BASE}/images/${biere.image}`;
    img.alt = `Image de la bière ${biere.name}`;
    img.loading = "lazy";

    carte.append(titre, sousTitre, description, tauxAlcool, ibu, img);
    return carte;
  }

  function afficherBieres(bieres) {
    catalogue.replaceChildren();
    if (bieres.length === 0) {
      statut.textContent = "Aucun résultat.";
    } else {
      statut.textContent = `${bieres.length} fiche(s) affichée(s) sur cette page.`;
    }
    for (const biere of bieres) {
      catalogue.append(creerCarte(biere));
    }
  }

  function preparerRequete(message) {
    boutons.forEach((btn) => {
      btn.disabled = true;
    });
    catalogue.replaceChildren();
    pagination.hidden = true;
    statut.classList.remove("erreur");
    statut.textContent = message;
  }

  function finirRequete() {
    boutons.forEach((btn) => {
      btn.disabled = false;
    });
  }

  function afficherErreur(error) {
    statut.classList.add("erreur");
    statut.textContent = "Impossible de contacter le catalogue. Réessayez.";
    console.error(error);
  }

  async function chargerCatalogue(page = 1) {
    preparerRequete("Chargement du catalogue...");
    let dernierePage = false;
    try {
      let bieres = await obtenirBieres(urlPage(page));
      if (!Array.isArray(bieres))
        throw new Error("Réponse du catalogue invalide.");
      if (bieres.length === 0 && page > 1) {
        page--;
        dernierePage = true;
        bieres = await obtenirBieres(urlPage(page));
      }
      pageCourante = page;
      afficherBieres(bieres);
      if (dernierePage)
        statut.textContent = "Vous avez atteint la dernière page du catalogue.";
      numeroPage.textContent = `Page ${pageCourante}`;
      pagination.hidden = false;
    } catch (error) {
      afficherErreur(error);
    } finally {
      finirRequete();
      pagePrecedente.disabled = pageCourante <= 1;
      pageSuivante.disabled = dernierePage;
    }
  }

  async function rechercherBieres(nom) {
    preparerRequete("Recherche en cours...");
    try {
      const param = new URLSearchParams({
        beer_name: nom.replace(/\s+/g, "_"),
        page: 1,
        per_page: 10,
      });
      const bieres = await obtenirBieres(`${API_BASE}/beers?${param}`);
      afficherBieres(bieres);
    } catch (error) {
      afficherErreur(error);
    } finally {
      finirRequete();
    }
  }

  function wait(ms) {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }
  async function chargerAleatoire() {
    preparerRequete("Chargement d'une bière aléatoire...");
    try {
      const data = await obtenirBieres(`${API_BASE}/beers/random`);
      afficherBieres(Array.isArray(data) ? data : [data]);
    } catch (error) {
      afficherErreur(error);
    } finally {
      finirRequete();
    }
  }

  boutonCharger.addEventListener("click", () => chargerCatalogue());
  pagePrecedente.addEventListener("click", () =>
    chargerCatalogue(pageCourante - 1),
  );
  pageSuivante.addEventListener("click", () =>
    chargerCatalogue(pageCourante + 1),
  );
  boutonAleatoire.addEventListener("click", chargerAleatoire);

  formulaire.addEventListener("submit", (event) => {
    event.preventDefault();
    const nom = champNom.value.trim();
    if (nom.length === 0) {
      chargerCatalogue();
    } else {
      rechercherBieres(nom);
    }
  });
});
