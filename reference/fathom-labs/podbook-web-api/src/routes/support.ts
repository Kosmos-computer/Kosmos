const { Router } = require('express');
const { AuthRequest } = require('../middleware/auth');
const { prisma } = require('../config/database');
const { authMiddleware } = require('../middleware/auth');
const sgMail = require('@sendgrid/mail');

// Configure SendGrid
sgMail.setApiKey(process.env.SENDGRID_API_KEY);

const router = Router();

// Send support email
router.post('/', authMiddleware, async (req: AuthRequest, res) => {
  try {
    const userId = req.user.id;
    const { subject, message, pageUrl, userEmail } = req.body;

    // Validate required fields
    if (!subject || !message) {
      return res.status(400).json({ error: 'Subject and message are required' });
    }

    // Get user details
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: {
        id: true,
        name: true,
        email: true
      }
    });

    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    // Prepare email content
    const supportEmail = 'abdullah@fathom.fm';
    const emailSubject = `Podbook Support - ${subject}`;
    
    const emailBody = `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
        <div style="background: #f8f9fa; padding: 20px; border-radius: 8px; margin-bottom: 20px;">
          <h2 style="color: #333; margin-bottom: 15px;">New Support Request</h2>
          <p style="color: #666; margin-bottom: 10px;"><strong>From:</strong> ${user.name} (${user.email})</p>
          <p style="color: #666; margin-bottom: 10px;"><strong>Subject:</strong> ${subject}</p>
          <p style="color: #666; margin-bottom: 15px;"><strong>Page URL:</strong> <a href="${pageUrl || 'N/A'}" target="_blank">${pageUrl || 'N/A'}</a></p>
        </div>
        
        <div style="background: #fff; padding: 20px; border: 1px solid #e9ecef; border-radius: 8px;">
          <h3 style="color: #333; margin-bottom: 15px;">Message:</h3>
          <div style="color: #333; line-height: 1.6; white-space: pre-wrap;">${message}</div>
        </div>
        
        <div style="margin-top: 20px; padding: 15px; background: #e3f2fd; border-radius: 8px;">
          <p style="color: #1976d2; margin: 0; font-size: 14px;">
            <strong>Reply directly to:</strong> ${user.email}
          </p>
        </div>
        
        <div style="margin-top: 20px; text-align: center; color: #999; font-size: 12px;">
          <p>This email was sent from the Podbook support system</p>
        </div>
      </div>
    `;

    const textBody = `
New Support Request

From: ${user.name} (${user.email})
Subject: ${subject}
Page URL: ${pageUrl || 'N/A'}

Message:
${message}

Reply directly to: ${user.email}

This email was sent from the Podbook support system
    `;

    // Send email
    const msg = {
      to: supportEmail,
      from: 'paul@podium.page',
      subject: emailSubject,
      text: textBody,
      html: emailBody
    };

    await sgMail.send(msg);

    // Log the support request (optional - you could store in database)
    console.log(`Support request sent from ${user.email}: ${subject}`);

    res.json({ 
      message: 'Support request sent successfully',
      ticketId: `SUP-${Date.now()}` // Simple ticket ID generation
    });

  } catch (error) {
    console.error('Support email error:', error);
    res.status(500).json({ error: 'Failed to send support request' });
  }
});

module.exports = router;
