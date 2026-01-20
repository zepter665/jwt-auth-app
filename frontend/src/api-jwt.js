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
        } else if (error.response.status >= 500) {
          throw new Error('Server-Fehler. Versuchen Sie es später erneut.')
        }
      } else if (error.request) {
        // Request wurde gesendet, aber keine Antwort erhalten
        throw new Error('Netzwerkfehler. Überprüfen Sie Ihre Internetverbindung.')
      } else {
        // Fehler beim Erstellen der Anfrage
        throw new Error('Anfragefehler: ' + error.message)
      }
      
      // Fallback für unbekannte Fehler
      throw new Error('Ein unbekannter Fehler ist aufgetreten.')
    }
  }

  /**
   * TTR-Wert eines Spielers abrufen
   * @param {string} nuid - Eindeutige Spieler-ID
   * @returns {Promise<Object>} - TTR-Daten
   */
  async getPlayerTTR(nuid) {
    try {
      const response = await this.client.get(`/ttr/player/${nuid}`)
      return response.data
    } catch (error) {
      console.error(`TTR-Fehler für ${nuid}:`, error)
      throw error
    }
  }

  /**
   * TTR-Historie eines Spielers abrufen
   * @param {string} nuid - Eindeutige Spieler-ID  
   * @returns {Promise<Object>} - TTR-Historie
   */
  async getPlayerTTRHistory(nuid) {
    try {
      const response = await this.client.get(`/ttr/history/${nuid}`)
      return response.data
    } catch (error) {
      console.error(`TTR-Historie-Fehler für ${nuid}:`, error)
      throw error
    }
  }

  /**
   * Spieler nach NUID abrufen
   * @param {string} nuid - Eindeutige Spieler-ID
   * @returns {Promise<Object>} - Spielerdaten mit TTR
   */
  async getPlayerByNuid(nuid) {
    try {
      const response = await this.client.get(`/player/${nuid}`)
      return response.data
    } catch (error) {
      console.error(`Spieler-Abruf Fehler für ${nuid}:`, error)
      throw error
    }
  }

  /**
   * Suchergebnisse mit TTR-Werten anreichern
   * @param {Object} searchResults - Suchergebnisse von searchPlayers()
   * @returns {Promise<Object>} - Suchergebnisse mit TTR-Werten
   */
  async searchPlayersWithTTR(query, page = 1, pagesize = 10) {
    const searchResults = await this.searchPlayers(query, page, pagesize)
    
    // TTR-Werte parallel für alle Spieler abrufen
    const ttrPromises = searchResults.results.map(async (player, index) => {
      try {
        const nuid = player.internal_id || player.nuid
        if (!nuid) {
          return { 
            ...searchResults.results[index], 
            ttr_current: null,
            qttr: null,
            ttr_error: 'Keine NUID gefunden' 
          }
        }
        
        // Versuche sowohl TTR als auch TTR-Historie (mit Q-TTR = vq_ttr) abzurufen
        const [ttrData, ttrHistoryData] = await Promise.allSettled([
          this.getPlayerTTR(nuid),
          this.getPlayerTTRHistory(nuid)
        ])
        
        let ttr_current = null
        let qttr = null
        let ttr_error = null
        
        if (ttrData.status === 'fulfilled') {
          ttr_current = ttrData.value.ttr
          console.log(`TTR für ${nuid}: ${ttr_current}`) // Debug-Log
        } else {
          ttr_error = ttrData.reason?.message || 'TTR-Fehler'
          console.log(`TTR-Fehler für ${nuid}: ${ttr_error}`)
        }
        
        if (ttrHistoryData.status === 'fulfilled') {
          // Q-TTR (Vorquartal-TTR) aus Historie verwenden
          if (ttrHistoryData.value.vq_ttr) {
            qttr = ttrHistoryData.value.vq_ttr
            console.log(`Q-TTR für ${nuid}: ${qttr}`) // Debug-Log
          }
        } else {
          console.log(`Q-TTR-Fehler für ${nuid}: ${ttrHistoryData.reason?.message || 'Nicht verfügbar'}`)
        }
        
        return { 
          ...searchResults.results[index], 
          ttr_current,
          qttr,
          ttr_error
        }
      } catch (error) {
        console.error(`TTR-Fehler für ${player.internal_id || player.nuid}:`, error)
        // Bei TTR-Fehler Spieler trotzdem anzeigen, aber ohne TTR
        return { 
          ...searchResults.results[index], 
          ttr_current: null,
          qttr: null,
          ttr_error: 'TTR-Abfrage fehlgeschlagen' 
        }
      }
    })

    const resultsWithTTR = await Promise.all(ttrPromises)
    return { ...searchResults, results: resultsWithTTR }
  }

  /**
   * Auth-Status prüfen (JWT-basiert)
   * @returns {Promise<Object>} - Authentifizierungsstatus
   */
  async checkAuthStatus() {
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
    const qttrValue = player.qttr || player.vq_ttr || null
    const vqTTRValue = player.vq_ttr || null
    const fullName = `${player.firstname || ''} ${player.lastname || ''}`.trim()

    return {
      id: player.internal_id || player.nuid || player.person_id,
      name: fullName || player.displayName || 'Unbekannt',
      nuid: player.internal_id || player.nuid || 'N/A',
      club: player.club_name || player.club || player.licence_club || 'Kein Verein',
      licence: player.licence_club || player.club_name || '',
      ttr: currentTTR ? `${currentTTR}` : 'N/A',
      ttrNumeric: currentTTR,
      ttrError: player.ttr_error || null,
      qttr: qttrValue ? `${qttrValue}` : null,
      qttrNumeric: qttrValue,
      vqTTR: vqTTRValue ? `${vqTTRValue}` : null,
      vqTTRNumeric: vqTTRValue,
      raw: player // Original-Daten für Debugging
    }
  }
}

// Singleton Export
const api = new MyTischtennisAPI()
export default api