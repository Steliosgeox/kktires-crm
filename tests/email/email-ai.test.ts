import { requestAiAssist } from '@/components/email/outlook-editor/email-ai';

describe('email ai client', () => {
  const originalFetch = global.fetch;

  afterEach(() => {
    global.fetch = originalFetch;
    vi.restoreAllMocks();
  });

  it('returns generated content for improve and expand actions', async () => {
    global.fetch = vi
      .fn()
      .mockResolvedValueOnce(
        new Response(JSON.stringify({ improved: '<p>Improved</p>' }), { status: 200 })
      )
      .mockResolvedValueOnce(
        new Response(JSON.stringify({ generatedText: '<p>Expanded</p>' }), { status: 200 })
      ) as typeof fetch;

    await expect(requestAiAssist('improve', '<p>Draft</p>')).resolves.toEqual({
      content: '<p>Improved</p>',
    });

    await expect(requestAiAssist('expand', '<p>Draft</p>')).resolves.toEqual({
      content: '<p>Expanded</p>',
    });
  });

  it('returns subject suggestions for subject generation', async () => {
    global.fetch = vi.fn().mockResolvedValue(
      new Response(JSON.stringify({ suggestions: ['Subject A', 'Subject B'] }), {
        status: 200,
      })
    ) as typeof fetch;

    await expect(requestAiAssist('subjects', '<p>Draft</p>')).resolves.toEqual({
      subjects: ['Subject A', 'Subject B'],
    });
  });

  it('throws a normalized error when the endpoint fails', async () => {
    global.fetch = vi.fn().mockResolvedValue(
      new Response(JSON.stringify({ error: 'Boom' }), { status: 500, statusText: 'Server Error' })
    ) as typeof fetch;

    await expect(requestAiAssist('improve', '<p>Draft</p>')).rejects.toThrow('Boom');
  });
});
