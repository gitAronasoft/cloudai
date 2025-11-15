import OpenAI from "openai";

// Use the same stable model as the rest of the system
const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

export interface ChatbotRequest {
  message: string;
  context: {
    currentSection: string;
    currentContent: string;
    assessmentData: {
      dynamicSections?: Record<string, string>;
      actionItems?: string[];
    };
  };
}

export interface ChatbotResponse {
  message: string;
  suggestions?: {
    type: 'replace' | 'append' | 'improve';
    section: string;
    content: string;
    reason: string;
  }[];
}

export async function getChatbotResponse(request: ChatbotRequest): Promise<ChatbotResponse> {
  try {
    const { message, context } = request;
    
    // Create context-aware prompt
    const dynamicSectionsText = context.assessmentData.dynamicSections 
      ? Object.entries(context.assessmentData.dynamicSections)
          .map(([key, value]) => `- ${key}: ${value || 'Not yet written'}`)
          .join('\n')
      : 'No sections added yet';

    const systemPrompt = `You are an AI assistant specialized in helping social workers edit and improve care assessment documents. You have access to the current assessment content and can provide specific suggestions for improvements.

Current assessment context:
- Current section being edited: ${context.currentSection}
- Current content: "${context.currentContent}"

Full assessment sections:
${dynamicSectionsText}

Action Items: ${context.assessmentData.actionItems?.join(', ') || 'None added'}

CRITICAL: When providing suggestions, you MUST use the EXACT section key as it appears in the assessment's dynamicSections object.
Use the exact key with the same capitalization and spacing.

Available section keys from the assessment (use these EXACTLY):
${Object.keys(context.assessmentData.dynamicSections || {}).map(key => `"${key}"`).join(', ')}

For example:
- If "endoflifeconsiderationsandmylastwishes" exists in sections, use exactly "endoflifeconsiderationsandmylastwishes"
- If "keysafe" exists in sections, use exactly "keysafe"

Provide helpful, professional suggestions for improving the assessment documentation. You can:
1. Suggest content improvements
2. Recommend additions or clarifications
3. Help with professional language and structure
4. Provide specific text replacements or additions

Always respond in JSON format with 'message' and optionally 'suggestions' array. Each suggestion should have:
- 'type': either 'replace', 'append', or 'improve'
- 'section': the EXACT section name from the assessment (preserve case and spacing)
- 'content': the suggested content
- 'reason': explanation for the suggestion`;

    const userPrompt = `User request: ${message}

Please provide a helpful response and any specific suggestions for improving the assessment documentation.`;

    const response = await openai.chat.completions.create({
      model: "gpt-4.1-mini",
      messages: [
        { role: "system", content: systemPrompt },
        { role: "user", content: userPrompt }
      ],
      response_format: { type: "json_object" },
    });

    const result = JSON.parse(response.choices[0].message.content || '{}');
    
    return {
      message: result.message || "I'm here to help you improve your assessment documentation.",
      suggestions: result.suggestions || []
    };

  } catch (error) {
    console.error('Chatbot error:', error);
    throw new Error('Failed to get chatbot response');
  }
}

export async function getContentSuggestions(section: string, currentContent: string): Promise<string[]> {
  try {
    const prompt = `Analyze this ${section} section of a care assessment and provide 3-5 specific improvement suggestions:

Current content: "${currentContent}"

Provide suggestions as a JSON array of strings. Focus on:
- Professional language improvements
- Missing important details
- Better structure or clarity
- Compliance with care documentation standards

Respond with JSON in this format: { "suggestions": ["suggestion1", "suggestion2", "suggestion3"] }`;

    const response = await openai.chat.completions.create({
      model: "gpt-4.1-mini",
      messages: [{ role: "user", content: prompt }],
      response_format: { type: "json_object" },
    });

    const result = JSON.parse(response.choices[0].message.content || '{}');
    return result.suggestions || [];

  } catch (error) {
    console.error('Content suggestions error:', error);
    return [];
  }
}