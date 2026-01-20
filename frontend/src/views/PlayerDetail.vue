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
        </div>
      </div>
    </div>
  </div>
</template>

<script>
import { ref, onMounted } from 'vue'
import { useRoute } from 'vue-router'
import api from '../api-jwt.js'

export default {
  name: 'PlayerDetail',
  setup() {
    const route = useRoute()
    const player = ref(null)
    const isLoading = ref(true)
    const error = ref('')

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

    onMounted(() => {
      loadPlayerData()
    })

    return {
      player,
      isLoading,
      error
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

