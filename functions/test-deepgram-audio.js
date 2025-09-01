

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
    console.log('Testing Deepgram with different audio configurations...');
    
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

    // Test 1: Minimal webm audio (base64 encoded)
    const testAudioData = 'UklGRnoGAABXQVZFZm10IBAAAAABAAEAQB8AAEAfAAABAAgAZGF0YQoGAACBhYqFbF1fdJivrJBhNjVgodDbq2EcBj+a2/LDciUFLIHO8tiJNwgZaLvt559NEAxQp+PwtmMcBjiR1/LMeSwFJHfH8N2QQAoUXrTp66hVFApGn+DyvmwhBSuBzvLZiTYIG2m98OScTgwOUarm7blmGgU7k9n1unEiBC13yO/eizEIHWq+8+OWT';
    
    console.log('Test 1: Testing with minimal webm audio...');
    console.log('Audio data length:', testAudioData.length);
    
    // Try different configurations
    const testConfigs = [
      {
        name: 'Basic Nova-2',
        url: 'https://api.deepgram.com/v1/listen?model=nova-2&smart_format=true'
      },
      {
        name: 'With encoding',
        url: 'https://api.deepgram.com/v1/listen?model=nova-2&smart_format=true&encoding=webm'
      },
      {
        name: 'With sample rate',
        url: 'https://api.deepgram.com/v1/listen?model=nova-2&smart_format=true&encoding=webm&sample_rate=48000'
      },
      {
        name: 'Minimal config',
        url: 'https://api.deepgram.com/v1/listen?model=nova-2'
      }
    ];

    const results = [];

    for (const config of testConfigs) {
      try {
        console.log(`\nTesting: ${config.name}`);
        console.log('URL:', config.url);
        
        const response = await fetch(config.url, {
          method: 'POST',
          headers: {
            'Authorization': `Token ${deepgramApiKey}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            buffer: testAudioData
          })
        });

        console.log(`Response status: ${response.status}`);
        
        if (response.ok) {
          const result = await response.json();
          console.log(`✅ ${config.name} SUCCESS:`, result);
          results.push({
            config: config.name,
            status: 'SUCCESS',
            statusCode: response.status,
            result: result
          });
        } else {
          const errorData = await response.text();
          console.log(`❌ ${config.name} FAILED: ${response.status} - ${errorData}`);
          results.push({
            config: config.name,
            status: 'FAILED',
            statusCode: response.status,
            error: errorData
          });
        }
      } catch (error) {
        console.log(`❌ ${config.name} ERROR:`, error.message);
        results.push({
          config: config.name,
          status: 'ERROR',
          error: error.message
        });
      }
    }

    // Find the first successful configuration
    const successfulConfig = results.find(r => r.status === 'SUCCESS');
    
    if (successfulConfig) {
      return {
        statusCode: 200,
        headers,
        body: JSON.stringify({
          message: 'Deepgram audio test completed!',
          working: true,
          successfulConfig: successfulConfig.config,
          allResults: results
        })
      };
    } else {
      return {
        statusCode: 500,
        headers,
        body: JSON.stringify({
          message: 'All Deepgram audio tests failed',
          working: false,
          allResults: results
        })
      };
    }

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
