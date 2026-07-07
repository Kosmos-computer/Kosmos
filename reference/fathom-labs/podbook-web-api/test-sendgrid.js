const sgMail = require('@sendgrid/mail');
require('dotenv').config();

// Configure SendGrid
sgMail.setApiKey(process.env.SENDGRID_API_KEY);

async function testSendGridEmail() {
  try {
    console.log('🔍 Testing SendGrid email functionality...');
    
    if (!process.env.SENDGRID_API_KEY) {
      console.error('❌ SENDGRID_API_KEY not found in environment variables');
      console.log('💡 Please add SENDGRID_API_KEY to your .env file');
      return;
    }

    const testEmail = 'm.a.mirza.97@gmail.com'; 
    const resetToken = 'test-token-12345';
    
    const msg = {
      to: testEmail,
      from: 'paul@podium.page',
      subject: 'Test Password Reset - Podbook',
      text: `Hello,\n\nThis is a test email for password reset functionality.\n\nReset link: ${process.env.FRONTEND_URL || 'http://localhost:8080'}/reset-password?token=${resetToken}\n\nBest regards,\nThe Podbook Team`,
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
          <h1 style="color: #333;">Test Password Reset Email</h1>
          <p>This is a test email to verify SendGrid integration is working correctly.</p>
          <p>Reset link: <a href="${process.env.FRONTEND_URL || 'http://localhost:8080'}/reset-password?token=${resetToken}">Reset Password</a></p>
        </div>
      `
    };

    console.log('📧 Sending test email...');
    await sgMail.send(msg);
    console.log('✅ Test email sent successfully!');
    console.log(`📬 Email sent to: ${testEmail}`);
    console.log(`📤 From: paul@podium.page`);
    
  } catch (error) {
    console.error('❌ SendGrid test failed:', error.message);
    if (error.response) {
      console.error('📋 Error details:', error.response.body);
    }
  }
}

testSendGridEmail();
