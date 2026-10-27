import React from "react";

const ProcessingBar = ({ label, percent }) => {
  const determinate = typeof percent === "number";

  return (
    <div className="mt-4">
      <div className="mb-2 flex items-center justify-between gap-3 text-sm text-teal-300">
        <span>{label}</span>
        {determinate ? <span>{Math.max(0, Math.min(100, Math.round(percent)))}%</span> : null}
      </div>
      <div className="h-2 overflow-hidden rounded-full bg-white/10">
        {determinate ? (
          <div
            className="h-full rounded-full bg-teal-600 transition-[width] duration-300"
            style={{ width: `${Math.max(4, Math.min(100, percent))}%` }}
          />
        ) : (
          <div className="processing-slider h-full w-1/3 rounded-full bg-teal-600" />
        )}
      </div>
    </div>
  );
};

export default ProcessingBar;
