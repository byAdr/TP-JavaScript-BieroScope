async function ouvrirBaseBieres() {
  return new Promise((resolve, reject) => {
    const requete = indexedDB.open("BeerDB", 4);
    requete.onupgradeneeded = () => {
      const db = requete.result;
      if (!db.objectStoreNames.contains("beers")) {
        const bieres = db.createObjectStore("beers", { keyPath: "id" });
        bieres.createIndex("name", "name", { unique: false });
      }
      if (!db.objectStoreNames.contains("catalogue")) {
        db.createObjectStore("catalogue");
      } else {
        const transaction = requete.transaction;
        const curseur = transaction.objectStore("catalogue").openCursor();
        curseur.onsuccess = () => {
          const entree = curseur.result;
          if (!entree) return;
          entree.update(enregistrerFiches(transaction, entree.value));
          entree.continue();
        };
      }
    };
    requete.onsuccess = () => {
      const db = requete.result;
      db.onversionchange = () => db.close();
      resolve(db);
    };
    requete.onerror = () => reject(requete.error);
  });
}

function enregistrerFiches(transaction, bieres) {
  const magasin = transaction.objectStore("beers");
  return bieres.map((biere) => {
    const id = `api:${biere.id}`;
    magasin.put({ ...biere, id, source: "api" });
    return id;
  });
}

async function enregistrerResultat(url, bieres) {
  const db = await ouvrirBaseBieres();
  try {
    return await new Promise((resolve, reject) => {
      const transaction = db.transaction(["catalogue", "beers"], "readwrite");
      const ids = enregistrerFiches(transaction, bieres);
      if (url) transaction.objectStore("catalogue").put(ids, url);
      transaction.oncomplete = resolve;
      transaction.onabort = () => reject(transaction.error);
    });
  } finally {
    db.close();
  }
}

async function consulterCacheCatalogue(url) {
  const db = await ouvrirBaseBieres();
  try {
    return await new Promise((resolve, reject) => {
      const transaction = db.transaction(["catalogue", "beers"]);
      const requete = transaction.objectStore("catalogue").get(url);
      let fiches;
      requete.onsuccess = () => {
        fiches = requete.result?.map(id => transaction.objectStore("beers").get(id));
      };
      transaction.oncomplete = () => resolve(fiches?.map(fiche => fiche.result));
      transaction.onabort = () => reject(transaction.error);
    });
  } finally {
    db.close();
  }
}

async function lireBieresLocales() {
  const db = await ouvrirBaseBieres();
  try {
    return await new Promise((resolve, reject) => {
      const requete = db.transaction("beers").objectStore("beers").getAll();
      requete.onsuccess = () => resolve(requete.result);
      requete.onerror = () => reject(requete.error);
    });
  } finally {
    db.close();
  }
}

async function ajouterBiereLocale(biere) {
  const db = await ouvrirBaseBieres();
  try {
    await new Promise((resolve, reject) => {
      const transaction = db.transaction("beers", "readwrite");
      transaction.oncomplete = resolve;
      transaction.onabort = () => reject(transaction.error);
      transaction.objectStore("beers").add({ ...biere, id: crypto.randomUUID() });
    });
  } finally {
    db.close();
  }
}
