import { onAuthStateChanged, type User } from 'firebase/auth';
import {
  doc,
  getDoc,
  serverTimestamp,
  setDoc,
  Timestamp,
  updateDoc,
} from 'firebase/firestore';
import { Volume2, VolumeX } from 'lucide-react';
import { useCallback, useEffect, useState } from 'react';
import {
  GoldenTicketCard,
  PixelTridentSprite,
} from './components/GoldenTicketCard';
import { ProductionEmailViewer } from './components/ProductionEmailViewer';
import {
  RegistrationConsole,
  type ConsoleLogEntry,
} from './components/RegistrationConsole';
import {
  auth,
  db,
  handleFirestoreError,
  loginWithGoogle,
  logoutPlayer,
  OperationType,
} from './lib/firebase';
import { apiUrl } from './lib/api';
import { soundFX } from './lib/soundEffects';
import {
  DISEMBARK_DATE,
  generateTicketMetadata,
  type DispatchedEmailPreview,
  type GoldenTicketData,
} from './lib/ticketUtils';

function formatIssuedDate(value: unknown): string {
  if (value instanceof Timestamp) {
    return value.toDate().toLocaleDateString('pt-BR', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
    });
  }
  return new Date().toLocaleDateString('pt-BR', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
  });
}

export default function App() {
  const [user, setUser] = useState<User | null>(null);
  const [authLoading, setAuthLoading] = useState(true);
  const [ticket, setTicket] = useState<GoldenTicketData | null>(null);
  const [ticketLoading, setTicketLoading] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [logs, setLogs] = useState<ConsoleLogEntry[]>([]);
  const [emailPreview, setEmailPreview] = useState<DispatchedEmailPreview | null>(
    null,
  );
  const [showEmailModal, setShowEmailModal] = useState(false);
  const [showTridentGlitch, setShowTridentGlitch] = useState(false);
  const [muted, setMuted] = useState(false);

  const appendLog = useCallback(
    (tag: ConsoleLogEntry['tag'], message: string) => {
      setLogs((prev) => [
        ...prev.slice(-11),
        {
          id: `${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
          tag,
          message,
        },
      ]);
    },
    [],
  );

  const loadExistingTicket = useCallback(
    async (currentUser: User) => {
      const ticketPath = `tickets/${currentUser.uid}`;
      setTicketLoading(true);
      try {
        const snap = await getDoc(doc(db, 'tickets', currentUser.uid));
        if (snap.exists()) {
          const data = snap.data();
          const loaded: GoldenTicketData = {
            ownerUid: String(data.ownerUid || currentUser.uid),
            minecraftNick: String(data.minecraftNick || ''),
            ticketCode: String(data.ticketCode || ''),
            platformNumber: String(data.platformNumber || 'PL-01'),
            carriageCode: String(data.carriageCode || 'Vagão 01'),
            emailStatus:
              data.emailStatus === 'sent'
                ? 'sent'
                : data.emailStatus === 'preview_ready'
                  ? 'preview_ready'
                  : 'pending',
            issuedAtLabel: formatIssuedDate(data.issuedAt),
          };
          setTicket(loaded);
          appendLog(
            'BANCO',
            `Bilhete localizado para ${loaded.minecraftNick} (${loaded.ticketCode}).`,
          );
        } else {
          setTicket(null);
          appendLog(
            'AUTH',
            `Sessão iniciada (${currentUser.email}). Digite seu Nick do Minecraft para emitir o Ticket Dourado.`,
          );
        }
      } catch (err) {
        if (
          err instanceof Error &&
          err.message.toLowerCase().includes('missing or insufficient permissions')
        ) {
          handleFirestoreError(err, OperationType.GET, ticketPath);
        }
        setErrorMessage('Não foi possível consultar seu ticket salvo no momento.');
        appendLog('ERRO', 'Falha ao consultar dados do bilhete no Firestore.');
      } finally {
        setTicketLoading(false);
      }
    },
    [appendLog],
  );

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (nextUser) => {
      setUser(nextUser);
      setAuthLoading(false);
      setErrorMessage(null);
      if (nextUser) {
        void loadExistingTicket(nextUser);
      } else {
        setTicket(null);
        setEmailPreview(null);
      }
    });
    return () => unsubscribe();
  }, [loadExistingTicket]);

  function handleToggleMute() {
    const next = !muted;
    setMuted(next);
    soundFX.setMuted(next);
    if (!next) {
      soundFX.playButtonClick();
    }
  }

  async function handleLogin() {
    setErrorMessage(null);
    try {
      const signedInUser = await loginWithGoogle();
      soundFX.playAuthChime();
      appendLog('AUTH', `Conta autenticada: ${signedInUser.email}`);
    } catch (err) {
      const msg =
        err instanceof Error && err.message.includes('popup-closed')
          ? 'Login cancelado pelo usuário.'
          : 'Não foi possível concluir o login com Google.';
      setErrorMessage(msg);
      appendLog('ERRO', msg);
    }
  }

  async function handleLogout() {
    await logoutPlayer();
    setLogs([]);
    setTicket(null);
    setEmailPreview(null);
    setErrorMessage(null);
  }

  async function handleSubmitNick(minecraftNick: string) {
    if (!user || !user.email) {
      setErrorMessage('Faça login com sua conta Google antes de emitir o ticket.');
      return;
    }

    setSubmitting(true);
    setErrorMessage(null);

    try {
      appendLog('VALIDAÇÃO', `Validando nick "${minecraftNick}" para a Linha Zero...`);

      const ticketRef = doc(db, 'tickets', user.uid);
      const privateRef = doc(db, 'playerPrivate', user.uid);

      const meta = ticket
        ? {
            ticketCode: ticket.ticketCode,
            platformNumber: ticket.platformNumber,
            carriageCode: ticket.carriageCode,
          }
        : generateTicketMetadata(user.uid);

      if (!ticket) {
        try {
          await setDoc(ticketRef, {
            ownerUid: user.uid,
            minecraftNick,
            ticketCode: meta.ticketCode,
            platformNumber: meta.platformNumber,
            carriageCode: meta.carriageCode,
            emailStatus: 'pending',
            issuedAt: serverTimestamp(),
            updatedAt: serverTimestamp(),
          });
        } catch (err) {
          handleFirestoreError(err, OperationType.CREATE, `tickets/${user.uid}`);
        }
      } else {
        try {
          await updateDoc(ticketRef, {
            minecraftNick,
            updatedAt: serverTimestamp(),
          });
        } catch (err) {
          handleFirestoreError(err, OperationType.UPDATE, `tickets/${user.uid}`);
        }
      }

      const existingPrivate = await getDoc(privateRef).catch((err) =>
        handleFirestoreError(err, OperationType.GET, `playerPrivate/${user.uid}`),
      );
      if (!existingPrivate.exists()) {
        try {
          await setDoc(privateRef, {
            ownerUid: user.uid,
            email: user.email,
            createdAt: serverTimestamp(),
            updatedAt: serverTimestamp(),
          });
        } catch (err) {
          handleFirestoreError(err, OperationType.CREATE, `playerPrivate/${user.uid}`);
        }
      } else {
        try {
          await updateDoc(privateRef, {
            email: user.email,
            updatedAt: serverTimestamp(),
          });
        } catch (err) {
          handleFirestoreError(err, OperationType.UPDATE, `playerPrivate/${user.uid}`);
        }
      }

      appendLog(
        'BANCO',
        `Ticket Dourado ${meta.ticketCode} registrado para ${minecraftNick}.`,
      );

      appendLog(
        'E-MAIL',
        `Despachando carta oficial da produção para ${user.email}...`,
      );

      const emailRes = await fetch(apiUrl('/api/send-welcome-email'), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: user.email,
          minecraftNick,
          ticketCode: meta.ticketCode,
          platformNumber: meta.platformNumber,
          carriageCode: meta.carriageCode,
        }),
      });

      const emailJson = (await emailRes.json()) as DispatchedEmailPreview & {
        error?: string;
      };

      if (!emailRes.ok) {
        throw new Error(emailJson.error || 'Falha ao enviar mensagem por e-mail.');
      }

      const nextEmailStatus: GoldenTicketData['emailStatus'] =
        emailJson.status === 'sent' ? 'sent' : 'preview_ready';

      try {
        await updateDoc(ticketRef, {
          emailStatus: nextEmailStatus,
          updatedAt: serverTimestamp(),
        });
        await updateDoc(privateRef, {
          lastNotifiedAt: serverTimestamp(),
          updatedAt: serverTimestamp(),
        });
      } catch (err) {
        handleFirestoreError(err, OperationType.UPDATE, `tickets/${user.uid}`);
      }

      // Whole-site glitch + PSI Trident symbol before revealing the Ticket
      setShowTridentGlitch(true);
      soundFX.playGlitchBurst(0.95);

      await new Promise<void>((resolve) => {
        window.setTimeout(() => resolve(), 1050);
      });

      setShowTridentGlitch(false);

      setTicket({
        ownerUid: user.uid,
        minecraftNick,
        ticketCode: meta.ticketCode,
        platformNumber: meta.platformNumber,
        carriageCode: meta.carriageCode,
        emailStatus: nextEmailStatus,
        issuedAtLabel: ticket?.issuedAtLabel || formatIssuedDate(null),
      });

      soundFX.playTicketIssued();
      setEmailPreview(emailJson);
      appendLog(
        'E-MAIL',
        nextEmailStatus === 'sent'
          ? `E-mail de agradecimento e novidades enviado para ${user.email}.`
          : `Mensagem da produção gerada para ${user.email}. Clique em "Ver Mensagem da Produção" no ticket.`,
      );
    } catch (err) {
      setShowTridentGlitch(false);
      const msg =
        err instanceof Error
          ? err.message
          : 'Erro inesperado durante o cadastro.';
      setErrorMessage(msg);
      appendLog('ERRO', msg);
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="min-h-screen bg-[#030406] px-3 py-4 text-[#E6E8EE] sm:px-6 sm:py-8">
      {/* Whole Retro CRT Computer Console Enclosure */}
      <div
        className={`crt-bezel crt-monitor-screen mx-auto flex min-h-[calc(100vh-4rem)] max-w-6xl flex-col justify-between border-2 border-[#232834] ${
          showTridentGlitch ? 'animate-site-glitch' : ''
        }`}
      >
        {/* Top Retro Console Bar */}
        <header className="flex flex-wrap items-center justify-between gap-4 border-b border-[#1D222D] bg-[#0A0C11] px-4 py-3 sm:px-6">
          <div className="flex items-center gap-3">
            <span className="font-display text-lg font-bold tracking-wider text-[#FFE89E]">
              HSMP
            </span>
            <span aria-hidden="true" className="text-[#4B5263]">
              /
            </span>
            <span
              tabIndex={0}
              data-text="PSI"
              className="glitch-hover font-mono text-xs font-bold tracking-widest text-[#F5B82E]"
            >
              PSI
            </span>
            <span aria-hidden="true" className="hidden text-[#4B5263] sm:inline">
              ·
            </span>
            <span className="hidden font-mono text-xs text-[#8E95A5] sm:inline">
              TERMINAL DE EMBARQUE · LINHA ZERO
            </span>
          </div>

          <button
            type="button"
            onClick={handleToggleMute}
            aria-label={muted ? 'Ativar efeitos sonoros' : 'Silenciar efeitos sonoros'}
            className="inline-flex min-h-[40px] items-center gap-2 border border-[#252A36] bg-[#0F1219] px-3.5 py-1.5 font-mono text-xs text-[#C8CDD6] transition-colors hover:border-[#F5B82E]/70 hover:text-[#FFE89E] whitespace-nowrap shrink-0 cursor-pointer"
          >
            {muted ? (
              <>
                <VolumeX className="h-4 w-4 text-[#8E95A5]" />
                <span>Som: Mudo</span>
              </>
            ) : (
              <>
                <Volume2 className="h-4 w-4 text-[#F5B82E]" />
                <span>Som: Ativado</span>
              </>
            )}
          </button>
        </header>

        {/* Main Console Workspace: ONLY Login & Ticket Emission */}
        <main className="flex-1 p-4 sm:p-8">
          <div className="mb-6 border-b border-[#171B24] pb-5">
            <p className="font-mono text-xs text-[#F5B82E]">
              CONSOLE DE ACESSO · DESTINO: HSMP · DESEMBARQUE {DISEMBARK_DATE}
            </p>
            <h1 className="mt-1.5 font-display text-2xl font-bold tracking-wide text-[#FFE89E] sm:text-3xl">
              Login e Emissão do Ticket Dourado
            </h1>
          </div>

          <div className="grid grid-cols-1 items-start gap-8 lg:grid-cols-12">
            {/* Left Column: Login + Minecraft Nick Console */}
            <div className="lg:col-span-5">
              <RegistrationConsole
                user={user}
                authLoading={authLoading}
                hasExistingTicket={Boolean(ticket)}
                initialNick={ticket?.minecraftNick || ''}
                submitting={submitting}
                logs={logs}
                errorMessage={errorMessage}
                onLogin={handleLogin}
                onLogout={handleLogout}
                onSubmitNick={handleSubmitNick}
              />
            </div>

            {/* Right Column: Ticket Dourado Display */}
            <div className="lg:col-span-7">
              {ticketLoading ? (
                <div className="border border-[#1D222D] bg-[#05070A] p-8 font-mono text-sm text-[#8E95A5]">
                  &gt; LENDO DADOS DO BILHETE NA MEMÓRIA...
                </div>
              ) : ticket ? (
                <div className="space-y-4">
                  <GoldenTicketCard
                    ticket={ticket}
                    hasEmailPreview={Boolean(emailPreview)}
                    onOpenEmailPreview={() => setShowEmailModal(true)}
                  />
                  {emailPreview && (
                    <div className="border border-[#1D222D] bg-[#05070A] p-4 font-mono text-xs leading-relaxed text-[#C8CDD6]">
                      <p className="font-semibold text-[#FFE89E]">
                        [MENSAGEM DA PRODUÇÃO] HSMP &amp; Prisma Estudios
                      </p>
                      <p className="mt-1 text-[#8E95A5]">
                        {emailPreview.status === 'sent'
                          ? `E-mail enviado para ${emailPreview.recipient} com agradecimento e novidades.`
                          : `Mensagem gerada para ${emailPreview.recipient}. Clique em "Ver Mensagem da Produção" para ler.`}
                      </p>
                    </div>
                  )}
                </div>
              ) : (
                <div className="flex min-h-[340px] flex-col justify-between border border-[#1D222D] bg-[#05070A] p-6 sm:p-8">
                  <div className="space-y-3">
                    <p className="font-mono text-xs text-[#F5B82E]">
                      &gt; SAÍDA DE IMPRESSÃO AGUARDANDO DADOS
                    </p>
                    <h2 className="font-display text-xl font-bold text-[#FFE89E] sm:text-2xl">
                      Nenhum Ticket Emitido nesta Sessão
                    </h2>
                    <p className="font-mono text-xs leading-relaxed text-[#8E95A5] sm:text-sm">
                      Execute o login com Google e informe seu nick oficial do
                      Minecraft no terminal ao lado. O Ticket Dourado da Linha
                      Zero com destino ao HSMP e desembarque em{' '}
                      {DISEMBARK_DATE} será impresso aqui.
                    </p>
                  </div>

                  <div className="mt-8 border-t border-[#151922] pt-4 font-mono text-xs text-[#6B7280]">
                    <p>
                      OPERADOR: PSI (PESQUISA &amp; DESENVOLVIMENTO) · DESTINO:
                      HSMP
                    </p>
                  </div>
                </div>
              )}
            </div>
          </div>
        </main>

        {/* Quiet Retro Console Footer */}
        <footer className="flex flex-wrap items-center justify-between gap-3 border-t border-[#1D222D] bg-[#080A0E] px-4 py-3.5 font-mono text-xs text-[#8E95A5] sm:px-6">
          <span>Desenvolvido por Prisma Estudios &amp; HSMP</span>
          <span>PSI · LINHA ZERO · {DISEMBARK_DATE}</span>
        </footer>
      </div>

      {/* Full-Screen Whole-Site Glitch + PSI Trident Symbol right before Ticket reveals */}
      {showTridentGlitch && (
        <div
          aria-hidden="true"
          className="glitch-scanlines pointer-events-none fixed inset-0 z-50 flex flex-col items-center justify-center overflow-hidden bg-black/92"
        >
          <div className="animate-3301-bar absolute top-1/3 left-0 right-0 h-2 bg-[#2DD4BF]/40" />
          <div className="animate-3301-bar absolute top-2/3 left-0 right-0 h-3 bg-[#F5B82E]/35" />

          <div className="animate-trident-emerge flex flex-col items-center gap-4">
            <div className="relative drop-shadow-[0_0_32px_rgba(45,212,191,0.65)]">
              <PixelTridentSprite size={144} />
            </div>
            <div className="relative select-none font-display text-4xl font-bold tracking-[0.35em] text-[#FFE89E] sm:text-5xl">
              <span className="animate-3301-slice-a absolute inset-0 text-[#EF4444]">
                PSI
              </span>
              <span className="animate-3301-slice-b absolute inset-0 text-[#2DD4BF]">
                PSI
              </span>
              <span className="relative">PSI</span>
            </div>
          </div>
        </div>
      )}

      {showEmailModal && emailPreview && (
        <ProductionEmailViewer
          emailData={emailPreview}
          onClose={() => setShowEmailModal(false)}
        />
      )}
    </div>
  );
}
