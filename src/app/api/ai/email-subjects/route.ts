import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/auth';
import { generateGreekSubjectLines } from '@/lib/ai/meltemi';

export async function POST(request: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const { emailContent, count = 5 } = body;

    if (!emailContent || emailContent.trim().length === 0) {
      return NextResponse.json(
        { error: 'Email content is required' },
        { status: 400 }
      );
    }

    // Use the Meltemi library function
    const result = await generateGreekSubjectLines(emailContent, count);

    if (!result.success) {
      return NextResponse.json({
        suggestions: [],
        error: result.error,
        source: 'fallback',
      });
    }

    // Parse the generated text into an array of suggestions
    const suggestions = parseSubjectLines(result.generatedText || '');

    return NextResponse.json({
      suggestions,
      source: 'meltemi',
    });
  } catch (error) {
    console.error('Subject suggestions error:', error);
    return NextResponse.json(
      { error: 'Failed to generate subject suggestions' },
      { status: 500 }
    );
  }
}

function parseSubjectLines(text: string): string[] {
  // Parse numbered list format: "1. Subject\n2. Subject\n..."
  const lines = text.split('\n').filter(line => line.trim());
  const suggestions: string[] = [];

  for (const line of lines) {
    // Remove numbering (1., 2., etc.) and clean up
    const cleaned = line.replace(/^\d+[\.\)]\s*/, '').trim();
    if (cleaned && cleaned.length > 0 && cleaned.length < 100) {
      suggestions.push(cleaned);
    }
  }

  // Return up to 5 suggestions
  return suggestions.slice(0, 5);
}

