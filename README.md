# 🏓 MyTischtennis Spielersuche

Eine Node.js-CLI-Anwendung zur Suche nach Tischtennisspielern über die inoffizielle myTischtennis.de API.

## 🚀 Features

- **Spielersuche**: Suche nach Namen von Tischtennisspielern
- **Pagination**: Navigiere durch mehrere Seiten von Suchergebnissen  
- **Detaillierte Infos**: Zeigt Namen, NUID, Verein, TTR-Werte und Lizenzen
- **Rate Limit Handling**: Automatische Behandlung von API-Limits
- **Benutzerfreundlich**: Intuitive CLI mit Emojis und Farbgebung

## 📋 Voraussetzungen

- Node.js (Version 16 oder höher)
- npm

## ⚡ Installation

```bash
# Repository klonen oder Dateien herunterladen
cd mytischtennis-player-search

# Dependencies installieren
npm install
```

## 🎯 Verwendung

### Grundlegende Suche
```bash
node index.js "Müller"
```

### Mit Optionen
```bash
# Bestimmte Seitengröße
node index.js "Schmidt" --pagesize 20

# Bestimmte Seite
node index.js "Müller" --page 2

# Kombiniert
node index.js "Weber" --pagesize 15 --page 3
```

### NPM Scripts verwenden
```bash
npm start "Spielername"
```

### Hilfe anzeigen
```bash
node index.js --help
```

## 📚 Optionen

| Option | Kurz | Beschreibung | Standard |
|--------|------|-------------|----------|
| `--help` | `-h` | Zeigt die Hilfe an | - |
| `--page` | `-p` | Seitennummer für Pagination | 1 |
| `--pagesize` | `-s` | Anzahl Ergebnisse pro Seite | 10 |

## 💡 Beispiele

### Einfache Suche
```bash
$ node index.js "Müller"
🔍 Suche nach "Müller"...

🏓 Gefundene Spieler (100 insgesamt, Seite 1/10):
════════════════════════════════════════════════════════════════════════════════
1. Jan-Luka Müller
   🆔 NUID: NU590250
   🏛️  Verein: TV Frischborn 1912
   ⭐ TTR: N/A
   📋 Lizenz: TV Frischborn 1912 (24016)
──────────────────────────────────────────────────
...
```

### Mit Pagination
```bash
$ node index.js "Schmidt" --page 2 --pagesize 5
🔍 Suche nach "Schmidt"...

🏓 Gefundene Spieler (100 insgesamt, Seite 2/20):
════════════════════════════════════════════════════════════════════════════════
6. Andreas Schmidt
   🆔 NUID: NU123456
   🏛️  Verein: TTC Berlin
   ⭐ TTR: 1850
...
```

## ⚠️ Einschränkungen

- **Rate Limit**: 90 Requests pro Stunde (API-seitige Beschränkung)
- **Mindestlänge**: Suchbegriff muss mindestens 3 Zeichen haben
- **TTR-Werte**: Oft nicht verfügbar (API-Limitation)
- **Inoffizielle API**: Keine Garantie für Verfügbarkeit

## 🔧 Technische Details

- **HTTP-Client**: Axios
- **SSL-Handling**: Deaktivierte Zertifikatsprüfung für API-Kompatibilität  
- **Error Handling**: Umfassende Fehlerbehandlung
- **ES Modules**: Moderne JavaScript-Syntax

## 📖 API-Quelle

Diese App nutzt die inoffizielle myTischtennis.de API:
- **Dokumentation**: [https://notmycupofteetee.github.io/mytt-api/](https://notmycupofteetee.github.io/mytt-api/)
- **Repository**: [https://github.com/notMYcupofTeeTee/mytt-api](https://github.com/notMYcupofTeeTee/mytt-api)

## ⚖️ Disclaimer

- Diese App steht in keiner Verbindung zum DTTB oder myTischtennis.de
- Die Nutzung erfolgt auf eigene Verantwortung
- Bitte respektieren Sie die Nutzungsbedingungen von myTischtennis.de

## 🐛 Troubleshooting

### "Rate Limit erreicht"
- Warten Sie eine Stunde vor dem nächsten Request
- Die API erlaubt nur 90 Requests pro Stunde

### "Keine Antwort vom Server"  
- Überprüfen Sie Ihre Internetverbindung
- Die myTischtennis.de Server könnten temporär nicht verfügbar sein

### "Suchbegriff zu kurz"
- Verwenden Sie mindestens 3 Zeichen für die Suche

## 📝 Lizenz

MIT License - Siehe API-Dokumentation für weitere Details.