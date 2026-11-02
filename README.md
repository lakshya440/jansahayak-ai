# Jan Sahayak

Jan Sahayak is a Hindi and English chat assistant for general questions and government schemes. Chat answers use Groq, with built-in browser search enabled by default; `sahayak_schemes.json` is not used as the answer catalog. Voice notes can also be transcribed with Groq.

## Run locally

1. Install Node.js 20 or later and create a PostgreSQL database in Neon.
2. Copy `.env.example` to `.env`. Set your Neon `DATABASE_URL`, a long random `AUTH_JWT_SECRET`, and `GROQ_API_KEY`.
3. Run `npm start` and open `http://localhost:3000`.

The app loads `.env` automatically and creates or migrates the `users`, `messages`, `schemes`, `applications`, `conversations`, and `conversation_messages` tables in Neon at startup. `GROQ_CHAT_MODEL` defaults to `openai/gpt-oss-20b`, which supports Groq browser search. `GROQ_FALLBACK_MODEL` defaults to `openai/gpt-oss-120b`. These model IDs can be changed in `.env`; keep a GPT-OSS model if live browser search is required.

Sign up with a name, email, phone, and a password of at least 10 characters. Passwords are stored as scrypt hashes, and login returns a signed JWT held in the browser session. Each application draft references the user's account and a scheme record, so an account can have many applications. Each saved conversation belongs to a user and has many messages. The left sidebar lists the account's saved conversations; chats are saved while logged in. Previous guest-only chats were in browser memory and cannot be recovered. Application drafts are not submitted to government portals. Account deletion removes the user's applications, conversations, and associated WhatsApp chat history. Keep `.env` private.

## Voice and WhatsApp

## Mock NSP sandbox

Open `/mock-nsp` while the app is running to use the fictional scholarship registration sandbox. The Jan Sahayak document assistant is embedded in the left column and fills reviewed demo values into the form after the mock login and captcha. The demo OTP is `123456` and captcha is `7K2M`. It includes a simulated identity step, student and bank form, review, and fake application confirmation. It stores no data and has no connection to NSP, DigiLocker, UIDAI, or other government services. Use invented details only.

The application assistant can read JPG, PNG, WebP, and PDF documents locally in the browser using Tesseract.js and PDF.js. OCR supports English and Hindi; PDF text is read directly when available, otherwise up to four pages are rendered for OCR. The first OCR run downloads the language model from jsDelivr. The document itself is not uploaded. Extracted values are suggestions and must be reviewed; this is OCR, not document authenticity verification.

## Mock eShram sandbox

Open `/mock-eshram` from the Jan Sahayak sidebar or directly while the app is running. This practice portal is based on the local `e-shram` project and uses fictional values only. The registration demo accepts any 10-digit mobile number, captcha `7K2M`, and demo OTP `123456`, then lets the user review fictional worker details. It stores no data, sends no OTP, and has no connection to the real eShram service. The Sahayak browser guide supports this page and can point out the visible fields and navigation links; users enter values and control every step.

## Sahayak scheme page guide extension

`extension/` contains a Manifest V3 Chromium extension that helps users navigate scheme registration and application pages. Load it from `chrome://extensions` (or the equivalent extensions page in Chromium) with Developer mode enabled and choose **Load unpacked**, selecting this repository's `extension` folder. Open a supported scheme page, click the Sahayak toolbar icon, then choose **Start crawler on this page**. The on-page guide identifies the current step, visible required fields, and likely page actions; **Show** scrolls to a field when available. It rescans after page changes, including multi-step forms. Use the extension popup or the guide's close button to stop it.

The extension supports HTTPS `.gov.in` and `.nic.in` pages plus the local `/mock-nsp` and `/mock-eshram` sandboxes. Page inspection is local to the browser tab. Sahayak does not read a saved profile or documents, fill fields, click portal controls, solve verification, or submit forms. OTP, CAPTCHA, identity checks, answers, and navigation remain under the user's control. It is a navigation guide, not an official government integration or a guarantee that every portal can be recognized.

The browser uses built-in speech recognition when supported. Otherwise, recorded audio is transcribed through Groq using `GROQ_TRANSCRIPTION_MODEL` (default `whisper-large-v3-turbo`). Browser-provided speech recognition is separate and does not use the Groq API key.

The WhatsApp version accepts text and voice notes; voice notes are transcribed through Groq and replies use Groq browser search. To enable WhatsApp, deploy behind HTTPS, configure the webhook URL as `https://YOUR_HOST/webhook/whatsapp`, subscribe to `messages`, and set the same verify token in Meta and `.env`. Set `WHATSAPP_ACCESS_TOKEN` and `WHATSAPP_PHONE_NUMBER_ID` to enable replies. Set `WHATSAPP_APP_SECRET` to verify Meta webhook signatures.

Telegram supports text and voice messages through `POST /webhook/telegram`. Voice notes are downloaded securely from Telegram, limited to 20 MB, transcribed with `GROQ_TRANSCRIPTION_MODEL` (default `whisper-large-v3-turbo`), then answered using the same chat and browser-search logic as the website. Create a bot with [@BotFather](https://t.me/BotFather), add its token as `TELEGRAM_BOT_TOKEN` in Render, and deploy. On startup, the server registers `https://YOUR_RENDER_HOST/webhook/telegram` with Telegram using Telegram's secret-token header for webhook verification. Render provides `RENDER_EXTERNAL_URL`; for another host, set `APP_BASE_URL` to the service's public HTTPS base URL. Check the deploy logs for the bot's `https://t.me/<username>` link, then open it and tap Start. Chat history is stored by Telegram chat when PostgreSQL is configured. Never commit or share the bot token.

When a user asks to apply for a scheme, the web chat can prepare a review-only draft. The user must check it and submit it on the official site; the chatbot does not log into government sites or submit applications.

## Notes

Answers depend on Groq availability, model limits, and browser search. Groq browser search is available with the configured GPT-OSS models; changing to a model that does not support browser search may cause request errors. Verify scheme eligibility and application details on official government pages. For production, add rate limiting and deployment secrets management, complete Meta webhook verification, and establish privacy, retention, and security policies for profile information.
