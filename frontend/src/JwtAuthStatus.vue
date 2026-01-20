<template>
  <div class="auth-status">
    <div v-if="loading" class="loading">
      🔄 Authentifizierungsstatus wird geprüft...
    </div>
    <div v-else-if="authStatus.authenticated" class="authenticated">
      ✅ Authentifiziert (JWT)
      <div class="auth-info">
        {{ authStatus.message }}
      </div>
    </div>
    <div v-else class="not-authenticated">
      ❌ Nicht authentifiziert
      <div class="auth-info">
        JWT-Token nicht konfiguriert. Setzen Sie die Environment-Variable <code>MYTISCHTENNIS_JWT</code>.
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, onMounted } from 'vue'
import api from './api-jwt.js'

const loading = ref(true)
const authStatus = ref({})

const checkAuthStatus = async () => {
  try {
    loading.value = true
    authStatus.value = await api.checkAuthStatus()
  } catch (error) {
    console.error('Fehler beim Prüfen des Auth-Status:', error)
    authStatus.value = { authenticated: false }
  } finally {
    loading.value = false
  }
}

onMounted(() => {
  checkAuthStatus()
})
</script>

<style scoped>
.auth-status {
  padding: 1rem;
  border-radius: 8px;
  margin-bottom: 1rem;
  border: 1px solid #e0e0e0;
}

.authenticated {
  background-color: #d4edda;
  color: #155724;
  border-color: #c3e6cb;
}

.not-authenticated {
  background-color: #f8d7da;
  color: #721c24;
  border-color: #f5c6cb;
}

.loading {
  background-color: #e2e3e5;
  color: #383d41;
  border-color: #d6d8db;
}

.auth-info {
  font-size: 0.9rem;
  margin-top: 0.5rem;
  opacity: 0.8;
}

code {
  background-color: rgba(0,0,0,0.1);
  padding: 0.2rem 0.4rem;
  border-radius: 3px;
  font-family: 'Consolas', 'Monaco', monospace;
}
</style>