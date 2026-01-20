<template>
  <div class="app">
    <div class="container">
      <header class="header">
        <h1 class="title">
          Spielersuche
        </h1>
        <p class="subtitle">
          Suche nach deutschen Tischtennisspielern
        </p>
      </header>

      <main class="main">
        <!-- Suchbereich -->
        <div class="search-section">
          <div class="search-box">
            <input
              v-model="searchQuery"
              @keyup.enter="handleSearch"
              type="text"
              placeholder="Spielername eingeben (mindestens 3 Zeichen)..."
              class="search-input"
              :disabled="isLoading"
            >
            <button 
              @click="handleSearch"
              :disabled="isLoading || searchQuery.length < 3"
              class="search-button"
            >
              <span v-if="isLoading">🔄</span>
              <span v-else>🔍</span>
              {{ isLoading ? 'Suche...' : 'Suchen' }}
            </button>
          </div>
          
          <div class="search-options">
            <label class="option">
              Ergebnisse pro Seite:
              <select v-model="pageSize" :disabled="isLoading">
                <option value="10">10</option>
                <option value="20">20</option>
                <option value="30">30</option>
                <option value="50">50</option>
              </select>
            </label>
            
            <label class="option">
              <input 
                v-model="fetchTTR" 
                type="checkbox"
                :disabled="isLoading || !isAuthenticated"
              >
              TTR-Werte abrufen 
              <span v-if="!isAuthenticated" class="auth-hint">(Anmeldung erforderlich)</span>
              <span v-else class="auth-hint">(langsamer)</span>
            </label>
          </div>
        </div>

        <!-- Fehleranzeige -->
        <div v-if="error" class="error-message">
          ❌ {{ error }}
        </div>

        <!-- Lade-Animation -->
        <div v-if="isLoading" class="loading">
          <div class="spinner"></div>
          <p>Suche nach "{{ searchQuery }}"...</p>
          <p v-if="fetchTTR" class="loading-hint">
            🔄 TTR-Werte werden geladen (kann etwas dauern)...
          </p>
        </div>

        <!-- Ergebnisse -->
        <div v-if="results && !isLoading" class="results-section">
          <!-- Ergebnis-Header -->
          <div class="results-header">
            <h2>
              🏓 {{ results.total_count }} Spieler gefunden
              <span v-if="results.pages_count > 1">
                (Seite {{ currentPage }} von {{ results.pages_count }})
              </span>
            </h2>
          </div>

          <!-- Spielerliste -->
          <div class="players-grid">
            <div 
              v-for="(player, index) in formattedPlayers" 
              :key="player.id"
              class="player-card"
              @click="openPlayerDetail(player)"
            >
              <div class="player-number">{{ (currentPage - 1) * pageSize + index + 1 }}</div>
              <div class="player-info">
                <h3 class="player-name">{{ player.name }}</h3>
                <div class="player-details">
                  <div class="detail">
                    <span class="label">🆔 NUID:</span>
                    <span class="value">{{ player.nuid }}</span>
                  </div>
                  <div class="detail">
                    <span class="label">🏛️ Verein:</span>
                    <span class="value">{{ player.club }}</span>
                  </div>
                  <div class="detail" v-if="player.ttr !== 'N/A'">
                    <span class="label">⭐ TTR:</span>
                    <span class="value ttr">{{ player.ttr }}</span>
                    <span v-if="player.ttrError" class="ttr-error" :title="player.ttrError">⚠️</span>
                  </div>
                  <div class="detail" v-else-if="fetchTTR && player.nuid !== 'N/A'">
                    <span class="label">⭐ TTR:</span>
                    <span class="value ttr-unavailable">Nicht verfügbar</span>
                  </div>
                  <div class="detail" v-if="player.qttr">
                    <span class="label">📊 Q-TTR:</span>
                    <span class="value qttr">{{ player.qttr }}</span>
                  </div>
                  <div class="detail" v-if="player.licence && player.licence !== player.club">
                    <span class="label">📋 Lizenz:</span>
                    <span class="value licence">{{ player.licence }}</span>
                  </div>
                </div>
              </div>
            </div>
          </div>

          <!-- Pagination -->
          <div v-if="results.pages_count > 1" class="pagination">
            <button 
              @click="goToPage(currentPage - 1)"
              :disabled="currentPage === 1 || isLoading"
              class="page-button"
            >
              ⬅️ Zurück
            </button>
            
            <div class="page-info">
              Seite {{ currentPage }} von {{ results.pages_count }}
            </div>
            
            <button 
              @click="goToPage(currentPage + 1)"
              :disabled="currentPage === results.pages_count || isLoading"
              class="page-button"
            >
              Vor ➡️
            </button>
          </div>
        </div>

        <!-- Player Detail Modal -->
        <div v-if="selectedPlayer" class="modal-overlay" @click="closePlayerDetail">
          <div class="modal-content" @click.stop>
            <button class="modal-close" @click="closePlayerDetail">✕</button>
            <h2 class="modal-title">{{ selectedPlayer.name }}</h2>
            <div class="modal-details">
              <div class="modal-detail-row">
                <span class="modal-label">🆔 NUID:</span>
                <span class="modal-value">{{ selectedPlayer.nuid }}</span>
              </div>
              <div class="modal-detail-row">
                <span class="modal-label">🏛️ Verein:</span>
                <span class="modal-value">{{ selectedPlayer.club }}</span>
              </div>
              <div class="modal-detail-row" v-if="selectedPlayer.ttr !== 'N/A'">
                <span class="modal-label">⭐ TTR:</span>
                <span class="modal-value ttr-value">{{ selectedPlayer.ttr }}</span>
              </div>
              <div class="modal-detail-row" v-if="selectedPlayer.qttr">
                <span class="modal-label">📊 Q-TTR:</span>
                <span class="modal-value qttr-value">{{ selectedPlayer.qttr }}</span>
              </div>
              <div class="modal-detail-row" v-if="selectedPlayer.licence && selectedPlayer.licence !== selectedPlayer.club">
                <span class="modal-label">📋 Lizenz:</span>
                <span class="modal-value">{{ selectedPlayer.licence }}</span>
              </div>
            </div>
          </div>
        </div>
      </main>
    </div>
  </div>
</template>

<script>
import { ref, computed, onMounted } from 'vue'
import api from './api-jwt.js'
import JwtAuthStatus from './JwtAuthStatus.vue'

export default {
  name: 'App',
  components: {
    JwtAuthStatus
  },
  setup() {
    // Reactive state
    const searchQuery = ref('')
    const results = ref(null)
    const error = ref('')
    const isLoading = ref(false)
    const currentPage = ref(1)
    const pageSize = ref(20)
    const fetchTTR = ref(true)
    const isAuthenticated = ref(false)
    const selectedPlayer = ref(null)

    // Auth-Status beim Start prüfen
    const checkAuthStatus = async () => {
      try {
        const status = await api.checkAuthStatus()
        isAuthenticated.value = status.authenticated
        console.log('Auth-Status:', status) // Debug-Log
      } catch (error) {
        console.error('Auth-Status-Fehler:', error)
        isAuthenticated.value = false
      }
    }

    onMounted(() => {
      checkAuthStatus()
    })

    // Computed properties
    const formattedPlayers = computed(() => {
      if (!results.value?.results) return []
      const formatted = results.value.results.map(player => api.formatPlayer(player))
      
      // Sortiere nach Nachname, dann Vorname
      return formatted.sort((a, b) => {
        const [lastNameA, firstNameA] = a.name.split(', ')
        const [lastNameB, firstNameB] = b.name.split(', ')
        
        // Vergleiche zuerst Nachnamen
        const lastNameComparison = lastNameA.localeCompare(lastNameB, 'de')
        if (lastNameComparison !== 0) return lastNameComparison
        
        // Bei gleichem Nachnamen: Vergleiche Vornamen
        return (firstNameA || '').localeCompare(firstNameB || '', 'de')
      })
    })

    // Methods
    const handleSearch = async () => {
      if (searchQuery.value.length < 3) {
        error.value = 'Der Suchbegriff muss mindestens 3 Zeichen lang sein.'
        return
      }

      await performSearch(1) // Immer mit Seite 1 starten
    }

    const performSearch = async (page = 1) => {
      try {
        isLoading.value = true
        error.value = ''
        currentPage.value = page

        console.log(`Suche: "${searchQuery.value}", TTR: ${fetchTTR.value}, Auth: ${isAuthenticated.value}`) // Debug

        let result
        if (fetchTTR.value && isAuthenticated.value) {
          console.log('Verwende searchPlayersWithTTR') // Debug
          result = await api.searchPlayersWithTTR(searchQuery.value, page, pageSize.value)
        } else {
          console.log('Verwende searchPlayers') // Debug
          result = await api.searchPlayers(searchQuery.value, page, pageSize.value)
        }
        
        results.value = result
        console.log('Suchergebnis:', result) // Debug
        
        if (!result.results || result.results.length === 0) {
          error.value = 'Keine Spieler gefunden. Versuchen Sie einen anderen Suchbegriff.'
        }
      } catch (err) {
        error.value = err.message
        results.value = null
      } finally {
        isLoading.value = false
      }
    }

    const goToPage = async (page) => {
      if (page < 1 || page > results.value.pages_count) return
      await performSearch(page)
    }

    const clearSearch = () => {
      searchQuery.value = ''
      results.value = null
      error.value = ''
      currentPage.value = 1
    }

    const openPlayerDetail = (player) => {
      selectedPlayer.value = player
    }

    const closePlayerDetail = () => {
      selectedPlayer.value = null
    }

    const onAuthChanged = (authenticated) => {
      isAuthenticated.value = authenticated
      // Bei Auth-Änderung Ergebnisse neu laden, falls vorhanden
      if (results.value && searchQuery.value) {
        performSearch(currentPage.value)
      }
    }

    return {
      searchQuery,
      results,
      error,
      isLoading,
      currentPage,
      pageSize,
      fetchTTR,
      isAuthenticated,
      formattedPlayers,
      handleSearch,
      goToPage,
      clearSearch,
      onAuthChanged,
      selectedPlayer,
      openPlayerDetail,
      closePlayerDetail
    }
  }
}
</script>

<style scoped>
.app {
  min-height: 100vh;
  padding: 20px;
  background: #4793E3;
}

.container {
  max-width: 1200px;
  margin: 0 auto;
}

.header {
  text-align: center;
  margin-bottom: 40px;
  color: white;
}

.title {
  font-size: 2.5rem;
  margin-bottom: 10px;
  text-shadow: 2px 2px 4px rgba(0,0,0,0.3);
}

.subtitle {
  font-size: 1.2rem;
  opacity: 0.9;
}

.search-section {
  background: white;
  border-radius: 12px;
  padding: 30px;
  margin-bottom: 30px;
  box-shadow: 0 4px 20px rgba(0,0,0,0.1);
}

.search-box {
  display: flex;
  gap: 15px;
  margin-bottom: 20px;
}

.search-input {
  flex: 1;
  padding: 15px;
  border: 2px solid #e1e5e9;
  border-radius: 8px;
  font-size: 16px;
  transition: border-color 0.3s ease;
}

.search-input:focus {
  outline: none;
  border-color: #667eea;
  box-shadow: 0 0 0 3px rgba(102, 126, 234, 0.1);
}

.search-button {
  padding: 15px 25px;
  background: #4793E3;
  color: white;
  border: none;
  border-radius: 8px;
  font-size: 16px;
  font-weight: 600;
  cursor: pointer;
  transition: transform 0.2s ease, box-shadow 0.2s ease;
}

.search-button:hover:not(:disabled) {
  transform: translateY(-2px);
  box-shadow: 0 4px 12px rgba(71, 147, 227, 0.4);
}

.search-button:disabled {
  opacity: 0.6;
  cursor: not-allowed;
}

.search-options {
  display: flex;
  gap: 20px;
  align-items: center;
}

.option {
  display: flex;
  align-items: center;
  gap: 8px;
  font-weight: 500;
}

.option input[type="checkbox"] {
  margin-right: 5px;
}

.auth-hint {
  font-size: 0.8rem;
  color: #666;
  font-weight: normal;
}

.option select {
  padding: 8px;
  border: 1px solid #e1e5e9;
  border-radius: 6px;
  font-size: 14px;
}

.error-message {
  background: #fee;
  border: 1px solid #fcc;
  color: #c66;
  padding: 15px;
  border-radius: 8px;
  margin-bottom: 20px;
  text-align: center;
}

.loading {
  text-align: center;
  padding: 40px;
  color: white;
}

.loading-hint {
  font-size: 0.9rem;
  opacity: 0.8;
  margin-top: 10px;
}

.spinner {
  width: 40px;
  height: 40px;
  border: 4px solid rgba(255,255,255,0.3);
  border-left: 4px solid white;
  border-radius: 50%;
  animation: spin 1s linear infinite;
  margin: 0 auto 20px;
}

@keyframes spin {
  0% { transform: rotate(0deg); }
  100% { transform: rotate(360deg); }
}

.results-section {
  background: white;
  border-radius: 12px;
  padding: 30px;
  margin-bottom: 30px;
  box-shadow: 0 4px 20px rgba(0,0,0,0.1);
}

.results-header h2 {
  color: #333;
  margin-bottom: 25px;
}

.players-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(400px, 1fr));
  gap: 20px;
  margin-bottom: 30px;
}

.player-card {
  background: #f8f9fa;
  border: 1px solid #e9ecef;
  border-radius: 8px;
  padding: 20px;
  transition: transform 0.2s ease, box-shadow 0.2s ease;
  position: relative;
}

.player-card:hover {
  transform: translateY(-2px);
  box-shadow: 0 4px 12px rgba(0,0,0,0.15);
}

.player-number {
  position: absolute;
  top: 10px;
  right: 15px;
  background: #667eea;
  color: white;
  width: 30px;
  height: 30px;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  font-weight: bold;
  font-size: 14px;
}

.player-name {
  color: #333;
  margin-bottom: 15px;
  font-size: 1.1rem;
  padding-right: 40px;
}

.player-details {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.detail {
  display: flex;
  gap: 8px;
}

.label {
  font-weight: 600;
  min-width: 80px;
  color: #666;
}

.value {
  color: #333;
}

.value.ttr {
  font-weight: 600;
  color: #28a745;
}

.value.qttr {
  font-weight: 600;
  color: #6c5ce7; /* Lila für Q-TTR */
}

.value.ttr-unavailable {
  font-weight: 500;
  color: #6c757d;
  font-style: italic;
}

.ttr-error {
  margin-left: 5px;
  font-size: 0.8rem;
  cursor: help;
}

.value.licence {
  font-size: 0.9rem;
  color: #6c757d;
}

.pagination {
  display: flex;
  justify-content: center;
  align-items: center;
  gap: 20px;
  margin-top: 30px;
}

.page-button {
  padding: 10px 20px;
  background: #667eea;
  color: white;
  border: none;
  border-radius: 6px;
  cursor: pointer;
  transition: background-color 0.2s ease;
}

.page-button:hover:not(:disabled) {
  background: #5a6fd8;
}

.page-button:disabled {
  background: #ccc;
  cursor: not-allowed;
}

.page-info {
  font-weight: 600;
  color: #333;
}

.footer {
  text-align: center;
  color: white;
  opacity: 0.8;
  margin-top: 40px;
}

.footer p {
  margin-bottom: 10px;
}

.footer a {
  color: #ffd700;
  text-decoration: none;
}

.footer a:hover {
  text-decoration: underline;
}

@media (max-width: 768px) {
  .app {
    padding: 10px;
  }
  
  .title {
    font-size: 2rem;
  }
  
  .search-box {
    flex-direction: column;
  }
  
  .players-grid {
    grid-template-columns: 1fr;
  }
  
  .pagination {
    flex-direction: column;
    gap: 10px;
  }
}

/* Modal Styles */
.modal-overlay {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: rgba(0, 0, 0, 0.7);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 1000;
  animation: fadeIn 0.2s ease;
}

@keyframes fadeIn {
  from {
    opacity: 0;
  }
  to {
    opacity: 1;
  }
}

.modal-content {
  background: white;
  border-radius: 16px;
  padding: 40px;
  max-width: 600px;
  width: 90%;
  max-height: 80vh;
  overflow-y: auto;
  position: relative;
  box-shadow: 0 10px 40px rgba(0, 0, 0, 0.3);
  animation: slideUp 0.3s ease;
}

@keyframes slideUp {
  from {
    transform: translateY(30px);
    opacity: 0;
  }
  to {
    transform: translateY(0);
    opacity: 1;
  }
}

.modal-close {
  position: absolute;
  top: 15px;
  right: 15px;
  background: none;
  border: none;
  font-size: 28px;
  cursor: pointer;
  color: #999;
  width: 40px;
  height: 40px;
  display: flex;
  align-items: center;
  justify-content: center;
  border-radius: 50%;
  transition: all 0.2s ease;
}

.modal-close:hover {
  background: #f0f0f0;
  color: #333;
}

.modal-title {
  font-size: 2rem;
  margin-bottom: 30px;
  color: #333;
  padding-right: 40px;
}

.modal-details {
  display: flex;
  flex-direction: column;
  gap: 20px;
}

.modal-detail-row {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 15px;
  background: #f8f9fa;
  border-radius: 8px;
  transition: background 0.2s ease;
}

.modal-detail-row:hover {
  background: #e9ecef;
}

.modal-label {
  font-weight: 600;
  color: #555;
  font-size: 1.1rem;
}

.modal-value {
  font-size: 1.1rem;
  color: #333;
  font-weight: 500;
}

.modal-value.ttr-value {
  color: #4793E3;
  font-weight: 700;
  font-size: 1.3rem;
}

.modal-value.qttr-value {
  color: #28a745;
  font-weight: 700;
  font-size: 1.3rem;
}
</style>