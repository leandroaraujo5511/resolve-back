import { Controller, Get, Header } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

/**
 * Rota fora do prefixo global `/api` (ver `main.ts`) para servir página de suporte
 * acessível pela Support URL do App Store Connect.
 */
@Controller()
export class SupportController {
  constructor(private readonly config: ConfigService) {}

  @Get('support')
  @Header('Content-Type', 'text/html; charset=utf-8')
  supportPage(): string {
    const email =
      this.config.get<string>('SUPPORT_EMAIL', '').trim() ||
      'suporte@infinittech.com.br';
    const title = 'Suporte — Resolve +';
    return `<!DOCTYPE html>
<html lang="pt-BR">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <title>${title}</title>
  <style>
    body { font-family: system-ui, -apple-system, Segoe UI, Roboto, sans-serif; margin: 0; padding: 24px; line-height: 1.5; color: #0f171a; background: #f4f7f9; }
    main { max-width: 560px; margin: 0 auto; background: #fff; padding: 28px 24px; border-radius: 12px; box-shadow: 0 4px 24px rgba(15,23,26,.08); }
    h1 { font-size: 1.35rem; margin: 0 0 12px; }
    p { margin: 0 0 12px; }
    a { color: #15803d; font-weight: 600; }
    .muted { color: #64748b; font-size: 0.9rem; }
  </style>
</head>
<body>
  <main>
    <h1>Resolve + — Suporte</h1>
    <p>Esta página é o canal oficial de suporte ao aplicativo <strong>Resolve +</strong> (cidadão).</p>
    <p>Para dúvidas, problemas técnicos ou solicitações relacionadas ao app e à sua conta, envie um e-mail para:</p>
    <p><a href="mailto:${email}">${email}</a></p>
    <p class="muted">Descreva seu aparelho, versão do app e o que aconteceu. Responderemos o quanto antes.</p>
  </main>
</body>
</html>`;
  }
}
