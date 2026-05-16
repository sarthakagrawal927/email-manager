"use client";

const primaryNav = [
  { id: "today", label: "Today", icon: "⚡" },
  { id: "inbox", label: "Inbox", icon: "📥" },
  { id: "search", label: "Semantic search", icon: "🔍" },
];

const browseNav = [
  { id: "starred", label: "Starred", icon: "⭐" },
  { id: "sent", label: "Sent", icon: "📤" },
  { id: "trash", label: "Trash", icon: "🗑" },
];

const toolsNav = [
  { id: "subscriptions", label: "Subscriptions", icon: "📬" },
  { id: "filters", label: "Filters", icon: "⚙️" },
  { id: "analytics", label: "Analytics", icon: "📊" },
];

interface Props {
  view: string;
  onNavigate: (id: string) => void;
  onSignOut: () => void;
  userImage?: string;
  userName: string;
}

function NavGroup({
  label,
  items,
  view,
  onNavigate,
}: {
  label?: string;
  items: { id: string; label: string; icon: string }[];
  view: string;
  onNavigate: (id: string) => void;
}) {
  return (
    <div className="mb-3">
      {label && (
        <div className="px-3 pt-2 pb-1 text-[10px] font-semibold uppercase tracking-wider text-[var(--text-muted)]">
          {label}
        </div>
      )}
      {items.map((item) => (
        <button
          key={item.id}
          onClick={() => onNavigate(item.id)}
          aria-current={view === item.id ? "page" : undefined}
          className={`w-full text-left px-3 py-2 rounded-lg mb-0.5 flex items-center gap-2.5 transition cursor-pointer text-sm ${
            view === item.id
              ? "bg-[var(--accent)]/10 text-[var(--accent)] font-medium"
              : "hover:bg-[var(--border)]/50 text-[var(--text-muted)]"
          }`}
        >
          <span aria-hidden>{item.icon}</span>
          {item.label}
        </button>
      ))}
    </div>
  );
}

export function Sidebar({ view, onNavigate, onSignOut, userImage, userName }: Props) {
  return (
    <aside className="w-56 border-r border-[var(--border)] bg-[var(--bg-card)] flex flex-col h-screen shrink-0">
      <div className="px-4 pt-4 pb-3 border-b border-[var(--border)] flex items-center gap-2">
        <span className="flex h-7 w-7 items-center justify-center rounded-md bg-[var(--accent)] text-xs font-bold text-white">
          K
        </span>
        <span className="text-sm font-bold">Kinetic</span>
      </div>

      <nav className="flex-1 overflow-y-auto px-2 py-2">
        <NavGroup items={primaryNav} view={view} onNavigate={onNavigate} />
        <NavGroup label="Mail" items={browseNav} view={view} onNavigate={onNavigate} />
        <NavGroup label="Tools" items={toolsNav} view={view} onNavigate={onNavigate} />
      </nav>

      <div className="p-3 border-t border-[var(--border)] flex items-center gap-2">
        {userImage && (
          <img src={userImage} alt="" className="w-7 h-7 rounded-full" />
        )}
        <span className="text-sm truncate flex-1" title={userName}>{userName}</span>
        <button
          onClick={onSignOut}
          className="text-xs text-[var(--text-muted)] hover:text-[var(--danger)] cursor-pointer"
        >
          Sign out
        </button>
      </div>
    </aside>
  );
}
