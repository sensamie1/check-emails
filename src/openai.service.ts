import { Injectable } from '@nestjs/common';
import OpenAI from 'openai';

@Injectable()
export class OpenAIService {
  private openai: OpenAI;

  constructor() {
    this.openai = new OpenAI({
      apiKey: process.env.OPENAI_API_KEY,
    });
  }

  async categorizeEmail(content: string): Promise<string> {
    const prompt = `
      Categorize the following email content into one of the categories: "Interested", "Not Interested", "More information":
      Email content: "${content}"
    `;

    const response = await this.openai.completions.create({
      model: 'text-davinci-003',
      prompt,
      max_tokens: 50,
    });

    const category = response.choices[0].text.trim();
    return category;
  }
}
