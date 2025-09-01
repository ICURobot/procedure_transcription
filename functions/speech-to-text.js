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
    console.log('Speech-to-text function called');
    console.log('Request body length:', event.body ? event.body.length : 'undefined');
    
    const { audioData, encoding = 'WEBM_OPUS', sampleRateHertz = 48000, languageCode = 'en-US' } = JSON.parse(event.body);

    console.log('Audio data length:', audioData ? audioData.length : 'undefined');
    console.log('Encoding:', encoding);
    console.log('Sample rate:', sampleRateHertz);
    console.log('Language:', languageCode);

    if (!audioData) {
      console.log('No audio data provided');
      return {
        statusCode: 400,
        headers,
        body: JSON.stringify({ error: 'No audio data provided' })
      };
    }

    // Check payload size (Netlify Functions have 6MB limit)
    const payloadSize = event.body.length;
    console.log('Total payload size:', payloadSize, 'bytes');
    if (payloadSize > 6 * 1024 * 1024) {
      console.log('Payload too large:', payloadSize, 'bytes');
      return {
        statusCode: 413,
        headers,
        body: JSON.stringify({ error: 'Payload too large. Maximum 6MB allowed.' })
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
    console.log('Request payload size:', JSON.stringify(request).length);
    
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
