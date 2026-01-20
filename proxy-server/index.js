import express from 'express'
import cors from 'cors'
import axios from 'axios'
import cookieParser from 'cookie-parser'
import https from 'https'
import dotenv from 'dotenv'

// .env-Datei laden
dotenv.config()

const app = express()
const PORT = 3001

// JWT Token aus Environment Variable oder .env-Datei
const JWT_TOKEN = process.env.MYTISCHTENNIS_JWT || ''
if (!JWT_TOKEN) {
  console.warn('⚠️  Warnung: MYTISCHTENNIS_JWT Environment-Variable nicht gesetzt')
  console.warn('   Setzen Sie Ihren JWT-Token in die .env-Datei: MYTISCHTENNIS_JWT=ihr_token_hier')
} else {
  console.log('✅ JWT-Token aus .env-Datei geladen')
}

// Middleware
app.use(cors({
  origin: 'http://localhost:5173',
  credentials: true
}))
app.use(express.json())
app.use(express.urlencoded({ extended: true }))
app.use(cookieParser())

// HTTPS Agent mit deaktivierter SSL-Verifikation
const httpsAgent = new https.Agent({
  rejectUnauthorized: false
})

// Axios-Instance für myTischtennis.de API
const apiClient = axios.create({
  baseURL: 'https://www.mytischtennis.de',
  headers: {
    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
    'Accept': 'application/json, text/plain, */*',
    'Accept-Language': 'de-DE,de;q=0.9,en;q=0.8',
    'Origin': 'https://www.mytischtennis.de',
    'Referer': 'https://www.mytischtennis.de/'
  },
  timeout: 10000,
  httpsAgent,
  withCredentials: true
})

// Route: Spielersuche (öffentlich)
app.post('/api/search/players', async (req, res) => {
  try {
    const { query, page = 1, pagesize = 10 } = req.body

    if (!query || query.length < 3) {
      return res.status(400).json({ 
        error: 'Der Suchbegriff muss mindestens 3 Zeichen lang sein.' 
      })
    }

    const params = new URLSearchParams()
    params.append('query', query)
    params.append('page', page.toString())
    params.append('pagesize', pagesize.toString())

    console.log(`🔍 Spielersuche: "${query}" (Seite ${page}, Größe ${pagesize})`)

    const response = await apiClient.post('/api/search/players', params, {
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded'
      }
    })

    res.json(response.data)
  } catch (error) {
    console.error('Spielersuche Fehler:', error.message)
    res.status(error.response?.status || 500).json({
      error: error.response?.data || error.message
    })
  }
})

// Route: TTR-Wert abrufen (benötigt JWT)
app.get('/api/ttr/player/:nuid', async (req, res) => {
  try {
    const { nuid } = req.params

    if (!JWT_TOKEN) {
      return res.status(401).json({
        error: 'JWT-Token nicht konfiguriert. Setzen Sie MYTISCHTENNIS_JWT Environment-Variable.'
      })
    }

    console.log(`⭐ TTR abrufen für: ${nuid}`)

    const response = await apiClient.get(`/api/ttr/player/${nuid}`, {
      headers: {
        'Cookie': `sb-10-auth-token=${JWT_TOKEN}`
      }
    })

    res.json(response.data)
  } catch (error) {
    console.error(`TTR Fehler für ${req.params.nuid}:`, error.message)
    
    res.status(error.response?.status || 500).json({
      ttr: null,
      error: error.response?.data || error.message
    })
  }
})

// Route: TTR-Historie abrufen (benötigt JWT) 
app.get('/api/ttr/history/:nuid', async (req, res) => {
  try {
    const { nuid } = req.params

    if (!JWT_TOKEN) {
      return res.status(401).json({
        error: 'JWT-Token nicht konfiguriert. Setzen Sie MYTISCHTENNIS_JWT Environment-Variable.'
      })
    }

    console.log(`📈 TTR-Historie abrufen für: ${nuid}`)

    const response = await apiClient.get(`/api/ttr/history/${nuid}`, {
      headers: {
        'Cookie': `sb-10-auth-token=${JWT_TOKEN}`
      }
    })

    res.json(response.data)
  } catch (error) {
    console.error(`TTR-Historie Fehler für ${req.params.nuid}:`, error.message)
    
    res.status(error.response?.status || 500).json({
      error: error.response?.data || error.message
    })
  }
})

// Route: Q-TTR-Wert über Andro-Ranking abrufen
app.get('/api/q-ttr/player/:nuid', async (req, res) => {
  try {
    const { nuid } = req.params

    console.log(`📊 Q-TTR abrufen für: ${nuid}`)

    // Andro-Ranking API verwenden (ohne Auth = nur Q-TTR verfügbar)
    const params = new URLSearchParams({
      '_data': 'routes/$',
      'current-ranking': 'no', // Q-TTR explizit anfordern
      'results-per-page': '500', // Höhere Anzahl für bessere Suchergebnisse
      'page': '1'
    })

    const response = await apiClient.get(`/api/andro-ranking?${params}`)
    
    // Suche nach dem Spieler in der Rangliste
    const data = response.data
    const blockKey = Object.keys(data.blockLoaderData || {})[0]
    
    if (!blockKey || !data.blockLoaderData[blockKey]?.data) {
      return res.json({ 
        qttr: null, 
        error: 'Keine Ranglisten-Daten gefunden',
        debug: { blockKey, hasData: !!data.blockLoaderData }
      })
    }
    
    const players = data.blockLoaderData[blockKey].data
    
    // Suche nach dem Spieler mit der NUID
    const player = players.find(p => p.nuid === nuid || p.internal_id === nuid)
    
    if (player) {
      res.json({ 
        qttr: player.fedRank, // fedRank = Q-TTR
        player: {
          name: `${player.firstname} ${player.lastname}`,
          nuid: player.nuid,
          internal_id: player.internal_id,
          qttr: player.fedRank,
          club: player.club
        },
        source: 'andro-ranking',
        accessLevel: data.userContentAccessLevel
      })
    } else {
      // Spieler nicht in der Standard-Rangliste gefunden
      // Eventuell TTR zu hoch oder zu niedrig
      res.json({ 
        qttr: null, 
        error: 'Spieler nicht in der aktuellen Rangliste gefunden',
        searchedNuid: nuid,
        totalPlayers: players.length,
        accessLevel: data.userContentAccessLevel
      })
    }
  } catch (error) {
    console.error(`Q-TTR Fehler für ${req.params.nuid}:`, error.message)
    
    res.status(error.response?.status || 500).json({
      qttr: null,
      error: error.response?.data || error.message
    })
  }
})

// Route: Auth-Status prüfen (JWT-basiert)
app.get('/api/auth/status', (req, res) => {
  const hasToken = !!JWT_TOKEN
  res.json({
    authenticated: hasToken,
    method: 'JWT',
    message: hasToken ? 'JWT-Token verfügbar' : 'Kein JWT-Token gesetzt'
  })
})
app.get('/api/auth/status', (req, res) => {
  res.json({
    authenticated: !!authCookies,
    message: authCookies ? 'Authentifiziert' : 'Nicht authentifiziert'
  })
})

// Health Check
app.get('/health', (req, res) => {
  res.json({
    status: 'OK',
    timestamp: new Date().toISOString(),
    authenticated: !!authCookies
  })
})

// Fehler-Handler
app.use((error, req, res, next) => {
  console.error('Server Fehler:', error)
  res.status(500).json({
    error: 'Interner Server-Fehler'
  })
})

// Server starten
app.listen(PORT, () => {
  console.log(`
🚀 MyTischtennis Proxy-Server läuft auf Port ${PORT}
📡 API-Endpunkte:
   POST /api/search/players     - Spielersuche (öffentlich)
   GET  /api/ttr/player/:nuid   - TTR-Wert (auth erforderlich)
   GET  /api/ttr/history/:nuid  - TTR-Historie (auth erforderlich)
   GET  /api/q-ttr/player/:nuid - Q-TTR-Wert (öffentlich, experimentell)
   POST /api/auth/login         - Login
   POST /api/auth/logout        - Logout
   GET  /api/auth/status        - Auth-Status
   GET  /health                 - Health Check

🔐 Authentifizierung: Cookie-basiert über myTischtennis.de
🌐 CORS aktiviert für: http://localhost:5173
  `)
})