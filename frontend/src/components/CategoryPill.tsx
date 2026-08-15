/** Colored category label. Color comes from the Category record. */

export function CategoryPill({ name, color }: { name: string; color: string }) {
  return (
    <span
      className="inline-block rounded-full px-2.5 py-0.5 text-xs font-medium"
      style={{
        color,
        backgroundColor: `${color}22`,
        border: `1px solid ${color}44`,
      }}
    >
      {name}
    </span>
  );
}
