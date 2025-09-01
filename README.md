# Medical Procedure Dictation App

A secure medical procedure dictation and transcription tool with AI-powered documentation generation.

## 🔐 Security Features

- **Secure API Calls**: All AI processing happens through your own Netlify Functions
- **Environment Variables**: API keys stored securely in Netlify
- **CORS Protection**: Proper cross-origin request handling
- **Input Validation**: Server-side validation of all requests

## 🚀 Setup Instructions

### 1. Install Dependencies
```bash
npm install
```

### 2. Get Google AI API Key
1. Go to [Google AI Studio](https://makersuite.google.com/app/apikey)
2. Create a new API key
3. Copy the key (you'll need it for step 4)

### 2.5. Get Deepgram Speech-to-Text API Key (Recommended)
1. Go to [Deepgram Console](https://console.deepgram.com/)
2. Sign up for a free account (includes 200 hours/month)
3. Create a new API key
4. Copy the key (you'll need it for step 4)

### 3. Deploy to Netlify
1. Push your code to GitHub
2. Connect your repository to Netlify
3. Deploy the site

### 4. Set Environment Variables in Netlify
1. Go to your Netlify dashboard
2. Navigate to **Site settings** → **Environment variables**
3. Add the following variables:
   - **Key**: `GOOGLE_AI_API_KEY`
   - **Value**: Your Google AI API key from step 2
   - **Key**: `DEEPGRAM_API_KEY`
   - **Value**: Your Deepgram API key from step 2.5

### 5. Test the Application
1. Visit your deployed Netlify site
2. Try recording a procedure
3. Check that AI processing works correctly

## 🏗️ Architecture

```
Frontend (Netlify)
    ↓ (secure API call)
Netlify Function (Serverless)
    ↓ (with API key)
Deepgram Speech-to-Text API
    ↓ (transcript)
Google AI API (Gemini Pro)
    ↓ (structured response)
Frontend (Display results)
```

## 🔧 Local Development

```bash
# Install Netlify CLI
npm install -g netlify-cli

# Set up environment variables locally
echo "GOOGLE_AI_API_KEY=your_api_key_here" > .env
echo "DEEPGRAM_API_KEY=your_deepgram_key_here" >> .env

# Run locally
netlify dev
```

## 📁 File Structure

```
├── index.html              # Main application
├── netlify.toml           # Netlify configuration
├── package.json           # Dependencies
├── functions/
│   └── process-transcript.js  # Secure API endpoint
└── README.md              # This file
```

## 🛡️ Security Benefits

- ✅ **No exposed API keys** in frontend code
- ✅ **Rate limiting** through Netlify
- ✅ **Input validation** on server
- ✅ **CORS protection** for cross-origin requests
- ✅ **Environment variable** security
- ✅ **Serverless** - no server maintenance

## 💰 Cost Control

- **Netlify Functions**: Free tier includes 125,000 requests/month
- **Google AI API**: Free tier includes 15 requests/minute, then pay per use
- **Deepgram Speech-to-Text API**: Free tier includes 200 hours/month, then $0.0044 per hour
- **No hidden costs** - you control all API usage

## 🚨 Important Notes

- Keep your Google AI API key secure
- Monitor your API usage in Google AI Studio dashboard
- Consider setting up usage alerts
- The app works offline for speech recognition
- AI processing requires internet connection

## 🆘 Troubleshooting

**"API endpoint not configured" error:**
- Make sure you've set the `GOOGLE_AI_API_KEY` environment variable in Netlify
- Check that your Netlify function is deployed correctly

**"Failed to process transcript" error:**
- Check your Google AI API key is valid
- Verify you have sufficient Google AI credits
- Check Netlify function logs for detailed errors
