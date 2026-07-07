import { Request, Response } from "express";

const { Request, Response } = require('express');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const crypto = require('crypto');
const sgMail = require('@sendgrid/mail');
const { prisma } = require('../config/database');

// Configure SendGrid
sgMail.setApiKey(process.env.SENDGRID_API_KEY);

// Helper function to send password reset email
async function sendPasswordResetEmail(email: string, resetToken: string, userName?: string) {
  const resetUrl = `${process.env.FRONTEND_URL || 'http://localhost:8080'}/reset-password?token=${resetToken}`;
  
  const msg = {
    to: email,
    from: 'paul@podium.page',
    subject: 'Reset Your Password - Podbook',
    text: `Hello${userName ? ` ${userName}` : ''},\n\nYou requested a password reset for your Podbook account. Click the link below to reset your password:\n\n${resetUrl}\n\nThis link will expire in 15 minutes for security reasons.\n\nIf you didn't request this password reset, please ignore this email.\n\nBest regards,\nThe Podbook Team`,
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
        <div style="text-align: center; margin-bottom: 30px;">
          <h1 style="color: #333; margin-bottom: 10px;">Reset Your Password</h1>
          <p style="color: #666; font-size: 16px;">Podbook - AI-Powered Content Transformation</p>
        </div>
        
        <div style="background: #f8f9fa; padding: 30px; border-radius: 8px; margin-bottom: 20px;">
          <p style="color: #333; font-size: 16px; margin-bottom: 20px;">
            Hello${userName ? ` ${userName}` : ''},
          </p>
          
          <p style="color: #333; font-size: 16px; margin-bottom: 20px;">
            You requested a password reset for your Podbook account. Click the button below to reset your password:
          </p>
          
          <div style="text-align: center; margin: 30px 0;">
            <a href="${resetUrl}" 
               style="background: #007bff; color: white; padding: 12px 30px; text-decoration: none; border-radius: 5px; font-size: 16px; font-weight: bold; display: inline-block;">
              Reset Password
            </a>
          </div>
          
          <p style="color: #666; font-size: 14px; margin-bottom: 10px;">
            This link will expire in 15 minutes for security reasons.
          </p>
          
          <p style="color: #666; font-size: 14px;">
            If you didn't request this password reset, please ignore this email.
          </p>
        </div>
        
        <div style="text-align: center; color: #999; font-size: 12px;">
          <p>Best regards,<br>The Podbook Team</p>
        </div>
      </div>
    `
  };

  try {
    await sgMail.send(msg);
    console.log(`Password reset email sent to ${email}`);
  } catch (error) {
    console.error('Error sending password reset email:', error);
    throw error;
  }
}

module.exports.register = async function(req: any, res: any) {
  try {
    const { name, email, password } = req.body;

    // Check if user already exists
    const existingUser = await prisma.user.findUnique({
      where: { email }
    });

    if (existingUser) {
      return res.status(400).json({ error: 'User already exists' });
    }

    // Hash password
    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(password, salt);

    // Create user
    const user = await prisma.user.create({
      data: {
        name,
        email,
        password: hashedPassword
      }
    });

    // Generate JWT token
    const token = jwt.sign(
      { id: user.id, email: user.email, role: user.role },
      process.env.JWT_SECRET || 'fallback-secret',
      { expiresIn: process.env.JWT_EXPIRES_IN || '7d' }
    );

    res.status(201).json({
      message: 'User created successfully',
      token,
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
        role: user.role
      }
    });
  } catch (error) {
    res.status(500).json({ error: 'Server error' });
  }
};

module.exports.login = async function(req: any, res: any) {
  try {
    const { email, password } = req.body;

    // Find user
    const user = await prisma.user.findUnique({
      where: { email }
    });

    if (!user) {
      return res.status(400).json({ error: 'Invalid credentials' });
    }

    // Check password
    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) {
      return res.status(400).json({ error: 'Invalid credentials' });
    }

    // Generate JWT token
    const token = jwt.sign(
      { id: user.id, email: user.email, role: user.role },
      process.env.JWT_SECRET || 'fallback-secret',
      { expiresIn: process.env.JWT_EXPIRES_IN || '7d' }
    );

    // Update last login
    await prisma.user.update({
      where: { id: user.id },
      data: { lastLoginAt: new Date() }
    });

    res.json({
      message: 'Login successful',
      token,
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
        role: user.role
      }
    });
  } catch (error) {
    res.status(500).json({ error: 'Server error' });
  }
};

module.exports.refreshToken = async function(req: any, res: any) {
  // TODO: Implement refresh token logic
  res.status(501).json({ error: 'Not implemented yet' });
};

module.exports.logout = async function(req: any, res: any) {
  // TODO: Implement logout logic (e.g., blacklist token)
  res.json({ message: 'Logout successful' });
};

module.exports.forgotPassword = async function(req: any, res: any) {
  try {
    const { email } = req.body;

    // Always return success to prevent email enumeration attacks
    // Check if user exists but don't reveal the result
    const user = await prisma.user.findUnique({
      where: { email, isActive: true }
    });

    if (user) {
      // Generate secure random token
      const token = crypto.randomBytes(32).toString('hex');
      const expiresAt = new Date(Date.now() + 15 * 60 * 1000); // 15 minutes

      // Store reset token
      await prisma.passwordReset.create({
        data: {
          token,
          email,
          expiresAt,
          userId: user.id
        }
      });

      // Send password reset email
      try {
        await sendPasswordResetEmail(email, token, user.name);
      } catch (emailError) {
        console.error('Failed to send password reset email:', emailError);
        // Don't fail the request if email sending fails - still return success to prevent enumeration
        // The token is still created and valid, user can try again
      }
    }

    // Always return success message
    res.json({ 
      message: 'If an account with that email exists, a password reset link has been sent.' 
    });
  } catch (error) {
    console.error('Forgot password error:', error);
    res.status(500).json({ error: 'Server error' });
  }
};

module.exports.resetPassword = async function(req: any, res: any) {
  try {
    const { token, password } = req.body;

    // Find valid reset token
    const resetRecord = await prisma.passwordReset.findFirst({
      where: {
        token,
        used: false,
        expiresAt: { gt: new Date() }
      },
      include: { user: true }
    });

    if (!resetRecord) {
      return res.status(400).json({ error: 'Invalid or expired reset token' });
    }

    // Hash new password
    const salt = await bcrypt.genSalt(12); // Increased salt rounds for security
    const hashedPassword = await bcrypt.hash(password, salt);

    // Update user password
    await prisma.user.update({
      where: { id: resetRecord.user.id },
      data: { 
        password: hashedPassword,
        updatedAt: new Date()
      }
    });

    // Mark token as used
    await prisma.passwordReset.update({
      where: { id: resetRecord.id },
      data: { 
        used: true,
        usedAt: new Date()
      }
    });

    // Invalidate all existing sessions (optional security measure)
    // This would require implementing a session management system

    res.json({ message: 'Password reset successful' });
  } catch (error) {
    console.error('Reset password error:', error);
    res.status(500).json({ error: 'Server error' });
  }
};
