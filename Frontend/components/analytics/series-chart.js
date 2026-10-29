"use client";

import { CartesianGrid, Line, LineChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { formatNumber } from "@/lib/format";

export function SeriesChart({ data, label, ariaLabel, height = 240 }) {
  return (
    <div role="img" aria-label={ariaLabel} style={{ height }} className="w-full">
      <ResponsiveContainer width="100%" height="100%">
        <LineChart data={data} margin={{ top: 8, right: 12, bottom: 0, left: 0 }}>
          <CartesianGrid stroke="#e3e3dc" vertical={false} />
          <XAxis dataKey="x" tick={{ fontSize: 12, fill: "#5f636c" }} tickLine={false} axisLine={{ stroke: "#cfcfc6" }} minTickGap={24} />
          <YAxis tick={{ fontSize: 12, fill: "#5f636c" }} tickLine={false} axisLine={false} width={48} allowDecimals={false} tickFormatter={(v) => formatNumber(v)} />
          <Tooltip
            formatter={(value) => [formatNumber(value), label]}
            contentStyle={{ borderRadius: 10, border: "1px solid #e3e3dc", fontSize: 13 }}
          />
          <Line type="monotone" dataKey="y" stroke="#0b705d" strokeWidth={2} dot={data.length < 20} activeDot={{ r: 4 }} isAnimationActive={false} />
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
}
