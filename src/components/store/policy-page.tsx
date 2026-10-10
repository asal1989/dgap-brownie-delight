import type { Metadata } from "next";
import { PageHero } from "@/components/ui/section";
import { POLICY_TITLES, policyText, type PolicyKey } from "@/lib/policies";
import { getSettings } from "@/lib/settings";

export const policyMetadata = (key: PolicyKey): Metadata => ({
  title: POLICY_TITLES[key],
  alternates: { canonical: `/${key}` },
});

export async function PolicyPage({ policy }: { policy: PolicyKey }) {
  const settings = await getSettings();
  const blocks = policyText(policy, settings).split(/\n{2,}/);
  return (
    <>
      <PageHero eyebrow="Customer care" title={POLICY_TITLES[policy]} />
      <article className="container-narrow py-16">
        {blocks.map((b, i) => {
          const lines = b.split("\n");
          if (lines[0].startsWith("# ")) {
            return (
              <section key={i} className="mb-8">
                <h2 className="mb-3 text-3xl">{lines[0].slice(2)}</h2>
                {lines.slice(1).map((l, j) => <p key={j} className="text-muted">{l}</p>)}
              </section>
            );
          }
          return <p key={i} className="mb-5 text-muted">{b}</p>;
        })}
      </article>
    </>
  );
}
