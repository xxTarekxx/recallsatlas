import {
  formatGeneralRecallCategoryLabel,
  generalRecallCategoryHue,
} from "@/lib/generalRecallCategoryUi";

type Props = {
  categoryKey: string;
  className?: string;
};

export default function GeneralRecallCategoryTag({ categoryKey, className = "" }: Props) {
  const key = categoryKey.trim();
  if (!key) return null;
  const label = formatGeneralRecallCategoryLabel(key);
  const hue = generalRecallCategoryHue(key);
  return (
    <span
      className={`general-recall-category-tag${className ? ` ${className}` : ""}`}
      style={{ ["--gr-cat-hue" as string]: String(hue) }}
    >
      {label}
    </span>
  );
}
