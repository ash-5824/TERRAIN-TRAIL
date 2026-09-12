# TERRAIN-TRAIL
AI-Powered Visual Terrain-Hazard Assessment

Built for Hack Days Solan

Mountain commuters and travelers face severe safety hazards from sudden landslides, sinking roads, and slope failures during monsoons in regions like Himachal Pradesh. Existing disaster-management tools are slow, academic, and require complex manual data input.

Terrain & Trail Guard is a mobile-first, zero-friction web application that allows users to instantly assess geological risks on the spot. By combining smartphone camera capture, device geolocation, and the Gemini 2.5 Flash multimodal vision model, it delivers real-time hazard identification and safety recommendations in seconds.

🚀 Key Features
Instant Multimodal Edge Reasoning: Users snap a photo of a cracking road or slipping slope. The app uses Gemini's Vision capabilities to extract physical hazard indicators (tension cracks, water seepage, rock-fall debris) without requiring manual data entry.

Bounded Client-Side Compression: Engineered for serverless environments (like Vercel). The app features a custom HTML5 Canvas compression loop with step-down quality targeting, ensuring large modern smartphone photos are compressed below 4MB before hitting the network, preventing silent 413 Payload Too Large crashes.

Deterministic Structured JSON: Bypasses conversational AI fluff. The backend strictly enforces a structured JSON schema via the @google/genai SDK, ensuring the frontend always receives reliable, typed data (risk_level, hazard_type, key_observations) to render color-coded dashboards safely.

Robust Input Validation: Features strict MIME-type allowlists, client-side iOS HEIC format rejection, and defensive coordinate boundary checks.

Ethical AI Safety Boundaries: Built with deep engineering responsibility. The AI is structurally prevented from guaranteeing physical safety. Coordinates are treated strictly as geographic metadata, and the safe_to_proceed logic is deliberately conservative.

🛠️ Tech Stack
Framework: Next.js 15 (App Router, TypeScript)

Intelligence: Google Gen AI SDK (@google/genai)

Model: Gemini 2.5 Flash (Multimodal Vision + Structured Outputs)

Styling: Tailwind CSS + Lucide React (High-contrast, mobile-first emergency dashboard)

Device APIs: HTML5 Geolocation API, MediaDevices API (capture="environment")

⚠️ Important Safety Disclaimer
Terrain & Trail Guard is an AI-assisted visual assessment MVP, NOT an authoritative emergency service.
Image analysis alone cannot establish hidden hazards, geological stability, changing weather conditions, or official road closures. The output of this application is based strictly on visible indicators in the submitted photograph. It does not constitute a guarantee of safety. Always follow local authorities, on-site warnings, and real-world judgment.

