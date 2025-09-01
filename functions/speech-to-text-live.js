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
    console.log('Deepgram Live Streaming function called');
    
    const { audioData, encoding = 'webm', sampleRateHertz = 48000, languageCode = 'en-US' } = JSON.parse(event.body);

    if (!audioData) {
      return {
        statusCode: 400,
        headers,
        body: JSON.stringify({ error: 'No audio data provided' })
      };
    }

    const deepgramApiKey = process.env.DEEPGRAM_API_KEY;
    
    if (!deepgramApiKey) {
      return {
        statusCode: 500,
        headers,
        body: JSON.stringify({ 
          error: 'DEEPGRAM_API_KEY not found in environment variables'
        })
      };
    }

    // Use the pre-recorded API with the correct format for now
    const deepgramUrl = 'https://api.deepgram.com/v1/listen';
    
    // Build query string for Deepgram configuration
    const queryParams = new URLSearchParams({
      model: 'nova-2',
      language: languageCode,
      encoding: encoding,
      sample_rate: sampleRateHertz,
      punctuate: 'true',
      smart_format: 'true',
      numerals: 'true',
      interim_results: 'false',
      endpointing: '200'
    });

    const deepgramUrlWithParams = `${deepgramUrl}?${queryParams.toString()}`;
    console.log('Deepgram URL with params:', deepgramUrlWithParams);

    // Convert base64 to buffer
    const audioBuffer = Buffer.from(audioData, 'base64');
    console.log('Audio buffer size:', audioBuffer.length, 'bytes');
    console.log('Audio encoding:', encoding);
    console.log('Sample rate:', sampleRateHertz);

    const response = await fetch(deepgramUrlWithParams, {
      method: 'POST',
      headers: {
        'Authorization': `Token ${deepgramApiKey}`,
        'Content-Type': 'audio/webm', // Send as raw audio
      },
      body: audioBuffer // Send raw audio buffer
    });

    console.log('Deepgram response status:', response.status);
    
    if (!response.ok) {
      const errorData = await response.text();
      console.error('Deepgram API error:', errorData);
      throw new Error(`Deepgram API error: ${response.status} - ${errorData}`);
    }

    const result = await response.json();
    console.log('Deepgram response:', JSON.stringify(result, null, 2));
    
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
      .join(' ');

    const confidence = result.results
      .map(result => result.alternatives[0].confidence)
      .reduce((a, b) => a + b, 0) / result.results.length;

    console.log('Transcription result:', { transcript: transcription, confidence });

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
    console.error('Deepgram Live Streaming error:', error);
    
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
