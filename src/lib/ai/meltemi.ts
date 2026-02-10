/**
 * Meltemi 7B Greek AI Integration
 * Uses Hugging Face Inference API for Greek language email expansion
 */

const HUGGINGFACE_API = 'https://api-inference.huggingface.co/models/ilsp/Meltemi-7B-v1';
const API_KEY = process.env.HUGGINGFACE_API_KEY;

export interface CustomerContext {
  firstName: string;
  lastName?: string;
  company?: string;
  email?: string;
}

export interface MeltemiResponse {
  success: boolean;
  generatedText?: string;
  error?: string;
}

/**
 * Expand a brief Greek note into a full professional email
 */
export async function expandToGreekEmail(
  briefNote: string,
  customer: CustomerContext
): Promise<MeltemiResponse> {
  const customerName = [customer.firstName, customer.lastName].filter(Boolean).join(' ');

  const prompt = `Είσαι επαγγελματίας copywriter για ελληνική επιχείρηση ελαστικών.
Μετάτρεψε αυτή τη σύντομη σημείωση σε πλήρες επαγγελματικό email στα Ελληνικά.

Σημείωση: ${briefNote}
Πελάτης: ${customerName}
${customer.company ? `Εταιρεία: ${customer.company}` : ''}

Γράψε ένα ευγενικό, επαγγελματικό email με:
- Κατάλληλο χαιρετισμό (Αγαπητέ/ή κ. ...)
- Σαφές κύριο μήνυμα
- Ευγενικό κλείσιμο (Με εκτίμηση, ...)

Email:`;

  try {
    const response = await fetch(HUGGINGFACE_API, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        inputs: prompt,
        parameters: {
          max_new_tokens: 500,
          temperature: 0.7,
          do_sample: true,
          top_p: 0.9,
          repetition_penalty: 1.1,
        },
      }),
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));

      // Handle model loading
      if (response.status === 503) {
        return {
          success: false,
          error: 'Το μοντέλο φορτώνει. Παρακαλώ δοκιμάστε ξανά σε λίγα δευτερόλεπτα.',
        };
      }

      return {
        success: false,
        error: errorData.error || `API Error: ${response.status}`,
      };
    }

    const result = await response.json();

    // Extract generated text
    let generatedText = '';
    if (Array.isArray(result) && result[0]?.generated_text) {
      generatedText = result[0].generated_text;
    } else if (result.generated_text) {
      generatedText = result.generated_text;
    }

    // Clean up the response - remove the prompt from the beginning
    if (generatedText.includes('Email:')) {
      generatedText = generatedText.split('Email:').pop()?.trim() || generatedText;
    }

    return {
      success: true,
      generatedText,
    };
  } catch (error) {
    console.error('Meltemi API error:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Άγνωστο σφάλμα',
    };
  }
}

/**
 * Generate Greek subject lines for an email
 */
export async function generateGreekSubjectLines(
  emailContent: string,
  count: number = 5
): Promise<MeltemiResponse> {
  const prompt = `Δημιούργησε ${count} διαφορετικά θέματα (subject lines) για το παρακάτω email στα Ελληνικά.
Τα θέματα πρέπει να είναι σύντομα, ελκυστικά και επαγγελματικά.

Email:
${emailContent.slice(0, 500)}

Θέματα:
1.`;

  try {
    const response = await fetch(HUGGINGFACE_API, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        inputs: prompt,
        parameters: {
          max_new_tokens: 200,
          temperature: 0.8,
          do_sample: true,
        },
      }),
    });

    if (!response.ok) {
      return {
        success: false,
        error: `API Error: ${response.status}`,
      };
    }

    const result = await response.json();
    const generatedText = Array.isArray(result)
      ? result[0]?.generated_text
      : result.generated_text;

    return {
      success: true,
      generatedText,
    };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Άγνωστο σφάλμα',
    };
  }
}

/**
 * Check if the Meltemi model is available
 */
export async function checkMeltemiStatus(): Promise<{
  available: boolean;
  message: string;
}> {
  try {
    const response = await fetch(HUGGINGFACE_API, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        inputs: 'Γεια',
        parameters: {
          max_new_tokens: 10,
        },
      }),
    });

    if (response.status === 503) {
      return {
        available: false,
        message: 'Το μοντέλο φορτώνει...',
      };
    }

    if (!response.ok) {
      return {
        available: false,
        message: 'Το μοντέλο δεν είναι διαθέσιμο',
      };
    }

    return {
      available: true,
      message: 'Έτοιμο',
    };
  } catch {
    return {
      available: false,
      message: 'Σφάλμα σύνδεσης',
    };
  }
}

