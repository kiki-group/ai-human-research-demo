import { useEffect, useState, type ReactNode } from "react";
import { Link, NavLink, useLocation, useNavigate } from "react-router-dom";
import { useAppState } from "../state/AppState";
import Logo from "./Logo";
import Icon from "./Icon";

interface Props {
  children: ReactNode;
  /** Show back button in the header. True = history back; string = path */
  back?: boolean | string;
  title?: string;
  subtitle?: string;
  /** Custom action slot in header right area */
  actions?: ReactNode;
  /** Full-width (e.g. for large reports); defaults to narrow (max-w-3xl) */
  wide?: boolean;
}

export default function AppShell({
  children,
  back,
  title,
  subtitle,
  actions,
  wide,
}: Props) {
  const navigate = useNavigate();
  const location = useLocation();
  const { setApiKey, studies } = useAppState();
  const [menuOpen, setMenuOpen] = useState(false);

  // close mobile menu on route change
  useEffect(() => setMenuOpen(false), [location.pathname]);

  function handleBack() {
    if (typeof back === "string") navigate(back);
    else navigate(-1);
  }

  const recentStudies = [...studies]
    .sort((a, b) => b.updatedAt - a.updatedAt)
    .slice(0, 6);

  return (
    <div className="min-h-full bg-slate-50">
      {/* ---------- Desktop sidebar ---------- */}
      <aside className="fixed inset-y-0 left-0 z-40 hidden w-64 shrink-0 border-r border-slate-200 bg-white lg:block">
        <SidebarContent
          onClose={() => setMenuOpen(false)}
          onSignOut={() => {
            if (confirm("Remove the saved Gemini API key from this browser?")) {
              setApiKey(null);
            }
          }}
          recentStudies={recentStudies}
        />
      </aside>

      {/* ---------- Mobile sidebar drawer ---------- */}
      {menuOpen && (
        <>
          <div
            className="fixed inset-0 z-50 bg-slate-900/40 backdrop-blur-sm lg:hidden"
            onClick={() => setMenuOpen(false)}
            aria-hidden
          />
          <aside className="fixed inset-y-0 left-0 z-50 w-72 max-w-[82vw] border-r border-slate-200 bg-white shadow-pop lg:hidden animate-fade-in">
            <SidebarContent
              onClose={() => setMenuOpen(false)}
              onSignOut={() => {
                if (
                  confirm("Remove the saved Gemini API key from this browser?")
                ) {
                  setApiKey(null);
                }
              }}
              recentStudies={recentStudies}
            />
          </aside>
        </>
      )}

      {/* ---------- Main column ---------- */}
      <div className="lg:pl-64">
        <header className="sticky top-0 z-30 border-b border-slate-200 bg-white/80 backdrop-blur">
          <div
            className={`mx-auto flex items-center gap-3 px-4 py-3 sm:px-6 ${
              wide ? "max-w-7xl" : "max-w-5xl"
            }`}
          >
            <button
              onClick={() => setMenuOpen(true)}
              className="btn-icon lg:hidden"
              aria-label="Open menu"
            >
              <Icon name="menu" />
            </button>
            {back && (
              <button
                onClick={handleBack}
                className="btn-icon"
                aria-label="Back"
              >
                <Icon name="chevron-left" />
              </button>
            )}
            <div className="min-w-0 flex-1">
              {title ? (
                <>
                  <div className="truncate text-[15px] font-semibold text-slate-900">
                    {title}
                  </div>
                  {subtitle && (
                    <div className="truncate text-xs text-slate-500">
                      {subtitle}
                    </div>
                  )}
                </>
              ) : (
              <Link to="/" className="flex items-center gap-2 lg:hidden">
                <Logo size={28} />
                <span className="text-sm font-semibold tracking-tight">
                  Human Research
                </span>
              </Link>
              )}
            </div>
            {actions && (
              <div className="flex shrink-0 items-center gap-2">{actions}</div>
            )}
          </div>
        </header>
        <main
          className={`mx-auto w-full px-4 pb-16 pt-6 sm:px-6 sm:pt-8 animate-fade-in ${
            wide ? "max-w-7xl" : "max-w-5xl"
          }`}
        >
          {children}
        </main>
      </div>
    </div>
  );
}

function SidebarContent({
  onClose,
  onSignOut,
  recentStudies,
}: {
  onClose: () => void;
  onSignOut: () => void;
  recentStudies: { id: string; title: string; status: string }[];
}) {
  return (
    <div className="flex h-full flex-col">
      <div className="flex items-center justify-between px-5 py-4">
        <Link
          to="/"
          onClick={onClose}
          className="flex items-center gap-2.5"
        >
          <Logo size={32} />
          <div className="flex flex-col leading-tight">
            <span className="text-sm font-semibold tracking-tight text-slate-900">
              AI-Driven Human Research
            </span>
            <span className="text-2xs text-slate-500">AI-moderated studies</span>
          </div>
        </Link>
        <button
          onClick={onClose}
          className="btn-icon lg:hidden !h-8 !w-8"
          aria-label="Close menu"
        >
          <Icon name="close" size={14} />
        </button>
      </div>

      <div className="px-4">
        <NavLink
          to="/create"
          onClick={onClose}
          className={({ isActive }) =>
            `flex items-center gap-2 rounded-lg px-3 py-2.5 text-sm font-semibold transition ${
              isActive
                ? "bg-brand-600 text-white shadow-sm"
                : "bg-brand-600 text-white shadow-sm hover:bg-brand-700"
            }`
          }
        >
          <Icon name="plus" size={16} />
          New study
        </NavLink>
      </div>

      <nav className="mt-5 flex flex-col gap-1 px-2">
        <SideLink to="/" icon="home" label="Dashboard" onClose={onClose} end />
      </nav>

      <div className="mt-5 px-5">
        <div className="label">Recent studies</div>
      </div>
      <div className="mt-2 flex-1 overflow-y-auto px-2 no-scrollbar">
        {recentStudies.length === 0 ? (
          <div className="px-3 py-2 text-xs text-slate-500">No studies yet</div>
        ) : (
          recentStudies.map((s) => (
            <SideLink
              key={s.id}
              to={
                s.status === "complete"
                  ? `/study/${s.id}/report`
                  : s.status === "pending"
                  ? `/study/${s.id}/pending`
                  : `/study/${s.id}/edit`
              }
              label={s.title || "Untitled"}
              onClose={onClose}
              truncate
              right={
                <StatusDot status={s.status as "draft" | "pending" | "complete"} />
              }
            />
          ))
        )}
      </div>

      <div className="mt-auto border-t border-slate-200 p-3">
        <button
          onClick={onSignOut}
          className="flex w-full items-center gap-2 rounded-lg px-3 py-2 text-xs font-medium text-slate-600 transition hover:bg-slate-100 hover:text-slate-900"
        >
          <Icon name="logout" size={14} />
          Reset API key
        </button>
        <div className="mt-2 px-3 py-1 text-2xs text-slate-400">
          Demo mode · runs on your Gemini key
        </div>
      </div>
    </div>
  );
}

function StatusDot({ status }: { status: "draft" | "pending" | "complete" }) {
  const cls =
    status === "complete"
      ? "bg-brand-500"
      : status === "pending"
      ? "bg-amber-500 animate-pulse"
      : "bg-slate-300";
  return (
    <span
      className={`inline-block h-1.5 w-1.5 rounded-full ${cls}`}
      aria-label={status}
    />
  );
}

function SideLink({
  to,
  label,
  icon,
  onClose,
  end,
  truncate,
  right,
}: {
  to: string;
  label: string;
  icon?: Parameters<typeof Icon>[0]["name"];
  onClose: () => void;
  end?: boolean;
  truncate?: boolean;
  right?: ReactNode;
}) {
  return (
    <NavLink
      to={to}
      end={end}
      onClick={onClose}
      className={({ isActive }) =>
        `group flex items-center gap-2 rounded-lg px-3 py-2 text-sm transition ${
          isActive
            ? "bg-slate-100 font-semibold text-slate-900"
            : "text-slate-600 hover:bg-slate-50 hover:text-slate-900"
        }`
      }
    >
      {icon && <Icon name={icon} size={16} />}
      <span className={truncate ? "min-w-0 flex-1 truncate" : "flex-1"}>
        {label}
      </span>
      {right}
    </NavLink>
  );
}
