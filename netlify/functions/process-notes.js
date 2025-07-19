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

        // Base prompt for all procedures
        let prompt = `
            You are an expert medical scribe specializing in cardiology procedures. Your task is to process a raw, timestamped transcript from a medical procedure named "${procedure}" and organize it into a formal, de-identified report.

            **PRIVACY INSTRUCTIONS (ABSOLUTELY CRITICAL):** You MUST remove all Personally Identifiable Information (PII). This includes patient names, specific ages, dates of birth, and medical record numbers. Replace names with "the patient".

            **TIMEZONE INSTRUCTIONS (VERY IMPORTANT):** The user is in the "${timezone}" timezone. All timestamps are in UTC (ISO 8601). You **MUST** convert them to the user's local timezone ("${timezone}") and format them as HH:MM.

            The raw transcript is as follows:
            ---
            ${transcript}
            ---

            Based on this de-identified transcript, perform the following tasks:

            1.  **Generate Nursing Notes (DAR Format):** Create a comprehensive nursing note in the DAR (Data, Action, Response) format. This section should be a well-written narrative and **must not contain any timestamps.**

            2.  **Generate Procedure Log (with Timestamps):** Create a clear, timestamped log of events. Each event **MUST be prefixed with its corresponding local time in HH:MM format.**

            3.  **Summarize Medications:** Identify every medication administered. List its name, dosage, and the **exact local time** it was administered.
        `;

        // Add special instructions ONLY for TEE procedure
        if (procedure === 'TEE') {
            prompt += `
            4.  **Extract Vital Signs for TEE:** Because this is a TEE procedure, you MUST extract vital signs into a structured object.
                - **Pre-Procedure Vitals:** Find the single set of vital signs taken before the procedure.
                - **Intra-Procedure Vitals:** Find all sets of vital signs taken during the procedure (usually every 5 minutes), including the Ramsay Sedation Scale (RSS) score.
                The final JSON object MUST have an additional key called "vitalSigns".
                - "vitalSigns" should contain an object with two keys: "pre" and "intra".
                - "pre" should be an object with keys: "time", "hr", "bp", "rr", "o2sat", "oxygen", "rhythm".
                - "intra" should be an ARRAY of objects, each with keys: "time", "bp", "hr", "rhythm", "rr", "o2sat", "rss_score".
            `;
        }

        prompt += `
            Please provide the output in a strict JSON format. Do not include any text before or after the JSON object.
            The JSON object must have three keys: "nursingNotes", "procedureNotes", and "medicationSummary".
            If the procedure is "TEE", it must also include the "vitalSigns" key.
        `;

        // Dynamically build the schema based on the procedure
        const properties = {
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
        };
        
        const requiredFields = ["nursingNotes", "procedureNotes", "medicationSummary"];

        if (procedure === 'TEE') {
            properties.vitalSigns = {
                type: "OBJECT",
                properties: {
                    pre: { 
                        type: "OBJECT",
                        properties: {
                            time: { type: "STRING" },
                            hr: { type: "STRING" },
                            bp: { type: "STRING" },
                            rr: { type: "STRING" },
                            o2sat: { type: "STRING" },
                            oxygen: { type: "STRING" },
                            rhythm: { type: "STRING" }
                        }
                    },
                    intra: { 
                        type: "ARRAY", 
                        items: { 
                            type: "OBJECT",
                            properties: {
                                time: { type: "STRING" },
                                bp: { type: "STRING" },
                                hr: { type: "STRING" },
                                rhythm: { type: "STRING" },
                                rr: { type: "STRING" },
                                o2sat: { type: "STRING" },
                                rss_score: { type: "STRING" }
                            }
                        } 
                    }
                }
            };
            // Although we prompt for it, we don't make it a required field
            // to prevent errors if no vitals are mentioned in the transcript.
        }

        const apiUrl = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${apiKey}`;

        const payload = {
            contents: [{ role: "user", parts: [{ text: prompt }] }],
            generationConfig: {
                responseMimeType: "application/json",
                responseSchema: {
                    type: "OBJECT",
                    properties: properties,
                    required: requiredFields
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
