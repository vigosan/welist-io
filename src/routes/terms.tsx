import { createFileRoute, Link } from "@tanstack/react-router";
import { Trans } from "react-i18next";
import { AppFooter } from "@/components/AppFooter";
import { AppNav } from "@/components/AppNav";
import { useTranslation } from "@/i18n/service";

export const Route = createFileRoute("/terms")({
  component: TermsPage,
});

const linkClass = "underline hover:text-ink dark:hover:text-paper";

const md = {
  b: <strong />,
  // biome-ignore lint/a11y/useAnchorContent: content is injected by Trans
  mail: <a href="mailto:hola@welist.io" className={linkClass} />,
  privacy: <Link to="/privacy" className={linkClass} />,
};

function TermsPage() {
  const { t } = useTranslation();

  return (
    <div className="min-h-dvh bg-canvas dark:bg-canvas-dark flex flex-col">
      <AppNav />
      <main className="flex-1 w-full max-w-2xl mx-auto px-4 sm:px-8 py-10">
        <Link
          to="/"
          className="text-xs text-gray-500 dark:text-muted hover:text-ink dark:hover:text-paper transition"
        >
          {t("terms.back")}
        </Link>
        <h1 className="mt-4 text-3xl font-bold tracking-tight text-ink dark:text-paper">
          {t("terms.title")}
        </h1>
        <p className="mt-2 text-sm text-gray-500 dark:text-muted">
          {t("terms.updated")}
        </p>

        <div className="mt-8 flex flex-col gap-6 text-sm text-gray-700 dark:text-gray-300 leading-relaxed">
          <Section title={t("terms.s1.title")}>
            <p>
              <Trans i18nKey="terms.s1.p1" components={md} />
            </p>
          </Section>

          <Section title={t("terms.s2.title")}>
            <p>{t("terms.s2.p1")}</p>
          </Section>

          <Section title={t("terms.s3.title")}>
            <p>{t("terms.s3.p1")}</p>
          </Section>

          <Section title={t("terms.s4.title")}>
            <p>{t("terms.s4.p1")}</p>
            <p>{t("terms.s4.p2")}</p>
            <ul className="list-disc pl-5 flex flex-col gap-1">
              <li>{t("terms.s4.i1")}</li>
              <li>{t("terms.s4.i2")}</li>
              <li>{t("terms.s4.i3")}</li>
              <li>{t("terms.s4.i4")}</li>
              <li>{t("terms.s4.i5")}</li>
              <li>{t("terms.s4.i6")}</li>
            </ul>
            <p>{t("terms.s4.p3")}</p>
          </Section>

          <Section title={t("terms.s5.title")}>
            <p>{t("terms.s5.p1")}</p>
          </Section>

          <Section title={t("terms.s6.title")}>
            <p>{t("terms.s6.p1")}</p>
            <p>
              <Trans i18nKey="terms.s6.p2" components={md} />
            </p>
          </Section>

          <Section title={t("terms.s7.title")}>
            <p>{t("terms.s7.p1")}</p>
          </Section>

          <Section title={t("terms.s8.title")}>
            <p>{t("terms.s8.p1")}</p>
          </Section>

          <Section title={t("terms.s9.title")}>
            <p>{t("terms.s9.p1")}</p>
          </Section>

          <Section title={t("terms.s10.title")}>
            <p>{t("terms.s10.p1")}</p>
          </Section>

          <Section title={t("terms.s11.title")}>
            <p>{t("terms.s11.p1")}</p>
          </Section>

          <Section title={t("terms.s12.title")}>
            <p>{t("terms.s12.p1")}</p>
          </Section>

          <Section title={t("terms.s13.title")}>
            <p>
              <Trans i18nKey="terms.s13.p1" components={md} />
            </p>
          </Section>
        </div>

        <p className="mt-10 text-xs text-gray-500 dark:text-muted">
          <Link to="/privacy" className={linkClass}>
            {t("terms.privacyLink")}
          </Link>
        </p>
      </main>
      <AppFooter />
    </div>
  );
}

function Section({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}) {
  return (
    <section className="flex flex-col gap-2">
      <h2 className="text-base font-semibold text-ink dark:text-paper">
        {title}
      </h2>
      {children}
    </section>
  );
}
