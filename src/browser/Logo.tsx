import React from "react";

type NodeLocation = {
  cx: number;
  cy: number;
  decoration?: string;
};

export const originalNodes: NodeLocation[] = [
  { cx: 50, cy: 150 },
  { cx: 30, cy: 100 },
  { cx: 50, cy: 50 },
  { cx: 100, cy: 30 },
  { cx: 150, cy: 50 },
  { cx: 170, cy: 100 },
  { cx: 150, cy: 150 },
];

const nodes: NodeLocation[] = [
  { cx: 70, cy: 150, decoration: "line" },
  { cx: 80, cy: 80, decoration: "vertical" },
  { cx: 40, cy: 75, decoration: "grey" },
  { cx: 110, cy: 30, decoration: "" },
  { cx: 130, cy: 155, decoration: "vertical" },
  { cx: 160, cy: 70, decoration: "grey" },
  { cx: 120, cy: 110, decoration: "line" },
];

const strokeWidth = 7;

const Line = ({ from, to }: { from: NodeLocation; to: NodeLocation }) => (
  <line
    x1={from.cx}
    y1={from.cy}
    x2={to.cx}
    y2={to.cy}
    stroke="black"
    strokeWidth={strokeWidth}
  />
);
export const debuggingColors = [
  "#E63946", // Red
  "#F1FAEE", // Light Blue
  "#A8DADC", // Cyan
  "#457B9D", // Dark Blue
  "#1D3557", // Navy Blue
  "#F4A261", // Sandy Brown
  "#2A9D8F", // Teal
];
export function Logo() {
  return (
    <svg width="200" height="200" xmlns="http://www.w3.org/2000/svg">
      <circle
        cx="100"
        cy="100"
        r={100 - strokeWidth}
        fill="none"
        stroke="black"
        strokeWidth={strokeWidth}
      />

      <Line from={nodes[0]} to={nodes[1]} />
      <Line from={nodes[0]} to={nodes[2]} />
      <Line from={nodes[1]} to={nodes[5]} />
      <Line from={nodes[2]} to={nodes[3]} />
      <Line from={nodes[3]} to={nodes[6]} />
      <Line from={nodes[4]} to={nodes[5]} />
      <Line from={nodes[6]} to={nodes[0]} />
      <Line from={nodes[4]} to={nodes[1]} />
      <Line from={nodes[5]} to={nodes[3]} />

      {nodes.map((node, i) => (
        <>
          <circle
            key={i}
            cx={node.cx}
            cy={node.cy}
            r="14"
            fill="white"
            // fill={colors[i % colors.length]}
            strokeWidth={strokeWidth}
            stroke={node.decoration !== "grey" ? "black" : "grey"}
          />
          {node.decoration === "vertical" && (
            <line
              x1={node.cx}
              y1={node.cy - 14}
              x2={node.cx}
              y2={node.cy + 14}
              stroke="black"
              strokeWidth={strokeWidth}
            />
          )}
          {node.decoration === "line" && (
            <line
              x1={node.cx - 14}
              y1={node.cy}
              x2={node.cx + 14}
              y2={node.cy}
              stroke="black"
              strokeWidth={strokeWidth}
            />
          )}
        </>
      ))}
    </svg>
  );
}
