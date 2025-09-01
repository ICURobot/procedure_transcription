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
    console.log('Deepgram Speech-to-text function called');
    console.log('Request body length:', event.body ? event.body.length : 'undefined');
    
    const { audioData, encoding = 'webm', sampleRateHertz = 48000, languageCode = 'en-US' } = JSON.parse(event.body);

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

    // Deepgram API configuration
    const deepgramUrl = 'https://api.deepgram.com/v1/listen';
    const deepgramApiKey = process.env.DEEPGRAM_API_KEY;
    
    if (!deepgramApiKey) {
      console.error('DEEPGRAM_API_KEY not found in environment variables');
      return {
        statusCode: 500,
        headers,
        body: JSON.stringify({ error: 'Deepgram API key not configured' })
      };
    }

    // Deepgram request configuration for real-time medical transcription
    const deepgramConfig = {
      model: 'nova-2', // Latest and most accurate model
      language: languageCode,
      encoding: encoding,
      sample_rate: sampleRateHertz,
      punctuate: true,
      diarize: false,
      smart_format: true,
      numerals: true,
      profanity_filter: false,
      redact: false,
      search: [],
      replace: [],
      keywords: [],
      detect_language: false,
      multichannel: false,
      alternatives: 1,
      interim_results: false, // Set to false for final results only
      endpointing: 200, // End of speech detection
      vad_events: false,
      vad_turnoff: 500,
      max_alternatives: 1,
      filler_words: false
    };

    console.log('Making request to Deepgram API...');
    console.log('API Key present:', !!deepgramApiKey);
    console.log('Request payload size:', JSON.stringify(deepgramConfig).length);
    
    // Deepgram supports JSON payloads with base64 audio data
    const requestBody = {
      buffer: audioData // Send base64 encoded audio data
    };
    
    console.log('Audio data type:', typeof audioData);
    console.log('Audio data length:', audioData.length);
    console.log('Request body:', { buffer: 'base64_audio_data...' });

    // Build query string for Deepgram configuration
    const queryParams = new URLSearchParams({
      model: deepgramConfig.model,
      language: deepgramConfig.language,
      encoding: deepgramConfig.encoding,
      sample_rate: deepgramConfig.sample_rate,
      punctuate: deepgramConfig.punctuate.toString(),
      smart_format: deepgramConfig.smart_format.toString(),
      numerals: deepgramConfig.numerals.toString(),
      interim_results: deepgramConfig.interim_results.toString(),
      endpointing: deepgramConfig.endpointing.toString()
    });

    const deepgramUrlWithParams = `${deepgramUrl}?${queryParams.toString()}`;
    console.log('Deepgram URL with params:', deepgramUrlWithParams);

    const response = await fetch(deepgramUrlWithParams, {
      method: 'POST',
      headers: {
        'Authorization': `Token ${deepgramApiKey}`,
        'Content-Type': 'application/json', // Send as JSON as per Deepgram docs
      },
      body: JSON.stringify(requestBody)
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
      .map(result => result.channels[0].alternatives[0].transcript)
      .join(' ');

    const confidence = result.results
      .map(result => result.channels[0].alternatives[0].confidence)
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
    console.error('Deepgram Speech-to-Text error:', error);
    
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
