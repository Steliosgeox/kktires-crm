import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/auth';
import { expandToGreekEmail, CustomerContext } from '@/lib/ai/meltemi';

export async function POST(request: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const { briefNote, customer } = body;

    if (!briefNote || briefNote.trim().length === 0) {
      return NextResponse.json(
        { error: 'Brief note is required' },
        { status: 400 }
      );
    }

    // Use the Meltemi library function
    const customerContext: CustomerContext = {
      firstName: customer?.firstName || 'Πελάτη',
      lastName: customer?.lastName,
      company: customer?.company,
      email: customer?.email,
    };

    const result = await expandToGreekEmail(briefNote, customerContext);

    if (!result.success) {
      return NextResponse.json({
        generatedText: briefNote, // Return original on error
        error: result.error,
        source: 'fallback',
      });
    }

    return NextResponse.json({
      generatedText: result.generatedText,
      source: 'meltemi',
    });
  } catch (error) {
    console.error('Email expand error:', error);
    return NextResponse.json(
      { error: 'Failed to expand email' },
      { status: 500 }
    );
  }
}

