// File path: netlify/functions/process-notes.js

exports.handler = async function(event) {
    if (event.httpMethod !== 'POST') {
        return { statusCode: 405, body: 'Method Not Allowed' };
    }

    try {
        const apiKey = process.env.GEMINI_API_KEY;
        if (!apiKey) {
            throw new Error("API key is not set in Netlify environment.");
        }

        const { transcript, procedure, timezone } = JSON.parse(event.body);
        if (!transcript || !procedure || !timezone) {
            return { statusCode: 400, body: 'Missing transcript, procedure name, or timezone.' };
        }

        const prompt = `
            You are an expert medical scribe specializing in cardiology procedures. Your task is to process a raw, timestamped transcript from a medical procedure named "${procedure}" and organize it into a formal report.

            **TIMEZONE INSTRUCTIONS (VERY IMPORTANT):** The user is in the "${timezone}" timezone. All timestamps in the raw transcript are in UTC format (ISO 8601). When you extract times for the summaries, you **MUST** convert them from UTC to the user's local timezone ("${timezone}") first, and then format them as HH:MM. For example, if the user is in "America/New_York" (UTC-4) and the timestamp is "2023-10-27T18:30:00.000Z", the correct local time is "14:30".

            The raw transcript is as follows:
            ---
            ${transcript}
            ---

            Based on this transcript, perform the following tasks:

            1.  **Clean and Organize Procedure Notes (with Timestamps):** Review the entire transcript. Correct speech-to-text errors. Convert the dictation into a clear, timestamped log of events. Each distinct event or observation should start on a new line and **MUST be prefixed with its corresponding local time in HH:MM format.** (e.g., "[14:32] Patient vitals stable.").

            2.  **Summarize Medications (Crucial):** Identify every medication administered, including its dosage if mentioned. For each medication, create an entry listing its name and the **exact local time** it was administered, following the timezone conversion rule above. The time is non-negotiable and must be included.

            Please provide the output in a strict JSON format. Do not include any text before or after the JSON object.

            The JSON object must have two keys: "procedureNotes" and "medicationSummary".
            - "procedureNotes" must be a single string containing the timestamped log. Use "\\n" for line breaks between entries.
            - "medicationSummary" must be an array of objects. Each object MUST have "medication" and "time" keys. The "time" key is mandatory and should contain the user's local time in HH:MM format.
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
