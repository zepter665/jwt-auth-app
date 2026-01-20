import axios from 'axios';
import https from 'https';

const BASE_URL = 'https://www.mytischtennis.de';

class MyTischtennisAPI {
  constructor() {
    // HTTPS Agent mit deaktivierter SSL-Verifikation für Testzwecke
    const httpsAgent = new https.Agent({
      rejectUnauthorized: false
    });

    this.client = axios.create({
      baseURL: BASE_URL,
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
        'Accept': 'application/json, text/plain, */*',
        'Accept-Language': 'de-DE,de;q=0.9,en;q=0.8',
        'Origin': 'https://www.mytischtennis.de',
        'Referer': 'https://www.mytischtennis.de/'
      },
      timeout: 10000, // 10 Sekunden Timeout
      httpsAgent
    });
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
      throw new Error('Der Suchbegriff muss mindestens 3 Zeichen lang sein.');
    }

    try {
      const params = new URLSearchParams();
      params.append('query', query);
      params.append('page', page.toString());
      params.append('pagesize', pagesize.toString());

      const response = await this.client.post('/api/search/players', params);
      
      if (response.status === 429) {
        throw new Error('Rate Limit erreicht (90 Requests/Stunde). Bitte warten Sie vor dem nächsten Request.');
      }

      return response.data;
    } catch (error) {      
      if (error.response) {
        // Server hat mit einem Fehlercode geantwortet
        if (error.response.status === 400) {
          throw new Error('Ungültige Anfrage. Überprüfen Sie die Suchparameter.');
        } else if (error.response.status === 429) {
          throw new Error('Rate Limit erreicht (90 Requests/Stunde). Bitte warten Sie.');
        } else {
          throw new Error(`Server-Fehler: ${error.response.status} - ${error.response.statusText}`);
        }
      } else if (error.request) {
        // Request wurde gesendet, aber keine Antwort erhalten
        throw new Error(`Keine Antwort vom Server. Code: ${error.code}. Überprüfen Sie Ihre Internetverbindung.`);
      } else {
        // Fehler beim Aufsetzen des Requests
        throw new Error(`Request-Fehler: ${error.message}`);
      }
    }
  }

  /**
   * Formatiert die Suchergebnisse für die Anzeige
   * @param {Object} results - API Response
   * @returns {string} - Formatierte Ausgabe
   */
  formatPlayerResults(results) {
    if (!results || !results.results || results.results.length === 0) {
      return '❌ Keine Spieler gefunden.';
    }

    let output = `\n🏓 Gefundene Spieler (${results.total_count} insgesamt, Seite ${results.page}/${results.pages_count}):\n`;
    output += '═'.repeat(80) + '\n';

    results.results.forEach((player, index) => {
      const fullName = `${player.firstname || ''} ${player.lastname || ''}`.trim() || 'Unbekannt';
      output += `${index + 1}. ${fullName}\n`;
      output += `   🆔 NUID: ${player.internal_id || 'N/A'}\n`;
      output += `   🏛️  Verein: ${player.club_name || 'N/A'}\n`;
      output += `   ⭐ TTR: ${player.ttr || 'N/A'}\n`;
      if (player.licence_club && player.licence_club !== player.club_name) {
        output += `   📋 Lizenz: ${player.licence_club}\n`;
      }
      output += '─'.repeat(50) + '\n';
    });

    if (results.pages_count > 1) {
      output += `\n💡 Tipp: Verwende --page ${results.page + 1} für die nächste Seite.\n`;
    }

    return output;
  }
}

export default MyTischtennisAPI;