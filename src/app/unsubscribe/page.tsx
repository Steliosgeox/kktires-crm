export const dynamic = 'force-dynamic';

export default function UnsubscribePage({
  searchParams,
}: {
  searchParams?: { success?: string; error?: string };
}) {
  const success = searchParams?.success === '1';
  const error = searchParams?.error;

  return (
    <div className="min-h-screen flex items-center justify-center bg-zinc-950 px-6">
      <div className="w-full max-w-lg rounded-2xl border border-white/10 bg-white/[0.04] p-8 shadow-xl">
        <h1 className="text-2xl font-semibold text-white">Unsubscribe</h1>

        {success ? (
          <p className="mt-4 text-white/70">
            Η διαγραφή ολοκληρώθηκε. Δεν θα λαμβάνετε πλέον email από αυτή τη λίστα.
          </p>
        ) : (
          <p className="mt-4 text-white/70">
            {error === 'invalid_signature'
              ? 'Ο σύνδεσμος διαγραφής δεν είναι έγκυρος.'
              : error === 'not_found'
                ? 'Δεν βρέθηκε η εγγραφή διαγραφής.'
                : error === 'missing_params'
                  ? 'Λείπουν απαραίτητες παράμετροι.'
                  : error === 'server_error'
                    ? 'Παρουσιάστηκε σφάλμα. Δοκιμάστε ξανά αργότερα.'
                    : 'Δεν ήταν δυνατή η διαγραφή.'}
          </p>
        )}

        <div className="mt-6">
          <a
            href="/login"
            className="inline-flex items-center justify-center rounded-lg bg-cyan-500 px-4 py-2 text-sm font-medium text-black hover:bg-cyan-400"
          >
            Επιστροφή στο Login
          </a>
        </div>
      </div>
    </div>
  );
}

