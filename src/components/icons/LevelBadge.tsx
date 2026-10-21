import RewardIcon from "./RewardIcon";
export default function LevelBadge({ value }: { value: number }) {
  return (
    <span className="polish-level-badge" aria-hidden="true">
      <RewardIcon kind="level" />
      <b>{value}</b>
    </span>
  );
}
