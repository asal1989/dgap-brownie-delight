import type { Metadata } from "next";
import { BoxBuilder } from "@/components/store/box-builder";
import { PageHero } from "@/components/ui/section";
import { getBoxBuilderData } from "@/lib/store-queries";

export const metadata: Metadata = {
  title: "Build your own brownie box",
  description: "Choose a box size and fill it with your favourite DGAP brownies.",
  alternates: { canonical: "/build-your-box" },
};

export default async function BuildYourBoxPage() {
  const { sizes, picks } = await getBoxBuilderData();
  return (
    <>
      <PageHero eyebrow="Custom box" title="Build your own box" sub="Choose a size, mix your favourite flavours, and see your selection before you order." />
      <div className="container-x py-16">
        <BoxBuilder sizes={sizes} picks={picks} />
      </div>
    </>
  );
}
