/* ===== Beheerpagina: praat met de GitHub API om items op te slaan =====
   De site staat op GitHub Pages (alleen bestanden, geen server).
   Items worden opgeslagen door data/items.json in de repository aan te
   passen via de GitHub API, met een toegangssleutel (fine-grained token).

   De beheerder stelt de pagina één keer in met die sleutel en kiest dan
   een gebruikersnaam + wachtwoord. De sleutel wordt versleuteld met het
   wachtwoord (AES-GCM, sleutel afgeleid via PBKDF2) en alleen in deze
   browser bewaard. Daarna is inloggen gewoon: naam + wachtwoord. */

const KLUIS_SLEUTEL = "ldw_kluis";
const OUD_SLEUTEL = "ldw_instellingen"; // oud formaat met onversleutelde token

let actieveInstellingen = null; // { owner, repo, branch, token } — alleen in geheugen

function instellingen() { return actieveInstellingen; }

function kluis() {
  try { return JSON.parse(localStorage.getItem(KLUIS_SLEUTEL)) || null; }
  catch { return null; }
}

function meld(tekst, soort) {
  const el = document.getElementById("melding");
  el.textContent = tekst;
  el.className = "melding " + (soort || "ok");
  el.scrollIntoView({ behavior: "smooth", block: "nearest" });
}

function meldWeg() {
  document.getElementById("melding").className = "melding";
}

/* Maakt van een technische fout een begrijpelijke uitleg. */
function legFoutUit(e) {
  if (e instanceof TypeError && /fetch/i.test(e.message)) {
    return "De browser kon GitHub (api.github.com) niet bereiken. Dit komt bijna altijd " +
      "door een adblocker, een browserextensie of een virusscanner die het verzoek blokkeert. " +
      "Probeer het eens in een incognitovenster (Ctrl+Shift+N), of zet je adblocker voor deze site uit.";
  }
  return e.message;
}

/* ---- base64-hulpjes ---- */
function utf8NaarB64(str) {
  return bytesNaarB64(new TextEncoder().encode(str));
}

function b64NaarUtf8(b64) {
  return new TextDecoder().decode(b64NaarBytes(String(b64).replace(/\s/g, "")));
}

function bytesNaarB64(bytes) {
  let bin = "";
  for (const b of new Uint8Array(bytes)) bin += String.fromCharCode(b);
  return btoa(bin);
}

function b64NaarBytes(b64) {
  return Uint8Array.from(atob(b64), c => c.charCodeAt(0));
}

/* ---- versleuteling van de toegangssleutel met het wachtwoord ---- */
async function afgeleideSleutel(wachtwoord, salt) {
  const basis = await crypto.subtle.importKey(
    "raw", new TextEncoder().encode(wachtwoord), "PBKDF2", false, ["deriveKey"]);
  return crypto.subtle.deriveKey(
    { name: "PBKDF2", salt, iterations: 310000, hash: "SHA-256" },
    basis, { name: "AES-GCM", length: 256 }, false, ["encrypt", "decrypt"]);
}

async function versleutelToken(token, wachtwoord) {
  const salt = crypto.getRandomValues(new Uint8Array(16));
  const iv = crypto.getRandomValues(new Uint8Array(12));
  const sleutel = await afgeleideSleutel(wachtwoord, salt);
  const geheim = await crypto.subtle.encrypt(
    { name: "AES-GCM", iv }, sleutel, new TextEncoder().encode(token));
  return { salt: bytesNaarB64(salt), iv: bytesNaarB64(iv), geheim: bytesNaarB64(geheim) };
}

async function ontsleutelToken(k, wachtwoord) {
  const sleutel = await afgeleideSleutel(wachtwoord, b64NaarBytes(k.salt));
  const tekst = await crypto.subtle.decrypt(
    { name: "AES-GCM", iv: b64NaarBytes(k.iv) }, sleutel, b64NaarBytes(k.geheim));
  return new TextDecoder().decode(tekst);
}

/* ---- GitHub API ---- */
async function github(pad, opties = {}) {
  const s = instellingen();
  const r = await fetch(
    `https://api.github.com/repos/${s.owner}/${s.repo}/${pad}`,
    {
      ...opties,
      headers: {
        "Authorization": `Bearer ${s.token}`,
        "Accept": "application/vnd.github+json",
        "X-GitHub-Api-Version": "2022-11-28",
        ...(opties.headers || {}),
      },
    }
  );
  if (!r.ok) {
    let detail = "";
    try { detail = (await r.json()).message || ""; } catch {}
    throw new Error(`GitHub zegt: ${r.status} ${detail}`);
  }
  return r.json();
}

async function haalItemsBestand() {
  const s = instellingen();
  const bestand = await github(`contents/data/items.json?ref=${encodeURIComponent(s.branch)}`);
  return { sha: bestand.sha, data: JSON.parse(b64NaarUtf8(bestand.content)) };
}

async function bewaarItemsBestand(data, sha, bericht) {
  const s = instellingen();
  await github("contents/data/items.json", {
    method: "PUT",
    body: JSON.stringify({
      message: bericht,
      content: utf8NaarB64(JSON.stringify(data, null, 2)),
      sha,
      branch: s.branch,
    }),
  });
}

async function uploadFoto(bestand) {
  const s = instellingen();
  const b64 = await new Promise((ok, nee) => {
    const lezer = new FileReader();
    lezer.onload = () => ok(String(lezer.result).split(",")[1]);
    lezer.onerror = nee;
    lezer.readAsDataURL(bestand);
  });
  const veiligeNaam = bestand.name.toLowerCase()
    .replace(/[^a-z0-9.]+/g, "-").replace(/^-+|-+$/g, "");
  const pad = `fotos/${Date.now().toString(36)}-${veiligeNaam}`;
  await github(`contents/${pad}`, {
    method: "PUT",
    body: JSON.stringify({
      message: `Foto toegevoegd: ${veiligeNaam}`,
      content: b64,
      branch: s.branch,
    }),
  });
  return pad;
}

/* ---- Eerste keer instellen ---- */
async function stelIn() {
  const owner = document.getElementById("su-owner").value.trim();
  const repo = document.getElementById("su-repo").value.trim();
  const token = document.getElementById("su-token").value.replace(/\s+/g, "");
  const branch = document.getElementById("su-branch").value.trim() || "main";
  const naam = document.getElementById("su-naam").value.trim();
  const ww1 = document.getElementById("su-ww1").value;
  const ww2 = document.getElementById("su-ww2").value;

  if (!owner || !repo || !token || !naam) {
    meld("Vul alle velden in.", "fout");
    return;
  }
  if (ww1.length < 8) {
    meld("Kies een wachtwoord van minstens 8 tekens.", "fout");
    return;
  }
  if (ww1 !== ww2) {
    meld("De twee wachtwoorden zijn niet hetzelfde.", "fout");
    return;
  }

  const knop = document.getElementById("knop-setup");
  knop.disabled = true;
  try {
    actieveInstellingen = { owner, repo, branch, token };
    await haalItemsBestand(); // klopt de sleutel en is de repo bereikbaar?

    const versleuteld = await versleutelToken(token, ww1);
    localStorage.setItem(KLUIS_SLEUTEL, JSON.stringify({ owner, repo, branch, naam, ...versleuteld }));
    localStorage.removeItem(OUD_SLEUTEL);

    meldWeg();
    toonDashboard();
  } catch (e) {
    actieveInstellingen = null;
    meld(`Instellen is niet gelukt. ${legFoutUit(e)}`, "fout");
  } finally {
    knop.disabled = false;
  }
}

/* ---- Inloggen / uitloggen ---- */
async function login() {
  const naam = document.getElementById("in-naam").value.trim();
  const ww = document.getElementById("in-ww").value;
  const k = kluis();
  if (!k) { toonPaneel("setup"); return; }

  const knop = document.getElementById("knop-login");
  knop.disabled = true;
  try {
    let token = null;
    if (naam.toLowerCase() === String(k.naam).toLowerCase()) {
      try { token = await ontsleutelToken(k, ww); } catch { token = null; }
    }
    if (!token) {
      meld("De gebruikersnaam of het wachtwoord klopt niet.", "fout");
      return;
    }
    actieveInstellingen = { owner: k.owner, repo: k.repo, branch: k.branch, token };
    meldWeg();
    toonDashboard();
  } finally {
    knop.disabled = false;
  }
}

function uitloggen() {
  actieveInstellingen = null;
  location.reload();
}

function resetInstellingen() {
  if (!confirm("Weet je het zeker? Je hebt daarna de GitHub-toegangssleutel weer nodig om opnieuw in te stellen.")) return;
  localStorage.removeItem(KLUIS_SLEUTEL);
  localStorage.removeItem(OUD_SLEUTEL);
  location.reload();
}

/* ---- Panelen ---- */
function toonPaneel(welke) {
  document.getElementById("login-paneel").classList.toggle("verborgen", welke !== "login");
  document.getElementById("setup-paneel").classList.toggle("verborgen", welke !== "setup");
  document.getElementById("dashboard").classList.toggle("verborgen", welke !== "dashboard");
}

function toonDashboard() {
  toonPaneel("dashboard");
  ververslijst();
}

async function ververslijst() {
  const el = document.getElementById("item-lijst");
  try {
    const { data } = await haalItemsBestand();
    const items = (data.items || []).slice()
      .sort((a, b) => String(b.datum || "").localeCompare(String(a.datum || "")));
    if (!items.length) {
      el.innerHTML = "<p>Nog geen items.</p>";
      return;
    }
    el.innerHTML = `<table class="item-lijst">
      <tr><th>Soort</th><th>Titel</th><th>Datum</th><th></th></tr>
      ${items.map(i => `<tr>
        <td>${(TYPES[i.type] || {}).emoji || ""} ${esc((TYPES[i.type] || {}).enkel || i.type)}</td>
        <td>${esc(i.titel)}</td>
        <td>${esc(i.datum || "")}</td>
        <td><button class="knop rood klein" data-verwijder="${esc(i.id)}">Verwijder</button></td>
      </tr>`).join("")}
    </table>`;
    el.querySelectorAll("[data-verwijder]").forEach(k =>
      k.addEventListener("click", () => verwijderItem(k.dataset.verwijder))
    );
  } catch (e) {
    el.innerHTML = `<p>Kon de lijst niet laden. (${esc(e.message)})</p>`;
  }
}

async function verwijderItem(id) {
  if (!confirm("Weet je zeker dat je dit item wilt verwijderen?")) return;
  try {
    const { sha, data } = await haalItemsBestand();
    const item = (data.items || []).find(i => i.id === id);
    data.items = (data.items || []).filter(i => i.id !== id);
    await bewaarItemsBestand(data, sha, `Item verwijderd: ${item ? item.titel : id}`);
    meld("Item verwijderd! Het duurt een paar minuten voordat de site is bijgewerkt.");
    ververslijst();
  } catch (e) {
    meld(`Verwijderen is niet gelukt. ${legFoutUit(e)}`, "fout");
  }
}

async function opslaan() {
  const knop = document.getElementById("knop-opslaan");
  const titel = document.getElementById("nw-titel").value.trim();
  if (!titel) {
    meld("Geef het item eerst een titel.", "fout");
    return;
  }
  knop.disabled = true;
  knop.textContent = "Bezig met opslaan…";
  try {
    const fotoBestand = document.getElementById("nw-foto-bestand").files[0];
    let afbeelding = document.getElementById("nw-foto-url").value.trim();
    if (fotoBestand) afbeelding = await uploadFoto(fotoBestand);

    const dieren = document.getElementById("nw-dieren").value
      .split(",").map(d => d.trim().toLowerCase()).filter(Boolean);

    const nieuw = {
      id: Date.now().toString(36),
      type: document.getElementById("nw-type").value,
      titel,
      tekst: document.getElementById("nw-tekst").value.trim(),
      dieren,
      afbeelding,
      video: document.getElementById("nw-video").value.trim(),
      datum: new Date().toISOString().slice(0, 10),
    };

    const { sha, data } = await haalItemsBestand();
    data.items = data.items || [];
    data.items.unshift(nieuw);
    await bewaarItemsBestand(data, sha, `Nieuw item: ${titel}`);

    meld("Gelukt! 🎉 Het item is opgeslagen. Binnen een paar minuten staat het op de site.");
    for (const id of ["nw-titel", "nw-tekst", "nw-dieren", "nw-video", "nw-foto-url"])
      document.getElementById(id).value = "";
    document.getElementById("nw-foto-bestand").value = "";
    ververslijst();
  } catch (e) {
    meld(`Opslaan is niet gelukt. ${legFoutUit(e)}`, "fout");
  } finally {
    knop.disabled = false;
    knop.textContent = "Opslaan op de site 🚀";
  }
}

/* ---- Start ---- */
document.addEventListener("DOMContentLoaded", () => {
  document.getElementById("knop-setup").addEventListener("click", stelIn);
  document.getElementById("knop-login").addEventListener("click", login);
  document.getElementById("knop-uitloggen").addEventListener("click", uitloggen);
  document.getElementById("knop-opslaan").addEventListener("click", opslaan);
  document.getElementById("link-reset").addEventListener("click", e => {
    e.preventDefault();
    resetInstellingen();
  });
  document.getElementById("in-ww").addEventListener("keydown", e => {
    if (e.key === "Enter") login();
  });

  const k = kluis();
  if (k) {
    document.getElementById("in-naam").value = k.naam || "";
    toonPaneel("login");
  } else {
    toonPaneel("setup");
  }
});
