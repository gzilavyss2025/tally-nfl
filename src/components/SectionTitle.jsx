export function SectionTitle({ title, note }) {
  return (
    <h3 className="section__title">
      <span>{title}</span>
      {note && <em>{note}</em>}
    </h3>
  )
}
