
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
