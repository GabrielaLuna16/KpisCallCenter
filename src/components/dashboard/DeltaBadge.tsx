import styles from './Panels.module.css';

interface Props {
  curr: number;
  prev: number | null | undefined;
  positiveIsGood?: boolean;
  variant?: 'dark' | 'light';
  format?: (v: number) => string;
}

export default function DeltaBadge({ curr, prev, positiveIsGood = true, variant = 'dark', format }: Props) {
  if (prev == null || prev === 0) return null;
  const pct = Math.round(((curr - prev) / Math.abs(prev)) * 100);
  const prevFmt = format ? format(prev) : String(prev);

  if (pct === 0) {
    return (
      <span className={`${styles.delta} ${variant === 'dark' ? styles.deltaNeutDark : styles.deltaNeutLight}`}>
        = {prevFmt} mes ant.
      </span>
    );
  }

  const up = pct > 0;
  const good = positiveIsGood ? up : !up;
  const colorClass = good
    ? (variant === 'dark' ? styles.deltaGoodDark : styles.deltaGoodLight)
    : (variant === 'dark' ? styles.deltaBadDark  : styles.deltaBadLight);

  return (
    <span className={`${styles.delta} ${colorClass}`}>
      {up ? '↑' : '↓'} {Math.abs(pct)}% · ant: {prevFmt}
    </span>
  );
}
