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

    // Configure the request for Google Speech-to-Text REST API
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

    // Use Google's REST API directly
    console.log('Making request to Google Speech-to-Text API...');
    console.log('API Key present:', !!process.env.GOOGLE_AI_API_KEY);
    
    const response = await fetch(`https://speech.googleapis.com/v1/speech:recognize?key=${process.env.GOOGLE_AI_API_KEY}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(request)
    });

    console.log('Response status:', response.status);
    
    if (!response.ok) {
      const errorData = await response.text();
      console.error('Speech API error:', errorData);
      throw new Error(`Speech API error: ${response.status} - ${errorData}`);
    }

    const result = await response.json();
    
    if (!result.results || result.results.length === 0) {
      return {
        statusCode: 200,
        headers,
        body: JSON.stringify({
          transcript: '',
          confidence: 0,
          isFinal: true
        })
      };
    }

    const transcription = result.results
      .map(result => result.alternatives[0].transcript)
      .join('\n');

    const confidence = result.results
      .map(result => result.alternatives[0].confidence)
      .reduce((a, b) => a + b, 0) / result.results.length;

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
