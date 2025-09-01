exports.handler = async (event, context) => {
  // Enable CORS
  const headers = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'Content-Type',
    'Access-Control-Allow-Methods': 'GET, OPTIONS'
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
    console.log('Testing Deepgram API connection...');
    
    const deepgramApiKey = process.env.DEEPGRAM_API_KEY;
    
    if (!deepgramApiKey) {
      return {
        statusCode: 500,
        headers,
        body: JSON.stringify({ 
          error: 'DEEPGRAM_API_KEY not found in environment variables',
          message: 'Please set DEEPGRAM_API_KEY in your Netlify environment variables'
        })
      };
    }

    // Test Deepgram API with a simple request to get available models
    const response = await fetch('https://api.deepgram.com/v1/models', {
      method: 'GET',
      headers: {
        'Authorization': `Token ${deepgramApiKey}`,
        'Content-Type': 'application/json',
      }
    });

    console.log('Deepgram models API response status:', response.status);
    
    if (!response.ok) {
      const errorData = await response.text();
      console.error('Deepgram API error:', errorData);
      return {
        statusCode: response.status,
        headers,
        body: JSON.stringify({ 
          error: 'Deepgram API test failed',
          status: response.status,
          details: errorData
        })
      };
    }

    const models = await response.json();
    console.log('Available Deepgram models:', models);

    return {
      statusCode: 200,
      headers,
      body: JSON.stringify({
        message: 'Deepgram API connection successful!',
        status: 200,
        working: true,
        availableModels: models.models || [],
        apiKeyPresent: true
      })
    };

  } catch (error) {
    console.error('Deepgram API test error:', error);
    
    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({ 
        error: 'Failed to test Deepgram API',
        details: error.message,
        working: false
      })
    };
  }
};
