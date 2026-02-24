"use client";

const navItems = [
  { id: "inbox", label: "Inbox", icon: "📥" },
  { id: "starred", label: "Starred", icon: "⭐" },
  { id: "sent", label: "Sent", icon: "📤" },
  { id: "trash", label: "Trash", icon: "🗑" },
  { id: "subscriptions", label: "Subscriptions", icon: "📬" },
  { id: "analytics", label: "Analytics", icon: "📊" },
];

interface Props {
  view: string;
  onNavigate: (id: string) => void;
  onCompose: () => void;
  onSignOut: () => void;
  userImage?: string;
  userName: string;
}

export function Sidebar({ view, onNavigate, onCompose, onSignOut, userImage, userName }: Props) {
  return (
    <aside className="w-56 border-r border-[var(--border)] bg-[var(--bg-card)] flex flex-col h-screen shrink-0">
      <div className="p-4">
        <button
          onClick={onCompose}
          className="w-full py-2.5 bg-[var(--accent)] text-white rounded-lg hover:bg-[var(--accent-hover)] transition font-medium cursor-pointer"
        >
          Compose
        </button>
      </div>

      <nav className="flex-1 px-2">
        {navItems.map((item) => (
          <button
            key={item.id}
            onClick={() => onNavigate(item.id)}
            className={`w-full text-left px-3 py-2 rounded-lg mb-0.5 flex items-center gap-2.5 transition cursor-pointer ${
              view === item.id
                ? "bg-[var(--accent)]/10 text-[var(--accent)] font-medium"
                : "hover:bg-[var(--border)]/50 text-[var(--text-muted)]"
            }`}
          >
            <span>{item.icon}</span>
            {item.label}
          </button>
        ))}
      </nav>

      <div className="p-3 border-t border-[var(--border)] flex items-center gap-2">
        {userImage && (
          <img src={userImage} alt="" className="w-7 h-7 rounded-full" />
        )}
        <span className="text-sm truncate flex-1">{userName}</span>
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
