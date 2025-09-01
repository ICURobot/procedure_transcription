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

    // Return the API key for frontend use
    // Note: In production, you might want to implement additional security measures
    return {
      statusCode: 200,
      headers,
      body: JSON.stringify({
        apiKey: deepgramApiKey
      })
    };

  } catch (error) {
    console.error('Error getting Deepgram API key:', error);
    
    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({ 
        error: 'Failed to get API key',
        details: error.message
      })
    };
  }
};
