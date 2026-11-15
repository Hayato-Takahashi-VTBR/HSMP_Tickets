import { minecraftSkinUrl } from './api';

export const MINECRAFT_NICK_REGEX = /^[a-zA-Z0-9_]{3,16}$/;
export const DISEMBARK_DATE = '20/12/2026';

export interface GoldenTicketData {
  ownerUid: string;
  minecraftNick: string;
  ticketCode: string;
  platformNumber: string;
  carriageCode: string;
  skinRevision: string;
  emailStatus: 'pending' | 'sent' | 'preview_ready';
  issuedAtLabel: string;
}

export interface DispatchedEmailPreview {
  status: 'sent' | 'preview_ready';
  recipient: string;
  subject: string;
  textBody: string;
  htmlBody: string;
  dispatchedAt: string;
  note?: string;
}

function hashSeed(input: string): number {
  let h = 2166136261;
  for (let i = 0; i < input.length; i += 1) {
    h ^= input.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return h >>> 0;
}

export function generateTicketSeat(ticketCode: string): string {
  const h = hashSeed(`seat:${ticketCode}`);
  const rows = ['A', 'B', 'C', 'D', 'E', 'F'];
  const row = rows[h % rows.length];
  const num = String(((h >>> 4) % 28) + 1).padStart(2, '0');
  return `${row}-${num}`;
}

export function generateTicketMetadata(uid: string): {
  ticketCode: string;
  platformNumber: string;
  carriageCode: string;
} {
  const hash = hashSeed(uid);
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  let blockA = '';
  let blockB = '';
  for (let i = 0; i < 4; i += 1) {
    blockA += chars[(hash >>> (i * 5)) % chars.length];
    blockB += chars[(hash >>> ((i + 3) * 4)) % chars.length];
  }
  const platformNum = (hash % 9) + 1;
  const carriages = ['Vagão 01', 'Vagão 02', 'Vagão 03', 'Vagão 04'];
  const carriageCode = carriages[hash % carriages.length];

  return {
    ticketCode: `HSMP-${blockA}-${blockB}`,
    platformNumber: `PL-0${platformNum}`,
    carriageCode,
  };
}

export function buildVoxelAvatarGrid(nick: string): {
  primary: string;
  secondary: string;
  accent: string;
  eyes: string;
  cells: string[][];
} {
  const seed = hashSeed(nick.toLowerCase() || 'hsmp');
  const skins = [
    { primary: '#D4A574', secondary: '#B07D52', accent: '#3B2A1E', eyes: '#38BDF8' },
    { primary: '#C6956B', secondary: '#8E6241', accent: '#1F2937', eyes: '#F5B82E' },
    { primary: '#9AA5B1', secondary: '#616E7C', accent: '#1F2933', eyes: '#2DD4BF' },
    { primary: '#B89B72', secondary: '#7D6344', accent: '#271E17', eyes: '#FBBF24' },
  ];
  const palette = skins[seed % skins.length];

  const cells: string[][] = Array.from({ length: 8 }, () =>
    Array.from({ length: 8 }, () => palette.primary),
  );

  for (let x = 0; x < 8; x += 1) {
    cells[0][x] = palette.accent;
    cells[1][x] = (seed >> x) & 1 ? palette.accent : palette.secondary;
  }
  cells[2][0] = palette.accent;
  cells[2][7] = palette.accent;
  cells[5][0] = palette.secondary;
  cells[5][7] = palette.secondary;
  cells[6][1] = palette.secondary;
  cells[6][6] = palette.secondary;
  cells[4][1] = '#FFFFFF';
  cells[4][2] = palette.eyes;
  cells[4][5] = palette.eyes;
  cells[4][6] = '#FFFFFF';
  cells[6][3] = palette.accent;
  cells[6][4] = palette.accent;
  cells[7][2] = palette.secondary;
  cells[7][5] = palette.secondary;

  return { ...palette, cells };
}

function loadSameOriginSkinImage(
  nick: string,
  skinRevision: string,
): Promise<HTMLImageElement | null> {
  return new Promise((resolve) => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = () => resolve(null);
    img.crossOrigin = 'anonymous';
    img.src = minecraftSkinUrl(nick, skinRevision);
  });
}

function drawPixelTrainSprite(ctx: CanvasRenderingContext2D, ox: number, oy: number, px: number) {
  const grid = [
    '0000000001111000',
    '0000000001221000',
    '0011000001111000',
    '0012111111111100',
    '0112222222222110',
    '0122232222322210',
    '1111111111111111',
    '0033003300330033',
    '0011001100110011',
  ];
  const palette: Record<string, string> = {
    '1': '#FFF0A5',
    '2': '#F5B82E',
    '3': '#8C580A',
  };
  for (let y = 0; y < grid.length; y += 1) {
    for (let x = 0; x < grid[y].length; x += 1) {
      const ch = grid[y][x];
      if (ch !== '0') {
        ctx.fillStyle = palette[ch];
        ctx.fillRect(ox + x * px, oy + y * px, px, px);
      }
    }
  }
}

export async function downloadGoldenTicketPng(ticket: GoldenTicketData): Promise<void> {
  const canvas = document.createElement('canvas');
  canvas.width = 1280;
  canvas.height = 576;
  const ctx = canvas.getContext('2d');
  if (!ctx) return;

  ctx.imageSmoothingEnabled = false;

  const seat = generateTicketSeat(ticket.ticketCode);

  ctx.fillStyle = '#050608';
  ctx.fillRect(0, 0, canvas.width, canvas.height);

  const px = 8;
  const tx = 40;
  const ty = 40;
  const tw = 1200;
  const th = 496;

  ctx.fillStyle = '#B87612';
  ctx.fillRect(tx, ty, tw, th);

  ctx.fillStyle = '#FFF0A5';
  ctx.fillRect(tx, ty, tw - px, px);
  ctx.fillRect(tx, ty, px, th - px);

  ctx.fillStyle = '#6B3F06';
  ctx.fillRect(tx + px, ty + th - px, tw - px, px);
  ctx.fillRect(tx + tw - px, ty + px, px, th - px);

  ctx.fillStyle = '#F5B82E';
  ctx.fillRect(tx + px, ty + px, tw - px * 2, th - px * 2);

  ctx.fillStyle = '#0B0C10';
  ctx.fillRect(tx + px * 3, ty + px * 3, tw - px * 6, th - px * 6);

  ctx.strokeStyle = '#D99B1E';
  ctx.lineWidth = 4;
  ctx.strokeRect(tx + px * 4, ty + px * 4, tw - px * 8, th - px * 8);

  const rivets = [
    [tx + px * 5, ty + px * 5],
    [tx + tw - px * 6, ty + px * 5],
    [tx + px * 5, ty + th - px * 6],
    [tx + tw - px * 6, ty + th - px * 6],
  ];
  ctx.fillStyle = '#FFE999';
  for (const [rx, ry] of rivets) {
    ctx.fillRect(rx, ry, px, px);
  }

  for (let y = ty + px * 4; y < ty + th - px * 4; y += px * 2) {
    ctx.fillStyle = '#F5B82E';
    ctx.fillRect(928, y, 4, px);
  }

  ctx.fillStyle = '#050608';
  ctx.fillRect(920, ty, 20, px * 2);
  ctx.fillRect(920, ty + th - px * 2, 20, px * 2);
  ctx.fillRect(tx, 272, px * 2, 32);
  ctx.fillRect(tx + tw - px * 2, 272, px * 2, 32);

  // Header & PSI Wordmark (NO "Pesquisa e Desenvolvimento" on Ticket)
  ctx.fillStyle = '#F5B82E';
  ctx.font = '700 18px monospace';
  ctx.fillText('PSI  ·  LINHA ZERO  ·  DESTINO: HSMP', 104, 122);

  ctx.fillStyle = '#FFE89E';
  ctx.font = '700 44px Georgia, serif';
  ctx.fillText('TICKET DOURADO', 104, 178);

  // Pixelated Train
  drawPixelTrainSprite(ctx, 768, 114, 6);

  const avatarX = 104;
  const avatarY = 224;
  const avatarSize = 144;
  ctx.fillStyle = '#F5B82E';
  ctx.fillRect(avatarX - 6, avatarY - 6, avatarSize + 12, avatarSize + 12);
  ctx.fillStyle = '#050608';
  ctx.fillRect(avatarX - 2, avatarY - 2, avatarSize + 4, avatarSize + 4);

  const skinImg = await loadSameOriginSkinImage(
    ticket.minecraftNick,
    ticket.skinRevision,
  );
  if (skinImg) {
    ctx.drawImage(skinImg, avatarX, avatarY, avatarSize, avatarSize);
  } else {
    const avatar = buildVoxelAvatarGrid(ticket.minecraftNick);
    const cellSize = avatarSize / 8;
    for (let y = 0; y < 8; y += 1) {
      for (let x = 0; x < 8; x += 1) {
        ctx.fillStyle = avatar.cells[y][x];
        ctx.fillRect(avatarX + x * cellSize, avatarY + y * cellSize, cellSize, cellSize);
      }
    }
  }

  ctx.fillStyle = '#8E95A5';
  ctx.font = '600 15px monospace';
  ctx.fillText(`PASSAGEIRO (MINECRAFT)  ·  DESEMBARQUE ${DISEMBARK_DATE}`, 282, 248);

  ctx.fillStyle = '#FFFFFF';
  ctx.font = '700 46px monospace';
  ctx.fillText(ticket.minecraftNick, 282, 304);

  ctx.fillStyle = '#F5B82E';
  ctx.font = '600 18px monospace';
  ctx.fillText(
    `ASSENTO: ${seat}   ·   ${ticket.platformNumber}   ·   ${ticket.carriageCode.toUpperCase()}`,
    282,
    354,
  );

  ctx.fillStyle = '#8E95A5';
  ctx.font = '600 14px monospace';
  ctx.fillText(
    `EMITIDO EM ${ticket.issuedAtLabel}  ·  DESEMBARQUE: ${DISEMBARK_DATE}  ·  PRISMA ESTUDIOS × HSMP`,
    104,
    468,
  );

  // Right stub details
  ctx.fillStyle = '#F5B82E';
  ctx.font = '700 22px Georgia, serif';
  ctx.fillText('PSI', 964, 124);

  ctx.fillStyle = '#8E95A5';
  ctx.font = '600 13px monospace';
  ctx.fillText('CÓDIGO DO BILHETE', 964, 166);

  ctx.fillStyle = '#FFE89E';
  ctx.font = '700 23px monospace';
  ctx.fillText(ticket.ticketCode, 964, 198);

  ctx.fillStyle = '#C8CDD6';
  ctx.font = '600 13px monospace';
  ctx.fillText('DESTINO     : HSMP', 964, 238);
  ctx.fillText(`ASSENTO     : ${seat}`, 964, 262);
  ctx.fillText(`EMISSÃO     : ${ticket.issuedAtLabel}`, 964, 286);
  ctx.fillText(`DESEMBARQUE : ${DISEMBARK_DATE}`, 964, 310);
  ctx.fillText('LINHA       : LINHA ZERO', 964, 334);

  const hash = hashSeed(`${ticket.ticketCode}:${seat}`);
  for (let i = 0; i < 30; i += 1) {
    const w = ((hash >> (i % 16)) & 1) ? 6 : 3;
    ctx.fillStyle = i % 4 === 0 ? '#F5B82E' : '#E6E8EE';
    ctx.fillRect(964 + i * 8, 364, w, 60);
  }

  ctx.fillStyle = '#8E95A5';
  ctx.font = '600 12px monospace';
  ctx.fillText('PSI · PRISMA ESTUDIOS · HSMP', 964, 468);

  const link = document.createElement('a');
  link.download = `hsmp-linha-zero-${ticket.minecraftNick}.png`;
  link.href = canvas.toDataURL('image/png');
  link.click();
}
