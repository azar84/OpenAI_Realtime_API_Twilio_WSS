import dotenv from 'dotenv';
import path from 'path';

// Load environment variables from the root .env file
dotenv.config({ path: path.resolve(process.cwd(), '../../.env') });

/** @type {import('next').NextConfig} */
const nextConfig = {
  env: {
    NEXT_PUBLIC_WS_URL: process.env.NEXT_PUBLIC_WS_URL,
    NEXT_PUBLIC_WEBSOCKET_URL: process.env.NEXT_PUBLIC_WEBSOCKET_URL,
    DATABASE_URL: process.env.DATABASE_URL,
    OPENAI_API_KEY: process.env.OPENAI_API_KEY,
    TWILIO_ACCOUNT_SID: process.env.TWILIO_ACCOUNT_SID,
    TWILIO_AUTH_TOKEN: process.env.TWILIO_AUTH_TOKEN,
    TWILIO_PHONE_NUMBER: process.env.TWILIO_PHONE_NUMBER,
    PORT: process.env.PORT,
    NGROK_AUTHTOKEN: process.env.NGROK_AUTHTOKEN,
    OPENAI_ASSISTANT_ID: process.env.OPENAI_ASSISTANT_ID,
    N8N_WEBHOOK_URL: process.env.N8N_WEBHOOK_URL,
    AUDIO_FORMAT: process.env.AUDIO_FORMAT,
  },
};

export default nextConfig;
