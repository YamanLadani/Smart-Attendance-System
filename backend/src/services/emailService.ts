import nodemailer from 'nodemailer';
import { env } from '../config/env';
import { logger } from '../utils/logger';

/**
 * Reusable email service with SMTP support and dev-mode console fallback.
 */

let transporter: nodemailer.Transporter | null = null;

export function isSmtpConfigured(): boolean {
  const user = process.env.SMTP_USER || env.SMTP_USER;
  const pass = process.env.SMTP_PASSWORD || env.SMTP_PASSWORD;
  const host = process.env.SMTP_HOST || env.SMTP_HOST;
  return Boolean(host && user && pass);
}

function getTransporter(): nodemailer.Transporter {
  if (!transporter) {
    const user = (process.env.SMTP_USER || env.SMTP_USER || '').trim();
    const pass = (process.env.SMTP_PASSWORD || env.SMTP_PASSWORD || '').replace(/\s+/g, '');
    const host = (process.env.SMTP_HOST || env.SMTP_HOST || '').trim().toLowerCase();

    if (host && user && pass) {
      if (host.includes('gmail')) {
        transporter = nodemailer.createTransport({
          service: 'gmail',
          auth: { user, pass },
        });
      } else {
        transporter = nodemailer.createTransport({
          host: host,
          port: parseInt(process.env.SMTP_PORT || String(env.SMTP_PORT) || '587', 10),
          secure: (process.env.SMTP_PORT || String(env.SMTP_PORT)) === '465',
          auth: { user, pass },
        });
      }
      logger.info('✅ Email transporter initialized with SMTP credentials');
    } else {
      // Dev mode: log emails to console
      transporter = nodemailer.createTransport({
        host: 'localhost',
        port: 1025,
        ignoreTLS: true,
      });
      logger.warn('⚠️  SMTP not configured — emails will be logged to console only');
    }
  }
  return transporter;
}

/**
 * Send an email (or log to console in dev mode).
 */
export async function sendEmail(options: {
  to: string;
  subject: string;
  html: string;
  text?: string;
}): Promise<boolean> {
  try {
    if (!isSmtpConfigured()) {
      // Dev fallback: just log
      logger.info(`📧 [DEV EMAIL] To: ${options.to}`);
      logger.info(`📧 Subject: ${options.subject}`);
      logger.info(`📧 Body:\n${options.text || options.html.replace(/<[^>]*>/g, '')}`);
      return true;
    }

    const transport = getTransporter();
    await transport.sendMail({
      from: env.SMTP_FROM,
      to: options.to,
      subject: options.subject,
      html: options.html,
      text: options.text,
    });

    logger.info(`Email sent successfully to ${options.to}`);
    return true;
  } catch (error) {
    logger.error('Failed to send email:', error);
    return false;
  }
}

/**
 * Send OTP verification email.
 */
export async function sendOtpEmail(to: string, otp: string, purpose: 'verification' | 'password_reset' | 'login'): Promise<boolean> {
  const purposeText = purpose === 'verification' ? 'Email Verification' : purpose === 'login' ? 'Sign In Verification' : 'Password Reset';
  const actionText = purpose === 'verification'
    ? 'verify your email address'
    : purpose === 'login'
    ? 'sign in to your Smart Attendance account'
    : 'reset your password';

  const html = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
</head>
<body style="margin:0;padding:0;font-family:'Segoe UI',Tahoma,Geneva,Verdana,sans-serif;background-color:#f4f7fa;">
  <div style="max-width:500px;margin:40px auto;background:#ffffff;border-radius:12px;overflow:hidden;box-shadow:0 4px 24px rgba(0,0,0,0.08);">
    <!-- Header -->
    <div style="background:linear-gradient(135deg,#2563eb,#06b6d4);padding:32px 24px;text-align:center;">
      <h1 style="color:#ffffff;margin:0;font-size:22px;font-weight:700;">🎓 Smart Attendance System</h1>
      <p style="color:rgba(255,255,255,0.85);margin:8px 0 0;font-size:14px;">${purposeText}</p>
    </div>

    <!-- Body -->
    <div style="padding:32px 24px;">
      <p style="color:#374151;font-size:15px;line-height:1.6;margin:0 0 20px;">
        Hello,<br><br>
        Use the following OTP code to ${actionText}. This code is valid for <strong>${env.OTP_EXPIRY_MINUTES} minutes</strong>.
      </p>

      <!-- OTP Box -->
      <div style="background:#f0f9ff;border:2px dashed #2563eb;border-radius:10px;padding:20px;text-align:center;margin:24px 0;">
        <span style="font-size:36px;font-weight:800;letter-spacing:10px;color:#1e40af;font-family:monospace;">${otp}</span>
      </div>

      <p style="color:#6b7280;font-size:13px;line-height:1.6;margin:20px 0 0;">
        If you did not request this code, please ignore this email. Do not share this code with anyone.
      </p>
    </div>

    <!-- Footer -->
    <div style="background:#f9fafb;padding:16px 24px;text-align:center;border-top:1px solid #e5e7eb;">
      <p style="color:#9ca3af;font-size:11px;margin:0;">
        © ${new Date().getFullYear()} Smart Attendance System — College Academic Platform
      </p>
    </div>
  </div>
</body>
</html>`;

  const text = `Smart Attendance System — ${purposeText}\n\nYour OTP code is: ${otp}\n\nThis code expires in ${env.OTP_EXPIRY_MINUTES} minutes.\n\nIf you did not request this code, please ignore this email.`;

  return sendEmail({ to, subject: `${purposeText} — OTP: ${otp}`, html, text });
}

/**
 * Send welcome email after successful registration.
 */
export async function sendWelcomeEmail(to: string, name: string, role: string): Promise<boolean> {
  const html = `
<!DOCTYPE html>
<html>
<head><meta charset="utf-8"></head>
<body style="margin:0;padding:0;font-family:'Segoe UI',Tahoma,Geneva,Verdana,sans-serif;background-color:#f4f7fa;">
  <div style="max-width:500px;margin:40px auto;background:#ffffff;border-radius:12px;overflow:hidden;box-shadow:0 4px 24px rgba(0,0,0,0.08);">
    <div style="background:linear-gradient(135deg,#2563eb,#06b6d4);padding:32px 24px;text-align:center;">
      <h1 style="color:#ffffff;margin:0;font-size:22px;">🎓 Welcome to Smart Attendance!</h1>
    </div>
    <div style="padding:32px 24px;">
      <p style="color:#374151;font-size:15px;line-height:1.6;">
        Hello <strong>${name}</strong>,<br><br>
        Your <strong>${role}</strong> account has been successfully created. You can now log in and start using the Smart Attendance System.
      </p>
      <div style="text-align:center;margin:24px 0;">
        <a href="${env.CLIENT_URL}/login" style="display:inline-block;background:linear-gradient(135deg,#2563eb,#06b6d4);color:#fff;text-decoration:none;padding:12px 32px;border-radius:8px;font-weight:600;font-size:14px;">
          Go to Login
        </a>
      </div>
    </div>
    <div style="background:#f9fafb;padding:16px 24px;text-align:center;border-top:1px solid #e5e7eb;">
      <p style="color:#9ca3af;font-size:11px;margin:0;">© ${new Date().getFullYear()} Smart Attendance System</p>
    </div>
  </div>
</body>
</html>`;

  return sendEmail({ to, subject: 'Welcome to Smart Attendance System! 🎓', html });
}
