const speech = require('@google-cloud/speech');

// Initialize Google Cloud Speech client
const speechClient = new speech.SpeechClient({
  keyFilename: process.env.GOOGLE_APPLICATION_CREDENTIALS || undefined,
  credentials: process.env.GOOGLE_CREDENTIALS ? JSON.parse(process.env.GOOGLE_CREDENTIALS) : undefined,
});

exports.handler = async (event, context) => {
  // Enable CORS
  const headers = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'Content-Type',
    'Access-Control-Allow-Methods': 'POST, OPTIONS'
  };

  // Handle preflight requests
  if (event.httpMethod === 'OPTIONS') {
    return {
      statusCode: 200,
      headers,
      body: ''
    };
  }

  try {
    const { audioData, encoding = 'WEBM_OPUS', sampleRateHertz = 48000, languageCode = 'en-US' } = JSON.parse(event.body);

    if (!audioData) {
      return {
        statusCode: 400,
        headers,
        body: JSON.stringify({ error: 'No audio data provided' })
      };
    }

    // Convert base64 audio data to buffer
    const audioBuffer = Buffer.from(audioData, 'base64');

    // Configure the request
    const request = {
      audio: {
        content: audioData
      },
      config: {
        encoding: encoding,
        sampleRateHertz: sampleRateHertz,
        languageCode: languageCode,
        enableAutomaticPunctuation: true,
        enableWordTimeOffsets: false,
        enableWordConfidence: true,
        model: 'medical_dictation', // Use medical model for better accuracy
        useEnhanced: true
      }
    };

    // Perform the transcription
    const [response] = await speechClient.recognize(request);
    
    const transcription = response.results
      .map(result => result.alternatives[0].transcript)
      .join('\n');

    const confidence = response.results
      .map(result => result.alternatives[0].confidence)
      .reduce((a, b) => a + b, 0) / response.results.length;

    return {
      statusCode: 200,
      headers,
      body: JSON.stringify({
        transcript: transcription,
        confidence: confidence,
        isFinal: true
      })
    };

  } catch (error) {
    console.error('Speech-to-Text error:', error);
    
    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({ 
        error: 'Failed to process speech',
        details: error.message 
      })
    };
  }
};
