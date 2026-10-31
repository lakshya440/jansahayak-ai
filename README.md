# Jan Sahayak

A bilingual (Hindi/English) government-scheme assistant for farmers and students. This hackathon demo uses the local `sahayak_schemes.json` metadata to answer scheme questions without online search or Gemini text-generation calls.

## Run locally

1. Install Node.js 20 or later and create a PostgreSQL database in Neon.
2. Copy `.env.example` to `.env`, set your Neon `DATABASE_URL`, and set `AUTH_JWT_SECRET` to a long random secret. Text chat uses the built-in scheme data and does not need a Gemini API key.
3. Run `npm start` and open `http://localhost:3000`.

The app loads `.env` automatically and creates or migrates the `users`, `messages`, `schemes`, `applications`, `conversations`, and `conversation_messages` tables in Neon at startup. The local scheme catalog is synchronized into `schemes`. After starting, check the terminal for “PostgreSQL schema is ready.” Sign up with a name, email, phone, and a password of at least 10 characters; passwords are stored as scrypt hashes. Login returns a signed JWT that the browser keeps for the current session. Each application draft has foreign keys to `users.id` and `schemes.id`, so one account can own many application drafts and each scheme can be referenced by many users. Each saved conversation belongs to a user and has many messages. The left sidebar lists that account's saved conversations; chats are saved only while logged in. Conversation history begins after this update; prior guest-only chats were only in browser memory and cannot be recovered. Saved applications start with `draft` status; users can mark a record submitted after completing the application on the official site. This does not submit forms for them. Account deletion removes that user's applications, conversations, and associated WhatsApp chat history. Keep `.env` private.

## WhatsApp setup

The browser microphone uses browser speech recognition when supported, then sends the transcript to the local metadata responder. Browsers without speech recognition use the Gemini transcription endpoint, which needs `GEMINI_API_KEY`. Asking to apply opens a local demo draft form, prefilled from the saved profile when available. The draft is not saved or submitted to a government portal; it only provides a review preview and official-site link. The WhatsApp version does not collect application credentials or submit forms. For WhatsApp, deploy behind HTTPS, configure the webhook URL as `https://YOUR_HOST/webhook/whatsapp`, subscribe to `messages`, and set the same verify token in Meta and `.env`. Set `WHATSAPP_ACCESS_TOKEN` and `WHATSAPP_PHONE_NUMBER_ID` to enable replies. Set `WHATSAPP_APP_SECRET` to verify Meta webhook signatures. WhatsApp voice notes are transcribed through Gemini and therefore still require API access/quota.

## Important

The contents of `sahayak_schemes.json` are fictional/demo metadata and may include inaccurate benefits, eligibility, or contact details. The app labels every answer as demo information; do not use it to make real application decisions. For production, replace the demo records with a reviewed data source, add rate limiting and deployment secrets management, complete Meta webhook verification, and establish privacy, retention and security policies for profile information.
