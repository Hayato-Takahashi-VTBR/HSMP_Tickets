import { useEffect, useMemo, useRef, useState } from 'react';
import { apiUrl } from '../lib/api';
import { buildVoxelAvatarGrid, MINECRAFT_NICK_REGEX } from '../lib/ticketUtils';

interface VoxelAvatarProps {
  nick: string;
  size?: number;
  debounceMs?: number;
  className?: string;
}

export function VoxelAvatar({
  nick,
  size = 64,
  debounceMs = 0,
  className = '',
}: VoxelAvatarProps) {
  const trimmed = nick.trim();
  const isValidNick = MINECRAFT_NICK_REGEX.test(trimmed);
  const [debouncedNick, setDebouncedNick] = useState(isValidNick ? trimmed : '');
  const [hasError, setHasError] = useState(false);
  const imgRef = useRef<HTMLImageElement | null>(null);

  useEffect(() => {
    setHasError(false);

    if (!isValidNick) {
      setDebouncedNick('');
      return;
    }

    if (debounceMs <= 0) {
      setDebouncedNick(trimmed);
      return;
    }

    const timer = window.setTimeout(() => {
      setDebouncedNick(trimmed);
    }, debounceMs);

    return () => window.clearTimeout(timer);
  }, [trimmed, isValidNick, debounceMs]);

  useEffect(() => {
    const img = imgRef.current;
    if (img && img.complete && img.naturalWidth === 0) {
      setHasError(true);
    }
  }, [debouncedNick]);

  const avatar = useMemo(
    () => buildVoxelAvatarGrid(trimmed || 'HSMP'),
    [trimmed],
  );

  const skinSrc = debouncedNick
    ? apiUrl(`/api/minecraft-skin/${encodeURIComponent(debouncedNick)}`)
    : null;

  return (
    <div
      style={{ width: size, height: size }}
      className={`relative shrink-0 overflow-hidden border-2 border-[#F5B82E] bg-[#08090C] shadow-[inset_0_0_0_2px_#3B2504] ${className}`}
    >
      {/* Deterministic 8x8 Pixel Fallback behind real skin */}
      <svg
        width={size}
        height={size}
        viewBox="0 0 8 8"
        shapeRendering="crispEdges"
        aria-label={`Avatar de ${trimmed || 'jogador'}`}
        className="h-full w-full"
      >
        {avatar.cells.map((row, y) =>
          row.map((color, x) => (
            <rect key={`${x}-${y}`} x={x} y={y} width={1} height={1} fill={color} />
          )),
        )}
      </svg>

      {/* Real Minecraft Skin Head loaded directly with no opacity hide race */}
      {skinSrc && !hasError && (
        <img
          ref={imgRef}
          key={skinSrc}
          src={skinSrc}
          alt={`Skin real de ${debouncedNick} no Minecraft`}
          referrerPolicy="no-referrer"
          onLoad={() => setHasError(false)}
          onError={() => setHasError(true)}
          className="pixel-art absolute inset-0 h-full w-full object-cover"
        />
      )}
    </div>
  );
}
