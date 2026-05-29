import { createFileRoute, Link } from "@tanstack/react-router";
import { Trans } from "react-i18next";
import { AppFooter } from "@/components/AppFooter";
import { AppNav } from "@/components/AppNav";
import { useTranslation } from "@/i18n/service";

export const Route = createFileRoute("/privacy")({
  component: PrivacyPage,
});

const linkClass = "underline hover:text-ink dark:hover:text-paper";

const md = {
  b: <strong />,
  // biome-ignore lint/a11y/useAnchorContent: content is injected by Trans
  mail: <a href="mailto:hola@welist.io" className={linkClass} />,
};

function PrivacyPage() {
  const { t } = useTranslation();

  return (
    <div className="min-h-dvh bg-canvas dark:bg-canvas-dark flex flex-col">
      <AppNav />
      <main className="flex-1 w-full max-w-2xl mx-auto px-4 sm:px-8 py-10">
        <Link
          to="/"
          className="text-xs text-gray-500 dark:text-muted hover:text-ink dark:hover:text-paper transition"
        >
          {t("privacy.back")}
        </Link>
        <h1 className="mt-4 text-3xl font-bold tracking-tight text-ink dark:text-paper">
          {t("privacy.title")}
        </h1>
        <p className="mt-2 text-sm text-gray-500 dark:text-muted">
          {t("privacy.updated")}
        </p>

        <div className="mt-8 flex flex-col gap-6 text-sm text-gray-700 dark:text-[#d4d2cd] leading-relaxed">
          <Section title={t("privacy.s1.title")}>
            <p>
              <Trans i18nKey="privacy.s1.p1" components={md} />
            </p>
            <p>
              <Trans i18nKey="privacy.s1.p2" components={md} />
            </p>
          </Section>

          <Section title={t("privacy.s2.title")}>
            <ul className="list-disc pl-5 flex flex-col gap-1">
              <li>
                <Trans i18nKey="privacy.s2.i1" components={md} />
              </li>
              <li>
                <Trans i18nKey="privacy.s2.i2" components={md} />
              </li>
              <li>
                <Trans i18nKey="privacy.s2.i3" components={md} />
              </li>
              <li>
                <Trans i18nKey="privacy.s2.i4" components={md} />
              </li>
              <li>
                <Trans i18nKey="privacy.s2.i5" components={md} />
              </li>
            </ul>
          </Section>

          <Section title={t("privacy.s3.title")}>
            <ul className="list-disc pl-5 flex flex-col gap-1">
              <li>
                <Trans i18nKey="privacy.s3.i1" components={md} />
              </li>
              <li>
                <Trans i18nKey="privacy.s3.i2" components={md} />
              </li>
              <li>
                <Trans i18nKey="privacy.s3.i3" components={md} />
              </li>
              <li>
                <Trans i18nKey="privacy.s3.i4" components={md} />
              </li>
              <li>
                <Trans i18nKey="privacy.s3.i5" components={md} />
              </li>
            </ul>
            <p>
              <Trans i18nKey="privacy.s3.p1" components={md} />
            </p>
          </Section>

          <Section title={t("privacy.s4.title")}>
            <p>{t("privacy.s4.p1")}</p>
            <ul className="list-disc pl-5 flex flex-col gap-1">
              <li>
                <Trans i18nKey="privacy.s4.i1" components={md} />
              </li>
              <li>
                <Trans i18nKey="privacy.s4.i2" components={md} />
              </li>
              <li>
                <Trans i18nKey="privacy.s4.i3" components={md} />
              </li>
              <li>
                <Trans i18nKey="privacy.s4.i4" components={md} />
              </li>
              <li>
                <Trans i18nKey="privacy.s4.i5" components={md} />
              </li>
            </ul>
            <p>{t("privacy.s4.p2")}</p>
          </Section>

          <Section title={t("privacy.s5.title")}>
            <p>{t("privacy.s5.p1")}</p>
          </Section>

          <Section title={t("privacy.s6.title")}>
            <p>{t("privacy.s6.p1")}</p>
            <ul className="list-disc pl-5 flex flex-col gap-1">
              <li>{t("privacy.s6.i1")}</li>
              <li>{t("privacy.s6.i2")}</li>
              <li>{t("privacy.s6.i3")}</li>
              <li>{t("privacy.s6.i4")}</li>
              <li>{t("privacy.s6.i5")}</li>
              <li>{t("privacy.s6.i6")}</li>
              <li>{t("privacy.s6.i7")}</li>
            </ul>
            <p>
              <Trans i18nKey="privacy.s6.p2" components={md} />
            </p>
          </Section>

          <Section title={t("privacy.s7.title")}>
            <p>{t("privacy.s7.p1")}</p>
          </Section>

          <Section title={t("privacy.s8.title")}>
            <p>{t("privacy.s8.p1")}</p>
          </Section>

          <Section title={t("privacy.s9.title")}>
            <p>{t("privacy.s9.p1")}</p>
          </Section>

          <Section title={t("privacy.s10.title")}>
            <p>{t("privacy.s10.p1")}</p>
          </Section>
        </div>

        <p className="mt-10 text-xs text-gray-500 dark:text-muted">
          <Link to="/terms" className={linkClass}>
            {t("privacy.termsLink")}
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
