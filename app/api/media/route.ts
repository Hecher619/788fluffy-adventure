import { NextResponse } from 'next/server';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const email = searchParams.get('email');

    if (!email) {
      return NextResponse.json({ error: 'Unauthorized request' }, { status: 401 });
    }

    const user = await prisma.user.findUnique({
      where: { email },
      include: { media: { orderBy: { createdAt: 'desc' } } }
    });

    if (!user) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    return NextResponse.json({
      media: user.media,
      storageUsed: Number(user.storageUsed),
      storageLimit: Number(user.storageLimit)
    });
  } catch (error) {
    return NextResponse.json({ error: 'Failed to fetch media' }, { status: 500 });
  }
}

export async function POST(req: Request) {
  try {
    const { email, name, url, type, size } = await req.json();

    if (!email || !url || !name) {
      return NextResponse.json({ error: 'Missing required file data' }, { status: 400 });
    }

    const user = await prisma.user.findUnique({ where: { email } });
    if (!user) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    const newMedia = await prisma.media.create({
      data: {
        userId: user.id,
        name,
        url,
        type,
        size: Number(size) || 0
      }
    });

    await prisma.user.update({
      where: { email },
      data: { storageUsed: { increment: Number(size) || 0 } }
    });

    return NextResponse.json({ success: true, media: newMedia });
  } catch (error) {
    console.error('Upload Error:', error);
    return NextResponse.json({ error: 'Failed to save media metadata' }, { status: 500 });
  }
}
