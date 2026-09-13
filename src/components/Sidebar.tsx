import { NavLink } from 'react-router-dom';

interface SidebarItem {
  to: string;
  label: string;
  icon?: string;
  end?: boolean;
}

interface SidebarProps {
  items: SidebarItem[];
  title?: string;
  footer?: React.ReactNode;
}

export function Sidebar({ items, title, footer }: SidebarProps) {
  return (
    <aside className="bg-surfaceAlt border-r border-hairline flex flex-col h-full w-56 flex-shrink-0">
      {title && (
        <div className="px-5 py-4 border-b border-hairline flex items-center gap-2.5">
          <img src="/logo.png" alt="MILO logo" className="w-6 h-6 object-contain rounded" />
          <span className="text-sm font-bold text-ink tracking-tight">{title}</span>
        </div>
      )}
      <nav className="flex-1 py-3" aria-label="Sidebar navigation">
        <ul className="flex flex-col gap-0.5 px-2">
          {items.map((item) => (
            <li key={item.to}>
              <NavLink
                to={item.to}
                end={item.end}
                className={({ isActive }) =>
                  `flex items-center gap-2.5 px-3 py-2 rounded-nested text-sm font-medium transition-colors ${
                    isActive
                      ? 'bg-ink text-paper font-semibold shadow-xs'
                      : 'text-ink/80 hover:text-ink hover:bg-canvas'
                  }`
                }
              >
                {item.icon && <span aria-hidden="true">{item.icon}</span>}
                {item.label}
              </NavLink>
            </li>
          ))}
        </ul>
      </nav>
      {footer && <div className="border-t border-hairline p-4">{footer}</div>}
    </aside>
  );
}
