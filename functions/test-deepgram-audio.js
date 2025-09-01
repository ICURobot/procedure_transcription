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
    console.log('Testing Deepgram with minimal audio payload...');
    
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

    // Test with a minimal audio payload (just a few bytes of base64)
    const testAudioData = 'UklGRnoGAABXQVZFZm10IBAAAAABAAEAQB8AAEAfAAABAAgAZGF0YQoGAACBhYqFbF1fdJivrJBhNjVgodDbq2EcBj+a2/LDciUFLIHO8tiJNwgZaLvt559NEAxQp+PwtmMcBjiR1/LMeSwFJHfH8N2QQAoUXrTp66hVFApGn+DyvmwhBSuBzvLZiTYIG2m98OScTgwOUarm7blmGgU7k9n1unEiBC13yO/eizEIHWq+8+OWT';
    
    const deepgramUrl = 'https://api.deepgram.com/v1/listen?model=nova-2&smart_format=true&encoding=webm&sample_rate=48000';
    
    console.log('Testing Deepgram URL:', deepgramUrl);
    console.log('Test audio data length:', testAudioData.length);
    
    const response = await fetch(deepgramUrl, {
      method: 'POST',
      headers: {
        'Authorization': `Token ${deepgramApiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        buffer: testAudioData
      })
    });

    console.log('Deepgram test response status:', response.status);
    
    if (!response.ok) {
      const errorData = await response.text();
      console.error('Deepgram test error:', errorData);
      return {
        statusCode: response.status,
        headers,
        body: JSON.stringify({ 
          error: 'Deepgram test failed',
          status: response.status,
          details: errorData
        })
      };
    }

    const result = await response.json();
    console.log('Deepgram test success:', result);

    return {
      statusCode: 200,
      headers,
      body: JSON.stringify({
        message: 'Deepgram audio test successful!',
        status: 200,
        working: true,
        result: result
      })
    };

  } catch (error) {
    console.error('Deepgram audio test error:', error);
    
    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({ 
        error: 'Failed to test Deepgram audio',
        details: error.message,
        working: false
      })
    };
  }
};
