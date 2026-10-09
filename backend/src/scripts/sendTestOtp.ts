import dotenv from 'dotenv';
import path from 'path';
dotenv.config({ path: path.resolve(__dirname, '../../.env') });

import { connectDB } from '../config/db';
import { sendPreRegistrationOtp } from '../services/otpService';

async function main() {
  await connectDB();
  const targetEmail = 'travelplanner0104@gmail.com';
  console.log(`Sending live Pre-Registration OTP to ${targetEmail}...`);
  const res = await sendPreRegistrationOtp(targetEmail);
  console.log('Result:', res);
  process.exit(0);
}

main();
