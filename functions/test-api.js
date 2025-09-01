exports.handler = async (event, context) => {
  const headers = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'Content-Type',
    'Access-Control-Allow-Methods': 'GET, OPTIONS'
  };

  if (event.httpMethod === 'OPTIONS') {
    return { statusCode: 200, headers, body: '' };
  }

  try {
    console.log('Testing API key...');
    console.log('API Key present:', !!process.env.GOOGLE_AI_API_KEY);
    console.log('API Key starts with:', process.env.GOOGLE_AI_API_KEY ? process.env.GOOGLE_AI_API_KEY.substring(0, 10) + '...' : 'NOT SET');

    // Test Generative AI API
    const genAIResponse = await fetch(`https://generativelanguage.googleapis.com/v1/models/gemini-1.5-pro-002:generateContent?key=${process.env.GOOGLE_AI_API_KEY}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        contents: [{ parts: [{ text: "Hello, this is a test." }] }]
      })
    });

    console.log('Generative AI response status:', genAIResponse.status);
    
    if (!genAIResponse.ok) {
      const errorText = await genAIResponse.text();
      console.error('Generative AI error:', errorText);
      return {
        statusCode: 400,
        headers,
        body: JSON.stringify({
          error: 'Generative AI API failed',
          status: genAIResponse.status,
          details: errorText
        })
      };
    }

    // Test Speech-to-Text API
    const speechResponse = await fetch(`https://speech.googleapis.com/v1/speech:recognize?key=${process.env.GOOGLE_AI_API_KEY}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        audio: { content: 'dGVzdA==' }, // base64 "test"
        config: {
          encoding: 'LINEAR16',
          sampleRateHertz: 16000,
          languageCode: 'en-US'
        }
      })
    });

    console.log('Speech-to-Text response status:', speechResponse.status);

    return {
      statusCode: 200,
      headers,
      body: JSON.stringify({
        message: 'API key test completed',
        generativeAI: {
          status: genAIResponse.status,
          working: genAIResponse.ok
        },
        speechToText: {
          status: speechResponse.status,
          working: speechResponse.ok
        }
      })
    };

  } catch (error) {
    console.error('Test error:', error);
    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({
        error: 'Test failed',
        details: error.message
      })
    };
  }
};
