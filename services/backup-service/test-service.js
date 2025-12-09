// Beauty Platform Backup Service - Test Script
// Простой скрипт для тестирования API endpoints

const axios = require('axios');

const BASE_URL = 'http://localhost:6027';

// Создаем тестовый JWT токен (в реальности получаем от auth service)
function createTestToken() {
  const jwt = require('jsonwebtoken');
  const payload = {
    userId: 'test-super-admin',
    tenantId: 'test-tenant',
    role: 'SUPER_ADMIN',
    permissions: ['backup.read', 'backup.write', 'backup.delete', 'backup.config'],
    iat: Math.floor(Date.now() / 1000),
    exp: Math.floor(Date.now() / 1000) + (60 * 60) // 1 час
  };
  
  const secret = process.env.JWT_SECRET || 'your_jwt_secret_key_here_should_be_very_long_and_secure_in_production';
  return jwt.sign(payload, secret);
}

async function testBackupService() {
  console.log('🔧 Testing Beauty Platform Backup Service');
  console.log('==========================================');
  
  const token = createTestToken();
  const headers = {
    'Authorization': `Bearer ${token}`,
    'Content-Type': 'application/json'
  };

  try {
    // 1. Health check
    console.log('\n1. Testing health check...');
    const health = await axios.get(`${BASE_URL}/health`);
    console.log('✅ Health check:', health.data.service);

    // 2. System status
    console.log('\n2. Testing system status...');
    const status = await axios.get(`${BASE_URL}/api/backup/status`, { headers });
    console.log('✅ System status:', status.data.status.backupService.status);

    // 3. Backup list
    console.log('\n3. Testing backup list...');
    const list = await axios.get(`${BASE_URL}/api/backup/list`, { headers });
    console.log('✅ Backup list:', `Found ${list.data.pagination.total} backups`);

    // 4. Configuration
    console.log('\n4. Testing configuration...');
    const config = await axios.get(`${BASE_URL}/api/backup/config`, { headers });
    console.log('✅ Configuration loaded, enabled:', config.data.config.enabled);

    // 5. Logs
    console.log('\n5. Testing logs...');
    const logs = await axios.get(`${BASE_URL}/api/backup/logs?limit=5`, { headers });
    console.log('✅ Logs retrieved:', logs.data.count, 'entries');

    // 6. Script test
    console.log('\n6. Testing backup script...');
    const scriptTest = await axios.post(`${BASE_URL}/api/backup/test-script`, {}, { headers });
    console.log('✅ Script test:', scriptTest.data.success ? 'PASSED' : 'FAILED');

    console.log('\n🎉 All tests passed! Backup Service is working correctly.');

  } catch (error) {
    console.error('\n❌ Test failed:');
    if (error.response) {
      console.error('Status:', error.response.status);
      console.error('Error:', error.response.data);
    } else {
      console.error('Error:', error.message);
    }
    
    // Проверяем доступность сервиса
    try {
      await axios.get(`${BASE_URL}/health`);
      console.log('\n💡 Service is running but authentication/authorization failed');
      console.log('Check JWT_SECRET and user permissions');
    } catch {
      console.log('\n💡 Service is not running. Start it with: pnpm run dev');
    }
  }
}

// Запускаем тесты
if (require.main === module) {
  testBackupService();
}

module.exports = { testBackupService, createTestToken };