import { Link } from "@tanstack/react-router";
import { useTranslation } from "@/i18n/service";

const LogoMark = () => (
  <span
    aria-hidden="true"
    className="inline-grid h-[18px] w-[18px] place-items-center rounded-[5px] bg-ink dark:bg-paper"
  >
    <svg
      aria-hidden="true"
      width="10"
      height="10"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="3.5"
      strokeLinecap="round"
      strokeLinejoin="round"
      className="text-canvas dark:text-canvas-dark"
    >
      <polyline points="20 6 9 17 4 12" />
    </svg>
  </span>
);

function ColTitle({ children }: { children: React.ReactNode }) {
  return (
    <h4 className="mb-3.5 font-mono text-[11px] uppercase tracking-[0.12em] text-muted font-medium">
      {children}
    </h4>
  );
}

function FootLink({
  to,
  external,
  children,
}: {
  to: string;
  external?: boolean;
  children: React.ReactNode;
}) {
  const cls =
    "text-[13.5px] text-ink/85 dark:text-paper/80 hover:text-ink dark:hover:text-paper no-underline transition-colors duration-150";
  if (external) {
    return (
      <a href={to} className={cls} target="_blank" rel="noreferrer">
        {children}
      </a>
    );
  }
  return (
    <Link to={to} className={cls}>
      {children}
    </Link>
  );
}

export function AppFooter() {
  const { t } = useTranslation();
  const year = new Date().getFullYear();

  return (
    <footer className="shrink-0 border-t border-black/[0.08] dark:border-white/[0.08]">
      <div className="mx-auto max-w-[1240px] px-6 sm:px-12 pt-14 pb-7">
        <div className="grid grid-cols-2 gap-10 md:grid-cols-[1.6fr_1fr_1fr]">
          <div>
            <Link
              to="/"
              className="flex items-center gap-2 text-[15px] font-bold text-ink dark:text-paper hover:opacity-70 no-underline tracking-[-0.01em]"
            >
              <LogoMark />
              welist
            </Link>
            <p className="mt-3.5 max-w-[320px] text-[13.5px] leading-[1.5] text-muted">
              {t("home.footBrandTagline")}
            </p>
          </div>

          <div>
            <ColTitle>{t("home.footColProduct")}</ColTitle>
            <ul className="flex flex-col gap-2 list-none p-0">
              <li>
                <FootLink to="/lists">{t("nav.myLists")}</FootLink>
              </li>
              <li>
                <FootLink to="/explore">{t("nav.explore")}</FootLink>
              </li>
              <li>
                <FootLink to="/users">{t("directory.nav")}</FootLink>
              </li>
              <li>
                <FootLink to="/help">{t("help.nav")}</FootLink>
              </li>
            </ul>
          </div>

          <div>
            <ColTitle>{t("home.footColLegal")}</ColTitle>
            <ul className="flex flex-col gap-2 list-none p-0">
              <li>
                <FootLink to="/privacy">{t("home.footLinkPrivacy")}</FootLink>
              </li>
              <li>
                <FootLink to="/terms">{t("home.footLinkTerms")}</FootLink>
              </li>
            </ul>
          </div>
        </div>

        <div className="mt-12 flex flex-wrap items-center justify-between gap-3 border-t border-black/[0.05] dark:border-white/[0.05] pt-6 font-mono text-[11px] text-muted tracking-[0.04em]">
          <span>{t("home.footMadeIn", { year })}</span>
          <span className="opacity-70">{t("home.footVersion")}</span>
        </div>
      </div>
    </footer>
  );
}
