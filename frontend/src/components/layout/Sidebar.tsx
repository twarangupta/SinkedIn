/**
 * Left navigation sidebar. Nav items beyond Home are Phase-later stubs, shown
 * for layout but not yet wired to routes.
 */

const NAV = [
  { label: 'Home', active: true },
  { label: 'Feed', active: false },
  { label: 'Companies', active: false },
  { label: 'Interviews', active: false },
  { label: 'Salaries', active: false },
  { label: 'Leaderboard', active: false },
];

export function Sidebar() {
  return (
    <aside className="hidden w-52 shrink-0 lg:block">
      <nav className="sticky top-20 space-y-1">
        {NAV.map((item) => (
          <button
            key={item.label}
            className={`block w-full rounded-lg px-3 py-2 text-left text-sm ${
              item.active
                ? 'bg-elevated text-primary'
                : 'text-ink-2 hover:bg-elevated hover:text-ink'
            }`}
          >
            {item.label}
          </button>
        ))}
      </nav>
    </aside>
  );
}
