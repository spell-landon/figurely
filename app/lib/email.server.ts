import { Resend } from 'resend';

const resend = new Resend(process.env.RESEND_API_KEY);

export interface SendInvoiceEmailParams {
  to: string;
  invoiceNumber: string;
  invoiceUrl: string;
  fromName?: string;
  fromEmail?: string;
}

export async function sendInvoiceEmail({
  to,
  invoiceNumber,
  invoiceUrl,
  fromName,
  fromEmail,
}: SendInvoiceEmailParams) {
  // Always use RESEND_FROM_EMAIL for the actual sender (Resend requirement)
  // We'll include the business name in the subject/body instead
  const from = process.env.RESEND_FROM_EMAIL || 'onboarding@resend.dev';

  try {
    const { data, error } = await resend.emails.send({
      from: `Figurely <${from}>`,
      to: [to],
      subject: `Invoice ${invoiceNumber}`,
      html: `
        <!DOCTYPE html>
        <html>
          <head>
            <meta charset="utf-8">
            <meta name="viewport" content="width=device-width, initial-scale=1.0">
            <title>Invoice ${invoiceNumber}</title>
          </head>
          <body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px;">
            <div style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); padding: 30px; border-radius: 10px 10px 0 0; text-align: center;">
              <h1 style="color: white; margin: 0; font-size: 28px;">Invoice ${invoiceNumber}</h1>
            </div>

            <div style="background: #f8f9fa; padding: 30px; border-radius: 0 0 10px 10px;">
              <p style="font-size: 16px; margin-bottom: 20px;">
                Hello,
              </p>

              <p style="font-size: 16px; margin-bottom: 20px;">
                You have received a new invoice ${
                  fromName ? `from ${fromName}` : ''
                }.
              </p>

              <div style="text-align: center; margin: 30px 0;">
                <a href="${invoiceUrl}"
                   style="display: inline-block; background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; padding: 14px 30px; text-decoration: none; border-radius: 6px; font-weight: 600; font-size: 16px;">
                  View Invoice
                </a>
              </div>

              <p style="font-size: 14px; color: #666; margin-top: 30px; padding-top: 20px; border-top: 1px solid #ddd;">
                If you have any questions about this invoice, please contact ${
                  fromName || 'us'
                }.
              </p>

              <p style="font-size: 12px; color: #999; margin-top: 20px; text-align: center;">
                This invoice was sent via Figurely
              </p>
            </div>
          </body>
        </html>
      `,
      text: `
Invoice ${invoiceNumber}

You have received a new invoice${fromName ? ` from ${fromName}` : ''}.

View your invoice here: ${invoiceUrl}

If you have any questions about this invoice, please contact ${
        fromName || 'us'
      }.

---
This invoice was sent via Figurely
      `,
    });

    if (error) {
      console.error('Error sending email:', error);
      throw new Error(error.message);
    }

    return { success: true, data };
  } catch (error) {
    console.error('Failed to send invoice email:', error);
    throw error;
  }
}
