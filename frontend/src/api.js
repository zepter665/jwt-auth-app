import axios from 'axios'

class MyTischtennisAPI {
  constructor() {
    this.client = axios.create({
      baseURL: '/api', // Proxy wird von Vite zu unserem Backend-Server geleitet
      headers: {
        'Content-Type': 'application/json',
        'Accept': 'application/json, text/plain, */*',
      },
      timeout: 15000, // TTR-Requests können länger dauern
      withCredentials: true // Für Cookie-Authentifizierung
    })
  }

  /**
   * Sucht nach Spielern über die myTischtennis API
   * @param {string} query - Suchbegriff (mindestens 3 Zeichen)
   * @param {number} page - Seitennummer (default: 1)
   * @param {number} pagesize - Anzahl Ergebnisse pro Seite (default: 10)
   * @returns {Promise<Object>} - Suchergebnisse
   */
  async searchPlayers(query, page = 1, pagesize = 10) {
    if (!query || query.length < 3) {
      throw new Error('Der Suchbegriff muss mindestens 3 Zeichen lang sein.')
    }

    try {
      const response = await this.client.post('/search/players', {
        query,
        page,
        pagesize
      })
      
      if (response.status === 429) {
        throw new Error('Rate Limit erreicht (90 Requests/Stunde). Bitte warten Sie vor dem nächsten Request.')
      }

      return response.data
    } catch (error) {
      console.error('API Error:', error)
      
      if (error.response) {
        // Server hat mit einem Fehlercode geantwortet
        if (error.response.status === 400) {
          throw new Error('Ungültige Anfrage. Überprüfen Sie die Suchparameter.')
        } else if (error.response.status === 429) {
          throw new Error('Rate Limit erreicht (90 Requests/Stunde). Bitte warten Sie.')
        } else if (error.response.status === 404) {
          throw new Error('API-Endpunkt nicht gefunden. Möglicherweise ist die API nicht verfügbar.')
        } else {
          throw new Error(`Server-Fehler: ${error.response.status} - ${error.response.statusText}`)
        }
      } else if (error.request) {
        // Request wurde gesendet, aber keine Antwort erhalten
        throw new Error('Keine Antwort vom Server. Überprüfen Sie Ihre Internetverbindung.')
      } else {
        // Fehler beim Aufsetzen des Requests
        throw new Error(`Request-Fehler: ${error.message}`)
      }
    }
  }

  /**
   * Holt den aktuellen TTR-Wert eines Spielers
   * @param {string} nuid - Die NUID des Spielers (z.B. "NU123456")
   * @returns {Promise<Object>} - TTR-Daten
   */
  async getPlayerTTR(nuid) {
    try {
      const response = await this.client.get(`/ttr/player/${nuid}`)
      return response.data
    } catch (error) {
      console.warn(`TTR für ${nuid} nicht verfügbar:`, error.message)
      return { ttr: null, error: error.message }
    }
  }

  /**
   * Holt die TTR-Historie eines Spielers
   * @param {string} nuid - Die NUID des Spielers (z.B. "NU123456") 
   * @returns {Promise<Object>} - TTR-Historie
   */
  async getPlayerTTRHistory(nuid) {
    try {
      const response = await this.client.get(`/ttr/history/${nuid}`)
      return response.data
    } catch (error) {
      console.warn(`TTR-Historie für ${nuid} nicht verfügbar:`, error.message)
      return { error: error.message }
    }
  }

  /**
   * Erweiterte Spielersuche mit TTR-Werten
   * @param {string} query - Suchbegriff
   * @param {number} page - Seitennummer 
   * @param {number} pagesize - Anzahl Ergebnisse
   * @param {boolean} withTTR - Soll TTR-Wert abgerufen werden?
   * @returns {Promise<Object>} - Suchergebnisse mit TTR
   */
  async searchPlayersWithTTR(query, page = 1, pagesize = 10, withTTR = true) {
    // Erst normale Spielersuche
    const searchResults = await this.searchPlayers(query, page, pagesize)
    
    if (!withTTR || !searchResults.results) {
      return searchResults
    }

    // TTR-Werte parallel abrufen (max 5 gleichzeitig um Rate Limit zu schonen)
    const playersWithTTR = await Promise.allSettled(
      searchResults.results.slice(0, 10).map(async (player) => {
        if (!player.internal_id) {
          return { ...player, ttr_current: null, ttr_error: 'Keine NUID' }
        }

        try {
          const ttrData = await this.getPlayerTTR(player.internal_id)
          return { 
            ...player, 
            ttr_current: ttrData.ttr, 
            ttr_error: ttrData.error 
          }
        } catch (error) {
          return { 
            ...player, 
            ttr_current: null, 
            ttr_error: error.message 
          }
        }
      })
    )

    // Ergebnisse zusammenfassen
    searchResults.results = playersWithTTR.map((result, index) => {
      if (result.status === 'fulfilled') {
        return result.value
      } else {
        return { 
          ...searchResults.results[index], 
          ttr_current: null, 
          ttr_error: 'TTR-Abfrage fehlgeschlagen' 
        }
      }
    })

    return searchResults
  }

  /**
   * Login bei myTischtennis.de
   * @param {string} email - E-Mail Adresse
   * @param {string} password - Passwort
   * @returns {Promise<Object>} - Login-Ergebnis
   */
  async login(email, password) {
    try {
      const response = await this.client.post('/auth/login', {
        email,
        password
      })
      return response.data
    } catch (error) {
      throw new Error(error.response?.data?.error || 'Login fehlgeschlagen')
    }
  }

  /**
   * Logout
   * @returns {Promise<Object>} - Logout-Ergebnis
   */
  async logout() {
    try {
      const response = await this.client.post('/auth/logout')
      return response.data
    } catch (error) {
      throw new Error(error.response?.data?.error || 'Logout fehlgeschlagen')
    }
  }

  /**
   * Auth-Status prüfen
   * @returns {Promise<Object>} - Authentifizierungsstatus
   */
  async getAuthStatus() {
    try {
      const response = await this.client.get('/auth/status')
      return response.data
    } catch (error) {
      return { authenticated: false, error: error.message }
    }
  }

  /**
   * Formatiert Spielerdaten für die Anzeige
   * @param {Object} player - Spielerdaten von der API
   * @returns {Object} - Formatierte Spielerdaten
   */
  formatPlayer(player) {
    const currentTTR = player.ttr_current || player.ttr || null
    const hasCurrentTTR = currentTTR !== null && currentTTR !== 'N/A'
    
    return {
      id: player.internal_id || player.person_id,
      name: `${player.firstname || ''} ${player.lastname || ''}`.trim() || 'Unbekannt',
      firstName: player.firstname || '',
      lastName: player.lastname || '',
      nuid: player.internal_id || 'N/A',
      club: player.club_name || 'N/A',
      licence: player.licence_club || '',
      ttr: hasCurrentTTR ? currentTTR : 'N/A',
      ttrCurrent: currentTTR,
      ttrError: player.ttr_error || null,
      personId: player.person_id,
      dttbPlayerId: player.dttb_player_id,
      hasTTR: hasCurrentTTR
    }
  }
}

export default new MyTischtennisAPI()