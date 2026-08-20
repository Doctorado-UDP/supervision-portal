import { createClient } from "@/lib/supabase/server";

export default async function SupabaseTestPage() {
  const supabase = await createClient();

  const { data, error } = await supabase
    .from("profiles")
    .select("id")
    .limit(1);

  const urlConfigured = Boolean(
    process.env.NEXT_PUBLIC_SUPABASE_URL
  );

  const keyConfigured = Boolean(
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY
  );

  return (
    <main className="min-h-screen p-8">
      <div className="mx-auto max-w-2xl space-y-6">
        <h1 className="text-3xl font-semibold">
          Supabase connection test
        </h1>

        <div className="rounded-lg border p-6">
          <dl className="space-y-3">
            <div>
              <dt className="font-medium">
                Supabase URL configured
              </dt>
              <dd>{urlConfigured ? "Yes" : "No"}</dd>
            </div>

            <div>
              <dt className="font-medium">
                Publishable key configured
              </dt>
              <dd>{keyConfigured ? "Yes" : "No"}</dd>
            </div>

            <div>
              <dt className="font-medium">
                Database request
              </dt>
              <dd>
                {error
                  ? `Supabase responded: ${error.message}`
                  : `Supabase responded successfully (${data.length} visible rows)`}
              </dd>
            </div>
          </dl>
        </div>

        <p className="text-sm">
          Zero visible rows is expected when anonymous access is
          restricted by Row Level Security.
        </p>
      </div>
    </main>
  );
}