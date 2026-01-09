# Testovací Protokol - ZÁBER Pro (Beta)

Tento dokument slúži ako manuál pre QA testovanie Android APK verzie aplikácie ZÁBER.

## 📋 1. Príprava pred testom (Pre-requisites)
*   **Zariadenie:** Android telefón s funkčným GPS a Kamerou.
*   **Povolenia:** Aplikácia musí mať povolený prístup k Pologe (Location - "While using the app") a Kamere/Súborom.
*   **Sieť:** Aktívne pripojenie na internet (Wifi/4G).

---

## 🧪 2. Testovacie Scenáre (Test Cases)

### TC-01: Registrácia a Prvý Vstup
**Cieľ:** Overiť, či sa nový používateľ dokáže zaregistrovať a či sa vytvorí záznam vo Firestore.
1. Spustite aplikáciu.
2. Prepnite prepínač na **"Registrácia"**.
3. Zadajte Meno: `Tester Beta`, Email: `tester@zaber.sk` (alebo vlastný), Heslo: `password123`.
4. Kliknite na **"Vytvoriť denník"**.
5. **Očakávaný výsledok:**
    *   Zobrazí sa modal "Skúšobná prevádzka (Beta Notice)".
    *   Po zatvorení modalu ste na Domovskej obrazovke.
    *   V hlavičke vidíte svoje meno a avatar.

### TC-02: GPS Lokalizácia a Počasie
**Cieľ:** Overiť integráciu Geolocation API a Gemini AI pre počasie.
1. Na Domovskej obrazovke skontrolujte text pod menom.
2. **Očakávaný výsledok:**
    *   Aplikácia si vyžiada povolenie na polohu (ak nebolo udelené).
    *   Text sa zmení z "Lokalizujem..." na názov najbližšieho revíru (napr. "VN Kráľová" alebo "Dunaj č.3") alebo "Aktuálna poloha".
    *   Widget "Prognóza aktivity" zobrazí čísla pre Tlak, Teplotu a Vietor (nie nuly).

### TC-03: Pridanie Úlovku (Core Feature)
**Cieľ:** Overiť flow pridania záznamu, kompresiu obrázkov a ukladanie.
1. Kliknite na stredné tlačidlo **"+" (Pridať)** v spodnej lište.
2. Kliknite na **ikonu Kamery** a vyfotte (alebo vyberte z galérie) fotku ryby.
3. Sledujte obrazovku - mala by sa objaviť animácia "Analyzujem biológiu...".
4. **Očakávaný výsledok AI:**
    *   Druh ryby sa automaticky vyplní (napr. "Kapor obyčajný").
    *   Ak AI nerozpozná rybu, vypíše chybovú hlášku.
5. Doplňte Dĺžku (napr. 55) a Váhu (napr. 4.5).
6. Kliknite na **"Miesto lovu"** -> vyberte revír zo zoznamu alebo cez Mapu.
7. Kliknite na **"Potvrdiť Zápis"**.
8. **Očakávaný výsledok:** Zobrazí sa zelená obrazovka "Zaznamenané". Úlovok je viditeľný v tabe "Úlovky".

### TC-04: AI Ichtyológ - Stratégia
**Cieľ:** Overiť volanie Gemini API pre generovanie textu.
1. Kliknite na **"AI Ichtyológ"** na domovskej obrazovke.
2. Uistite sa, že je aktívny tab **"Stratégia"**.
3. Vyberte rybu (napr. "Zubáč veľkoústy").
4. Kliknite na **"Pripraviť stratégiu"**.
5. **Očakávaný výsledok:** Po chvíli "premýšľania" sa zobrazí text s taktikou lovu pre aktuálne počasie.

### TC-05: AI Ichtyológ - Diagnostika (Health)
**Cieľ:** Overiť analýzu obrazu pre choroby rýb.
1. V AI Ichtyológovi prepnite na tab **"Zdravie"**.
2. Nahrajte fotku ryby.
3. Kliknite na **"Spustiť rozbor vzorky"**.
4. **Očakávaný výsledok:** Zobrazí sa karta s výsledkom (Zdravá/Chorá) a odporúčaním.

### TC-06: Eko Monitoring
**Cieľ:** Overiť nahlasovanie environmentálnych aktivít.
1. Na Domovskej obrazovke kliknite na kartu **"Eko-Misia"**.
2. Vyberte misiu, napr. **"Strážca Pobrežia"**.
3. Odfoťte "upratané miesto" (stačí akákoľvek testovacia fotka).
4. Napíšte krátky popis "Test upratovania".
5. Kliknite **"Odoslať inšpektorovi"**.
6. **Očakávaný výsledok:** Hlásenie sa odošle a zobrazí sa potvrdenie. Body sa zatiaľ nepripočítajú (čakajú na schválenie Adminom).

### TC-07: Profil a Rebríčky
1. Prejdite na tab **"Rebríčky"**.
2. Skontrolujte, či vidíte zoznam používateľov.
3. Kliknite na **"Komunita"** -> Skúste vyhľadať iného používateľa.
4. Prejdite na svoj **Profil** (cez domovskú obrazovku vľavo hore).
5. Skontrolujte, či sú tam vaše úlovky.

---

## 🐛 Známe limitácie (Beta)
*   Ak je GPS signál slabý (interiér), lokalizácia môže trvať dlhšie alebo zlyhať -> aplikácia vyzve na manuálny výber revíru.
*   AI analýza fotiek vyžaduje pripojenie na internet.
*   Notifikácie zatiaľ fungujú len v rámci aplikácie (nie Push notifikácie na pozadí).
