import { useState } from "react";

const PREVIEW_LENGTH = 160;

const shorten = (text: string) =>
  text.length > PREVIEW_LENGTH
    ? `${text.slice(0, PREVIEW_LENGTH).trimEnd()}...`
    : text;

interface SideProps {
  title: string;
  text: string;
  expanded: boolean;
}

const Side = ({ title, text, expanded }: SideProps) => (
  <div>
    <p className="mb-1 text-xs font-medium text-mute">{title}</p>
    <p className="text-xs leading-relaxed text-ink">
      {text ? (expanded ? text : shorten(text)) : "—"}
    </p>
  </div>
);

interface ProductDescriptionsProps {
  ours: string;
  theirs: string;
}

const ProductDescriptions = ({ ours, theirs }: ProductDescriptionsProps) => {
  const [expanded, setExpanded] = useState(false);
  const isLong = ours.length > PREVIEW_LENGTH || theirs.length > PREVIEW_LENGTH;

  return (
    <div className="w-[28rem] max-w-[70vw]">
      <div className="grid grid-cols-2 gap-4">
        <Side title="Ours" text={ours} expanded={expanded} />
        <Side title="Theirs" text={theirs} expanded={expanded} />
      </div>
      {isLong ? (
        <button
          type="button"
          onClick={() => setExpanded((current) => !current)}
          className="mt-2 text-xs text-brand hover:text-brand-hover"
        >
          {expanded ? "Show less" : "Show more"}
        </button>
      ) : null}
    </div>
  );
};

export default ProductDescriptions;
