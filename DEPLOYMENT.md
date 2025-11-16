# 🚀 Deployment-Anleitung für Äther-Imperium

Diese Anleitung führt dich **Schritt für Schritt** durch das Online-Stellen deines Spiels.

**Zeitaufwand:** Ca. 20-30 Minuten beim ersten Mal

---

## 📋 Was du brauchst

- [ ] GitHub-Account (hast du bereits ✅)
- [ ] Supabase-Account (kostenlos)
- [ ] Netlify-Account (kostenlos)
- [ ] Dein Code auf GitHub (hast du bereits ✅)

---

## Teil 1: Supabase-Projekt einrichten

### Schritt 1: Supabase-Account erstellen

1. Gehe zu: https://supabase.com
2. Klicke auf **"Start your project"** (grüner Button oben rechts)
3. Melde dich mit deinem **GitHub-Account** an (einfachste Methode)
4. Bestätige deine E-Mail-Adresse (Check dein Postfach)

### Schritt 2: Neues Projekt erstellen

1. Nach dem Login siehst du das Supabase Dashboard
2. Klicke auf **"New Project"** (grüner Button)
3. Fülle die Felder aus:
   - **Name:** `aether-imperium` (oder ein Name deiner Wahl)
   - **Database Password:** Wähle ein **sicheres Passwort** (speichere es!)
     - ⚠️ **WICHTIG:** Schreibe das Passwort auf! Du brauchst es später.
   - **Region:** Wähle **"Europe West (Ireland)"** (am nächsten zu Deutschland)
   - **Pricing Plan:** Lasse **"Free"** ausgewählt
4. Klicke auf **"Create new project"**
5. ⏳ Warte 2-3 Minuten (Supabase erstellt deine Datenbank)

### Schritt 3: API-Keys kopieren

1. Wenn das Projekt fertig ist, klicke links auf **⚙️ Settings** (ganz unten)
2. Klicke auf **"API"** im Menü
3. Du siehst jetzt zwei wichtige Werte:

   **a) Project URL** (sieht aus wie: `https://abcdefgh.supabase.co`)
   - Klicke auf das Kopier-Symbol 📋
   - Speichere ihn in einer Textdatei (z.B. Notepad)
   - Benenne ihn: `SUPABASE_URL`

   **b) anon public** (langer Text unter "Project API keys")
   - Scrolle nach unten zu "Project API keys"
   - Finde den Key bei **"anon" "public"**
   - Klicke auf das Kopier-Symbol 📋
   - Speichere ihn in deiner Textdatei
   - Benenne ihn: `SUPABASE_ANON_KEY`

4. Deine Textdatei sollte jetzt so aussehen:
   ```
   SUPABASE_URL=https://abcdefgh.supabase.co
   SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
   ```

### Schritt 4: Datenbank-Tabellen erstellen

1. Klicke links im Menü auf **"SQL Editor"** (Symbol: </> )
2. Klicke auf **"+ New query"**
3. Öffne auf deinem Computer die Datei:
   - `supabase/migrations/001_initial_schema.sql`
4. Kopiere den **kompletten Inhalt** dieser Datei
5. Füge ihn in den SQL Editor bei Supabase ein
6. Klicke unten rechts auf **"Run"** (▶️ Play-Button)
7. ✅ Du solltest sehen: **"Success. No rows returned"**

8. **Wiederhole Schritte 2-7** für diese Dateien (in dieser Reihenfolge!):
   - `supabase/migrations/002_settlements_military_foundation.sql`
   - `supabase/migrations/003_settlement_buildings.sql`
   - `supabase/migrations/004_enable_settlements_realtime.sql`
   - `supabase/migrations/005_shipyard_queue_extension.sql`

### Schritt 5: Realtime aktivieren

1. Klicke links auf **"Database"** → **"Replication"**
2. Scrolle nach unten zu **"supabase_realtime publication"**
3. Aktiviere folgende Tabellen (Checkboxen anklicken):
   - ✅ `players`
   - ✅ `settlements`
   - ✅ `settlement_buildings`
   - ✅ `shipyard_queue`
   - ✅ `messages`
   - ✅ `convoys`
   - ✅ `tiles`
4. Klicke auf **"Save"**

### Schritt 6: Welt-Daten einfügen (Regionen & Tiles)

1. Klicke wieder auf **"SQL Editor"**
2. Klicke auf **"+ New query"**
3. Füge folgenden Code ein:

```sql
-- Erstelle die 19 Regionen (Macro-Level)
INSERT INTO regions (id, name, rq, rr) VALUES
  ('reg-0-0', 'Zentral-Sektor', 0, 0),
  ('reg-1-0', 'Östlicher Sektor', 1, 0),
  ('reg-0-1', 'Südlicher Sektor', 0, 1),
  ('reg--1-0', 'Westlicher Sektor', -1, 0),
  ('reg-0--1', 'Nördlicher Sektor', 0, -1),
  ('reg-1--1', 'Nordost-Sektor', 1, -1),
  ('reg-1-1', 'Südost-Sektor', 1, 1),
  ('reg--1-1', 'Südwest-Sektor', -1, 1),
  ('reg--1--1', 'Nordwest-Sektor', -1, -1),
  ('reg-2-0', 'Äußerer Ost', 2, 0),
  ('reg-0-2', 'Äußerer Süd', 0, 2),
  ('reg--2-0', 'Äußerer West', -2, 0),
  ('reg-0--2', 'Äußerer Nord', 0, -2),
  ('reg-2--1', 'Nordost-Rand', 2, -1),
  ('reg-1-2', 'Südost-Rand', 1, 2),
  ('reg--1-2', 'Südwest-Rand', -1, 2),
  ('reg--2-1', 'Westrand', -2, 1),
  ('reg-2--2', 'Nordrand', 2, -2),
  ('reg--2--2', 'Nordwest-Rand', -2, -2);

-- Bestätige dass 19 Regionen existieren
SELECT COUNT(*) as region_count FROM regions;
```

4. Klicke auf **"Run"**
5. ✅ Du solltest sehen: `region_count: 19`

**Hinweis:** Die einzelnen Tiles (3000+) werden später automatisch beim ersten Login generiert.

---

## Teil 2: Netlify einrichten

### Schritt 1: Netlify-Account erstellen

1. Gehe zu: https://netlify.com
2. Klicke auf **"Sign up"** (oben rechts)
3. Wähle **"Sign up with GitHub"**
4. Autorisiere Netlify (Klicke auf "Authorize Netlify")

### Schritt 2: Projekt mit GitHub verbinden

1. Im Netlify Dashboard klicke auf **"Add new site"** → **"Import an existing project"**
2. Wähle **"Deploy with GitHub"**
3. Suche dein Repository: **"SteampunkStories15"**
4. Klicke darauf

### Schritt 3: Build-Einstellungen konfigurieren

1. Du siehst jetzt "Site settings for SteampunkStories15"
2. **Lasse alles so wie es ist** - Netlify erkennt automatisch die `netlify.toml`
3. Du solltest sehen:
   - **Branch to deploy:** `main` (oder dein Hauptbranch)
   - **Build command:** `npm run build` (wird aus netlify.toml gelesen)
   - **Publish directory:** `dist` (wird aus netlify.toml gelesen)

### Schritt 4: Environment Variables hinzufügen

1. Scrolle nach unten zu **"Environment variables"**
2. Klicke auf **"Add environment variables"** → **"Add a single variable"**
3. Füge **drei Variables** hinzu (einzeln):

   **Variable 1:**
   - **Key:** `VITE_SUPABASE_URL`
   - **Value:** (Deine Supabase URL von vorhin)
   - Klicke **"Create variable"**

   **Variable 2:**
   - **Key:** `VITE_SUPABASE_ANON_KEY`
   - **Value:** (Dein Supabase Anon Key von vorhin)
   - Klicke **"Create variable"**

   **Variable 3:**
   - **Key:** `VITE_WORLD_ID`
   - **Value:** `playtest-world`
   - Klicke **"Create variable"**

4. Prüfe dass alle 3 Variables angezeigt werden

### Schritt 5: Deployment starten

1. Klicke unten auf **"Deploy [dein-site-name]"**
2. ⏳ Warte 2-5 Minuten
3. Du siehst den Build-Fortschritt (Logs scrollen vorbei)
4. ✅ Wenn alles klappt: **"Site is live"** (grüner Badge)

### Schritt 6: Seite öffnen

1. Oben siehst du die URL (z.B. `https://random-name-123456.netlify.app`)
2. Klicke darauf → **Dein Spiel ist online! 🎉**

---

## Teil 3: Nach dem Deployment

### Test-Account erstellen

1. Öffne deine Live-Seite
2. Klicke auf **"Neuer Account"** (falls vorhanden) oder registriere dich
3. Gib einen Benutzernamen und Passwort ein
4. Logge dich ein
5. ✅ Du solltest das Dashboard sehen

### Automatische Updates einrichten

**Gute Nachricht:** Das ist bereits aktiv! 🎉

Jedes Mal wenn du Code pushst:
1. Netlify erkennt den neuen Commit automatisch
2. Startet einen neuen Build
3. Deployed die neue Version (nach ca. 2-5 Minuten)

Du musst **nichts manuell machen** - einfach `git push` und warten!

---

## 🔧 Troubleshooting

### Problem: "Build failed"

**Lösung:**
1. Klicke im Netlify Dashboard auf **"Deploys"**
2. Klicke auf den fehlgeschlagenen Deploy
3. Scrolle zu den Logs
4. Suche nach **"error"** (rot markiert)
5. Häufige Fehler:
   - **Missing dependencies:** Führe lokal `npm install` aus und committe `package-lock.json`
   - **TypeScript errors:** Führe `npm run typecheck` lokal aus und behebe Fehler
   - **Build errors:** Führe `npm run build` lokal aus

### Problem: "Weiße Seite" nach Deployment

**Lösung:**
1. Öffne Browser-Console (F12)
2. Schaue nach Fehlern
3. Häufig: Environment Variables fehlen
   - Gehe zu Netlify → Site settings → Environment variables
   - Prüfe ob alle 3 Variables existieren
   - Wenn nicht: Füge sie hinzu (siehe Teil 2, Schritt 4)
   - Klicke dann auf **"Deploys"** → **"Trigger deploy"** → **"Clear cache and deploy site"**

### Problem: "Failed to fetch" beim Login

**Lösung:**
- Prüfe ob die Supabase-URL korrekt ist (ohne trailing slash `/`)
- Gehe zu Supabase → Settings → API
- Vergleiche die URL mit deiner Environment Variable
- Bei Unterschied: Korrigiere in Netlify → Environment variables

### Problem: Keine Regionen auf der Karte

**Lösung:**
1. Gehe zu Supabase → SQL Editor
2. Führe aus: `SELECT COUNT(*) FROM regions;`
3. Wenn `0`: Führe die SQL-Befehle aus Teil 1, Schritt 6 nochmal aus

---

## 🎯 Checkliste: Ist alles bereit?

- [ ] Supabase-Projekt erstellt
- [ ] Alle 5 Migrations ausgeführt
- [ ] Realtime aktiviert für alle Tabellen
- [ ] 19 Regionen in Datenbank eingefügt
- [ ] Netlify-Account erstellt
- [ ] GitHub-Repo mit Netlify verbunden
- [ ] 3 Environment Variables gesetzt
- [ ] Deployment erfolgreich (grüner Badge)
- [ ] Seite öffnet sich
- [ ] Login funktioniert
- [ ] Karte zeigt Regionen

---

## 📞 Hilfe benötigt?

Wenn etwas nicht funktioniert:
1. Prüfe die Netlify Build-Logs
2. Prüfe die Browser-Console (F12)
3. Prüfe die Supabase-Logs (Supabase → Logs)
4. Erstelle ein GitHub Issue mit Screenshots

---

## 🚀 Nächste Schritte (Optional)

### Custom Domain einrichten

1. Netlify Dashboard → **"Domain settings"**
2. **"Add custom domain"**
3. Gib deine Domain ein (z.B. `aether-imperium.de`)
4. Folge den DNS-Anweisungen von Netlify
5. ✅ Nach 24-48h ist deine Domain aktiv

### Analytics aktivieren

1. Netlify Dashboard → **"Analytics"** (linkes Menü)
2. **"Enable Analytics"** (kostenlose Version reicht)
3. Sehe Besucherzahlen, Page Views, etc.

### Performance optimieren

1. Aktiviere **Netlify Image Optimization** (Settings → Build & deploy → Post processing)
2. Aktiviere **Asset Optimization** (automatisches Minify)
3. Aktiviere **Prerendering** für bessere SEO

---

**Geschafft! Dein Spiel ist online! 🎉**

Bei Fragen: Öffne ein GitHub Issue oder frage in Discord/Community.
