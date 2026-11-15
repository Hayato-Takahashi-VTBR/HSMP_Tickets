import dotenv from 'dotenv';
import express, { type Request, type Response } from 'express';
import nodemailer from 'nodemailer';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const PORT = Number(process.env.PORT || 3000);
const NICK_REGEX = /^[a-zA-Z0-9_]{3,16}$/;
const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

interface WelcomeEmailPayload {
  email?: string;
  minecraftNick?: string;
  ticketCode?: string;
  platformNumber?: string;
  carriageCode?: string;
}

interface CachedSkin {
  buffer: Buffer;
  contentType: string;
  expiresAt: number;
}

const skinCache = new Map<string, CachedSkin>();
const SKIN_CACHE_TTL_MS = 5 * 60 * 1000;

async function fetchImageBuffer(url: string): Promise<{ buffer: Buffer; contentType: string } | null> {
  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 5000);
    const res = await fetch(url, {
      signal: controller.signal,
      headers: {
        'User-Agent': 'HSMP-PrismaEstudios/1.0',
      },
    });
    clearTimeout(timeout);
    if (!res.ok) return null;
    const contentType = res.headers.get('content-type') || '';
    if (!contentType.startsWith('image/')) return null;
    const arrayBuffer = await res.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);
    if (buffer.length < 64) return null;
    return { buffer, contentType };
  } catch {
    return null;
  }
}

async function resolveMinecraftSkinHead(nick: string): Promise<{ buffer: Buffer; contentType: string } | null> {
  const key = nick.toLowerCase();
  const cached = skinCache.get(key);
  if (cached && cached.expiresAt > Date.now()) {
    return { buffer: cached.buffer, contentType: cached.contentType };
  }

  const encoded = encodeURIComponent(nick);
  const candidates = [
    `https://minotar.net/helm/${encoded}/128.png`,
    `https://mc-heads.net/avatar/${encoded}/128`,
  ];

  for (const url of candidates) {
    const img = await fetchImageBuffer(url);
    if (img) {
      skinCache.set(key, {
        buffer: img.buffer,
        contentType: img.contentType,
        expiresAt: Date.now() + SKIN_CACHE_TTL_MS,
      });
      return img;
    }
  }

  // Fallback via Mojang profile UUID + Crafatar
  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 4500);
    const profileRes = await fetch(`https://api.mojang.com/users/profiles/minecraft/${encoded}`, {
      signal: controller.signal,
    });
    clearTimeout(timeout);
    if (profileRes.ok) {
      const profile = (await profileRes.json()) as { id?: string };
      if (profile.id) {
        const crafatarImg = await fetchImageBuffer(
          `https://crafatar.com/avatars/${encodeURIComponent(profile.id)}?size=128&overlay`,
        );
        if (crafatarImg) {
          skinCache.set(key, {
            buffer: crafatarImg.buffer,
            contentType: crafatarImg.contentType,
            expiresAt: Date.now() + SKIN_CACHE_TTL_MS,
          });
          return crafatarImg;
        }
      }
    }
  } catch {
    // Ignore fallback errors
  }

  return null;
}

function escapeHtml(value: string): string {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

function buildSeatCode(ticketCode: string): string {
  let h = 2166136261;
  for (let i = 0; i < ticketCode.length; i += 1) {
    h ^= ticketCode.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  const rows = ['A', 'B', 'C', 'D', 'E', 'F'];
  const row = rows[Math.abs(h) % rows.length];
  const seatNum = String((Math.abs(h >>> 4) % 28) + 1).padStart(2, '0');
  return `${row}-${seatNum}`;
}

function buildProductionEmailContent(params: {
  minecraftNick: string;
  ticketCode: string;
  platformNumber: string;
  carriageCode: string;
}) {
  const safeNick = escapeHtml(params.minecraftNick);
  const safeCode = escapeHtml(params.ticketCode);
  const safePlatform = escapeHtml(params.platformNumber);
  const safeCarriage = escapeHtml(params.carriageCode);
  const seatCode = buildSeatCode(params.ticketCode);
  const safeSeat = escapeHtml(seatCode);
  const issuedDate = new Date().toLocaleDateString('pt-BR', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
  });
  const safeIssuedDate = escapeHtml(issuedDate);

  const subject = `[HSMP] Ticket Dourado ${params.ticketCode} · Convocação da Linha Zero (PSI)`;

  const textBody = [
    `Saudações, ${params.minecraftNick}.`,
    '',
    'A equipe de produção do HSMP e da Prisma Estudios agradece pelo seu cadastro oficial.',
    'Seu Ticket Dourado para a Linha Zero foi confirmado pela PSI:',
    '',
    `  Passageiro (Minecraft) : ${params.minecraftNick}`,
    `  Empresa                : PSI`,
    `  Linha                  : Linha Zero`,
    `  Destino                : HSMP`,
    `  Data de Emissão        : ${issuedDate}`,
    `  Data de Desembarque    : 20/12/2026`,
    `  Código do Ticket       : ${params.ticketCode}`,
    `  Plataforma             : ${params.platformNumber}`,
    `  Vagão / Assento        : ${params.carriageCode} · Assento ${seatCode}`,
    '',
    'NOVIDADES E O QUE ESTÁ POR VIR NO HSMP:',
    '1. Desembarque em 20/12/2026 (Linha Zero): a viagem pela Linha Zero conduzida pela PSI chegará ao destino HSMP.',
    '2. Mistérios e Capítulos Semanais: experimentos ocultos, transmissões enigmáticas e eventos narrativos para portadores do Ticket Dourado.',
    '3. Estrutura Técnica Prisma Estudios: sistemas exclusivos de embarque, proteção do mundo e eventos dinâmicos.',
    '4. Chamada de Embarque: guarde seu código do bilhete até a data de desembarque (20/12/2026).',
    '',
    'Nos vemos no destino: HSMP.',
    '',
    'Atenciosamente,',
    'Produção HSMP · Desenvolvido por Prisma Estudios & HSMP',
  ].join('\n');

  const htmlBody = `<!DOCTYPE html>
<html lang="pt-BR">
<head><meta charset="UTF-8" /></head>
<body style="margin:0;padding:24px;background-color:#050608;color:#E6E8EE;font-family:'Segoe UI',Arial,sans-serif;">
  <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="max-width:600px;margin:0 auto;background-color:#0B0C10;border:2px solid #C48312;">
    <tr>
      <td style="padding:28px 32px;border-bottom:1px solid #232630;background-color:#08090C;">
        <p style="margin:0 0 6px 0;font-size:11px;letter-spacing:2px;color:#F5B82E;text-transform:uppercase;font-weight:700;">PSI · LINHA ZERO · HSMP</p>
        <h1 style="margin:0;font-size:22px;color:#FFE89E;font-weight:700;">Seu Ticket Dourado foi emitido, ${safeNick}</h1>
      </td>
    </tr>
    <tr>
      <td style="padding:28px 32px;line-height:1.65;font-size:15px;color:#C8CDD6;">
        <p style="margin:0 0 16px 0;">
          A produção do <strong style="color:#FFFFFF;">HSMP</strong> e da <strong style="color:#FFFFFF;">Prisma Estudios</strong> agradece oficialmente pelo seu registro.
          A empresa de Pesquisa e Desenvolvimento <strong style="color:#F5B82E;">PSI</strong> autorizou seu embarque na <strong style="color:#F5B82E;">Linha Zero</strong> com destino ao <strong style="color:#FFFFFF;">HSMP</strong>.
        </p>
        <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="margin:20px 0;background-color:#07080B;border:2px solid #F5B82E;">
          <tr>
            <td style="padding:18px 20px;">
              <p style="margin:0 0 4px 0;font-size:11px;color:#8E95A5;letter-spacing:1px;">PSI · BILHETE DOURADO · DESTINO: HSMP</p>
              <p style="margin:0 0 12px 0;font-size:20px;font-weight:700;color:#FFE89E;font-family:monospace;">${safeNick}</p>
              <p style="margin:0;font-size:13px;color:#E5E7EB;font-family:monospace;">
                CÓDIGO: <strong style="color:#F5B82E;">${safeCode}</strong> &nbsp;·&nbsp;
                EMISSÃO: <strong>${safeIssuedDate}</strong> &nbsp;·&nbsp;
                DESEMBARQUE: <strong style="color:#FFE89E;">20/12/2026</strong><br/>
                ${safePlatform} · ${safeCarriage} · ASSENTO: <strong style="color:#F5B82E;">${safeSeat}</strong>
              </p>
            </td>
          </tr>
        </table>
        <h2 style="margin:24px 0 12px 0;font-size:16px;color:#FFE89E;">Novidades e o que está por vir</h2>
        <ul style="margin:0;padding-left:18px;color:#C8CDD6;">
          <li style="margin-bottom:8px;"><strong>Desembarque em 20/12/2026 (Linha Zero):</strong> chegada confirmada ao território do HSMP.</li>
          <li style="margin-bottom:8px;"><strong>Mistérios &amp; Lore Semanal:</strong> experimentos ocultos, transmissões enigmáticas e capítulos exclusivos para portadores do Ticket Dourado.</li>
          <li style="margin-bottom:8px;"><strong>Infraestrutura Prisma Estudios:</strong> mecânicas customizadas, performance otimizada e eventos coordenados pela produção.</li>
          <li><strong>Convocação Final:</strong> mantenha seu assento e código do bilhete guardados até 20/12/2026.</li>
        </ul>
      </td>
    </tr>
    <tr>
      <td style="padding:20px 32px;border-top:1px solid #232630;background-color:#07080B;font-size:12px;color:#8E95A5;">
        <strong style="color:#F5B82E;">PSI</strong> · Desenvolvido por <strong style="color:#E5E7EB;">Prisma Estudios</strong> &amp; <strong style="color:#F5B82E;">HSMP</strong>.
      </td>
    </tr>
  </table>
</body>
</html>`;

  return { subject, textBody, htmlBody };
}

async function createServer() {
  const app = express();
  const frontendOrigin = (
    process.env.FRONTEND_ORIGIN?.trim() ||
    'https://hayato-takahashi-vtbr.github.io'
  ).replace(/\/$/, '');

  app.use((req: Request, res: Response, next) => {
    const origin = req.get('origin');

    if (frontendOrigin && origin && origin !== frontendOrigin) {
      res.status(403).json({ error: 'Origem não autorizada.' });
      return;
    }

    if (frontendOrigin && origin === frontendOrigin) {
      res.setHeader('Access-Control-Allow-Origin', frontendOrigin);
      res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
      res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
      res.setHeader('Vary', 'Origin');
    }

    if (req.method === 'OPTIONS') {
      res.sendStatus(frontendOrigin && origin !== frontendOrigin ? 403 : 204);
      return;
    }

    next();
  });
  app.use(express.json({ limit: '64kb' }));

  app.get('/api/health', (_req: Request, res: Response) => {
    res.json({ ok: true, service: 'hsmp-prisma-estudios-psi' });
  });

  app.get('/api/minecraft-skin/:nick', async (req: Request, res: Response) => {
    const rawNick = String(req.params.nick || '').trim();
    if (!NICK_REGEX.test(rawNick)) {
      res.status(400).json({ error: 'Nick do Minecraft inválido.' });
      return;
    }

    const skin = await resolveMinecraftSkinHead(rawNick);
    if (!skin) {
      res.status(404).json({ error: 'Skin não encontrada.' });
      return;
    }

    res.setHeader('Content-Type', skin.contentType);
    res.setHeader('Cache-Control', 'public, max-age=300');
    res.send(skin.buffer);
  });

  app.post('/api/send-welcome-email', async (req: Request, res: Response) => {
    try {
      const body = (req.body || {}) as WelcomeEmailPayload;
      const email = String(body.email || '').trim();
      const minecraftNick = String(body.minecraftNick || '').trim();
      const ticketCode = String(body.ticketCode || '').trim();
      const platformNumber = String(body.platformNumber || 'PL-04').trim();
      const carriageCode = String(body.carriageCode || 'Vagão 01').trim();

      if (!EMAIL_REGEX.test(email)) {
        res.status(400).json({ error: 'Endereço de e-mail inválido.' });
        return;
      }

      if (!NICK_REGEX.test(minecraftNick)) {
        res.status(400).json({
          error: 'Nick do Minecraft inválido. Use entre 3 e 16 caracteres (letras, números ou _).',
        });
        return;
      }

      if (!ticketCode.startsWith('HSMP-')) {
        res.status(400).json({ error: 'Código de ticket inválido.' });
        return;
      }

      const content = buildProductionEmailContent({
        minecraftNick,
        ticketCode,
        platformNumber,
        carriageCode,
      });

      const smtpHost = process.env.SMTP_HOST?.trim();
      const smtpUser = process.env.SMTP_USER?.trim();
      const smtpPass = process.env.SMTP_PASS?.trim();
      const smtpPort = Number(process.env.SMTP_PORT || 587);
      const smtpFrom = process.env.SMTP_FROM?.trim() || 'HSMP Produção <noreply@prismaestudios.com>';

      if (smtpHost && smtpUser && smtpPass) {
        const transporter = nodemailer.createTransport({
          host: smtpHost,
          port: smtpPort,
          secure: smtpPort === 465,
          auth: {
            user: smtpUser,
            pass: smtpPass,
          },
        });

        const info = await transporter.sendMail({
          from: smtpFrom,
          to: email,
          subject: content.subject,
          text: content.textBody,
          html: content.htmlBody,
        });

        res.json({
          status: 'sent',
          messageId: info.messageId,
          recipient: email,
          subject: content.subject,
          textBody: content.textBody,
          htmlBody: content.htmlBody,
          dispatchedAt: new Date().toISOString(),
        });
        return;
      }

      res.json({
        status: 'preview_ready',
        recipient: email,
        subject: content.subject,
        textBody: content.textBody,
        htmlBody: content.htmlBody,
        dispatchedAt: new Date().toISOString(),
        note: 'SMTP não configurado no ambiente; mensagem gerada e exibida diretamente no comprovante.',
      });
    } catch (error) {
      console.error('Erro ao processar envio de e-mail HSMP:', error);
      res.status(500).json({
        error: 'Não foi possível processar a mensagem da produção no momento.',
      });
    }
  });

  if (process.env.NODE_ENV !== 'production') {
    const { createServer: createViteServer } = await import('vite');
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use((req, _res, next) => {
      if (req.path === '/') {
        req.url = '/app.html';
      }
      next();
    });
    app.use(vite.middlewares);
  } else {
    const distDir = path.resolve(__dirname, 'dist');
    app.use(express.static(distDir));
    app.get('/{*splat}', (_req: Request, res: Response) => {
      res.sendFile(path.join(distDir, 'index.html'));
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`HSMP Portal listening on http://0.0.0.0:${PORT}`);
  });
}

createServer().catch((err) => {
  console.error('Failed to start HSMP server:', err);
  process.exit(1);
});
