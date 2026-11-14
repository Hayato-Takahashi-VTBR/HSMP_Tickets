import { Check, Copy, Download, Mail } from 'lucide-react';
import { useMemo, useState } from 'react';
import { soundFX } from '../lib/soundEffects';
import {
  DISEMBARK_DATE,
  downloadGoldenTicketPng,
  generateTicketSeat,
  type GoldenTicketData,
} from '../lib/ticketUtils';
import { VoxelAvatar } from './VoxelAvatar';

interface GoldenTicketCardProps {
  ticket: GoldenTicketData;
  hasEmailPreview: boolean;
  onOpenEmailPreview: () => void;
}

export function PixelTridentSprite({ size = 48 }: { size?: number }) {
  const rows = [
    '0000000100000000',
    '0000001210000000',
    '0000101210100000',
    '0001201210210000',
    '0001201210210000',
    '0001213331210000',
    '0000133433100000',
    '0000001410000000',
    '0000001310000000',
    '0000001410000000',
    '0000001310000000',
    '0000001410000000',
    '0000001310000000',
    '0000001410000000',
    '0000001210000000',
    '0000000100000000',
  ];
  const palette: Record<string, string> = {
    '1': '#FFE999',
    '2': '#2DD4BF',
    '3': '#F5B82E',
    '4': '#9A630D',
  };

  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 16 16"
      shapeRendering="crispEdges"
      aria-label="Tridente pixelado"
      className="shrink-0"
    >
      {rows.map((row, y) =>
        row.split('').map((ch, x) =>
          ch === '0' ? null : (
            <rect
              key={`${x}-${y}`}
              x={x}
              y={y}
              width={1}
              height={1}
              fill={palette[ch]}
            />
          ),
        ),
      )}
    </svg>
  );
}

export function GoldenTicketCard({
  ticket,
  hasEmailPreview,
  onOpenEmailPreview,
}: GoldenTicketCardProps) {
  const [copied, setCopied] = useState(false);
  const [downloading, setDownloading] = useState(false);
  const [show3301Glitch, setShow3301Glitch] = useState(false);

  const seat = useMemo(
    () => generateTicketSeat(ticket.ticketCode),
    [ticket.ticketCode],
  );

  async function handleCopyCode() {
    soundFX.playButtonClick();
    try {
      await navigator.clipboard.writeText(ticket.ticketCode);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 2000);
    } catch {
      setCopied(false);
    }
  }

  async function handleAcceptAndDownload() {
    if (downloading) return;
    setDownloading(true);
    setShow3301Glitch(true);
    soundFX.playGlitchBurst(0.55);

    window.setTimeout(() => {
      setShow3301Glitch(false);
    }, 680);

    try {
      await downloadGoldenTicketPng(ticket);
    } finally {
      setDownloading(false);
    }
  }

  return (
    <div className="w-full space-y-5">
      {/* Pixelated Golden Train Ticket (Appearance preserved intact, rabbit creature removed) */}
      <article
        aria-label={`Ticket Dourado de ${ticket.minecraftNick} com destino ao HSMP`}
        className="pixel-ticket-shell relative bg-[#D99B1E] p-2 sm:p-3"
      >
        {/* Side Pixel Tear Notches */}
        <div
          aria-hidden="true"
          className="absolute top-1/2 -left-1.5 z-10 h-6 w-3 -translate-y-1/2 bg-[#050608]"
        />
        <div
          aria-hidden="true"
          className="absolute top-1/2 -right-1.5 z-10 h-6 w-3 -translate-y-1/2 bg-[#050608]"
        />

        {/* Inner Obsidian Pixel Face */}
        <div className="pixel-ticket-inner relative bg-[#090A0D] p-1">
          {/* Corner Pixel Rivets */}
          <span
            aria-hidden="true"
            className="absolute top-2.5 left-2.5 h-2 w-2 bg-[#FFF0A5]"
          />
          <span
            aria-hidden="true"
            className="absolute top-2.5 right-2.5 h-2 w-2 bg-[#FFF0A5]"
          />
          <span
            aria-hidden="true"
            className="absolute bottom-2.5 left-2.5 h-2 w-2 bg-[#FFF0A5]"
          />
          <span
            aria-hidden="true"
            className="absolute bottom-2.5 right-2.5 h-2 w-2 bg-[#FFF0A5]"
          />

          <div className="grid grid-cols-1 border-2 border-[#C48312]/70 lg:grid-cols-12">
            {/* Main Ticket Body */}
            <div className="flex flex-col justify-between gap-5 p-5 sm:p-7 lg:col-span-8 lg:border-r-4 lg:border-dashed lg:border-[#F5B82E]/50">
              <div className="flex flex-wrap items-start justify-between gap-4">
                <div>
                  <p className="font-mono text-xs font-bold tracking-widest text-[#F5B82E]">
                    <span
                      tabIndex={0}
                      data-text="PSI"
                      className="glitch-hover font-bold text-[#FFE89E]"
                    >
                      PSI
                    </span>{' '}
                    · LINHA ZERO · DESTINO: HSMP
                  </p>
                  <h3 className="mt-1.5">
                    <span
                      tabIndex={0}
                      data-text="TICKET DOURADO"
                      className="glitch-hover font-display text-2xl font-bold tracking-wide text-[#FFE89E] sm:text-3xl"
                    >
                      TICKET DOURADO
                    </span>
                  </h3>
                </div>
                <PixelTridentSprite />
              </div>

              {/* Player Identity Row with Real Minecraft Skin */}
              <div className="flex flex-col gap-4 border-y-2 border-[#2A200C] bg-[#06070A] p-4 sm:flex-row sm:items-center">
                <VoxelAvatar nick={ticket.minecraftNick} size={80} />
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center justify-between gap-2 font-mono text-[11px] tracking-wider text-[#8E95A5]">
                    <span>PASSAGEIRO (MINECRAFT)</span>
                    <span className="tabular-nums text-[#FFE89E]">
                      DESEMBARQUE {DISEMBARK_DATE}
                    </span>
                  </div>
                  <p className="mt-1 truncate font-sans text-2xl font-bold tracking-tight text-white sm:text-3xl">
                    {ticket.minecraftNick}
                  </p>
                  <div className="mt-2 flex flex-wrap items-center gap-x-3 gap-y-1 font-mono text-xs tabular-nums text-[#F5B82E]">
                    <span>Assento {seat}</span>
                    <span aria-hidden="true">·</span>
                    <span>Plataforma {ticket.platformNumber}</span>
                    <span aria-hidden="true">·</span>
                    <span>{ticket.carriageCode}</span>
                  </div>
                </div>
              </div>

              <div className="flex flex-wrap items-center justify-between gap-3 font-mono text-[11px] tabular-nums text-[#8E95A5]">
                <span>
                  Emitido em {ticket.issuedAtLabel} · Desembarque:{' '}
                  <strong className="text-[#FFE89E]">{DISEMBARK_DATE}</strong>
                </span>
                <span className="font-semibold text-[#C8CDD6]">
                  Prisma Estudios × HSMP
                </span>
              </div>
            </div>

            {/* Perforated Pixel Stub */}
            <div className="flex flex-col justify-between gap-5 border-t-4 border-dashed border-[#F5B82E]/50 bg-[#060709] p-5 sm:p-6 lg:col-span-4 lg:border-t-0">
              <div className="space-y-3">
                <div className="border-b border-[#221A0B] pb-3">
                  <p>
                    <span
                      tabIndex={0}
                      data-text="PSI"
                      className="glitch-hover font-display text-xl font-bold tracking-wider text-[#F5B82E]"
                    >
                      PSI
                    </span>
                  </p>
                </div>

                <div>
                  <p className="font-mono text-[11px] text-[#8E95A5]">
                    Código do Bilhete
                  </p>
                  <p className="mt-1 font-mono text-lg font-bold tabular-nums text-[#FFE89E]">
                    {ticket.ticketCode}
                  </p>
                </div>

                <div className="space-y-1 font-mono text-xs tabular-nums text-[#C8CDD6]">
                  <p>
                    Destino: <strong className="text-[#FFE89E]">HSMP</strong>
                  </p>
                  <p>
                    Assento: <strong className="text-[#FFE89E]">{seat}</strong>
                  </p>
                  <p>Emissão: {ticket.issuedAtLabel}</p>
                  <p>
                    Desembarque:{' '}
                    <strong className="text-[#FFE89E]">{DISEMBARK_DATE}</strong>
                  </p>
                  <p>Linha: Linha Zero</p>
                </div>
              </div>

              {/* Pixel Barcode */}
              <div className="space-y-2">
                <div
                  aria-hidden="true"
                  className="flex h-11 items-stretch gap-[3px] overflow-hidden border-2 border-[#251D0D] bg-[#040507] px-2.5 py-2"
                >
                  {Array.from({ length: 24 }).map((_, idx) => (
                    <span
                      key={idx}
                      className={`block h-full ${
                        idx % 4 === 0
                          ? 'w-[4px] bg-[#F5B82E]'
                          : idx % 2 === 0
                            ? 'w-[3px] bg-[#E6E8EE]/90'
                            : 'w-[2px] bg-[#8E95A5]/60'
                      }`}
                    />
                  ))}
                </div>
                <p className="font-mono text-[11px] tabular-nums text-[#8E95A5]">
                  Status:{' '}
                  <span className="text-[#E6E8EE]">
                    {ticket.emailStatus === 'sent'
                      ? 'Confirmado no e-mail'
                      : 'Embarque liberado'}
                  </span>
                </p>
              </div>
            </div>
          </div>
        </div>
      </article>

      {/* Action Bar: Primary Button "Aceito o Ticket" */}
      <div className="flex flex-wrap items-center gap-3">
        <button
          type="button"
          onClick={() => void handleAcceptAndDownload()}
          disabled={downloading}
          className="inline-flex min-h-[44px] items-center gap-2 bg-[#F5B82E] px-5 py-2.5 font-sans text-sm font-semibold text-[#050608] transition-colors hover:bg-[#FFE89E] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#F5B82E] disabled:opacity-60 whitespace-nowrap shrink-0 cursor-pointer"
        >
          <Download className="h-4 w-4" />
          <span>{downloading ? 'Baixando...' : 'Aceito o Ticket'}</span>
        </button>

        <button
          type="button"
          onClick={() => void handleCopyCode()}
          className="inline-flex min-h-[44px] items-center gap-2 border border-[#262934] bg-[#0D0F14] px-4 py-2.5 font-sans text-sm font-medium text-[#E6E8EE] transition-colors hover:border-[#F5B82E]/70 hover:text-[#FFE89E] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#F5B82E] whitespace-nowrap shrink-0 cursor-pointer"
        >
          {copied ? (
            <>
              <Check className="h-4 w-4 text-[#2DD4BF]" />
              <span>Código Copiado</span>
            </>
          ) : (
            <>
              <Copy className="h-4 w-4" />
              <span>Copiar Código</span>
            </>
          )}
        </button>

        {hasEmailPreview && (
          <button
            type="button"
            onClick={() => {
              soundFX.playButtonClick();
              onOpenEmailPreview();
            }}
            className="inline-flex min-h-[44px] items-center gap-2 border border-[#262934] bg-[#0D0F14] px-4 py-2.5 font-sans text-sm font-medium text-[#E6E8EE] transition-colors hover:border-[#F5B82E]/70 hover:text-[#FFE89E] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#F5B82E] whitespace-nowrap shrink-0 cursor-pointer"
          >
            <Mail className="h-4 w-4 text-[#F5B82E]" />
            <span>Ver Mensagem da Produção</span>
          </button>
        )}
      </div>

      {/* Rapid "3301" Glitch Overlay when clicking "Aceito o Ticket" */}
      {show3301Glitch && (
        <div
          aria-hidden="true"
          className="glitch-scanlines pointer-events-none fixed inset-0 z-50 flex items-center justify-center overflow-hidden bg-black/88"
        >
          <div className="animate-3301-bar absolute top-1/4 left-0 right-0 h-2 bg-[#22FF66]/35" />
          <div className="animate-3301-bar absolute top-2/3 left-0 right-0 h-3 bg-[#EF4444]/30" />

          <span className="animate-3301-slice-a absolute top-[18%] left-[12%] select-none font-mono text-xl tracking-[0.4em] text-[#22FF66]/45 sm:text-3xl">
            3301
          </span>
          <span className="animate-3301-slice-b absolute right-[10%] bottom-[22%] select-none font-mono text-xl tracking-[0.4em] text-[#F5B82E]/45 sm:text-3xl">
            3301
          </span>

          <div className="animate-3301-core relative select-none font-mono text-7xl font-bold tracking-[0.28em] sm:text-9xl">
            <span className="animate-3301-slice-a absolute inset-0 text-[#EF4444] drop-shadow-[-4px_0_0_rgba(239,68,68,0.9)]">
              3301
            </span>
            <span className="animate-3301-slice-b absolute inset-0 text-[#38BDF8] drop-shadow-[4px_0_0_rgba(56,189,248,0.9)]">
              3301
            </span>
            <span className="relative text-[#22FF66] drop-shadow-[0_0_32px_rgba(34,255,102,0.85)]">
              3301
            </span>
          </div>
        </div>
      )}
    </div>
  );
}
