const fetch = require('node-fetch');
require('dotenv').config();

const API_BASE_URL = process.env.API_URL || 'http://localhost:3000';

async function testSupportAPI() {
  try {
    console.log('🔍 Testing Support API endpoint...');
    
    // First, let's try to login to get a token
    console.log('\n1. Testing login to get authentication token...');
    
    const loginResponse = await fetch(`${API_BASE_URL}/api/auth/login`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        email: 'test@example.com', // Change this to a real test user
        password: 'testpassword'   // Change this to the real password
      })
    });

    if (!loginResponse.ok) {
      console.log('❌ Login failed. Please ensure you have a test user in the database.');
      console.log('💡 You can create a test user by running the registration endpoint first.');
      return;
    }

    const loginData = await loginResponse.json();
    const token = loginData.token;
    console.log('✅ Login successful!');

    // Test support email
    console.log('\n2. Testing POST /api/support...');
    
    const supportData = {
      subject: 'Test Support Request',
      message: 'This is a test support message to verify the email functionality works correctly.',
      pageUrl: 'https://podbook.com/project/123',
      userEmail: 'test@example.com'
    };

    const supportResponse = await fetch(`${API_BASE_URL}/api/support`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(supportData)
    });

    if (supportResponse.ok) {
      const supportResult = await supportResponse.json();
      console.log('✅ Support request sent successfully!');
      console.log('📊 Response:', JSON.stringify(supportResult, null, 2));
      console.log('📧 Check your email at m.a.mirza.97@gmail.com for the support email');
    } else {
      const errorData = await supportResponse.json();
      console.log('❌ Support request failed:', errorData);
    }

    // Test validation (missing subject)
    console.log('\n3. Testing validation (missing subject)...');
    
    const invalidSupportResponse = await fetch(`${API_BASE_URL}/api/support`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        subject: '',
        message: 'This should fail'
      })
    });

    if (!invalidSupportResponse.ok) {
      const errorData = await invalidSupportResponse.json();
      console.log('✅ Validation working correctly:', errorData.error);
    } else {
      console.log('❌ Validation failed - empty subject was accepted');
    }

  } catch (error) {
    console.error('❌ Test failed:', error.message);
  }
}

testSupportAPI();
