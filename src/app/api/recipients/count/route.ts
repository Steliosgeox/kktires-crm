import { NextRequest, NextResponse } from 'next/server';
import { countRecipients } from '@/server/email/recipients';
import { getOrgIdFromSession, requireSession } from '@/server/authz';

export async function GET(request: NextRequest) {
  try {
    const session = await requireSession();
    if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    const orgId = getOrgIdFromSession(session);

    const { searchParams } = new URL(request.url);
    const citiesParam = searchParams.get('cities');
    const tagsParam = searchParams.get('tags');
    const segmentsParam = searchParams.get('segments');
    const categoriesParam = searchParams.get('categories');
    const customerIdsParam = searchParams.get('customerIds');
    const rawEmailsParam = searchParams.get('rawEmails');

    const cities = citiesParam ? citiesParam.split(',').filter(Boolean) : [];
    const tagIds = tagsParam ? tagsParam.split(',').filter(Boolean) : [];
    const segmentIds = segmentsParam ? segmentsParam.split(',').filter(Boolean) : [];
    const categories = categoriesParam ? categoriesParam.split(',').filter(Boolean) : [];
    const customerIds = customerIdsParam ? customerIdsParam.split(',').filter(Boolean) : [];
    const rawEmails = rawEmailsParam ? rawEmailsParam.split(',').filter(Boolean) : [];

    const count = await countRecipients(orgId, {
      cities,
      tags: tagIds,
      segments: segmentIds,
      categories,
      customerIds,
      rawEmails,
    });

    return NextResponse.json({ count });
  } catch (error) {
    console.error('Error counting recipients:', error);
    return NextResponse.json({ error: 'Failed to count recipients' }, { status: 500 });
  }
}

