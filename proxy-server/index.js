import express from 'express'
import cors from 'cors'
import axios from 'axios'
import cookieParser from 'cookie-parser'
import https from 'https'
import dotenv from 'dotenv'
import fs from 'fs'
import path from 'path'
import { fileURLToPath } from 'url'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)

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

// Token-Verwaltung Funktionen
const parseJWTToken = (tokenString) => {
  try {
    if (tokenString.startsWith('base64-')) {
      const base64Data = tokenString.substring(7)
      const decoded = Buffer.from(base64Data, 'base64').toString('utf-8')
      return JSON.parse(decoded)
    }
    return null
  } catch (error) {
    console.error('Fehler beim Parsen des JWT-Tokens:', error.message)
    return null
  }
}

const updateEnvFile = (newToken) => {
  try {
    const envPath = path.join(__dirname, '.env')
    const envContent = fs.readFileSync(envPath, 'utf-8')
    const newContent = envContent.replace(
      /MYTISCHTENNIS_JWT=.*/,
      `MYTISCHTENNIS_JWT='${newToken}'`
    )
    fs.writeFileSync(envPath, newContent, 'utf-8')
    console.log('✅ .env-Datei erfolgreich aktualisiert')
    return true
  } catch (error) {
    console.error('❌ Fehler beim Aktualisieren der .env-Datei:', error.message)
    return false
  }
}

const refreshJWTToken = async () => {
  try {
    const tokenData = parseJWTToken(JWT_TOKEN)
    if (!tokenData || !tokenData.refresh_token) {
      throw new Error('Kein gültiger Refresh-Token gefunden')
    }

    console.log('🔄 Versuche Token zu refreshen...')
    
    // Supabase Auth Refresh Endpoint
    const response = await axios.post(
      'https://www.mytischtennis.de/auth/v1/token',
      {
        refresh_token: tokenData.refresh_token,
        grant_type: 'refresh_token'
      },
      {
        headers: {
          'Content-Type': 'application/json',
          'apikey': 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InRvanRnaHRlZm14emxkaWFiY3R4Iiwicm9sZSI6ImFub24iLCJpYXQiOjE2OTU4MTkyMzUsImV4cCI6MjAxMTM5NTIzNX0.h8RqSXHPKLgQh8mGVSgZzVZQlhQXVdnXLPMQjqwcgGg'
        },
        httpsAgent
      }
    )

    const newTokenData = response.data
    const base64Token = 'base64-' + Buffer.from(JSON.stringify(newTokenData)).toString('base64')
    
    // Update .env file
    if (updateEnvFile(base64Token)) {
      // Update process.env
      process.env.MYTISCHTENNIS_JWT = base64Token
      console.log('✅ Token erfolgreich erneuert')
      console.log(`📅 Neues Ablaufdatum: ${new Date(newTokenData.expires_at * 1000).toLocaleString('de-DE')}`)
      return { success: true, token: base64Token, expiresAt: newTokenData.expires_at }
    }
    
    throw new Error('Konnte .env-Datei nicht aktualisieren')
  } catch (error) {
    console.error('❌ Token-Refresh fehlgeschlagen:', error.response?.data || error.message)
    return { success: false, error: error.message }
  }
}

// Automatischer Token-Check beim Start
const checkTokenExpiry = () => {
  const tokenData = parseJWTToken(JWT_TOKEN)
  if (tokenData && tokenData.expires_at) {
    const expiryDate = new Date(tokenData.expires_at * 1000)
    const now = new Date()
    const hoursUntilExpiry = (expiryDate - now) / (1000 * 60 * 60)
    
    console.log(`🔐 Token läuft ab am: ${expiryDate.toLocaleString('de-DE')}`)
    
    if (hoursUntilExpiry < 24) {
      console.log(`⚠️  Token läuft in ${hoursUntilExpiry.toFixed(1)} Stunden ab - automatischer Refresh empfohlen`)
      // Auto-refresh wenn weniger als 1 Stunde
      if (hoursUntilExpiry < 1) {
        console.log('🔄 Starte automatischen Token-Refresh...')
        refreshJWTToken()
      }
    }
  }
}

if (JWT_TOKEN) {
  checkTokenExpiry()
}

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

// Route: Spieler nach NUID abrufen
app.get('/api/player/:nuid', async (req, res) => {
  try {
    const { nuid } = req.params

    console.log(`🔍 Spieler-Abruf: ${nuid}`)

    if (!JWT_TOKEN) {
      return res.status(401).json({
        error: 'JWT-Token erforderlich um Spielerdaten abzurufen'
      })
    }

    // Lade TTR, Historie und Suchdaten parallel
    const [ttrResponse, historyResponse, searchResponse] = await Promise.allSettled([
      apiClient.get(`/api/ttr/player/${nuid}`, {
        headers: { 'Cookie': `sb-10-auth-token=${JWT_TOKEN}` }
      }),
      apiClient.get(`/api/ttr/history/${nuid}`, {
        headers: { 'Cookie': `sb-10-auth-token=${JWT_TOKEN}` }
      }),
      // Suche nach NUID über Person-Name aus History
      (async () => {
        const histResp = await apiClient.get(`/api/ttr/history/${nuid}`, {
          headers: { 'Cookie': `sb-10-auth-token=${JWT_TOKEN}` }
        })
        const personName = histResp.data.person_name || ''
        const lastname = personName.split(',')[0]?.trim() || ''
        if (!lastname) return null
        
        const searchParams = new URLSearchParams()
        searchParams.append('query', lastname)
        searchParams.append('page', '1')
        searchParams.append('pagesize', '50')
        
        return await apiClient.post('/api/search/players', searchParams, {
          headers: { 'Content-Type': 'application/x-www-form-urlencoded' }
        })
      })()
    ])

    // Wenn TTR-Abruf fehlschlägt, existiert der Spieler nicht
    if (ttrResponse.status === 'rejected') {
      return res.status(404).json({
        error: `Spieler mit NUID ${nuid} nicht gefunden`
      })
    }

    const ttrData = ttrResponse.value.data
    
    // Hole zusätzliche Infos aus der History-API
    let person_name = ''
    let club_name = ''
    let vq_ttr = null
    
    if (historyResponse.status === 'fulfilled') {
      const historyData = historyResponse.value.data
      person_name = historyData.person_name || ''
      club_name = historyData.club_name || ''
      vq_ttr = historyData.vq_ttr || null
    }
    
    // Parse Name (Format: "Nachname, Vorname")
    const nameParts = person_name.split(',').map(p => p.trim())
    const lastname = nameParts[0] || ''
    const firstname = nameParts[1] || ''
    
    // Hole licence_club aus der Search-API
    let licence_club = ''
    if (searchResponse.status === 'fulfilled' && searchResponse.value) {
      const results = searchResponse.value.data.results || []
      const searchPlayer = results.find(p => p.internal_id === nuid)
      if (searchPlayer) {
        licence_club = searchPlayer.licence_club || ''
      }
    }
    
    const player = {
      internal_id: nuid,
      firstname: firstname,
      lastname: lastname,
      club: club_name,
      licence_club: licence_club,
      ttr_current: ttrData.ttr || null,
      vq_ttr: vq_ttr
    }

    res.json(player)
  } catch (error) {
    console.error(`Spieler-Abruf Fehler für ${req.params.nuid}:`, error.message)
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

// Route: Auth-Status prüfen (JWT-basiert)
app.get('/api/auth/status', (req, res) => {
  const hasToken = !!JWT_TOKEN
  const tokenData = parseJWTToken(JWT_TOKEN)
  let expiresAt = null
  let expiresIn = null
  
  if (tokenData && tokenData.expires_at) {
    expiresAt = new Date(tokenData.expires_at * 1000).toLocaleString('de-DE')
    const now = Date.now()
    expiresIn = Math.max(0, tokenData.expires_at * 1000 - now)
  }
  
  res.json({
    authenticated: hasToken,
    method: 'JWT',
    message: hasToken ? 'JWT-Token verfügbar' : 'Kein JWT-Token gesetzt',
    expiresAt,
    expiresInMs: expiresIn
  })
})

// Route: Token manuell refreshen
app.post('/api/auth/refresh-token', async (req, res) => {
  const result = await refreshJWTToken()
  if (result.success) {
    res.json({
      success: true,
      message: 'Token erfolgreich erneuert',
      expiresAt: new Date(result.expiresAt * 1000).toLocaleString('de-DE')
    })
  } else {
    res.status(500).json({
      success: false,
      error: result.error
    })
  }
})

// Health Check
app.get('/health', (req, res) => {
  const tokenData = parseJWTToken(JWT_TOKEN)
  res.json({
    status: 'OK',
    timestamp: new Date().toISOString(),
    authenticated: !!JWT_TOKEN,
    tokenExpiry: tokenData?.expires_at ? new Date(tokenData.expires_at * 1000).toLocaleString('de-DE') : null
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
   POST /api/search/players         - Spielersuche (öffentlich)
   GET  /api/player/:nuid           - Spieler nach NUID abrufen
   GET  /api/ttr/player/:nuid       - TTR-Wert (auth erforderlich)
   GET  /api/ttr/history/:nuid      - TTR-Historie (auth erforderlich)
   POST /api/auth/refresh-token     - JWT Token refreshen
   GET  /api/auth/status            - Auth-Status
   GET  /health                     - Health Check

🔐 Authentifizierung: JWT-basiert über myTischtennis.de
🔄 Automatischer Token-Refresh bei Ablauf < 1 Stunde
🌐 CORS aktiviert für: http://localhost:5173
  `)
})