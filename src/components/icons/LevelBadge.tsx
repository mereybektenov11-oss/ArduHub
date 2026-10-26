import Icon from "./Icon";
export default function LevelBadge({ value }: { value: number }) {
  return (
    <span className="polish-level-badge" aria-hidden="true">
      <Icon name="level" value={value} size={32} />
    </span>
  );
}
