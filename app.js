window.addEventListener("DOMContentLoaded", () => {
  const API_BASE = "https://punkapi.dev/api/v3";
  const TAILLE_PAGE = 80;

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

  let bieresLocales = [];
  let pageCourante = 1;

  function urlPage(page) {
    return `${API_BASE}/beers?page=${page}&per_page=${TAILLE_PAGE}`;
  }

  async function obtenirBieres(url) {
    const aleatoire = url === `${API_BASE}/beers/random`;
    if (!aleatoire) {
      try {
        const copie = await consulterCacheCatalogue(url);
        if (Array.isArray(copie)) return copie;
      } catch (error) {
        console.warn("Lecture du cache indisponible.", error);
      }
    }
    const response = await fetch(url, { cache: "no-store" });

    if (!response.ok) {
      throw new Error(`Erreur HTTP ${response.status}`);
    }

    const bieres = await response.json();
    if (aleatoire || Array.isArray(bieres)) {
      try {
        await enregistrerResultat(
          aleatoire ? null : url,
          Array.isArray(bieres) ? bieres : [bieres],
        );
      } catch (error) {
        console.warn("Enregistrement du catalogue indisponible.", error);
      }
    }
    return bieres;
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

    const tauxAlcool = creerLigne(
      "Taux d'alcool :",
      biere.abv == null ? "N/A" : `${biere.abv}%`,
    );
    const ibu = creerLigne("IBU :", biere.ibu ?? "N/A");

    carte.append(titre, sousTitre, description, tauxAlcool, ibu);
    if (!biere.image) return carte;

    const img = document.createElement("img");
    img.src = `${API_BASE}/images/${biere.image}`;
    img.alt = `Image de la bière ${biere.name}`;
    img.loading = "lazy";

    carte.append(img);
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
    afficherBieres(bieresLocales);
    statut.classList.add("erreur");
    statut.textContent = bieresLocales.length
      ? "Mode hors connexion : données locales."
      : "Mode hors connexion : aucune bière locale enregistrée.";
    console.error(error);
  }

  async function chargerCatalogue(page = 1) {
    preparerRequete("Chargement du catalogue...");
    let dernierePage = false;

    try {
      let bieres = await obtenirBieres(urlPage(page));

      if (!Array.isArray(bieres)) {
        throw new Error("Réponse du catalogue invalide.");
      }

      if (bieres.length === 0 && page > 1) {
        page--;
        dernierePage = true;
        bieres = await obtenirBieres(urlPage(page));
      }

      pageCourante = page;
      afficherBieres(
        page === 1
          ? [
              ...bieresLocales.filter((biere) => biere.source !== "api"),
              ...bieres,
            ]
          : bieres,
      );

      if (dernierePage) {
        statut.textContent = "Vous avez atteint la dernière page du catalogue.";
      }

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
        per_page: TAILLE_PAGE,
      });

      const bieres = await obtenirBieres(`${API_BASE}/beers?${param}`);
      afficherBieres(bieres);
    } catch (error) {
      afficherErreur(error);
    } finally {
      finirRequete();
    }
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

    // setTimeout(chargerAleatoire, 50);
  }

  boutonCharger.addEventListener("click", () => chargerCatalogue());
  boutonAleatoire.addEventListener("click", chargerAleatoire);

  pagePrecedente.addEventListener("click", () => {
    chargerCatalogue(pageCourante - 1);
  });

  pageSuivante.addEventListener("click", () => {
    chargerCatalogue(pageCourante + 1);
  });

  formulaire.addEventListener("submit", (event) => {
    event.preventDefault();

    const nom = champNom.value.trim();

    if (nom.length === 0) {
      chargerCatalogue();
    } else {
      rechercherBieres(nom);
    }
  });

  const boutonInstallation = document.querySelector("#install");
  let demandeInstallation = null;

  window.addEventListener("beforeinstallprompt", (event) => {
    event.preventDefault();
    demandeInstallation = event;
    boutonInstallation.hidden = false;
  });

  boutonInstallation.addEventListener("click", async () => {
    const demande = demandeInstallation;
    if (!demande) return;

    demandeInstallation = null;
    boutonInstallation.hidden = true;

    try {
      await demande.prompt();
    } catch (error) {
      console.error("Échec de l'ouverture de la demande d'installation", error);
    }
  });

  async function registerServiceWorker() {
    if ("serviceWorker" in navigator) {
      try {
        const registration = await navigator.serviceWorker.register("./sw.js");
        console.log("Service worker enregistré pour", registration.scope);
      } catch (error) {
        console.error("Échec de l'enregistrement du service worker", error);
      }
    }
  }

  async function initialiserCatalogue() {
    preparerRequete("Lecture des bières locales...");
    try {
      bieresLocales = await lireBieresLocales();
      afficherBieres(bieresLocales);
      if (!bieresLocales.length)
        statut.textContent = "Aucune bière locale enregistrée.";
      const premierePage = await consulterCacheCatalogue(urlPage(1));
      if (Array.isArray(premierePage)) {
        pageCourante = 1;
        afficherBieres([
          ...bieresLocales.filter((biere) => biere.source !== "api"),
          ...premierePage,
        ]);
        numeroPage.textContent = "Page 1";
        pagination.hidden = false;
      } else if (!bieresLocales.length) {
        await chargerCatalogue();
      }
    } catch (error) {
      statut.textContent = "Impossible de lire les bières locales.";
      console.error(error);
    } finally {
      finirRequete();
      pagePrecedente.disabled = pageCourante <= 1;
    }
  }

  registerServiceWorker();
  initialiserCatalogue();
  window.addEventListener("pageshow", (event) => {
    if (event.persisted) initialiserCatalogue();
  });
});
