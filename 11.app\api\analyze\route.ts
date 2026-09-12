
import { NextRequest, NextResponse } from 'next/server';
import { GoogleGenAI, Type } from '@google/genai';
import { sql, initDB } from '@/lib/db';

const MAX_PAYLOAD_BYTES = 4.5 * 1024 * 1024; // 4.5 MB
const ALLOWED_MIME_TYPES = ['image/jpeg', 'image/png', 'image/webp'];

export interface HazardAnalysisResult {
  risk_level: 'Low' | 'Moderate' | 'Critical';
  hazard_type: string;
  safe_to_proceed: boolean;
  key_observations: string[];
  recommended_action: string;
}

export async function POST(request: NextRequest) {
  try {
    const contentLength = request.headers.get('content-length');
    if (contentLength && parseInt(contentLength, 10) > MAX_PAYLOAD_BYTES) {
      return NextResponse.json(
        { error: 'Payload exceeds maximum limit of 4.5 MB' },
        { status: 413 }
      );
    }

    let formData: FormData;
    try {
      formData = await request.formData();
    } catch {
      return NextResponse.json(
        { error: 'Invalid form data' },
        { status: 400 }
      );
    }

    const image = formData.get('image');
    const latStr = formData.get('latitude');
    const lonStr = formData.get('longitude');
    const weather = formData.get('weather')?.toString() || 'Clear / Normal';
    const trailExposure = formData.get('trail_exposure')?.toString() || 'General Mountain Trail';
    const authorName = formData.get('author_name')?.toString() || 'Community Scout';
    const authorRole = formData.get('author_role')?.toString() || 'Trail Scout';
    const authorAvatar = formData.get('author_avatar')?.toString() || 'CS';
    const locationName = formData.get('location_name')?.toString() || 'Mountain Sector';

    if (!image || latStr === null || lonStr === null) {
      return NextResponse.json(
        { error: 'Missing required fields: image, latitude, and longitude are required' },
        { status: 400 }
      );
    }

    if (!(image instanceof Blob)) {
      return NextResponse.json(
        { error: 'Invalid image file provided' },
        { status: 400 }
      );
    }

    if (image.size > MAX_PAYLOAD_BYTES) {
      return NextResponse.json(
        { error: 'Image file size exceeds maximum limit of 4.5 MB' },
        { status: 413 }
      );
    }

    if (!ALLOWED_MIME_TYPES.includes(image.type)) {
      return NextResponse.json(
        {
          error: `Unsupported image MIME type "${image.type}". Only image/jpeg, image/png, and image/webp are accepted. HEIC/HEIF and others are rejected.`,
        },
        { status: 400 }
      );
    }

    const latitude = parseFloat(latStr.toString());
    const longitude = parseFloat(lonStr.toString());

    if (
      isNaN(latitude) ||
      isNaN(longitude) ||
      latitude < -90 ||
      latitude > 90 ||
      longitude < -180 ||
      longitude > 180
    ) {
      return NextResponse.json(
        {
          error: 'Invalid coordinates: latitude must be between -90 and 90, and longitude between -180 and 180.',
        },
        { status: 400 }
      );
    }

    const arrayBuffer = await image.arrayBuffer();
    const base64Data = Buffer.from(arrayBuffer).toString('base64');
    const dataUri = `data:${image.type};base64,${base64Data}`;

    const customHeaderKey = request.headers.get('x-gemini-api-key');
    const effectiveApiKey = customHeaderKey?.trim() || process.env.GEMINI_API_KEY;

    let geminiResponse;
    const modelsToTry = ['gemini-3.6-flash', 'gemini-2.5-flash', 'gemini-2.0-flash'];
    let lastApiError: unknown = null;

    for (const modelName of modelsToTry) {
      try {
        const ai = new GoogleGenAI({ apiKey: effectiveApiKey });
        geminiResponse = await ai.models.generateContent({
          model: modelName,
          contents: [
            {
              role: 'user',
              parts: [
                {
                  inlineData: {
                    mimeType: image.type,
                    data: base64Data,
                  },
                },
                {
                  text: `Geographic Metadata - Latitude: ${latitude}, Longitude: ${longitude}. Field Conditions: Weather: ${weather}, Trail Exposure: ${trailExposure}.`,
                },
              ],
            },
          ],
          config: {
            systemInstruction:
              "You are an expert visual terrain-hazard assessment assistant. Analyze the photograph for landslides, tension cracks, mud flows, and rockfall. Return ONLY valid JSON matching the schema. 'safe_to_proceed' must be conservative—true only if no obvious hazard exists visually.",
            responseMimeType: 'application/json',
            responseSchema: {
              type: Type.OBJECT,
              properties: {
                risk_level: {
                  type: Type.STRING,
                  enum: ['Low', 'Moderate', 'Critical'],
                },
                hazard_type: {
                  type: Type.STRING,
                },
                safe_to_proceed: {
                  type: Type.BOOLEAN,
                },
                key_observations: {
                  type: Type.ARRAY,
                  items: { type: Type.STRING },
                },
                recommended_action: {
                  type: Type.STRING,
                },
              },
              required: [
                'risk_level',
                'hazard_type',
                'safe_to_proceed',
                'key_observations',
                'recommended_action',
              ],
            },
          },
        });
        if (geminiResponse?.text) break;
      } catch (err) {
        lastApiError = err;
      }
    }

    if (!geminiResponse || !geminiResponse.text) {
      const errMsg = lastApiError instanceof Error ? lastApiError.message : 'Unknown error';
      return NextResponse.json(
        {
          error: 'Failed to communicate with AI visual assessment service',
          details: errMsg,
        },
        { status: 502 }
      );
    }

    let parsedResult: HazardAnalysisResult;
    try {
      parsedResult = JSON.parse(geminiResponse.text) as HazardAnalysisResult;
    } catch {
      return NextResponse.json(
        { error: 'AI visual assessment service returned invalid structured data' },
        { status: 502 }
      );
    }

    // Persist to Neon PostgreSQL with fallback
    try {
      await initDB();
      await sql`
        INSERT INTO hazard_reports (
          latitude, longitude, risk_level, hazard_type, safe_to_proceed, 
          recommended_action, image_data, author_name, author_role, 
          author_avatar, location_name
        ) VALUES (
          ${latitude}, ${longitude}, ${parsedResult.risk_level}, ${parsedResult.hazard_type},
          ${parsedResult.safe_to_proceed}, ${parsedResult.recommended_action},
          ${dataUri}, ${authorName}, ${authorRole}, ${authorAvatar}, ${locationName}
        );
      `;
    } catch (dbErr) {
      console.warn('Database save skipped (gracefully failing over):', dbErr);
    }

    return NextResponse.json(parsedResult);
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Internal Server Error';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

import { NextResponse } from "next/server";

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const query = searchParams.get("q")?.trim() || "";

    if (!query || query.length < 2) {
      return NextResponse.json([]);
    }

    // 1. Direct coordinates parsing (e.g. '46.5582, 8.5601')
    const coordMatch = query.match(/^\s*([-+]?\d{1,2}(?:\.\d+)?)[,\s]+([-+]?\d{1,3}(?:\.\d+)?)\s*$/);
    if (coordMatch) {
      const lat = parseFloat(coordMatch[1]);
      const lon = parseFloat(coordMatch[2]);
      if (!isNaN(lat) && !isNaN(lon) && lat >= -90 && lat <= 90 && lon >= -180 && lon <= 180) {
        return NextResponse.json([
          {
            display_name: GPS Coordinates: ${lat.toFixed(5)}, ${lon.toFixed(5)},
            lat,
            lon,
            type: "coordinate"
          }
        ]);
      }
    }

    // 2. OpenStreetMap Nominatim
    try {
      const nominatimUrl = https://nominatim.openstreetmap.org/search?q=${encodeURIComponent(query)}&format=json&limit=6&addressdetails=1;
      const res = await fetch(nominatimUrl, {
        headers: {
          "User-Agent": "TerrainTrailGuard/1.0",
          "Accept": "application/json",
          "Accept-Language": "en"
        },
        next: { revalidate: 3600 }
      });

      if (res.ok) {
        const data = await res.json();
        if (Array.isArray(data) && data.length > 0) {
          const results = data.map((item: { display_name: string; lat: string; lon: string; type?: string }) => ({
            display_name: item.display_name,
            lat: parseFloat(item.lat),
            lon: parseFloat(item.lon),
            type: item.type || "place"
          }));
          return NextResponse.json(results);
        }
      }
    } catch (nomErr) {
      console.warn("Nominatim lookup failed, falling back to Photon:", nomErr);
    }

    // 3. Fallback: Komoot Photon
    try {
      const photonUrl = https://photon.komoot.io/api/?q=${encodeURIComponent(query)}&limit=6;
      const photonRes = await fetch(photonUrl, {
        headers: { "Accept": "application/json" }
      });

      if (photonRes.ok) {
        const photonData = await photonRes.json();
        if (photonData?.features && Array.isArray(photonData.features)) {
          const results = photonData.features.map((f: { geometry: { coordinates: [number, number] }; properties: { name?: string; street?: string; city?: string; state?: string; country?: string; osm_value?: string } }) => {
            const props = f.properties;
            const parts = [props.name, props.street, props.city, props.state, props.country].filter(Boolean);
            return {
              display_name: parts.join(", "),
              lon: f.geometry.coordinates[0],
              lat: f.geometry.coordinates[1],
              type: props.osm_value || "place"
            };
          }).filter((item: { display_name: string }) => item.display_name.length > 0);

          if (results.length > 0) {
            return NextResponse.json(results);
          }
        }
      }
    } catch (photonErr) {
      console.warn("Photon fallback failed:", photonErr);
    }

    return NextResponse.json([]);
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Geocoding failed";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
