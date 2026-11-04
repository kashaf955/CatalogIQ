const nodemailer = require("nodemailer");
const {
  SMTP_HOST,
  SMTP_PORT,
  SMTP_USER,
  SMTP_PASS,
  MAIL_FROM,
  FRONTEND_URL,
} = require("../config/env");
const { logError } = require("../utils/logger");

let transporter = null;

const isMailConfigured = () => Boolean(SMTP_HOST && SMTP_USER && SMTP_PASS);

const getTransporter = () => {
  if (!transporter) {
    transporter = nodemailer.createTransport({
      host: SMTP_HOST,
      port: SMTP_PORT,
      secure: SMTP_PORT === 465,
      auth: { user: SMTP_USER, pass: SMTP_PASS },
    });
  }
  return transporter;
};

const escapeHtml = (value) =>
  String(value ?? "").replace(
    /[&<>"']/g,
    (char) =>
      ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[
        char
      ]
  );

const layout = (heading, body, buttonLabel, buttonUrl) => `
  <div style="font-family:Arial,sans-serif;max-width:520px;margin:0 auto;padding:24px;color:#1f2937">
    <h2 style="margin:0 0 16px">${escapeHtml(heading)}</h2>
    ${body}
    <p style="margin:24px 0">
      <a href="${escapeHtml(buttonUrl)}"
         style="background:#4f46e5;color:#fff;padding:12px 20px;border-radius:6px;text-decoration:none;display:inline-block">
        ${escapeHtml(buttonLabel)}
      </a>
    </p>
    <p style="font-size:12px;color:#6b7280">
      If the button does not work, copy this link into your browser:<br>${escapeHtml(buttonUrl)}
    </p>
  </div>`;

// Returns true when the message was handed to the SMTP server. Never throws,
// so a mail outage cannot break the invite itself.
const send = async ({ to, subject, text, html }) => {
  if (!isMailConfigured()) {
    console.warn(`[mail] SMTP is not configured; not sending "${subject}" to ${to}`);
    return false;
  }
  try {
    await getTransporter().sendMail({ from: MAIL_FROM, to, subject, text, html });
    console.log(`[mail] sent "${subject}" to ${to}`);
    return true;
  } catch (error) {
    logError("mail.send", error, { to, subject });
    return false;
  }
};

const sendInviteEmail = ({ to, inviterName, workspace, role, inviteUrl }) =>
  send({
    to,
    subject: `You're invited to ${workspace} on CatalogIQ`,
    text: `${inviterName} invited you to join ${workspace} on CatalogIQ as ${role}.\n\nSet your password and join here (link expires in 7 days):\n${inviteUrl}`,
    html: layout(
      `Join ${workspace} on CatalogIQ`,
      `<p>${escapeHtml(inviterName)} invited you to join <strong>${escapeHtml(workspace)}</strong> as <strong>${escapeHtml(role)}</strong>.</p>
       <p>Click below to choose your password. The link expires in 7 days and works once.</p>`,
      "Accept invite",
      inviteUrl
    ),
  });

const sendAddedEmail = ({ to, inviterName, workspace, role }) => {
  const loginUrl = `${FRONTEND_URL}/login`;
  return send({
    to,
    subject: `You were added to ${workspace} on CatalogIQ`,
    text: `${inviterName} added you to ${workspace} on CatalogIQ as ${role}.\n\nSign in with your existing password:\n${loginUrl}`,
    html: layout(
      `You now have access to ${workspace}`,
      `<p>${escapeHtml(inviterName)} added you to <strong>${escapeHtml(workspace)}</strong> as <strong>${escapeHtml(role)}</strong>.</p>
       <p>Sign in with your existing CatalogIQ password.</p>`,
      "Sign in",
      loginUrl
    ),
  });
};

module.exports = { isMailConfigured, sendInviteEmail, sendAddedEmail };
