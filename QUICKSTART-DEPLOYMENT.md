# ⚡ Quick Start: Spiel Online Bringen (15 Minuten)

**Für alle die es eilig haben - die absolute Kurzfassung!**

---

## 1️⃣ Supabase (5 Minuten)

1. https://supabase.com → Sign up mit GitHub
2. **New Project** → Name: `aether-imperium` → Region: Europe → Create
3. ⚙️ **Settings** → **API** → Kopiere:
   - `Project URL`
   - `anon public` Key
4. **SQL Editor** → Führe nacheinander alle `.sql` Dateien aus `supabase/migrations/` aus
5. **Database** → **Replication** → Aktiviere alle Tabellen

---

## 2️⃣ Netlify (5 Minuten)

1. https://netlify.com → Sign up mit GitHub
2. **Add new site** → **Import from GitHub** → Wähle `SteampunkStories15`
3. **Environment variables** → Füge hinzu:
   ```
   VITE_SUPABASE_URL = <deine-supabase-url>
   VITE_SUPABASE_ANON_KEY = <dein-anon-key>
   VITE_WORLD_ID = playtest-world
   ```
4. **Deploy site**
5. ⏳ Warte 3 Minuten → ✅ Fertig!

---

## 3️⃣ Testen (2 Minuten)

1. Öffne deine Netlify-URL (z.B. `https....netlify.app`)
2. Registriere einen Account
3. Logge dich ein
4. 🎉 **Spiel läuft!**

---

## 📖 Detaillierte Anleitung

Brauchst du mehr Hilfe? Siehe **DEPLOYMENT.md** für Schritt-für-Schritt mit Screenshots-Beschreibungen!

---

## 🔄 Updates veröffentlichen

Ab jetzt ist es **automatisch**:

```bash
git add .
git commit -m "Neue Features"
git push
```

→ Netlify deployed automatisch in 2-5 Minuten! ✅
