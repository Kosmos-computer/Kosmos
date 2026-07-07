const fetch = require('node-fetch');
require('dotenv').config();

const API_BASE_URL = process.env.API_URL || 'http://localhost:3000';

async function testUserProfileAPI() {
  try {
    console.log('🔍 Testing User Profile API endpoints...');
    
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

    // Test GET user profile
    console.log('\n2. Testing GET /api/users/profile...');
    
    const getProfileResponse = await fetch(`${API_BASE_URL}/api/users/profile`, {
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      }
    });

    if (getProfileResponse.ok) {
      const profileData = await getProfileResponse.json();
      console.log('✅ GET profile successful!');
      console.log('📊 User data:', JSON.stringify(profileData, null, 2));
    } else {
      const errorData = await getProfileResponse.json();
      console.log('❌ GET profile failed:', errorData);
    }

    // Test PUT user profile
    console.log('\n3. Testing PUT /api/users/profile...');
    
    const updateData = {
      name: 'Updated Test User',
      bio: 'This is a test bio update',
      website: 'https://testwebsite.com'
    };

    const updateProfileResponse = await fetch(`${API_BASE_URL}/api/users/profile`, {
      method: 'PUT',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(updateData)
    });

    if (updateProfileResponse.ok) {
      const updatedProfileData = await updateProfileResponse.json();
      console.log('✅ PUT profile successful!');
      console.log('📊 Updated user data:', JSON.stringify(updatedProfileData, null, 2));
    } else {
      const errorData = await updateProfileResponse.json();
      console.log('❌ PUT profile failed:', errorData);
    }

    // Test validation (empty name)
    console.log('\n4. Testing validation (empty name)...');
    
    const invalidUpdateResponse = await fetch(`${API_BASE_URL}/api/users/profile`, {
      method: 'PUT',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        name: '',
        bio: 'This should fail'
      })
    });

    if (!invalidUpdateResponse.ok) {
      const errorData = await invalidUpdateResponse.json();
      console.log('✅ Validation working correctly:', errorData.error);
    } else {
      console.log('❌ Validation failed - empty name was accepted');
    }

  } catch (error) {
    console.error('❌ Test failed:', error.message);
  }
}

testUserProfileAPI();
