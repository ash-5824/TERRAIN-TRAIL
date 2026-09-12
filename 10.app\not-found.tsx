
import Link from "next/link";

export default function NotFound() {
  return (
    <div className="min-h-screen bg-slate-50 flex flex-col items-center justify-center p-6 text-center">
      <div className="p-8 bg-white border border-slate-200 rounded-3xl shadow-xl max-w-md w-full space-y-4">
        <span className="text-4xl">🏔️</span>
        <h2 className="text-2xl font-black text-slate-900">Trail Waypoint Not Found</h2>
        <p className="text-xs text-slate-600">
          The requested mountain trail route or coordinate could not be located on our topographic database.
        </p>
        <Link
          href="/"
          className="inline-block px-5 py-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-bold transition-colors shadow-sm"
        >
          Return to Trail Guard HQ
        </Link>
      </div>
    </div>
  );
}
