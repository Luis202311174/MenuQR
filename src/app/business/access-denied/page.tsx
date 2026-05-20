import Link from "next/link";

export default function AccessDeniedPage() {
  return (
    <div className="min-h-screen bg-slate-50 flex items-center justify-center px-4 py-10">
      <div className="w-full max-w-2xl rounded-[2rem] border border-slate-200 bg-white p-10 shadow-xl">
        <div className="text-center">
          <p className="text-sm uppercase tracking-[0.4em] text-slate-500">Access denied</p>
          <h1 className="mt-4 text-4xl font-bold text-slate-900">You don't have permission to view this page</h1>
          <p className="mt-4 text-base text-slate-600">
            Your staff role does not include the required access rights for this section. If you believe this is an error, ask your manager to adjust your permissions.
          </p>
          <div className="mt-8 flex flex-col gap-3 sm:flex-row sm:justify-center">
            <Link
              href="/business/dashboard"
              className="inline-flex items-center justify-center rounded-full bg-slate-900 px-6 py-3 text-white shadow-sm transition hover:bg-slate-800"
            >
              Return to dashboard
            </Link>
            <Link
              href="/staff/login"
              className="inline-flex items-center justify-center rounded-full border border-slate-200 bg-white px-6 py-3 text-slate-900 transition hover:bg-slate-50"
            >
              Staff login
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
