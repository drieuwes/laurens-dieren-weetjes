/* ===== Laurens' dieren weetjes — gedeelde code voor de site ===== */

const TYPES = {
  weetje: { naam: "Weetjes", enkel: "Weetje", emoji: "🤓" },
  nieuws: { naam: "Nieuws", enkel: "Nieuws", emoji: "📰" },
  vraag:  { naam: "Vragen", enkel: "Vraag", emoji: "❓" },
  video:  { naam: "Video's", enkel: "Video", emoji: "🎬" },
  foto:   { naam: "Foto's", enkel: "Foto", emoji: "📸" },
};

const DIER_EMOJI = {
  leeuw: "🦁", tijger: "🐯", hond: "🐶", kat: "🐱", poes: "🐱", olifant: "🐘",
  dolfijn: "🐬", walvis: "🐳", haai: "🦈", vis: "🐟", uil: "🦉", vogel: "🐦",
  papegaai: "🦜", pinguïn: "🐧", pinguin: "🐧", aap: "🐵", gorilla: "🦍",
  panda: "🐼", beer: "🐻", ijsbeer: "🐻‍❄️", wolf: "🐺", vos: "🦊", konijn: "🐰",
  hamster: "🐹", muis: "🐭", egel: "🦔", eekhoorn: "🐿️", paard: "🐴", zebra: "🦓",
  giraf: "🦒", nijlpaard: "🦛", neushoorn: "🦏", koe: "🐮", varken: "🐷",
  schaap: "🐑", geit: "🐐", kip: "🐔", eend: "🦆", zwaan: "🦢", flamingo: "🦩",
  krokodil: "🐊", schildpad: "🐢", slang: "🐍", hagedis: "🦎", dino: "🦖",
  kikker: "🐸", octopus: "🐙", krab: "🦀", kwal: "🪼", zeehond: "🦭",
  vlinder: "🦋", bij: "🐝", spin: "🕷️", mier: "🐜", slak: "🐌",
  lieveheersbeestje: "🐞", kameel: "🐫", lama: "🦙", kangoeroe: "🦘",
  koala: "🐨", luiaard: "🦥", stokstaartje: "🦦", otter: "🦦", vleermuis: "🦇",
};

function dierEmoji(naam) {
  return DIER_EMOJI[String(naam).toLowerCase().trim()] || "🐾";
}

function esc(s) {
  return String(s ?? "").replace(/[&<>"']/g, c => (
    { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]
  ));
}

function hoofdletter(s) {
  s = String(s || "").trim();
  return s.charAt(0).toUpperCase() + s.slice(1);
}

function datumTekst(iso) {
  if (!iso) return "";
  const maanden = ["januari", "februari", "maart", "april", "mei", "juni",
    "juli", "augustus", "september", "oktober", "november", "december"];
  const [j, m, d] = iso.split("-").map(Number);
  if (!j || !m || !d) return iso;
  return `${d} ${maanden[m - 1]} ${j}`;
}

function youtubeId(url) {
  const m = String(url || "").match(
    /(?:youtube\.com\/(?:watch\?.*v=|embed\/|shorts\/)|youtu\.be\/)([\w-]{6,})/
  );
  return m ? m[1] : null;
}

async function laadItems() {
  const r = await fetch("data/items.json", { cache: "no-cache" });
  if (!r.ok) throw new Error("Kan data/items.json niet laden");
  const data = await r.json();
  const items = (data.items || []).slice();
  items.sort((a, b) => String(b.datum || "").localeCompare(String(a.datum || "")));
  return items;
}

function kaartHtml(item) {
  const type = TYPES[item.type] || TYPES.weetje;
  let media = "";

  if (item.afbeelding) {
    media = `<img class="item-foto" src="${esc(item.afbeelding)}" alt="${esc(item.titel)}"
      loading="lazy" onerror="this.remove()">`;
  }
  const vid = youtubeId(item.video);
  if (vid) {
    media += `<div class="video-wrap"><iframe
      src="https://www.youtube-nocookie.com/embed/${esc(vid)}"
      title="${esc(item.titel)}" allowfullscreen
      allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"></iframe></div>`;
  }

  const chips = (item.dieren || []).map(d =>
    `<a class="dier-chip" href="dier.html?dier=${encodeURIComponent(String(d).toLowerCase().trim())}">
      ${dierEmoji(d)} ${esc(hoofdletter(d))}</a>`
  ).join("");

  return `<article class="kaart type-${esc(item.type)}">
    <span class="badge">${type.emoji} ${esc(type.enkel)}</span>
    <h3>${esc(item.titel)}</h3>
    ${item.tekst ? `<p class="tekst">${esc(item.tekst)}</p>` : `<div class="tekst"></div>`}
    ${media}
    <div class="voet">${chips}<span class="datum">${esc(datumTekst(item.datum))}</span></div>
  </article>`;
}

function toonKaarten(el, items, legeTekst) {
  if (!items.length) {
    el.innerHTML = `<div class="leeg">🐾 ${esc(legeTekst || "Nog niets te zien hier… kom snel terug!")}</div>`;
    el.classList.remove("kaarten");
    return;
  }
  el.classList.add("kaarten");
  el.innerHTML = items.map(kaartHtml).join("");
}

/* Verzamelt alle dieren uit de items, met aantal items per dier. */
function verzamelDieren(items) {
  const map = new Map();
  for (const item of items) {
    for (const d of item.dieren || []) {
      const key = String(d).toLowerCase().trim();
      if (!key) continue;
      map.set(key, (map.get(key) || 0) + 1);
    }
  }
  return [...map.entries()].sort((a, b) => a[0].localeCompare(b[0], "nl"));
}

/* Zet de juiste navigatieknop op 'actief'. */
function markeerNav() {
  const hier = location.pathname.split("/").pop() || "index.html";
  const zoek = new URLSearchParams(location.search).get("type");
  document.querySelectorAll("nav.hoofdnav a").forEach(a => {
    const url = new URL(a.href);
    const pagina = url.pathname.split("/").pop() || "index.html";
    const type = url.searchParams.get("type");
    if (pagina === hier && type === zoek) a.classList.add("actief");
  });
}

document.addEventListener("DOMContentLoaded", markeerNav);
