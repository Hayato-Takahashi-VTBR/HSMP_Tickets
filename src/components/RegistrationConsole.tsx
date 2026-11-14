import type { User } from 'firebase/auth';
import { LogIn, LogOut, Send, Terminal } from 'lucide-react';
import { useEffect, useState, type FormEvent } from 'react';
import { soundFX } from '../lib/soundEffects';
import { MINECRAFT_NICK_REGEX } from '../lib/ticketUtils';
import { VoxelAvatar } from './VoxelAvatar';

export interface ConsoleLogEntry {
  id: string;
  tag: 'AUTH' | 'VALIDAÇÃO' | 'BANCO' | 'E-MAIL' | 'ERRO';
  message: string;
}

interface RegistrationConsoleProps {
  user: User | null;
  authLoading: boolean;
  hasExistingTicket: boolean;
  initialNick: string;
  submitting: boolean;
  logs: ConsoleLogEntry[];
  errorMessage: string | null;
  onLogin: () => Promise<void>;
  onLogout: () => Promise<void>;
  onSubmitNick: (nick: string) => Promise<void>;
}

export function RegistrationConsole({
  user,
  authLoading,
  hasExistingTicket,
  initialNick,
  submitting,
  logs,
  errorMessage,
  onLogin,
  onLogout,
  onSubmitNick,
}: RegistrationConsoleProps) {
  const [nickInput, setNickInput] = useState(initialNick);
  const [touched, setTouched] = useState(false);

  const trimmedNick = nickInput.trim();
  const isNickValid = MINECRAFT_NICK_REGEX.test(trimmedNick);

  useEffect(() => {
    if (!touched) {
      setNickInput(initialNick);
    }
  }, [initialNick, touched]);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setTouched(true);
    if (!user || !isNickValid || submitting) return;
    soundFX.playButtonClick();
    await onSubmitNick(trimmedNick);
  }

  return (
    <div className="overflow-hidden border border-[#1E232E] bg-[#05070A]">
      {/* Inner Terminal Sub-Bar */}
      <div className="flex items-center justify-between gap-4 border-b border-[#191D26] bg-[#0A0D12] px-4 py-2.5">
        <div className="flex items-center gap-2">
          <Terminal className="h-4 w-4 text-[#F5B82E]" />
          <span className="font-mono text-xs font-semibold text-[#E6E8EE]">
            C:\PSI\HSMP\EMBARQUE.EXE
          </span>
        </div>
        <span className="font-mono text-[11px] text-[#8E95A5]">
          LINHA ZERO · 20/12/2026
        </span>
      </div>

      {/* Console Body */}
      <div className="space-y-6 p-4 font-mono text-sm sm:p-6">
        {/* Step 01: Login */}
        <div className="space-y-3 border-b border-[#141820] pb-6">
          <div className="flex items-start gap-3">
            <span className="select-none text-xs tabular-nums text-[#5A6070]">
              01
            </span>
            <div className="min-w-0 flex-1 space-y-3">
              <p className="text-xs text-[#8E95A5]">
                <span className="text-[#F5B82E]">&gt;</span> LOGIN --CONTA
                GOOGLE
              </p>

              {authLoading ? (
                <p className="text-xs text-[#C8CDD6]">
                  Verificando sessão do terminal...
                </p>
              ) : !user ? (
                <div className="flex flex-col items-start gap-3 sm:flex-row sm:items-center sm:justify-between">
                  <p className="text-xs leading-relaxed text-[#C8CDD6]">
                    Autentique sua conta Google para liberar a emissão do Ticket
                    Dourado e receber a carta da produção no e-mail.
                  </p>
                  <button
                    type="button"
                    onClick={() => {
                      soundFX.playButtonClick();
                      void onLogin();
                    }}
                    className="inline-flex min-h-[44px] items-center gap-2 bg-[#F5B82E] px-5 py-2.5 text-xs font-bold text-[#050608] transition-colors hover:bg-[#FFE89E] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#F5B82E] whitespace-nowrap shrink-0 cursor-pointer"
                  >
                    <LogIn className="h-4 w-4" />
                    <span>Entrar com Google</span>
                  </button>
                </div>
              ) : (
                <div className="flex flex-wrap items-center justify-between gap-3 border border-[#1B202A] bg-[#080B10] px-4 py-3">
                  <div className="min-w-0">
                    <p className="text-[11px] text-[#22FF66]">
                      [SESSÃO ATIVA]
                    </p>
                    <p className="mt-0.5 truncate text-xs text-white sm:text-sm">
                      {user.email}
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={() => {
                      soundFX.playButtonClick();
                      void onLogout();
                    }}
                    className="inline-flex min-h-[40px] items-center gap-1.5 border border-[#262B36] bg-[#10141D] px-3 py-1.5 text-xs font-medium text-[#C8CDD6] transition-colors hover:border-[#F5B82E]/60 hover:text-white whitespace-nowrap shrink-0 cursor-pointer"
                  >
                    <LogOut className="h-3.5 w-3.5" />
                    <span>Sair</span>
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Step 02: Emissão do Ticket */}
        <form onSubmit={handleSubmit} className="space-y-5">
          <div className="flex items-start gap-3">
            <span className="select-none text-xs tabular-nums text-[#5A6070]">
              02
            </span>
            <div className="min-w-0 flex-1 space-y-3">
              <label
                htmlFor="minecraft-nick-input"
                className="block text-xs text-[#8E95A5]"
              >
                <span className="text-[#F5B82E]">&gt;</span> NICK_MINECRAFT =
              </label>

              <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
                <div className="flex flex-1 items-center gap-3 border border-[#242936] bg-[#030406] px-3.5 py-2 focus-within:border-[#F5B82E]">
                  <span className="select-none text-[#F5B82E]">_</span>
                  <input
                    id="minecraft-nick-input"
                    type="text"
                    value={nickInput}
                    disabled={!user || submitting}
                    maxLength={16}
                    autoComplete="off"
                    spellCheck={false}
                    placeholder={
                      user ? 'SeuNickNoMinecraft' : 'Faça login primeiro...'
                    }
                    onChange={(e) => {
                      setTouched(true);
                      setNickInput(e.target.value);
                      soundFX.playKeyClick();
                    }}
                    className="w-full min-w-0 bg-transparent py-1.5 font-mono text-base text-white placeholder-[#484E5C] focus:outline-none disabled:cursor-not-allowed disabled:opacity-50"
                  />
                </div>

                <div className="flex items-center gap-3 self-start sm:self-center">
                  <VoxelAvatar
                    nick={trimmedNick || 'HSMP'}
                    size={52}
                    debounceMs={350}
                  />
                  <div className="text-xs text-[#8E95A5]">
                    <p className="text-[#C8CDD6]">Skin Real</p>
                    <p className="tabular-nums">
                      {trimmedNick.length}/16 chars
                    </p>
                  </div>
                </div>
              </div>

              {touched && trimmedNick.length > 0 && !isNickValid && (
                <p role="alert" className="text-xs text-[#F87171]">
                  ERRO: Use entre 3 e 16 caracteres (letras, números e _).
                </p>
              )}
              {(!touched || trimmedNick.length === 0 || isNickValid) && (
                <p className="text-xs text-[#8E95A5]">
                  Informe seu nick oficial para carregar a skin e emitir o
                  Ticket Dourado.
                </p>
              )}
            </div>
          </div>

          {/* Step 03: Emitir Ticket */}
          <div className="flex items-start gap-3">
            <span className="select-none text-xs tabular-nums text-[#5A6070]">
              03
            </span>
            <div className="flex-1 space-y-3">
              <p className="text-xs text-[#8E95A5]">
                <span className="text-[#F5B82E]">&gt;</span> EXECUTAR --EMITIR
                --DESTINO HSMP
              </p>

              <button
                type="submit"
                disabled={!user || !isNickValid || submitting}
                className="inline-flex min-h-[46px] w-full items-center justify-center gap-2 bg-[#F5B82E] px-6 py-3 text-xs font-bold uppercase tracking-wider text-[#050608] transition-colors hover:bg-[#FFE89E] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#F5B82E] disabled:cursor-not-allowed disabled:bg-[#1A1E28] disabled:text-[#5E6474] sm:w-auto cursor-pointer"
              >
                <Send className="h-4 w-4" />
                <span>
                  {submitting
                    ? 'Processando Emissão...'
                    : hasExistingTicket
                      ? 'Atualizar Nick e Reemitir Ticket'
                      : 'Emitir Ticket e Enviar E-mail'}
                </span>
              </button>
            </div>
          </div>
        </form>

        {errorMessage && (
          <div
            role="alert"
            className="border border-[#EF4444]/40 bg-[#EF4444]/10 px-4 py-3 text-xs text-[#FCA5A5]"
          >
            {errorMessage}
          </div>
        )}

        {/* Execution Output Console */}
        <div className="border-t border-[#141820] pt-4">
          <p className="mb-2 text-[11px] text-[#5A6070]">SAÍDA DO TERMINAL</p>
          <div className="max-h-36 space-y-1.5 overflow-y-auto border border-[#141820] bg-[#030406] p-3 text-xs">
            {logs.length === 0 ? (
              <p className="text-[#5A6070]">
                Aguardando login do usuário para iniciar sessão...
              </p>
            ) : (
              logs.map((entry) => (
                <p key={entry.id} className="leading-relaxed text-[#C8CDD6]">
                  <span
                    className={
                      entry.tag === 'ERRO'
                        ? 'text-[#F87171]'
                        : entry.tag === 'E-MAIL' || entry.tag === 'BANCO'
                          ? 'text-[#22FF66]'
                          : 'text-[#F5B82E]'
                    }
                  >
                    [{entry.tag}]
                  </span>{' '}
                  <span>{entry.message}</span>
                </p>
              ))
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
