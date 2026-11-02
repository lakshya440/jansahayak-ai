# Jan Sahayak

Jan Sahayak is a Hindi and English chat assistant for general questions and government schemes. Chat answers use Groq, with built-in browser search enabled by default; `sahayak_schemes.json` is not used as the answer catalog. Voice notes can also be transcribed with Groq.

## Run locally

1. Install Node.js 20 or later and create a PostgreSQL database in Neon.
2. Copy `.env.example` to `.env`. Set your Neon `DATABASE_URL`, a long random `AUTH_JWT_SECRET`, and `GROQ_API_KEY`.
3. Run `npm start` and open `http://localhost:3000`.

The app loads `.env` automatically and creates or migrates the `users`, `messages`, `schemes`, `applications`, `conversations`, and `conversation_messages` tables in Neon at startup. `GROQ_CHAT_MODEL` defaults to `openai/gpt-oss-20b`, which supports Groq browser search. `GROQ_FALLBACK_MODEL` defaults to `openai/gpt-oss-120b`. These model IDs can be changed in `.env`; keep a GPT-OSS model if live browser search is required.

Sign up with a name, email, phone, and a password of at least 10 characters. Passwords are stored as scrypt hashes, and login returns a signed JWT held in the browser session. Each application draft references the user's account and a scheme record, so an account can have many applications. Each saved conversation belongs to a user and has many messages. The left sidebar lists the account's saved conversations; chats are saved while logged in. Previous guest-only chats were in browser memory and cannot be recovered. Application drafts are not submitted to government portals. Account deletion removes the user's applications, conversations, and associated WhatsApp chat history. Keep `.env` private.

## Voice and WhatsApp

The browser uses built-in speech recognition when supported. Otherwise, recorded audio is transcribed through Groq using `GROQ_TRANSCRIPTION_MODEL` (default `whisper-large-v3-turbo`). Browser-provided speech recognition is separate and does not use the Groq API key.

The WhatsApp version accepts text and voice notes; voice notes are transcribed through Groq and replies use Groq browser search. To enable WhatsApp, deploy behind HTTPS, configure the webhook URL as `https://YOUR_HOST/webhook/whatsapp`, subscribe to `messages`, and set the same verify token in Meta and `.env`. Set `WHATSAPP_ACCESS_TOKEN` and `WHATSAPP_PHONE_NUMBER_ID` to enable replies. Set `WHATSAPP_APP_SECRET` to verify Meta webhook signatures.

Telegram supports text and voice messages through `POST /webhook/telegram`. Voice notes are downloaded securely from Telegram, limited to 20 MB, transcribed with `GROQ_TRANSCRIPTION_MODEL` (default `whisper-large-v3-turbo`), then answered using the same chat and browser-search logic as the website. Create a bot with [@BotFather](https://t.me/BotFather), add its token as `TELEGRAM_BOT_TOKEN` in Render, and deploy. On startup, the server registers `https://YOUR_RENDER_HOST/webhook/telegram` with Telegram using Telegram's secret-token header for webhook verification. Render provides `RENDER_EXTERNAL_URL`; for another host, set `APP_BASE_URL` to the service's public HTTPS base URL. Check the deploy logs for the bot's `https://t.me/<username>` link, then open it and tap Start. Chat history is stored by Telegram chat when PostgreSQL is configured. Never commit or share the bot token.

When a user asks to apply for a scheme, the web chat can prepare a review-only draft. The user must check it and submit it on the official site; the chatbot does not log into government sites or submit applications.

## Notes

Answers depend on Groq availability, model limits, and browser search. Groq browser search is available with the configured GPT-OSS models; changing to a model that does not support browser search may cause request errors. Verify scheme eligibility and application details on official government pages. For production, add rate limiting and deployment secrets management, complete Meta webhook verification, and establish privacy, retention, and security policies for profile information.
