# 🔐 Authentifizierung für TTR-Werte

Die TTR-Funktionalität ist jetzt vollständig implementiert mit Cookie-basierter Authentifizierung!

## 🚀 **Setup (3 Schritte)**

### 1. **Proxy-Server starten** (Port 3001)
```bash
cd proxy-server
node index.js
```

### 2. **Frontend starten** (Port 3000)  
```bash
cd frontend
npm run dev
```

### 3. **Browser öffnen**
👉 **http://localhost:3000**

## 🔧 **So funktioniert es:**

### **Backend-Proxy (Port 3001)**
- ✅ **Cookie-Authentifizierung** mit myTischtennis.de
- ✅ **CORS-Problem gelöst** (Proxy zwischen Frontend und API)
- ✅ **SSL-Handling** für API-Zugriff
- ✅ **Error-Management** und Logging

### **Frontend (Port 3000)**
- ✅ **Login-Komponente** für myTischtennis.de Zugangsdaten
- ✅ **Automatische Auth-Prüfung** beim Start
- ✅ **TTR-Checkbox** nur bei erfolgreicher Anmeldung
- ✅ **Live TTR-Werte** direkt aus der API

## 📡 **API-Architektur:**

```
Frontend (Vue.js) ←→ Proxy-Server ←→ myTischtennis.de API
http://localhost:3000   http://localhost:3001   https://www.mytischtennis.de
```

## 🎯 **Verwendung:**

1. **Frontend öffnen**: http://localhost:3000
2. **Mit myTischtennis.de anmelden**: E-Mail + Passwort eingeben
3. **TTR-Checkbox aktivieren**: "TTR-Werte abrufen" anhaken  
4. **Spieler suchen**: Wie gewohnt nach Namen suchen
5. **Echte TTR-Werte**: Werden live aus der API geladen

## ⚠️ **Wichtige Hinweise:**

- **Zugangsdaten**: Benötigen Sie einen myTischtennis.de Account
- **Rate Limits**: TTR-Abfragen zählen zu den 90 Requests/Stunde
- **Cookies**: Werden im Proxy-Server temporär gespeichert
- **Sicherheit**: Zugangsdaten werden nicht im Frontend gespeichert

## 🔍 **Verfügbare Endpunkte:**

### **Öffentlich:**
- `POST /api/search/players` - Spielersuche

### **Authentifiziert:**
- `GET /api/ttr/player/:nuid` - Aktueller TTR-Wert
- `GET /api/ttr/history/:nuid` - TTR-Historie
- `POST /api/auth/login` - Anmeldung
- `POST /api/auth/logout` - Abmeldung
- `GET /api/auth/status` - Auth-Status

## 🎉 **Jetzt verfügbar:**
- ✅ **Echte TTR-Werte** statt "N/A"
- ✅ **Sichere Authentifizierung** 
- ✅ **CORS-freie API-Calls**
- ✅ **Professionelle Architektur**