import dotenv from 'dotenv';
import path from 'path';
import nodemailer from 'nodemailer';

dotenv.config({ path: path.resolve(__dirname, '../../.env') });

async function testEmail() {
  const host = (process.env.SMTP_HOST || '').trim();
  const port = parseInt(process.env.SMTP_PORT || '587', 10);
  const user = (process.env.SMTP_USER || '').trim();
  const rawPass = (process.env.SMTP_PASSWORD || '').trim();
  const pass = rawPass.replace(/\s+/g, '');
  const from = process.env.SMTP_FROM || user;

  console.log('─── SMTP Configuration Check ───');
  console.log('SMTP_HOST:', host || '(empty)');
  console.log('SMTP_PORT:', port);
  console.log('SMTP_USER:', user || '(empty)');
  console.log('SMTP_PASSWORD:', pass ? `[Set: ${pass.length} characters]` : '(empty)');
  console.log('SMTP_FROM:', from);
  console.log('─────────────────────────────────');

  if (!host || !user || !pass) {
    console.error('❌ Error: SMTP_HOST, SMTP_USER, or SMTP_PASSWORD is empty in .env.');
    console.error('Please save your .env file (Ctrl + S) with your Gmail address and 16-digit App Password.');
    return;
  }

  try {
    console.log('Connecting to mail server...');
    const transporter = nodemailer.createTransport(
      host.includes('gmail')
        ? {
            service: 'gmail',
            auth: { user, pass },
          }
        : {
            host,
            port,
            secure: port === 465,
            auth: { user, pass },
          }
    );

    console.log('Verifying SMTP connection credentials...');
    await transporter.verify();
    console.log('✅ SMTP connection verified successfully!');

    console.log(`Sending test email to ${user}...`);
    const info = await transporter.sendMail({
      from,
      to: user,
      subject: '🎓 Smart Attendance System — Test Email',
      html: `
        <div style="font-family: Arial, sans-serif; padding: 20px; max-width: 500px; border: 1px solid #e0e0e0; border-radius: 10px;">
          <h2 style="color: #2563eb;">✅ Email Setup Verified!</h2>
          <p>Congratulations! Your Smart Attendance System email service is fully configured and operational.</p>
          <p>Your OTP codes will now arrive directly in your inbox.</p>
        </div>
      `,
    });

    console.log('🎉 Test email sent successfully! Message ID:', info.messageId);
    console.log('Please check your Gmail inbox on your phone/computer.');
  } catch (error: any) {
    console.error('❌ Email sending failed with error:');
    console.error(error.message || error);
    if (error.code === 'EAUTH') {
      console.error('\n💡 Tip: Gmail authentication failed.');
      console.error('1. Make sure 2-Step Verification is ON in your Google Account.');
      console.error('2. Generate a 16-letter App Password at: https://myaccount.google.com/apppasswords');
      console.error('3. Use the 16-letter App Password in SMTP_PASSWORD (not your personal account password).');
    }
  }
}

testEmail();
