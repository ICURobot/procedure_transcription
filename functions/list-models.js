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
    console.log('Listing available models...');
    
    const response = await fetch(`https://generativelanguage.googleapis.com/v1/models?key=${process.env.GOOGLE_AI_API_KEY}`, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
      }
    });

    console.log('Response status:', response.status);
    
    if (!response.ok) {
      const errorData = await response.text();
      console.error('Error listing models:', errorData);
      return {
        statusCode: 400,
        headers,
        body: JSON.stringify({
          error: 'Failed to list models',
          status: response.status,
          details: errorData
        })
      };
    }

    const result = await response.json();
    
    // Filter for models that support generateContent
    const generateContentModels = result.models.filter(model => 
      model.supportedGenerationMethods && 
      model.supportedGenerationMethods.includes('generateContent')
    );

    return {
      statusCode: 200,
      headers,
      body: JSON.stringify({
        message: 'Available models retrieved',
        totalModels: result.models.length,
        generateContentModels: generateContentModels.map(model => ({
          name: model.name,
          displayName: model.displayName,
          description: model.description,
          supportedMethods: model.supportedGenerationMethods
        }))
      })
    };

  } catch (error) {
    console.error('Error listing models:', error);
    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({
        error: 'Failed to list models',
        details: error.message
      })
    };
  }
};
