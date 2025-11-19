import OpenAI from "openai";
import fs from "fs";

// Optimized OpenAI services for fast audio processing
const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY || process.env.VITE_OPENAI_API_KEY || "default_key"
});

import type { TranscriptSegment, EnhancedTranscript } from "@shared/schema";

// Placeholder for storage import to avoid circular dependencies
// In a real application, this would be properly managed to avoid circular imports
let storage: any;
async function initializeStorage() {
  if (!storage) {
    const storageModule = await import("../storage");
    storage = storageModule.storage;
  }
}

export async function transcribeAudio(audioFilePath: string): Promise<{ text: string; enhancedTranscript: EnhancedTranscript }> {
  try {
    console.log("Transcribing audio file:", audioFilePath);

    // Check file stats
    const stats = fs.statSync(audioFilePath);
    console.log("File size:", stats.size, "bytes");

    const audioReadStream = fs.createReadStream(audioFilePath);

    // Get transcription with word-level timestamps for accurate speaker segmentation
    const transcription = await openai.audio.transcriptions.create({
      file: audioReadStream,
      model: "whisper-1",
      response_format: "verbose_json",
      timestamp_granularities: ["word"],
    });

    console.log("Transcription successful, text length:", transcription.text.length);
    console.log("Segments count:", transcription.segments?.length || 0);

    // Create enhanced transcript with speaker identification
    const enhancedTranscript = await createEnhancedTranscript(transcription);

    return {
      text: transcription.text,
      enhancedTranscript,
    };
  } catch (error) {
    console.error("Transcription error:", error);
    throw new Error(`Failed to transcribe audio: ${(error as Error).message}`);
  }
}

// Process Whisper output to create enhanced transcript with speaker identification
async function createEnhancedTranscript(transcription: any): Promise<EnhancedTranscript> {
  try {
    const words = transcription.words || [];

    if (words.length === 0) {
      throw new Error("No word-level timestamps available");
    }

    // Get speaker turns from GPT
    const speakerTurns = await identifySpeakerTurns(transcription.text);

    // Map speaker turns to word timestamps
    const segments: TranscriptSegment[] = [];
    let wordIndex = 0;

    for (const turn of speakerTurns) {
      // Find words that match this turn's text
      const turnWords = turn.text.trim().split(/\s+/);
      const matchingWords: any[] = [];

      // Look for consecutive words that match the turn text
      let currentWordIndex = wordIndex;
      let matchedCount = 0;

      while (currentWordIndex < words.length && matchedCount < turnWords.length) {
        const word = words[currentWordIndex];
        // Simple matching - could be improved with fuzzy matching
        if (word.word.toLowerCase().includes(turnWords[matchedCount].toLowerCase().substring(0, 3))) {
          matchingWords.push(word);
          matchedCount++;
        }
        currentWordIndex++;
      }

      if (matchingWords.length > 0) {
        const start = matchingWords[0].start;
        const end = matchingWords[matchingWords.length - 1].end;

        segments.push({
          start,
          end,
          text: turn.text,
          speaker: turn.speaker,
          speakerRole: turn.speakerRole,
        });

        wordIndex = currentWordIndex;
      } else {
        // Fallback: estimate timing based on position and advance cursor
        const lastEnd = segments[segments.length - 1]?.end || 0;
        const estimatedStart = wordIndex < words.length ? words[wordIndex].start : lastEnd;
        const estimatedDuration = turn.text.split(/\s+/).length * 0.5; // ~0.5 seconds per word
        const estimatedEnd = estimatedStart + estimatedDuration;

        segments.push({
          start: estimatedStart,
          end: estimatedEnd,
          text: turn.text,
          speaker: turn.speaker,
          speakerRole: turn.speakerRole,
        });

        // Advance cursor by estimated word count to prevent timestamp collisions
        const estimatedWordCount = turn.text.split(/\s+/).length;
        wordIndex = Math.min(wordIndex + estimatedWordCount, words.length);
      }
    }

    // Extract unique speakers
    const speakerNames = segments.map((s: any) => s.speaker).filter((speaker: any): speaker is string => Boolean(speaker));
    const speakers: string[] = Array.from(new Set(speakerNames));

    // Create speaker roles mapping
    const speakerRoles: { [speaker: string]: string } = {};
    segments.forEach((segment: any) => {
      if (segment.speaker && segment.speakerRole) {
        speakerRoles[segment.speaker] = segment.speakerRole;
      }
    });

    console.log(`🎯 Created ${segments.length} speaker-turn segments with ${speakers.length} speakers`);

    return {
      text: transcription.text,
      segments,
      speakers,
      speakerRoles,
    };
  } catch (error) {
    console.warn("Failed to create enhanced transcript, falling back to basic format:", error);
    // Fallback: use word-based simple segmentation
    const words = transcription.words || [];
    if (words.length > 0) {
      // Create simple segments (every 10 words)
      const segments: TranscriptSegment[] = [];
      for (let i = 0; i < words.length; i += 10) {
        const chunkWords = words.slice(i, i + 10);
        segments.push({
          start: chunkWords[0].start,
          end: chunkWords[chunkWords.length - 1].end,
          text: chunkWords.map((w: any) => w.word).join(' '),
          speaker: "Speaker",
          speakerRole: "Speaker",
        });
      }

      return {
        text: transcription.text,
        segments,
        speakers: ["Speaker"],
        speakerRoles: { "Speaker": "Speaker" },
      };
    }

    // Final fallback
    return {
      text: transcription.text,
      segments: [{
        start: 0,
        end: transcription.duration || 60,
        text: transcription.text,
        speaker: "Speaker",
        speakerRole: "Speaker",
      }],
      speakers: ["Speaker"],
      speakerRoles: { "Speaker": "Speaker" },
    };
  }
}

// Identify speaker turns in the transcript
async function identifySpeakerTurns(transcriptText: string): Promise<Array<{ text: string; speaker: string; speakerRole: string; }>> {
  try {
    const prompt = `Analyze this social work assessment conversation and split it into speaker turns. Each turn is when ONE person speaks continuously before another person speaks.

Rules:
1. Extract real names when mentioned (e.g., "I'm David" → "David", "Call me Ellie" → "Ellie")
2. Use "Social Worker" role for the professional conducting the assessment
3. Use "Client" role for the person being assessed
4. Use "Family Member" for relatives/supporters
5. BE CONSISTENT - once you identify a speaker's name, use it throughout
6. Split the text precisely at speaker changes - each turn should contain only what ONE person said

Respond with JSON containing speaker turns in order:
{
  "turns": [
    { "text": "Hello? Mrs. Thompson? It's David from Home Care Assessments. I called earlier?", "speaker": "David", "speakerRole": "Social Worker" },
    { "text": "Oh, yes. Come on in, dear. The door's open.", "speaker": "Ellie", "speakerRole": "Client" },
    { "text": "Hi there, Mrs. Thompson. I'm David. How are you doing today?", "speaker": "David", "speakerRole": "Social Worker" },
    { "text": "Oh, call me Ellie, please. I'm... alright, I suppose. A bit tired. Sit down, sit down.", "speaker": "Ellie", "speakerRole": "Client" }
  ]
}

Transcript:
${transcriptText}`;

    const response = await openai.chat.completions.create({
      model: "gpt-4.1-mini",
      messages: [
        {
          role: "system",
          content: "You are an expert at analyzing conversations and identifying speaker turns. Split transcripts accurately at each speaker change, extract real names, and maintain consistency."
        },
        { role: "user", content: prompt }
      ],
      response_format: { type: "json_object" },
    });

    const result = JSON.parse(response.choices[0].message.content || '{}');
    const turns = result.turns || [];

    console.log(`🎙️ Identified ${turns.length} speaker turns`);

    return turns;

  } catch (error) {
    console.warn("Speaker turn identification failed, using fallback:", error);
    // Fallback: return the entire text as one turn
    return [{
      text: transcriptText,
      speaker: "Speaker",
      speakerRole: "Speaker",
    }];
  }
}


export async function generateCaseFromTranscript(transcriptText: string, template: string): Promise<{
  clientName: string;
  title: string;
  caseTitle: string;
}> {
  try {
    const prompt = `Extract from this ${template} transcript: client name, assessment title, case title.

JSON format:
{
  "clientName": "name or Unknown Client",
  "title": "brief assessment title",
  "caseTitle": "case organization title"
}

Transcript: ${transcriptText}`;

    const response = await openai.chat.completions.create({
      model: "gpt-4.1-mini",
      messages: [
        {
          role: "system",
          content: "You are a professional social work case manager specializing in care assessments. Extract accurate client information and create appropriate case titles from meeting transcripts."
        },
        { role: "user", content: prompt }
      ],
      response_format: { type: "json_object" },
    });

    const result = JSON.parse(response.choices[0].message.content || '{}');

    return {
      clientName: result.clientName || "Unknown Client",
      title: result.title || "Assessment",
      caseTitle: result.caseTitle || "Client Case",
    };
  } catch (error) {
    throw new Error(`Failed to generate case info: ${(error as Error).message}`);
  }
}

// Generate conversation format from transcript
export async function generateConversationFormat(transcriptText: string, enhancedTranscript: EnhancedTranscript): Promise<string> {
  try {
    const prompt = `Convert this transcript into a clear conversation format with speaker names and dialogue.

Format as:
Speaker Name: "What they said"

Transcript: ${transcriptText}

Speaker Information: ${JSON.stringify(enhancedTranscript.speakerRoles)}`;

    const response = await openai.chat.completions.create({
      model: "gpt-4.1-mini",
      messages: [
        {
          role: "system",
          content: "You are a professional transcript formatter. Convert raw transcripts into clear, readable conversation format with proper speaker attribution and natural dialogue formatting."
        },
        { role: "user", content: prompt }
      ],
    });

    return response.choices[0].message.content || transcriptText;
  } catch (error) {
    console.warn("Conversation format generation failed, using original transcript:", error);
    return transcriptText;
  }
}

// Dynamic care assessment generation using template sections
export async function generateCareAssessment(transcriptText: string, clientName: string, templateId: string): Promise<Record<string, any>> {
  try {
    await initializeStorage(); // Ensure storage is initialized

    // Fetch the template by name to get its sections
    const template = await storage.getTemplateByName(templateId);
    if (!template) {
      // Fallback to default sections if template not found
      console.warn(`Template ${templateId} not found, using default sections`);
      return generateDefaultCareAssessment(transcriptText, clientName, templateId);
    }

    // Build dynamic JSON format based on template sections
    const sectionsFormat: Record<string, string> = {};
    template.sections.forEach(section => {
      // Convert section name to camelCase for JSON keys
      const key = section.toLowerCase().replace(/\s+/g, '').replace(/[^a-zA-Z0-9]/g, '');
      sectionsFormat[key] = `${section.toLowerCase()} analysis and recommendations`;
    });

    // Build the complete JSON format including actionItems as array
    const jsonFormat = {
      ...sectionsFormat,
      actionItems: ["action item 1", "action item 2", "etc"]
    };

    const prompt = `Generate ${template.name} care assessment for ${clientName} from this transcript:

JSON format:
${JSON.stringify(jsonFormat, null, 2)}

For each section, provide comprehensive analysis relevant to the section name. Be specific and actionable.
IMPORTANT: actionItems must be an array of strings, not a single string.

Transcript: ${transcriptText}`;

    const response = await openai.chat.completions.create({
      model: "gpt-4.1-mini",
      messages: [
        {
          role: "system",
          content: `You are an expert social worker specializing in care assessments following Care Act guidelines. Generate comprehensive, professional care assessment reports with sections for: ${template.sections.join(', ')}. Each section should contain detailed analysis and actionable recommendations.`
        },
        { role: "user", content: prompt }
      ],
      response_format: { type: "json_object" },
    });

    const result = JSON.parse(response.choices[0].message.content || '{}');

    // Ensure all sections are present with fallback empty strings
    const finalResult: Record<string, any> = {};
    template.sections.forEach(section => {
      const key = section.toLowerCase().replace(/\s+/g, '').replace(/[^a-zA-Z0-9]/g, '');
      finalResult[key] = result[key] || "";
    });
    finalResult.actionItems = result.actionItems || [];

    return finalResult;
  } catch (error) {
    console.error(`Failed to generate dynamic care assessment: ${(error as Error).message}`);
    // Fallback to default if dynamic generation fails
    return generateDefaultCareAssessment(transcriptText, clientName, templateId);
  }
}

// Fallback function for backward compatibility
function generateDefaultCareAssessment(transcriptText: string, clientName: string, template: string): Promise<Record<string, any>> {
  return new Promise(async (resolve) => {
    try {
      const prompt = `Generate ${template} care assessment for ${clientName} from this transcript:

JSON format:
{
  "overview": "meeting summary and key concerns",
  "nutrition": "nutritional needs and challenges",
  "hygiene": "hygiene capabilities and support needs",
  "homeEnvironment": "home safety and maintenance",
  "actionItems": ["action points and next steps"]
}

Transcript: ${transcriptText}`;

      const response = await openai.chat.completions.create({
        model: "gpt-4.1-mini",
        messages: [
          {
            role: "system",
            content: "You are an expert social worker specializing in care assessments following Care Act guidelines. Generate comprehensive, professional care assessment reports with specific sections for nutrition, hygiene, home environment, and actionable next steps."
          },
          { role: "user", content: prompt }
        ],
        response_format: { type: "json_object" },
      });

      const result = JSON.parse(response.choices[0].message.content || '{}');

      resolve({
        overview: result.overview || "",
        nutrition: result.nutrition || "",
        hygiene: result.hygiene || "",
        homeEnvironment: result.homeEnvironment || "",
        actionItems: result.actionItems || [],
      });
    } catch (error) {
      resolve({
        overview: "Error generating assessment",
        nutrition: "",
        hygiene: "",
        homeEnvironment: "",
        actionItems: [],
      });
    }
  });
}

// New assessment-based workflow orchestration
export async function processAssessmentBasedWorkflow(
  assessmentId: string,
  recordingId: string,
  audioFilePath: string,
  template: string = "General Care Assessments"
): Promise<void> {
  await initializeStorage(); // Ensure storage is initialized

  console.log(`🚀 Starting optimized assessment processing for ${assessmentId}`);

  try {
    // Update recording status: starting transcription
    await storage.updateRecording(recordingId, {
      processingStatus: "transcribing"
    });

    // Step 1: Transcribe audio
    console.log(`🎯 Step 1: Transcribing audio`);
    const transcriptionResult = await transcribeAudio(audioFilePath);
    const rawTranscript = transcriptionResult.text;
    const enhancedTranscript = transcriptionResult.enhancedTranscript;

    // Step 2: Storing transcript and generating conversation format
    console.log(`⚡ Step 2: Storing transcript and generating conversation format`);

    // Update recording status: generating conversation
    await storage.updateRecording(recordingId, {
      processingStatus: "generating_conversation"
    });

    // Get assessment to retrieve caseId
    const assessment = await storage.getAssessment(assessmentId);
    if (!assessment) {
      throw new Error(`Assessment ${assessmentId} not found`);
    }

    // Create transcript record
    const transcript = await storage.createTranscript({
      caseId: assessment.caseId, // Required field
      recordingId: recordingId,
      assessmentId: assessmentId,
      rawTranscript: rawTranscript,
      enhancedTranscript: enhancedTranscript, // Store enhanced transcript here
      processingStatus: "processing", // Initial status for transcript
    });

    // Generate conversation format in parallel with transcript creation if possible, or after.
    // Here, it's sequential as per the original logic, but we can optimize.
    const conversationFormat = await generateConversationFormat(rawTranscript, enhancedTranscript);

    // Update transcript with conversation format and processing status
    await storage.updateTranscript(transcript.id, {
      enhancedTranscript: {
        ...enhancedTranscript,
        conversationFormat,
      },
      processingStatus: "transcription_complete", // Update status after conversation generation
    });

    // Step 3: Generate care assessment using template
    console.log(`🔥 Step 3: Generating care assessment`);

    // Update recording status: generating assessment
    await storage.updateRecording(recordingId, {
      processingStatus: "generating_assessment"
    });

    // Use the assessment's template instead of the parameter if available
    const templateToUse = assessment.template || template;

    const careAssessment = await generateCareAssessment(conversationFormat, "", templateToUse); // Pass conversationFormat here

    // Step 4: Update assessment with ALL content as dynamic sections
    console.log(`💾 Step 4: Updating assessment with all dynamic sections`);

    // Update recording status: finalizing
    await storage.updateRecording(recordingId, {
      processingStatus: "finalizing"
    });

    const assessmentUpdates: any = {
      processingStatus: "completed",
    };
    const dynamicSections: Record<string, any> = {};

    // ALL sections are now dynamic (including overview, nutrition, etc.)
    for (const [key, value] of Object.entries(careAssessment)) {
      if (key === 'actionItems') {
        // actionItems stays as array in its own column for compatibility
        assessmentUpdates.actionItems = value;
      } else if (typeof value === 'string' || typeof value === 'object') {
        // Everything else goes into dynamicSections
        dynamicSections[key] = value;
      }
    }

    // Store all sections as dynamic
    if (Object.keys(dynamicSections).length > 0) {
      assessmentUpdates.dynamicSections = dynamicSections;
      console.log(`💾 Storing ${Object.keys(dynamicSections).length} dynamic sections:`, Object.keys(dynamicSections));
    }

    await storage.updateAssessment(assessmentId, assessmentUpdates);

    // Final update for recording status: completed
    await storage.updateRecording(recordingId, {
      processingStatus: "completed",
    });

    console.log(`✅ Optimized assessment processing completed for ${assessmentId}`);

    return {
      transcriptId: transcript.id,
      careAssessment,
      success: true,
    };

  } catch (error) {
    console.error(`❌ Assessment processing failed for ${assessmentId}:`, error);

    // Update recording status to failed
    await storage.updateRecording(recordingId, {
      processingStatus: "failed",
    });

    // Update assessment status to failed
    try {
      await storage.updateAssessment(assessmentId, {
        processingStatus: "failed",
      });
    } catch (statusError) {
      console.error(`Failed to update assessment status to failed:`, statusError);
    }

    throw new Error(`Assessment processing failed: ${(error as Error).message}`);
  }
}

// Legacy function for backward compatibility
export async function processCaseBasedWorkflow(caseId: string, audioFilePath: string, template: string = "General Care Assessments") {
  console.warn('processCaseBasedWorkflow is deprecated. Use processAssessmentBasedWorkflow instead.');
  // This would need to be updated to work with the new architecture
  // For now, just throw an error to indicate it should not be used
  throw new Error('Case-based workflow is deprecated. Please use assessment-based workflow.');
}

export async function summarizeTranscript(transcriptText: string): Promise<string> {
  try {
    const response = await openai.chat.completions.create({
      model: "gpt-4.1-mini",
      messages: [
        {
          role: "system",
          content: "You are a professional summarization assistant specializing in healthcare and social work documentation. Create concise, accurate summaries that capture key points and outcomes from care assessment meetings."
        },
        {
          role: "user",
          content: `Summarize this care assessment transcript concisely:\n\n${transcriptText}`
        }
      ],
    });

    return response.choices[0].message.content || "";
  } catch (error) {
    throw new Error(`Failed to summarize transcript: ${(error as Error).message}`);
  }
}