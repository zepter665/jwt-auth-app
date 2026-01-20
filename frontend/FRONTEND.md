# Frontend Development

Das Vue.js Frontend ist nun verfügbar unter: **http://localhost:3000**

## 🚀 Wie starten?

```bash
cd frontend
npm run dev
```

## 🌟 Features

- **🎨 Moderne UI**: Responsive Design mit Vue 3
- **🔍 Live-Suche**: Suche nach Tischtennisspielern in Echtzeit
- **📱 Mobile-friendly**: Funktioniert auf Desktop und Mobil
- **📄 Pagination**: Navigation durch mehrere Seiten
- **⚡ Schnell**: Vite als Build-Tool für optimale Performance
- **🛠️ Entwicklerfreundlich**: Hot-Reload während der Entwicklung

## 🎯 Bedienung

1. **Suchbegriff eingeben** (mindestens 3 Zeichen)
2. **Enter drücken** oder auf "Suchen" klicken
3. **Ergebnisse durchblättern** mit Pagination
4. **Anzahl Ergebnisse** pro Seite anpassen

## ⚠️ Bekannte Einschränkungen

- **CORS-Probleme**: Die API blockiert möglicherweise Direct Browser Requests
- **Rate Limits**: 90 Requests pro Stunde
- **SSL-Zertifikat**: Möglicherweise Warnungen im Browser

## 🔧 Troubleshooting

Falls die API nicht funktioniert, liegt es vermutlich an CORS. Alternative Lösungen:
1. **Browser CORS** temporär deaktivieren
2. **Backend Proxy Server** erstellen
3. **Browser Extension** für CORS verwenden