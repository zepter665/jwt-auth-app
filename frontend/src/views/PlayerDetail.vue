<template>
  <div class="player-detail">
    <div class="detail-overlay">
      <div class="detail-content">
        <!-- Lade-Animation -->
        <div v-if="isLoading" class="loading">
          <div class="spinner"></div>
          <p>Lade Spielerdaten...</p>
        </div>

        <!-- Fehleranzeige -->
        <div v-if="error && !isLoading" class="error-message">
          <p>❌ {{ error }}</p>
          <router-link to="/" class="back-button">Zurück zur Suche</router-link>
        </div>

        <!-- Spielerdaten -->
        <div v-if="player && !isLoading">
          <router-link to="/" class="modal-close">✕</router-link>
          <h2 class="modal-title">{{ player.name }}</h2>
          
          <div class="modal-details">
            <div class="modal-detail-row">
              <span class="modal-label">🆔 NUID:</span>
              <span class="modal-value">{{ player.nuid }}</span>
            </div>
            
            <div class="modal-detail-row">
              <span class="modal-label">🏛️ Verein:</span>
              <span class="modal-value">{{ player.club }}</span>
            </div>
            
            <div class="modal-detail-row" v-if="player.ttr && player.ttr !== 'N/A'">
              <span class="modal-label">⭐ TTR:</span>
              <span class="modal-value ttr-value">{{ player.ttr }}</span>
            </div>
            
            <div class="modal-detail-row" v-if="player.qttr">
              <span class="modal-label">📊 Q-TTR:</span>
              <span class="modal-value qttr-value">{{ player.qttr }}</span>
            </div>
            
            <div class="modal-detail-row" v-if="player.licence && player.licence !== player.club">
              <span class="modal-label">📋 Lizenz:</span>
              <span class="modal-value">{{ player.licence }}</span>
            </div>
          </div>

          <!-- Match-Statistiken Section -->
          <div class="match-statistics-section">
            <h3 class="section-title">
              Match-Statistiken (letzte 3 Monate)
              <button 
                @click="loadMatchStatistics" 
                :disabled="isLoadingStats"
                class="refresh-button"
              >
                <svg viewBox="0 0 24 24" width="16" height="16" stroke="currentColor" stroke-width="2" fill="none" stroke-linecap="round" stroke-linejoin="round">
                  <polyline points="23,4 23,10 17,10"></polyline>
                  <path d="M20.49,15a9,9,0,1,1-2.12-9.36L23,10"></path>
                </svg>
              </button>
            </h3>
            
            <!-- Lade-Animation für Stats -->
            <div v-if="isLoadingStats" class="stats-loading">
              <div class="spinner-small"></div>
              <p>Lade Match-Statistiken...</p>
            </div>

            <!-- Fehler bei Stats -->
            <div v-else-if="statsError" class="stats-error">
              <p>⚠️ {{ statsError }}</p>
            </div>

            <!-- Match-Statistiken anzeigen -->
            <div v-else-if="matchStats && matchStats.length > 0" class="match-stats">
              <div class="stats-summary">
                <div class="stat-card">
                  <div class="stat-number">{{ matchStats.length }}</div>
                  <div class="stat-label">Spiele</div>
                </div>
                <div class="stat-card">
                  <div class="stat-number">{{ getWins() }}</div>
                  <div class="stat-label">Siege</div>
                </div>
                <div class="stat-card">
                  <div class="stat-number">{{ getLosses() }}</div>
                  <div class="stat-label">Niederlagen</div>
                </div>
                <div class="stat-card">
                  <div class="stat-number">{{ getWinRate() }}%</div>
                  <div class="stat-label">Siegquote</div>
                </div>
              </div>

              <!-- Recent matches list -->
              <div class="recent-matches">
                <h4>Letzte Spiele:</h4>
                <div class="matches-list">
                  <div 
                    v-for="(match, index) in recentMatches" 
                    :key="index"
                    class="match-item"
                    :class="{ 'win': match.result === 'Win', 'loss': match.result === 'Loss' }"
                  >
                    <div class="match-date">{{ formatDate(match.date) }}</div>
                    <div class="match-result">
                      <span class="opponent">vs {{ match.opponent }}</span>
                      <span class="score">{{ match.score }}</span>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            <!-- Keine Spiele gefunden -->
            <div v-else class="no-matches">
              <p>📭 Keine Spiele in den letzten 3 Monaten gefunden</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script>
import { ref, onMounted, computed } from 'vue'
import { useRoute } from 'vue-router'
import api from '../api-jwt.js'

export default {
  name: 'PlayerDetail',
  setup() {
    const route = useRoute()
    const player = ref(null)
    const isLoading = ref(true)
    const error = ref('')
    
    // Match-Statistiken State
    const matchStats = ref([])
    const isLoadingStats = ref(false)
    const statsError = ref('')

    const loadPlayerData = async () => {
      const nuid = route.params.nuid
      
      if (!nuid) {
        error.value = 'Keine Spieler-ID angegeben'
        isLoading.value = false
        return
      }

      try {
        isLoading.value = true
        error.value = ''

        // Lade Spieler direkt über NUID
        const playerData = await api.getPlayerByNuid(nuid)
        
        // Formatiere Spielerdaten
        player.value = api.formatPlayer(playerData)
        
        // Automatisch Match-Stats laden
        loadMatchStatistics()
        
      } catch (err) {
        if (err.response?.status === 404) {
          error.value = `Kein Spieler mit der ID ${nuid} gefunden`
        } else {
          error.value = `Fehler beim Laden der Spielerdaten: ${err.message}`
        }
        console.error('Fehler:', err)
      } finally {
        isLoading.value = false
      }
    }

    const loadMatchStatistics = async () => {
      if (!route.params.nuid) return
      
      try {
        isLoadingStats.value = true
        statsError.value = ''
        
        const result = await api.getPlayerMatchStatistics(route.params.nuid, 3)
        
        if (result.success) {
          matchStats.value = result.matches || []
        } else {
          statsError.value = result.error || 'Fehler beim Laden der Match-Statistiken'
        }
        
      } catch (err) {
        statsError.value = `Fehler beim Laden der Match-Statistiken: ${err.message}`
        console.error('Match-Stats Fehler:', err)
      } finally {
        isLoadingStats.value = false
      }
    }

    // Computed functions for statistics
    const getWins = () => {
      return matchStats.value.filter(match => 
        match.won || 
        match.result === 'win' || 
        match.result === 'Win'
      ).length
    }

    const getLosses = () => {
      return matchStats.value.filter(match => 
        !match.won && 
        match.result !== 'win' && 
        match.result !== 'Win'
      ).length
    }

    const getWinRate = () => {
      if (matchStats.value.length === 0) return 0
      return Math.round((getWins() / matchStats.value.length) * 100)
    }

    const recentMatches = computed(() => {
      return matchStats.value.slice(0, 10) // Zeige nur die letzten 10 Spiele
    })

    const formatDate = (dateString) => {
      try {
        return new Date(dateString).toLocaleDateString('de-DE')
      } catch {
        return dateString
      }
    }

    onMounted(() => {
      loadPlayerData()
    })

    return {
      player,
      isLoading,
      error,
      matchStats,
      isLoadingStats,
      statsError,
      recentMatches,
      loadMatchStatistics,
      getWins,
      getLosses, 
      getWinRate,
      formatDate
    }
  }
}
</script>

<style scoped>
.player-detail {
  min-height: 100vh;
  background: #4793E3;
}

.detail-overlay {
  min-height: 100vh;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 20px;
}

.detail-content {
  background: white;
  border-radius: 16px;
  padding: 40px;
  max-width: 600px;
  width: 100%;
  max-height: 80vh;
  overflow-y: auto;
  position: relative;
  box-shadow: 0 10px 40px rgba(0, 0, 0, 0.3);
  animation: slideUp 0.3s ease;
}

/* Custom Scrollbar für detail-content */
.detail-content::-webkit-scrollbar {
  width: 8px;
}

.detail-content::-webkit-scrollbar-track {
  background: transparent;
  border-radius: 10px;
}

.detail-content::-webkit-scrollbar-thumb {
  background: rgba(71, 147, 227, 0.3);
  border-radius: 10px;
  transition: background 0.2s;
}

.detail-content::-webkit-scrollbar-thumb:hover {
  background: rgba(71, 147, 227, 0.6);
}

/* Match-Statistiken Styling */
.match-statistics-section {
  margin-top: 30px;
  padding-top: 20px;
  border-top: 2px solid #e1e5e9;
}

.section-title {
  display: flex;
  align-items: center;
  gap: 10px;
  font-size: 1.3em;
  font-weight: 600;
  color: #2c3e50;
  margin-bottom: 20px;
}

.refresh-button {
  background: #3498db;
  border: none;
  color: white;
  width: 32px;
  height: 32px;
  border-radius: 50%;
  cursor: pointer;
  font-size: 14px;
  transition: all 0.2s;
}

.refresh-button:hover {
  background: #2980b9;
  transform: rotate(180deg);
}

.stats-loading, .stats-error, .no-matches {
  text-align: center;
  padding: 20px;
  color: #7f8c8d;
}

.spinner-small {
  width: 20px;
  height: 20px;
  border: 2px solid #e3e3e3;
  border-top: 2px solid #3498db;
  border-radius: 50%;
  animation: spin 1s linear infinite;
  margin: 0 auto 10px;
}

.stats-summary {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(120px, 1fr));
  gap: 15px;
  margin-bottom: 25px;
}

.stat-card {
  background: #4793E3;
  color: white;
  padding: 20px;
  border-radius: 12px;
  text-align: center;
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
}

.stat-number {
  font-size: 2em;
  font-weight: 700;
  margin-bottom: 5px;
}

.stat-label {
  font-size: 0.9em;
  opacity: 0.9;
}

.recent-matches h4 {
  margin-bottom: 15px;
  color: #2c3e50;
  font-size: 1.1em;
}

.matches-list {
  max-height: 300px;
  overflow-y: auto;
}

/* Custom Scrollbar für matches-list */
.matches-list::-webkit-scrollbar {
  width: 6px;
}

.matches-list::-webkit-scrollbar-track {
  background: transparent;
  border-radius: 10px;
}

.matches-list::-webkit-scrollbar-thumb {
  background: rgba(71, 147, 227, 0.3);
  border-radius: 10px;
  transition: background 0.2s;
}

.matches-list::-webkit-scrollbar-thumb:hover {
  background: rgba(71, 147, 227, 0.6);
}

.match-item {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 12px 16px;
  margin: 8px 0;
  border-radius: 8px;
  border-left: 4px solid;
  background: #f8f9fa;
  transition: transform 0.2s;
}

.match-item:hover {
  transform: translateX(5px);
}

.match-item.win {
  border-left-color: #27ae60;
  background: linear-gradient(90deg, rgba(39, 174, 96, 0.1), rgba(39, 174, 96, 0.05));
}

.match-item.loss {
  border-left-color: #e74c3c;
  background: linear-gradient(90deg, rgba(231, 76, 60, 0.1), rgba(231, 76, 60, 0.05));
}

.match-date {
  font-size: 0.9em;
  color: #7f8c8d;
  min-width: 90px;
}

.match-result {
  display: flex;
  align-items: center;
  gap: 8px;
  flex: 1;
}

.result-icon {
  font-size: 1.2em;
}

.opponent {
  font-weight: 500;
  color: #2c3e50;
  flex: 1;
}

.score {
  font-family: 'Consolas', monospace;
  font-weight: 600;
  min-width: 60px;
  text-align: right;
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
  text-decoration: none;
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

.loading {
  text-align: center;
  padding: 40px;
  color: #333;
}

.spinner {
  width: 40px;
  height: 40px;
  border: 4px solid rgba(71, 147, 227, 0.3);
  border-left: 4px solid #4793E3;
  border-radius: 50%;
  animation: spin 1s linear infinite;
  margin: 0 auto 20px;
}

@keyframes spin {
  0% { transform: rotate(0deg); }
  100% { transform: rotate(360deg); }
}

.error-message {
  text-align: center;
  padding: 20px;
}

.error-message p {
  color: #721c24;
  background: #f8d7da;
  border: 1px solid #f5c6cb;
  border-radius: 8px;
  padding: 15px;
  margin-bottom: 15px;
}

.back-button {
  display: inline-block;
  padding: 10px 20px;
  background: #4793E3;
  color: white;
  text-decoration: none;
  border-radius: 8px;
  transition: background 0.2s ease;
}

.back-button:hover {
  background: #3578c4;
}

@media (max-width: 768px) {
  .detail-content {
    padding: 30px 20px;
  }
  
  .modal-title {
    font-size: 1.5rem;
  }
  
  .modal-label,
  .modal-value {
    font-size: 1rem;
  }
  
  .modal-value.ttr-value,
  .modal-value.qttr-value {
    font-size: 1.1rem;
  }
}
</style>

