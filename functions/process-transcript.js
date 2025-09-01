const { GoogleGenerativeAI } = require('@google/generative-ai');

// Initialize Google AI with your API key from environment variables
const genAI = new GoogleGenerativeAI(process.env.GOOGLE_AI_API_KEY);

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
    // Parse the request body
    const { transcript, procedure, timezone } = JSON.parse(event.body);

    if (!transcript || !procedure) {
      return {
        statusCode: 400,
        headers,
        body: JSON.stringify({ error: 'Missing transcript or procedure' })
      };
    }

    // Create the prompt for medical documentation
    const prompt = createMedicalPrompt(transcript, procedure, timezone);

    // Call Google AI API
    const model = genAI.getGenerativeModel({ model: "gemini-pro" });
    
    const result = await model.generateContent([
      "You are a medical documentation specialist. Create structured medical documentation from dictation transcripts.",
      prompt
    ]);
    
    const response = result.response.text();
    const parsedResponse = parseAIResponse(response, procedure);

    return {
      statusCode: 200,
      headers,
      body: JSON.stringify(parsedResponse)
    };

  } catch (error) {
    console.error('Error processing transcript:', error);
    
    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({ 
        error: 'Failed to process transcript',
        details: error.message 
      })
    };
  }
};

function createMedicalPrompt(transcript, procedure, timezone) {
  return `
Please analyze this medical procedure dictation and create structured documentation.

PROCEDURE: ${procedure}
TIMEZONE: ${timezone}
TRANSCRIPT: ${transcript}

Please provide the following in JSON format:

1. NURSING NOTES (DAR Format):
   - Data: Patient assessment, vital signs, medications
   - Action: Nursing interventions performed
   - Response: Patient response to interventions

2. PROCEDURE LOG:
   - Detailed chronological account of the procedure
   - Equipment used, techniques performed
   - Any complications or deviations

3. MEDICATION SUMMARY:
   - List of medications administered with approximate times
   - Dosages and routes

4. VITAL SIGNS (if mentioned):
   - Pre-procedure vitals
   - Intra-procedure vitals (if multiple readings)

Format the response as valid JSON with these keys:
{
  "nursingNotes": "...",
  "procedureNotes": "...",
  "medicationSummary": [
    {"medication": "...", "time": "..."}
  ],
  "vitalSigns": {
    "pre": {"time": "...", "temp": "...", "bp": "...", "hr": "...", "rhythm": "...", "rr": "...", "o2sat": "..."},
    "intra": [{"time": "...", "temp": "...", "bp": "...", "hr": "...", "rhythm": "...", "rr": "...", "o2sat": "..."}]
  }
}
`;
}

function parseAIResponse(response, procedure) {
  try {
    // Try to extract JSON from the response
    const jsonMatch = response.match(/\{[\s\S]*\}/);
    if (jsonMatch) {
      return JSON.parse(jsonMatch[0]);
    }
    
    // Fallback: create structured response from text
    return {
      nursingNotes: response.includes('NURSING NOTES') ? response : 'Unable to parse nursing notes from AI response.',
      procedureNotes: response.includes('PROCEDURE') ? response : 'Unable to parse procedure notes from AI response.',
      medicationSummary: [],
      vitalSigns: procedure === 'TEE' ? { pre: {}, intra: [] } : null
    };
  } catch (error) {
    console.error('Error parsing AI response:', error);
    return {
      nursingNotes: 'Error processing AI response.',
      procedureNotes: 'Error processing AI response.',
      medicationSummary: [],
      vitalSigns: procedure === 'TEE' ? { pre: {}, intra: [] } : null
    };
  }
}
