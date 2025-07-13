// File path: netlify/functions/process-notes.js

// This is the handler for the Netlify Function.
// It will be triggered when your front-end calls `/.netlify/functions/process-notes`
exports.handler = async function(event) {
    // We only accept POST requests
    if (event.httpMethod !== 'POST') {
        return { statusCode: 405, body: 'Method Not Allowed' };
    }

    try {
        // Get the API key from Netlify's secure environment variables
        const apiKey = process.env.GEMINI_API_KEY;
        if (!apiKey) {
            throw new Error("API key is not set in Netlify environment.");
        }

        // Parse the data sent from the front-end (the transcript and procedure name)
        const { transcript, procedure } = JSON.parse(event.body);
        if (!transcript || !procedure) {
            return { statusCode: 400, body: 'Missing transcript or procedure name.' };
        }

        // The same prompt we used before, now running on the server
        const prompt = `
            You are an expert medical scribe specializing in cardiology procedures. Your task is to process a raw, timestamped transcript from a medical procedure named "${procedure}" and organize it into a formal report.

            The raw transcript is as follows:
            ---
            ${transcript}
            ---

            Based on this transcript, perform the following tasks:

            1.  **Clean and Organize Procedure Notes:** Review the entire transcript. Correct speech-to-text errors (e.g., "fishing" should be "pushing", "Lido" should be "lidocaine", "staples" should be "stable"). Convert the dictation into a coherent, professional narrative summarizing the procedure. Maintain the chronological order of events. Do not include the timestamps in the final notes.

            2.  **Summarize Medications:** Identify every medication administered, including dosage if mentioned. For each medication, list its name and the exact time it was administered based on the timestamp in the transcript.

            Please provide the output in a strict JSON format. Do not include any text before or after the JSON object.

            The JSON object must have two keys: "procedureNotes" and "medicationSummary".
            - "procedureNotes" must be a single string. Use "\\n" for line breaks for readability.
            - "medicationSummary" must be an array of objects. Each object must have "medication" and "time" keys. The time should be the human-readable time (e.g., HH:MM:SS AM/PM) from the transcript's timestamp.
        `;

        const apiUrl = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${apiKey}`;

        const payload = {
            contents: [{ role: "user", parts: [{ text: prompt }] }],
            generationConfig: {
                responseMimeType: "application/json",
                responseSchema: {
                    type: "OBJECT",
                    properties: {
                        procedureNotes: { type: "STRING" },
                        medicationSummary: {
                            type: "ARRAY",
                            items: {
                                type: "OBJECT",
                                properties: {
                                    medication: { type: "STRING" },
                                    time: { type: "STRING" }
                                },
                                required: ["medication", "time"]
                            }
                        }
                    },
                    required: ["procedureNotes", "medicationSummary"]
                }
            }
        };
        
        // Call the Google AI API from the server
        const response = await fetch(apiUrl, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload)
        });

        if (!response.ok) {
            const errorBody = await response.text();
            throw new Error(`Google AI API request failed: ${errorBody}`);
        }

        const result = await response.json();
        const jsonText = result.candidates[0].content.parts[0].text;

        // Send the successful response back to the front-end
        return {
            statusCode: 200,
            headers: { 'Content-Type': 'application/json' },
            body: jsonText
        };

    } catch (error) {
        console.error('Error in Netlify function:', error);
        return {
            statusCode: 500,
            body: JSON.stringify({ error: error.message })
        };
    }
};
