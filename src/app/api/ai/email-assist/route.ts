import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/auth';

const HUGGINGFACE_API_URL = 'https://api-inference.huggingface.co/models/ilsp/Meltemi-7B-v1';

interface EmailAssistRequest {
  content: string;
  language?: 'el' | 'en';
  tone?: 'professional' | 'friendly' | 'formal';
}

export async function POST(request: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body: EmailAssistRequest = await request.json();
    const { content, language = 'el', tone = 'professional' } = body;

    if (!content || content.trim().length === 0) {
      return NextResponse.json(
        { error: 'Content is required' },
        { status: 400 }
      );
    }

    const apiKey = process.env.HUGGINGFACE_API_KEY;
    if (!apiKey) {
      // Fallback: return slightly improved version without AI
      console.warn('HUGGINGFACE_API_KEY not set, returning original content');
      return NextResponse.json({ improved: content, source: 'fallback' });
    }

    // Create prompt for Meltemi
    const toneInstructions = {
      professional: 'επαγγελματικό και σαφές',
      friendly: 'φιλικό και ζεστό',
      formal: 'επίσημο και τυπικό',
    };

    const prompt = `Βελτίωσε το παρακάτω κείμενο email ώστε να είναι πιο ${toneInstructions[tone]}. Διατήρησε το νόημα αλλά κάνε το πιο ελκυστικό και επαγγελματικό. Απάντησε μόνο με το βελτιωμένο κείμενο, χωρίς εξηγήσεις.

Αρχικό κείμενο:
${content}

Βελτιωμένο κείμενο:`;

    try {
      const response = await fetch(HUGGINGFACE_API_URL, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${apiKey}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          inputs: prompt,
          parameters: {
            max_new_tokens: 500,
            temperature: 0.7,
            top_p: 0.95,
            do_sample: true,
            return_full_text: false,
          },
        }),
      });

      if (!response.ok) {
        const error = await response.text();
        console.error('Hugging Face API error:', error);
        
        // If model is loading, return original content
        if (response.status === 503) {
          return NextResponse.json({
            improved: content,
            source: 'original',
            message: 'AI model is loading, please try again in a moment',
          });
        }
        
        return NextResponse.json({ improved: content, source: 'fallback' });
      }

      const result = await response.json();
      
      // Extract the generated text
      let improved = content;
      if (Array.isArray(result) && result[0]?.generated_text) {
        improved = result[0].generated_text.trim();
      } else if (typeof result === 'string') {
        improved = result.trim();
      }

      // Clean up any remnants of the prompt
      if (improved.includes('Βελτιωμένο κείμενο:')) {
        improved = improved.split('Βελτιωμένο κείμενο:').pop()?.trim() || improved;
      }

      return NextResponse.json({
        improved,
        source: 'meltemi',
      });
    } catch (aiError) {
      console.error('AI processing error:', aiError);
      return NextResponse.json({ improved: content, source: 'fallback' });
    }
  } catch (error) {
    console.error('Email assist error:', error);
    return NextResponse.json(
      { error: 'Failed to process request' },
      { status: 500 }
    );
  }
}



