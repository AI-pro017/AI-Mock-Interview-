// app/api/test-route/route.js
import { NextResponse } from 'next/server';

export async function GET() {
  return NextResponse.json({ message: 'Test route is working' });
}

export async function POST(req) {
  try {
    const body = await req.json();
    return NextResponse.json({ message: 'Test route is working (POST)', receivedData: body });
  } catch (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}