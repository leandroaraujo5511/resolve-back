import { ConfigService } from '@nestjs/config';

export type PanelBrandConfig = {
  appName: string;
  panelUrl: string;
  logoUrl: string;
  primaryColor: string;
};

export type PanelEmailCta = {
  label: string;
  url: string;
};

export type BuildPanelEmailInput = {
  brand: PanelBrandConfig;
  /** Título principal (visível no corpo). */
  headline: string;
  /** Saudação, ex.: "Oi, Maria," */
  greeting: string;
  /** Parágrafos em HTML já escapados ou markup seguro. */
  paragraphsHtml: string[];
  cta?: PanelEmailCta;
  /** Texto auxiliar abaixo do botão (ex.: validade). */
  notes?: string[];
  /** Assinatura / equipe. */
  closingHtml?: string;
};

export function resolvePanelBrand(config: ConfigService): PanelBrandConfig {
  const panelUrl = (
    config.get<string>('PANEL_APP_URL', '')?.trim() || 'http://localhost:5173'
  ).replace(/\/+$/, '');
  const appName =
    config.get<string>('PANEL_APP_NAME', '')?.trim() || 'Resolve+';
  const logoOverride = config.get<string>('EMAIL_LOGO_URL', '')?.trim();
  const logoUrl =
    logoOverride || `${panelUrl}/logo_light.png`;
  const primaryColor =
    config.get<string>('EMAIL_PRIMARY_COLOR', '')?.trim() || '#1B4F8A';

  return { appName, panelUrl, logoUrl, primaryColor };
}

export function escapeHtml(value: string): string {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

/**
 * Layout HTML responsivo estilo e-mail transacional (logo + nome + CTA).
 * Tabelas para compatibilidade com clientes de e-mail.
 */
export function buildPanelEmailHtml(input: BuildPanelEmailInput): string {
  const { brand, headline, greeting, paragraphsHtml, cta, notes, closingHtml } =
    input;
  const year = new Date().getFullYear();
  const notesHtml = (notes ?? [])
    .map(
      (n) =>
        `<p style="margin:0 0 8px;font-size:13px;line-height:1.5;color:#6B7280;">${escapeHtml(n)}</p>`,
    )
    .join('');
  const bodyParagraphs = paragraphsHtml
    .map(
      (p) =>
        `<p style="margin:0 0 16px;font-size:16px;line-height:1.55;color:#1F2937;">${p}</p>`,
    )
    .join('');

  const ctaBlock = cta
    ? `
      <table role="presentation" cellpadding="0" cellspacing="0" border="0" style="margin:28px 0 20px;">
        <tr>
          <td align="left" style="border-radius:10px;background:${escapeHtml(brand.primaryColor)};">
            <a href="${escapeHtml(cta.url)}"
               style="display:inline-block;padding:14px 28px;font-size:16px;font-weight:700;color:#ffffff;text-decoration:none;border-radius:10px;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Helvetica,Arial,sans-serif;">
              ${escapeHtml(cta.label)}
            </a>
          </td>
        </tr>
      </table>`
    : '';

  return `<!DOCTYPE html>
<html lang="pt-BR">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <title>${escapeHtml(headline)}</title>
</head>
<body style="margin:0;padding:0;background:#F3F4F6;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Helvetica,Arial,sans-serif;">
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="background:#F3F4F6;padding:24px 12px;">
    <tr>
      <td align="center">
        <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="max-width:560px;background:#ffffff;border-radius:16px;overflow:hidden;box-shadow:0 1px 3px rgba(0,0,0,0.06);">
          <tr>
            <td style="padding:28px 32px 8px;">
              <img src="${escapeHtml(brand.logoUrl)}" alt="${escapeHtml(brand.appName)}" width="160" style="display:block;max-width:160px;height:auto;border:0;" />
            </td>
          </tr>
          <tr>
            <td style="padding:16px 32px 8px;">
              <h1 style="margin:0 0 20px;font-size:28px;line-height:1.25;font-weight:700;color:#111827;">
                ${escapeHtml(headline)}
              </h1>
              <p style="margin:0 0 16px;font-size:16px;line-height:1.55;color:#1F2937;">
                ${escapeHtml(greeting)}
              </p>
              ${bodyParagraphs}
              ${ctaBlock}
              ${notesHtml}
              ${
                closingHtml ??
                `<p style="margin:24px 0 0;font-size:16px;line-height:1.55;color:#1F2937;">Atenciosamente,<br/><strong>Equipe ${escapeHtml(brand.appName)}</strong></p>`
              }
            </td>
          </tr>
          <tr>
            <td style="padding:24px 32px;background:#F8F5F0;text-align:center;">
              <img src="${escapeHtml(brand.logoUrl)}" alt="${escapeHtml(brand.appName)}" width="100" style="display:inline-block;max-width:100px;height:auto;border:0;margin-bottom:10px;" />
              <p style="margin:0;font-size:12px;line-height:1.5;color:#9CA3AF;">
                © ${year} ${escapeHtml(brand.appName)} · Gestão de demandas municipais
              </p>
              <p style="margin:8px 0 0;font-size:12px;line-height:1.5;">
                <a href="${escapeHtml(brand.panelUrl)}" style="color:${escapeHtml(brand.primaryColor)};text-decoration:none;">Acessar o sistema</a>
              </p>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>`;
}

export function buildWelcomeEmailContent(input: {
  brand: PanelBrandConfig;
  userName: string;
  userEmail: string;
  provisionalPassword: string;
  requireChange: boolean;
}): { subject: string; textBody: string; htmlBody: string } {
  const { brand, userName, userEmail, provisionalPassword, requireChange } =
    input;
  const changeHint = requireChange
    ? 'No primeiro acesso, você deverá alterar esta senha provisória antes de usar o sistema.'
    : 'Recomendamos alterar a senha após o primeiro acesso.';

  const subject = 'Bem-vindo ao sistema';
  const textBody = [
    'Bem-vindo ao sistema',
    '',
    `Oi, ${userName},`,
    '',
    `Você foi convidado(a) a acessar o ${brand.appName}.`,
    `E-mail de acesso: ${userEmail}`,
    `Senha provisória: ${provisionalPassword}`,
    `Link de acesso: ${brand.panelUrl}`,
    '',
    changeHint,
    '',
    'Por segurança, não compartilhe seus dados de acesso com outras pessoas.',
    '',
    `Equipe ${brand.appName}`,
  ].join('\n');

  const htmlBody = buildPanelEmailHtml({
    brand,
    headline: 'Bem-vindo ao sistema',
    greeting: `Oi, ${userName},`,
    paragraphsHtml: [
      `Você foi convidado(a) a acessar o <strong>${escapeHtml(brand.appName)}</strong>.`,
      `E-mail de acesso: <strong>${escapeHtml(userEmail)}</strong>`,
      `Senha provisória: <strong style="font-family:ui-monospace,Menlo,Consolas,monospace;letter-spacing:0.02em;">${escapeHtml(provisionalPassword)}</strong>`,
      escapeHtml(changeHint),
      'Por segurança, não compartilhe seus dados de acesso com outras pessoas.',
    ],
    cta: {
      label: `Acessar o ${brand.appName}`,
      url: brand.panelUrl,
    },
  });

  return { subject, textBody, htmlBody };
}

export function buildPasswordResetEmailContent(input: {
  brand: PanelBrandConfig;
  userName: string;
  userEmail: string;
  resetUrl: string;
  validityLabel: string;
}): { subject: string; textBody: string; htmlBody: string } {
  const { brand, userName, userEmail, resetUrl, validityLabel } = input;

  const subject = 'Recuperação de senha';
  const textBody = [
    'Recuperação de senha',
    '',
    `Oi, ${userName},`,
    '',
    `Clique no link abaixo para redefinir sua senha no ${brand.appName}.`,
    `E-mail de acesso: ${userEmail}`,
    resetUrl,
    '',
    `Este link vai expirar em ${validityLabel}.`,
    'Caso você não tenha solicitado a redefinição de senha, ignore esta mensagem. Sua senha está segura!',
    '',
    `Equipe ${brand.appName}`,
  ].join('\n');

  const htmlBody = buildPanelEmailHtml({
    brand,
    headline: 'Veja como redefinir sua senha',
    greeting: `Oi, ${userName},`,
    paragraphsHtml: [
      `Clique no botão abaixo para redefinir sua senha no <strong>${escapeHtml(brand.appName)}</strong>.`,
      `E-mail de acesso: <strong>${escapeHtml(userEmail)}</strong>`,
    ],
    cta: {
      label: 'Redefinir senha',
      url: resetUrl,
    },
    notes: [
      `Este link vai expirar em ${validityLabel}.`,
      'Caso você não tenha solicitado a redefinição de senha, ignore esta mensagem. Sua senha está segura!',
    ],
  });

  return { subject, textBody, htmlBody };
}
