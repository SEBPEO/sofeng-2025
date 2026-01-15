import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as fs from 'fs';
import * as path from 'path';
import { GoogleGenerativeAI } from '@google/generative-ai';

@Injectable()
export class AiService {
  private readonly logger = new Logger(AiService.name);
  private readonly genAI: GoogleGenerativeAI;
  private readonly model: string = 'gemini-2.5-flash'; // Швидка та економна модель (gemini-1.5-flash була вимкнена)

  constructor(private configService: ConfigService) {
    const geminiApiKey = this.configService.get<string>('GEMINI_API_KEY') || '';

    if (!geminiApiKey) {
      this.logger.warn('GEMINI_API_KEY not found in environment variables. AI features will fail.');
    }

    // Ініціалізуємо Gemini API клієнт
    this.genAI = new GoogleGenerativeAI(geminiApiKey);

    this.logger.log(`Initialized AI Service with Gemini API (model: ${this.model})`);
  }

  /**
   * Визначає MIME тип файлу на основі розширення
   */
  private getMimeType(filePath: string): string {
    const ext = path.extname(filePath).toLowerCase();
    const mimeTypes: Record<string, string> = {
      '.mp3': 'audio/mpeg',
      '.wav': 'audio/wav',
      '.m4a': 'audio/m4a',
      '.ogg': 'audio/ogg',
      '.webm': 'audio/webm',
      '.mp4': 'video/mp4',
      '.mpeg': 'video/mpeg',
    };

    return mimeTypes[ext] || 'audio/mpeg'; // За замовчуванням
  }

  /**
   * Конвертує аудіо файл в base64 для Gemini API
   */
  private async fileToBase64(filePath: string): Promise<{ data: string; mimeType: string }> {
    const fileBuffer = fs.readFileSync(filePath);
    const base64Data = fileBuffer.toString('base64');
    const mimeType = this.getMimeType(filePath);

    return { data: base64Data, mimeType };
  }

  /**
   * Транскрибує аудіо файл використовуючи Gemini API
   * Gemini 2.5 Flash підтримує аудіо файли (мультимодальні можливості)
   */
  async transcribeAudio(filePath: string): Promise<string> {
    try {
      const fullPath = path.join(process.cwd(), filePath);

      if (!fs.existsSync(fullPath)) {
        throw new Error(`Audio file not found: ${fullPath}`);
      }

      // Перевіряємо розмір файлу
      const stats = fs.statSync(fullPath);
      const fileSizeInMB = stats.size / (1024 * 1024);

      if (fileSizeInMB > 20) {
        this.logger.warn(
          `File size is ${fileSizeInMB.toFixed(2)}MB. Large files may take longer to process. ` +
          'Consider using gemini-2.5-pro for better handling of large files.',
        );
      }

      this.logger.log(`Transcribing audio file with Gemini API: ${filePath} (${fileSizeInMB.toFixed(2)}MB)`);

      // Отримуємо модель
      const model = this.genAI.getGenerativeModel({ model: this.model });

      // Конвертуємо файл в base64
      const { data: base64Data, mimeType } = await this.fileToBase64(fullPath);

      // Створюємо промпт для транскрипції
      const prompt = `Please transcribe this audio recording. 
Include speaker labels if you can identify different speakers.
Format the transcript with timestamps if possible, or at least maintain the order of speech.
Be accurate and include all spoken words.`;

      // Генеруємо транскрипцію
      const result = await model.generateContent([
        {
          inlineData: {
            data: base64Data,
            mimeType: mimeType,
          },
        },
        {
          text: prompt,
        },
      ]);

      const response = await result.response;
      const transcript = response.text();

      this.logger.log(`Transcription completed. Length: ${transcript.length} characters`);

      return transcript;
    } catch (error: any) {
      this.logger.error(`Error transcribing audio: ${error.message}`, error.stack);

      // Перевіряємо помилки автентифікації
      if (error.message?.includes('API_KEY_INVALID') || error.message?.includes('401')) {
        throw new Error(
          'Gemini API authentication failed. Please check your GEMINI_API_KEY in .env file. ' +
          'Get your API key at: https://aistudio.google.com/app/apikey',
        );
      }

      // Перевіряємо обмеження квот
      if (error.message?.includes('429') || error.message?.includes('quota') || error.message?.includes('rate limit')) {
        throw new Error(
          'Gemini API rate limit exceeded. Please check your free tier quotas. ' +
          'You may need to wait or upgrade your plan.',
        );
      }

      // Перевіряємо, чи модель не знайдена (404)
      if (error.message?.includes('404') || error.message?.includes('not found') || error.message?.includes('is not found')) {
        throw new Error(
          `Model ${this.model} is not available. Available models: gemini-2.5-flash, gemini-2.5-flash-lite, gemini-2.5-pro. ` +
          'Please check the Gemini API documentation for current model availability.',
        );
      }

      throw new Error(`Failed to transcribe audio: ${error.message}`);
    }
  }

  /**
   * Генерує медичне зведення консультації з транскрипту використовуючи Gemini API
   */
  async generateConsultationSummary(transcript: string, patientName: string, doctorName: string): Promise<string> {
    try {
      this.logger.log('Generating consultation summary with Gemini API...');

      const systemPrompt = `You are a medical assistant AI. Your task is to create a structured, professional medical consultation summary from a doctor-patient conversation transcript.

IMPORTANT: Write in plain text format ONLY. Do NOT use any markdown formatting symbols such as asterisks (*), hash symbols (#), underscores (_), or any other markdown syntax. Write clean, readable text without formatting symbols.

Create a clear, organized summary that includes:
1. Chief Complaint - Main reason for the visit
2. History of Present Illness - Relevant details about the current issue
3. Physical Examination Findings (if mentioned)
4. Assessment/Diagnosis - What the doctor determined
5. Treatment Plan - Medications, procedures, follow-up instructions
6. Important Notes - Any other relevant information

Use simple numbered lists (just "1.", "2.", etc.) and write section titles in plain text (e.g., "1. Chief Complaint:" instead of "**1. Chief Complaint:**").
Format the summary in a professional medical note style. Be concise but comprehensive. Use medical terminology appropriately.`;

      const userPrompt = `Please create a medical consultation summary from the following transcript:

Patient: ${patientName}
Doctor: ${doctorName}

Transcript:
${transcript}

Generate a structured medical consultation summary:`;

      // Отримуємо модель
      const model = this.genAI.getGenerativeModel({
        model: this.model,
        generationConfig: {
          temperature: 0.3, // Низька температура для більшої точності
          maxOutputTokens: 2000, // Максимум токенів для зведення
        },
      });

      // Генеруємо зведення
      const result = await model.generateContent([
        {
          text: `${systemPrompt}\n\n${userPrompt}`,
        },
      ]);

      const response = await result.response;
      let summary = response.text();

      // Clean up any remaining markdown formatting that might slip through
      // Remove bold markers (**text** -> text)
      summary = summary.replace(/\*\*([^*]+)\*\*/g, '$1');
      // Remove single asterisks for italic (*text* -> text)
      summary = summary.replace(/\*([^*]+)\*/g, '$1');
      // Remove markdown headers (# -> empty)
      summary = summary.replace(/^#{1,6}\s+/gm, '');
      // Remove horizontal rules (---)
      summary = summary.replace(/^---+$/gm, '');
      // Remove markdown list markers that might be duplicated (clean up)
      summary = summary.replace(/\n\s*\*\s+/g, '\n');

      this.logger.log(`Summary generated. Length: ${summary.length} characters`);

      return summary.trim();
    } catch (error: any) {
      this.logger.error(`Error generating summary: ${error.message}`, error.stack);

      // Перевіряємо помилки автентифікації
      if (error.message?.includes('API_KEY_INVALID') || error.message?.includes('401')) {
        throw new Error(
          'Gemini API authentication failed. Please check your GEMINI_API_KEY in .env file. ' +
          'Get your API key at: https://aistudio.google.com/app/apikey',
        );
      }

      // Перевіряємо обмеження квот
      if (error.message?.includes('429') || error.message?.includes('quota') || error.message?.includes('rate limit')) {
        throw new Error(
          'Gemini API rate limit exceeded. Please check your free tier quotas. ' +
          'You may need to wait or upgrade your plan.',
        );
      }

      // Перевіряємо, чи модель не знайдена (404)
      if (error.message?.includes('404') || error.message?.includes('not found') || error.message?.includes('is not found')) {
        throw new Error(
          `Model ${this.model} is not available. Available models: gemini-2.5-flash, gemini-2.5-flash-lite, gemini-2.5-pro. ` +
          'Please check the Gemini API documentation for current model availability.',
        );
      }

      throw new Error(`Failed to generate summary: ${error.message}`);
    }
  }

  /**
   * Обробляє запис: транскрибує та генерує зведення
   */
  async processRecording(
    filePath: string,
    patientName: string,
    doctorName: string,
  ): Promise<{ transcript: string; summary: string }> {
    const transcript = await this.transcribeAudio(filePath);
    const summary = await this.generateConsultationSummary(transcript, patientName, doctorName);

    return { transcript, summary };
  }
}
