<template>
  <div class="auth-section" v-if="!isAuthenticated">
    <div class="auth-card">
      <h3>🔐 Anmelden für TTR-Werte</h3>
      <p class="auth-description">
        Melden Sie sich mit Ihren myTischtennis.de Zugangsdaten an, 
        um aktuelle TTR-Werte abzurufen.
      </p>
      
      <form @submit.prevent="handleLogin" class="login-form">
        <div class="form-group">
          <label for="email">E-Mail:</label>
          <input
            id="email"
            v-model="email"
            type="email"
            placeholder="ihre@email.de"
            required
            :disabled="isLoggingIn"
          >
        </div>
        
        <div class="form-group">
          <label for="password">Passwort:</label>
          <input
            id="password"
            v-model="password"
            type="password"
            placeholder="Ihr Passwort"
            required
            :disabled="isLoggingIn"
          >
        </div>
        
        <div v-if="loginError" class="error-message">
          ❌ {{ loginError }}
        </div>
        
        <button 
          type="submit" 
          :disabled="isLoggingIn || !email || !password"
          class="login-button"
        >
          <span v-if="isLoggingIn">🔄</span>
          <span v-else>🔐</span>
          {{ isLoggingIn ? 'Anmeldung...' : 'Anmelden' }}
        </button>
      </form>
      
      <div class="auth-info">
        <p>
          ℹ️ <strong>Hinweis:</strong> Ihre Zugangsdaten werden nur zur Authentifizierung 
          mit der myTischtennis.de API verwendet und nicht gespeichert.
        </p>
      </div>
    </div>
  </div>
  
  <div class="auth-status" v-else>
    <div class="auth-success">
      ✅ <strong>Angemeldet</strong> - TTR-Werte können abgerufen werden
      <button @click="handleLogout" class="logout-button">
        Abmelden
      </button>
    </div>
  </div>
</template>

<script>
import { ref, onMounted } from 'vue'
import api from './api.js'

export default {
  name: 'AuthComponent',
  emits: ['auth-changed'],
  setup(props, { emit }) {
    const email = ref('')
    const password = ref('')
    const isAuthenticated = ref(false)
    const isLoggingIn = ref(false)
    const loginError = ref('')

    // Auth-Status prüfen beim Laden
    const checkAuthStatus = async () => {
      try {
        const status = await api.getAuthStatus()
        isAuthenticated.value = status.authenticated
        emit('auth-changed', status.authenticated)
      } catch (error) {
        console.error('Auth-Status Fehler:', error)
        isAuthenticated.value = false
        emit('auth-changed', false)
      }
    }

    // Login
    const handleLogin = async () => {
      if (!email.value || !password.value) return

      try {
        isLoggingIn.value = true
        loginError.value = ''

        await api.login(email.value, password.value)
        
        // Auth-Status neu prüfen
        await checkAuthStatus()
        
        // Formular zurücksetzen
        email.value = ''
        password.value = ''
        
      } catch (error) {
        loginError.value = error.message
        isAuthenticated.value = false
        emit('auth-changed', false)
      } finally {
        isLoggingIn.value = false
      }
    }

    // Logout
    const handleLogout = async () => {
      try {
        await api.logout()
        isAuthenticated.value = false
        emit('auth-changed', false)
        loginError.value = ''
      } catch (error) {
        console.error('Logout Fehler:', error)
      }
    }

    // Initial auth check
    onMounted(() => {
      checkAuthStatus()
    })

    return {
      email,
      password,
      isAuthenticated,
      isLoggingIn,
      loginError,
      handleLogin,
      handleLogout
    }
  }
}
</script>

<style scoped>
.auth-section {
  margin-bottom: 30px;
}

.auth-card {
  background: white;
  border-radius: 12px;
  padding: 30px;
  box-shadow: 0 4px 20px rgba(0,0,0,0.1);
  border: 2px solid #e3f2fd;
}

.auth-card h3 {
  color: #1976d2;
  margin-bottom: 15px;
  text-align: center;
}

.auth-description {
  color: #666;
  text-align: center;
  margin-bottom: 25px;
  font-size: 0.95rem;
  line-height: 1.5;
}

.login-form {
  max-width: 400px;
  margin: 0 auto;
}

.form-group {
  margin-bottom: 20px;
}

.form-group label {
  display: block;
  margin-bottom: 5px;
  font-weight: 600;
  color: #333;
}

.form-group input {
  width: 100%;
  padding: 12px;
  border: 2px solid #e1e5e9;
  border-radius: 8px;
  font-size: 16px;
  transition: border-color 0.3s ease;
}

.form-group input:focus {
  outline: none;
  border-color: #1976d2;
  box-shadow: 0 0 0 3px rgba(25, 118, 210, 0.1);
}

.login-button {
  width: 100%;
  padding: 15px;
  background: linear-gradient(135deg, #1976d2 0%, #1565c0 100%);
  color: white;
  border: none;
  border-radius: 8px;
  font-size: 16px;
  font-weight: 600;
  cursor: pointer;
  transition: transform 0.2s ease, box-shadow 0.2s ease;
  margin-bottom: 20px;
}

.login-button:hover:not(:disabled) {
  transform: translateY(-2px);
  box-shadow: 0 4px 12px rgba(25, 118, 210, 0.4);
}

.login-button:disabled {
  opacity: 0.6;
  cursor: not-allowed;
  transform: none;
}

.error-message {
  background: #ffebee;
  border: 1px solid #f8bbd9;
  color: #c62828;
  padding: 12px;
  border-radius: 6px;
  margin-bottom: 15px;
  text-align: center;
  font-size: 0.9rem;
}

.auth-info {
  background: #f3f4f6;
  padding: 15px;
  border-radius: 8px;
  border-left: 4px solid #1976d2;
}

.auth-info p {
  margin: 0;
  font-size: 0.85rem;
  color: #666;
}

.auth-status {
  margin-bottom: 20px;
}

.auth-success {
  background: #e8f5e8;
  border: 2px solid #4caf50;
  color: #2e7d32;
  padding: 15px 20px;
  border-radius: 8px;
  display: flex;
  justify-content: space-between;
  align-items: center;
  font-weight: 600;
}

.logout-button {
  padding: 8px 16px;
  background: #f44336;
  color: white;
  border: none;
  border-radius: 6px;
  cursor: pointer;
  font-size: 0.9rem;
  transition: background-color 0.2s ease;
}

.logout-button:hover {
  background: #d32f2f;
}

@media (max-width: 768px) {
  .auth-card {
    padding: 20px;
  }
  
  .auth-success {
    flex-direction: column;
    gap: 10px;
    text-align: center;
  }
}
</style>