import { Mail, X } from 'lucide-react';
import { useEffect, useState } from 'react';
import type { DispatchedEmailPreview } from '../lib/ticketUtils';

interface ProductionEmailViewerProps {
  emailData: DispatchedEmailPreview;
  onClose: () => void;
}

export function ProductionEmailViewer({
  emailData,
  onClose,
}: ProductionEmailViewerProps) {
  const [viewMode, setViewMode] = useState<'formatted' | 'raw'>('formatted');

  useEffect(() => {
    function handleKey(e: KeyboardEvent) {
      if (e.key === 'Escape') onClose();
    }
    window.addEventListener('keydown', handleKey);
    return () => window.removeEventListener('keydown', handleKey);
  }, [onClose]);

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="production-email-title"
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/85 p-4 backdrop-blur-xs"
    >
      <div className="flex max-h-[90vh] w-full max-w-2xl flex-col border border-[#242834] bg-[#0B0C10] shadow-2xl">
        {/* Header */}
        <div className="flex items-center justify-between gap-4 border-b border-[#1E222B] bg-[#0F1117] px-5 py-4">
          <div className="flex min-w-0 items-center gap-3">
            <Mail className="h-5 w-5 shrink-0 text-[#F5B82E]" />
            <div className="min-w-0">
              <h3
                id="production-email-title"
                className="truncate text-sm font-semibold text-white"
              >
                Mensagem Oficial da Produção
              </h3>
              <p className="truncate font-mono text-xs text-[#8E95A5]">
                Para: {emailData.recipient}
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Fechar visualização do e-mail"
            className="inline-flex min-h-[40px] min-w-[40px] items-center justify-center border border-[#242834] bg-[#141720] text-[#C8CDD6] transition-colors hover:border-[#F5B82E]/60 hover:text-white cursor-pointer"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        {/* Toolbar & Subject */}
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-[#1E222B] px-5 py-3 text-xs">
          <p className="font-medium text-[#E6E8EE]">{emailData.subject}</p>
          <div className="flex items-center gap-1 border border-[#1E222B] bg-[#06070A] p-1">
            <button
              type="button"
              onClick={() => setViewMode('formatted')}
              className={`px-3 py-1.5 font-mono text-xs transition-colors whitespace-nowrap shrink-0 cursor-pointer ${
                viewMode === 'formatted'
                  ? 'bg-[#171B24] text-[#FFE89E]'
                  : 'text-[#8E95A5] hover:text-white'
              }`}
            >
              Visualização
            </button>
            <button
              type="button"
              onClick={() => setViewMode('raw')}
              className={`px-3 py-1.5 font-mono text-xs transition-colors whitespace-nowrap shrink-0 cursor-pointer ${
                viewMode === 'raw'
                  ? 'bg-[#171B24] text-[#FFE89E]'
                  : 'text-[#8E95A5] hover:text-white'
              }`}
            >
              Texto Puro
            </button>
          </div>
        </div>

        {/* Body */}
        <div className="flex-1 overflow-y-auto p-5">
          <div className="mb-4 border border-[#1E222B] bg-[#0F1117] px-4 py-3 text-xs text-[#C8CDD6]">
            {emailData.status === 'sent' ? (
              <span>
                Enviado com sucesso via SMTP para{' '}
                <strong className="text-white">{emailData.recipient}</strong>.
              </span>
            ) : (
              <span>
                Comprovante da mensagem gerada para{' '}
                <strong className="text-white">{emailData.recipient}</strong>{' '}
                (para entrega direta na caixa de entrada, configure as variáveis
                SMTP no servidor).
              </span>
            )}
          </div>

          {viewMode === 'formatted' ? (
            <div className="border border-[#1E222B] bg-[#060709] p-5 text-sm leading-relaxed text-[#C8CDD6]">
              <p className="font-mono text-xs font-semibold tracking-wider text-[#F5B82E]">
                PSI · LINHA ZERO · DESTINO: HSMP
              </p>
              <h4 className="mt-2 font-display text-2xl font-bold text-[#FFE89E]">
                Agradecemos pelo seu cadastro
              </h4>
              <p className="mt-3">
                Sua convocação para a <strong className="text-white">Linha Zero</strong>{' '}
                com destino ao <strong className="text-white">HSMP</strong> foi
                confirmada pela <strong className="text-[#F5B82E]">PSI</strong>.
                Desembarque marcado para <strong className="text-[#FFE89E]">20/12/2026</strong>.
              </p>

              <div className="mt-5 border-t border-[#1E222B] pt-4">
                <p className="font-semibold text-[#FFE89E]">
                  Novidades e o que está por vir:
                </p>
                <ul className="mt-3 space-y-2 text-sm text-[#C8CDD6]">
                  <li>
                    <strong className="text-white">01. Desembarque em 20/12/2026 (Linha Zero):</strong>{' '}
                    o transporte organizado pela PSI partirá rumo ao destino HSMP.
                  </li>
                  <li>
                    <strong className="text-white">02. Mistérios e Capítulos de Lore:</strong>{' '}
                    experimentos noturnos, transmissões enigmáticas e segredos para quem embarcar.
                  </li>
                  <li>
                    <strong className="text-white">03. Engenharia Prisma Estudios:</strong>{' '}
                    infraestrutura dedicada, estabilidade e mecânicas exclusivas da temporada.
                  </li>
                </ul>
              </div>
            </div>
          ) : (
            <pre className="overflow-x-auto border border-[#1E222B] bg-[#040507] p-4 font-mono text-xs leading-relaxed whitespace-pre-wrap text-[#C8CDD6]">
              {emailData.textBody}
            </pre>
          )}
        </div>
      </div>
    </div>
  );
}
