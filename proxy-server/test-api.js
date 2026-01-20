#!/usr/bin/env node

import axios from 'axios';
import https from 'https';
import dotenv from 'dotenv';

// .env-Datei laden
dotenv.config();

const JWT_TOKEN = process.env.MYTISCHTENNIS_JWT || '';

// HTTPS Agent mit deaktivierter SSL-Verifikation
const httpsAgent = new https.Agent({
  rejectUnauthorized: false
});

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
});

async function testAuthentication() {
  console.log('🧪 Teste myTischtennis.de API Authentifizierung\n');
  
  if (!JWT_TOKEN) {
    console.log('❌ Kein JWT-Token gefunden');
    return;
  }
  
  console.log('✅ JWT-Token vorhanden\n');
  
  // Test 1: Öffentliche API (Spielersuche) - ohne Auth
  console.log('Test 1: Öffentliche API (Spielersuche)');
  try {
    const searchParams = new URLSearchParams();
    searchParams.append('query', 'Mueller');
    searchParams.append('page', '1');
    searchParams.append('pagesize', '5');
    
    const response = await apiClient.post('/api/search/players', searchParams, {
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded'
      }
    });
    
    console.log('   ✅ Spielersuche erfolgreich');
    console.log('   📊 Gefundene Spieler:', response.data.results?.length || 0);
    
    if (response.data.results && response.data.results.length > 0) {
      const firstPlayer = response.data.results[0];
      console.log(`   👤 Beispiel-Spieler: ${firstPlayer.name} (NUID: ${firstPlayer.internal_id})`);
      
      // Test 2: Authentifizierte API (TTR-Wert)
      console.log('\nTest 2: Authentifizierte API (TTR-Wert)');
      try {
        const ttrResponse = await apiClient.get(`/api/ttr/player/${firstPlayer.internal_id}`, {
          headers: {
            'Cookie': `sb-10-auth-token=${JWT_TOKEN}`
          }
        });
        
        console.log('   ✅ TTR-Abruf erfolgreich');
        console.log('   ⭐ TTR-Wert:', ttrResponse.data.ttr || 'Nicht verfügbar');
        console.log('   🎯 Authentifizierung: ✅ FUNKTIONIERT');
        
      } catch (error) {
        console.log('   ❌ TTR-Abruf fehlgeschlagen');
        console.log('   🔍 HTTP Status:', error.response?.status);
        console.log('   📝 Fehler:', error.response?.data || error.message);
        console.log('   🎯 Authentifizierung: ❌ PROBLEM');
      }
      
      // Test 3: Authentifizierte API (TTR-Historie)
      console.log('\nTest 3: Authentifizierte API (TTR-Historie)');
      try {
        const historyResponse = await apiClient.get(`/api/ttr/history/${firstPlayer.internal_id}`, {
          headers: {
            'Cookie': `sb-10-auth-token=${JWT_TOKEN}`
          }
        });
        
        console.log('   ✅ TTR-Historie erfolgreich');
        console.log('   👤 Spieler:', historyResponse.data.person_name || 'Unbekannt');
        console.log('   🏓 Verein:', historyResponse.data.club_name || 'Unbekannt');
        console.log('   🎯 Authentifizierung: ✅ FUNKTIONIERT');
        
      } catch (error) {
        console.log('   ❌ TTR-Historie fehlgeschlagen');
        console.log('   🔍 HTTP Status:', error.response?.status);
        console.log('   📝 Fehler:', error.response?.data || error.message);
        console.log('   🎯 Authentifizierung: ❌ PROBLEM');
      }
    }
    
  } catch (error) {
    console.log('   ❌ Spielersuche fehlgeschlagen');
    console.log('   🔍 HTTP Status:', error.response?.status);
    console.log('   📝 Fehler:', error.response?.data || error.message);
  }
  
  console.log('\n🏁 Test abgeschlossen');
}

testAuthentication().catch(console.error);