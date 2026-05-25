import { useColorScheme } from "nativewind";
import Svg, { Circle } from "react-native-svg";

type Props = {
  done: number;
  total: number;
  size?: number;
  strokeWidth?: number;
};

export function ProgressDonut({
  done,
  total,
  size = 28,
  strokeWidth = 3,
}: Props) {
  const { colorScheme } = useColorScheme();
  const dark = colorScheme === "dark";
  const track = dark ? "#2a2a2a" : "#e5e5e5";
  const fill = dark ? "#f0ede8" : "#0c0c0b";
  const r = (size - strokeWidth) / 2;
  const c = 2 * Math.PI * r;
  const progress = total > 0 ? Math.min(1, done / total) : 0;
  const dash = c * progress;
  const gap = c - dash;
  return (
    <Svg width={size} height={size}>
      <Circle
        cx={size / 2}
        cy={size / 2}
        r={r}
        stroke={track}
        strokeWidth={strokeWidth}
        fill="none"
      />
      {progress > 0 && (
        <Circle
          cx={size / 2}
          cy={size / 2}
          r={r}
          stroke={fill}
          strokeWidth={strokeWidth}
          fill="none"
          strokeDasharray={`${dash} ${gap}`}
          strokeLinecap="round"
          transform={`rotate(-90 ${size / 2} ${size / 2})`}
        />
      )}
    </Svg>
  );
}
