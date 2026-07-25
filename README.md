# 🦁 Laurens' dieren weetjes

Een vrolijke website vol dierenweetjes, nieuws, vragen, video's en foto's —
voor en door kinderen van 8 tot 10 jaar. De site is helemaal statisch en kan
dus **gratis** gehost worden op GitHub Pages.

## Hoe zit de site in elkaar?

| Bestand | Wat is het? |
|---|---|
| `index.html` | De homepagina met de nieuwste items per soort |
| `categorie.html` | Alle items van één soort (weetjes, nieuws, vragen, video's of foto's) |
| `dieren.html` | Overzicht van alle dieren |
| `dier.html` | Alle items over één dier |
| `admin.html` | De beheerpagina (inloggen + items toevoegen/verwijderen) |
| `data/items.json` | Hier staan alle items in — dit bestand wordt door de beheerpagina aangepast |
| `fotos/` | Geüploade foto's komen hier terecht (map wordt vanzelf aangemaakt) |

Er is geen server: de beheerpagina slaat items op door `data/items.json`
rechtstreeks in de GitHub-repository aan te passen via de GitHub API.

## De site online zetten (eenmalig, ± 10 minuten)

1. **Maak een GitHub-account** (gratis) op [github.com](https://github.com) als je die nog niet hebt.
2. **Maak een nieuwe repository**: klik rechtsboven op **+** → *New repository*.
   - Naam: bijvoorbeeld `laurens-dieren-weetjes`
   - Zet hem op **Public** (verplicht voor gratis GitHub Pages)
   - Klik op *Create repository*
3. **Upload alle bestanden uit deze map**: klik in de repository op
   *uploading an existing file*, sleep álle bestanden en mappen erin
   (inclusief de mappen `css`, `js` en `data`) en klik op *Commit changes*.
   > Let op: slepen van mappen werkt het makkelijkst via de browser vanuit de Verkenner.
4. **Zet GitHub Pages aan**: ga naar *Settings* → *Pages*.
   - Bij *Source*: kies **Deploy from a branch**
   - Bij *Branch*: kies **main** en map **/ (root)**, klik *Save*
5. Na 1-2 minuten staat de site live op:
   `https://JOUW-GEBRUIKERSNAAM.github.io/laurens-dieren-weetjes/`

## Een toegangssleutel maken voor de beheerpagina

De beheerder logt op `admin.html` in met een **fine-grained personal access
token**. Zo maak je die:

1. Log in op GitHub en ga naar
   **Settings → Developer settings → Personal access tokens → Fine-grained tokens**
   (of ga direct naar <https://github.com/settings/personal-access-tokens/new>).
2. Vul in:
   - **Token name**: bijv. `dieren-weetjes-beheer`
   - **Expiration**: bijv. 1 jaar (na afloop maak je gewoon een nieuwe)
   - **Repository access**: *Only select repositories* → kies je dieren-weetjes-repository
   - **Permissions** → *Repository permissions* → **Contents**: zet op **Read and write**
3. Klik op *Generate token* en **kopieer de sleutel meteen** (hij begint met
   `github_pat_`). Je krijgt hem maar één keer te zien.
4. Ga naar `https://…github.io/…/admin.html`, vul je gebruikersnaam, de naam
   van de repository en de sleutel in, en klik op **Inloggen**.

⚠️ **Belangrijk over de sleutel:**
- De sleutel wordt alleen in de browser op je eigen computer bewaard.
- Deel de sleutel met niemand en zet hem nooit in een bestand op de site.
- Gebruik de beheerpagina alleen op je eigen computer, niet op een schoolcomputer.
- Kwijt of gelekt? Verwijder de token op GitHub en maak een nieuwe.

## Items toevoegen

1. Ga naar `admin.html` en log in.
2. Kies het soort item (weetje, nieuws, vraag, video of foto), vul een titel
   en tekst in, en typ de dieren waar het over gaat (met komma's ertussen).
3. Bij een video: plak de YouTube-link. Bij een foto: upload een bestand of
   plak een link.
4. Klik op **Opslaan op de site** 🚀

Elk dier dat je invult krijgt automatisch een eigen pagina en verschijnt in
het dierenoverzicht. Het duurt na het opslaan **1 tot 10 minuten** voordat de
wijziging op de site zichtbaar is (GitHub moet de site opnieuw publiceren).

## Lokaal bekijken (op je eigen computer)

De site laadt `data/items.json` via JavaScript en werkt daarom niet als je
`index.html` dubbelklikt. Start een mini-servertje in deze map:

```bash
npx -y http-server -p 8123 -c-1
```

(of, als je Python hebt: `python -m http.server 8123`)

en open dan <http://localhost:8123> in je browser.
