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
            You are an expert medical scribe specializing in cardiology procedures. Your task is to process a raw, timestamped transcript from a medical procedure named "${procedure}" and organize it into a formal, de-identified report with three distinct sections.

            **PRIVACY INSTRUCTIONS (ABSOLUTELY CRITICAL):** Before performing any other task, you MUST remove all Personally Identifiable Information (PII) from the transcript. This includes patient names, specific ages, dates of birth, and medical record numbers. Replace names with "the patient". This is a strict requirement.

            **TIMEZONE INSTRUCTIONS (VERY IMPORTANT):** The user is in the "${timezone}" timezone. All timestamps in the raw transcript are in UTC format (ISO 8601). When you extract times for the summaries, you **MUST** convert them from UTC to the user's local timezone ("${timezone}") first, and then format them as HH:MM.

            The raw transcript is as follows:
            ---
            ${transcript}
            ---

            Based on this de-identified transcript, perform the following three tasks:

            1.  **Generate Nursing Notes (DAR Format):** Create a comprehensive nursing note in the DAR (Data, Action, Response) format. The note should be a chronological narrative of the entire procedure (pre, intra, and post).
                - **Data:** Include relevant patient data, observations, and status before and during the procedure.
                - **Action:** Detail all actions taken by the nursing staff, including medication administration, patient positioning, and monitoring.
                - **Response:** Describe the patient's response to the actions and their overall status post-procedure.
                This section should be a well-written paragraph or set of paragraphs and **must not contain any timestamps.**

            2.  **Generate Procedure Log (with Timestamps):** Review the de-identified transcript. Correct speech-to-text errors. Convert the dictation into a clear, timestamped log of events. Each distinct event or observation should start on a new line and **MUST be prefixed with its corresponding local time in HH:MM format.** (e.g., "[14:32] Patient vitals stable.").

            3.  **Summarize Medications (Crucial):** Identify every medication administered. For each medication, create an entry listing its name, dosage, and the **exact local time** it was administered, following the timezone conversion rule. The time is non-negotiable.

            Please provide the output in a strict JSON format. Do not include any text before or after the JSON object.

            The JSON object must have three keys: "nursingNotes", "procedureNotes", and "medicationSummary".
            - "nursingNotes" must be a single string containing the DAR summary.
            - "procedureNotes" must be a single string containing the timestamped log. Use "\\n" for line breaks.
            - "medicationSummary" must be an array of objects. Each object MUST have "medication" and "time" keys.
        `;

        const apiUrl = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${apiKey}`;

        const payload = {
            contents: [{ role: "user", parts: [{ text: prompt }] }],
            generationConfig: {
                responseMimeType: "application/json",
                responseSchema: {
                    type: "OBJECT",
                    properties: {
                        nursingNotes: { type: "STRING" },
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
                    required: ["nursingNotes", "procedureNotes", "medicationSummary"]
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
