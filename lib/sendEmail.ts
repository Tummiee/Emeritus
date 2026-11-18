import "server-only";
import { transporter } from "./email";
import { escapeHtml } from "./email-html";

export async function sendCustomerConfirmation(order: any) {
  const itemsHtml = (order.order_items || [])
    .map(
      (item: any) => `
    <tr>
      <td width="70%" valign="top" style="width: 70%; padding: 12px 12px 12px 0; border-bottom: 1px solid #e2e8f0; text-align: left; vertical-align: top; word-break: break-word;">
        <span style="font-size: 14px; font-weight: 600; color: #0f172a;">${escapeHtml(item.name)}</span>
        <div style="font-size: 12px; color: #64748b; margin-top: 4px;">Qty: ${item.quantity}</div>
      </td>
      <td width="30%" valign="top" style="width: 30%; padding: 12px 0 12px 12px; border-bottom: 1px solid #e2e8f0; text-align: right; vertical-align: top; white-space: nowrap; font-size: 14px; font-weight: 600; color: #0f172a;">
        &#8358;${Number(item.unit_price * item.quantity).toLocaleString("en-NG")}
      </td>
    </tr>
  `,
    )
    .join("");

  const addr = order.shipping_address || {};
  const addressLine = [addr.address, addr.line1, addr.line2]
    .filter(Boolean)
    .join(", ");
  const cityStateZip = [addr.city, addr.state, addr.zip]
    .filter(Boolean)
    .join(", ");

  await transporter.sendMail({
    from: `"Emeritus Gadgets" <${process.env.SMTP_USER}>`,
    to: order.email,
    subject: `Order #${order.order_number} Confirmed - Emeritus Gadgets`,
    html: `
      <div style="font-family: system-ui, -apple-system, sans-serif; background-color: #f8fafc; padding: 24px; color: #334155; line-height: 1.6;">
        <div style="max-width: 600px; margin: 0 auto; background-color: #ffffff; border-radius: 16px; overflow: hidden; border: 1px solid #e2e8f0; box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.05);">
          <!-- Header -->
          <div style="background-color: #0f172a; padding: 32px 24px; text-align: center;">
            <h1 style="color: #ffffff; margin: 0; font-size: 24px; font-weight: 800; letter-spacing: -0.025em;">Emeritus Gadgets</h1>
            <p style="color: #38bdf8; margin: 8px 0 0 0; font-size: 14px; font-weight: 600; text-transform: uppercase; letter-spacing: 0.05em;">Order Confirmed</p>
          </div>
          
          <!-- Body -->
          <div style="padding: 32px 24px;">
            <h2 style="margin: 0 0 16px 0; font-size: 20px; font-weight: 700; color: #0f172a;">Thank you for your order!</h2>
            <p style="margin: 0 0 24px 0; font-size: 15px; color: #475569;">Hello ${order.customer_name || "Customer"}, your payment was successfully processed. We are preparing your order for shipment.</p>
            
            <!-- Order Details Card -->
            <div style="background-color: #f1f5f9; border-radius: 12px; padding: 20px; margin-bottom: 28px;">
              <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="width: 100%; border-collapse: collapse; table-layout: fixed; mso-table-lspace: 0pt; mso-table-rspace: 0pt; font-size: 14px;">
                <tr>
                  <td width="42%" valign="top" style="width: 42%; color: #64748b; padding: 0 12px 8px 0; vertical-align: top;">Order Number</td>
                  <td width="58%" valign="top" style="width: 58%; text-align: right; vertical-align: top; word-break: break-word; font-weight: 600; color: #0f172a; padding: 0 0 8px 12px;">${order.order_number}</td>
                </tr>
                <tr>
                  <td width="42%" valign="top" style="width: 42%; color: #64748b; padding: 0 12px 8px 0; vertical-align: top;">Payment Reference</td>
                  <td width="58%" valign="top" style="width: 58%; text-align: right; vertical-align: top; overflow-wrap: anywhere; word-break: break-all; font-family: monospace; color: #475569; padding: 0 0 8px 12px;">${order.payment_reference || "N/A"}</td>
                </tr>
                <tr>
                  <td width="42%" valign="top" style="width: 42%; color: #64748b; padding-right: 12px; vertical-align: top;">Order Date</td>
                  <td width="58%" valign="top" style="width: 58%; text-align: right; vertical-align: top; color: #475569; padding-left: 12px;">${new Date(order.created_at).toLocaleDateString("en-NG", { dateStyle: "medium" })}</td>
                </tr>
              </table>
            </div>

            <!-- Items table -->
            <h3 style="font-size: 16px; font-weight: 700; color: #0f172a; margin: 0 0 12px 0; border-bottom: 2px solid #f1f5f9; padding-bottom: 8px;">Items Ordered</h3>
            <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="width: 100%; border-collapse: collapse; table-layout: fixed; mso-table-lspace: 0pt; mso-table-rspace: 0pt; margin-bottom: 28px;">
              <thead>
                <tr>
                  <th width="70%" valign="bottom" style="width: 70%; text-align: left; font-size: 12px; text-transform: uppercase; color: #64748b; padding: 0 12px 8px 0;">Product</th>
                  <th width="30%" valign="bottom" style="width: 30%; text-align: right; font-size: 12px; text-transform: uppercase; color: #64748b; padding: 0 0 8px 12px;">Total</th>
                </tr>
              </thead>
              <tbody>
                ${itemsHtml}
              </tbody>
            </table>

            <!-- Summary Table -->
            <div style="border-top: 2px solid #f1f5f9; padding-top: 16px; margin-bottom: 28px;">
              <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="width: 100%; border-collapse: collapse; table-layout: fixed; mso-table-lspace: 0pt; mso-table-rspace: 0pt; font-size: 14px;">
                <tr>
                  <td width="50%" style="width: 50%; color: #64748b; padding: 6px 12px 6px 0;">Subtotal</td>
                  <td width="50%" style="width: 50%; text-align: right; white-space: nowrap; font-weight: 600; color: #0f172a; padding: 6px 0 6px 12px;">&#8358;${Number(order.subtotal).toLocaleString("en-NG")}</td>
                </tr>
                ${
                  Number(order.discount) > 0
                    ? `
                <tr>
                  <td width="50%" style="width: 50%; color: #ef4444; padding: 6px 12px 6px 0;">Discount</td>
                  <td width="50%" style="width: 50%; text-align: right; white-space: nowrap; font-weight: 600; color: #ef4444; padding: 6px 0 6px 12px;">-&#8358;${Number(order.discount).toLocaleString("en-NG")}</td>
                </tr>
                `
                    : ""
                }
                <tr>
                  <td width="50%" style="width: 50%; color: #64748b; padding: 6px 12px 6px 0;">Shipping</td>
                  <td width="50%" style="width: 50%; text-align: right; white-space: nowrap; font-weight: 600; color: #0f172a; padding: 6px 0 6px 12px;">
                    ${Number(order.shipping) === 0 ? "Free" : `&#8358;${Number(order.shipping).toLocaleString("en-NG")}`}
                  </td>
                </tr>
                <tr style="border-top: 1px solid #e2e8f0;">
                  <td width="50%" style="width: 50%; color: #0f172a; font-weight: 700; font-size: 16px; padding: 12px 12px 0 0;">Total</td>
                  <td width="50%" style="width: 50%; text-align: right; white-space: nowrap; font-weight: 800; color: #0f172a; font-size: 18px; padding: 12px 0 0 12px;">&#8358;${Number(order.total).toLocaleString("en-NG")}</td>
                </tr>
              </table>
            </div>

            <!-- Shipping Address -->
            <div style="border-top: 1px solid #e2e8f0; padding-top: 24px;">
              <h3 style="font-size: 16px; font-weight: 700; color: #0f172a; margin: 0 0 12px 0;">Shipping Address</h3>
              <div style="background-color: #f8fafc; border: 1px solid #e2e8f0; border-radius: 12px; padding: 16px; font-size: 14px; color: #475569;">
                <p style="margin: 0; font-weight: 600; color: #0f172a; margin-bottom: 4px;">${escapeHtml(order.customer_name)}</p>
                <p style="margin: 0; margin-bottom: 2px;">${escapeHtml(addressLine)}</p>
                <p style="margin: 0; margin-bottom: 2px;">${escapeHtml(cityStateZip)}</p>
                <p style="margin: 0; text-transform: uppercase; font-size: 11px; font-weight: 600; color: #64748b; letter-spacing: 0.05em; margin-bottom: 8px;">${escapeHtml(addr.country || "Nigeria")}</p>
                ${addr.phone ? `<p style="margin: 0; font-family: monospace; font-size: 12px;">&#128222; ${escapeHtml(addr.phone)}</p>` : ""}
              </div>
            </div>
          </div>

          <!-- Footer -->
          <div style="background-color: #f1f5f9; padding: 24px; text-align: center; border-top: 1px solid #e2e8f0; font-size: 12px; color: #64748b;">
            <p style="margin: 0 0 8px 0;">If you have any questions, contact us at <a href="mailto:support@emeritusgadgets.com" style="color: #0f172a; font-weight: 600; text-decoration: none;">support@emeritusgadgets.com</a></p>
            <p style="margin: 0;">&copy; ${new Date().getFullYear()} Emeritus Global Resources. All rights reserved.</p>
          </div>
        </div>
      </div>
    `,
  });
}

export async function sendAdminNotification(order: any) {
  const itemsHtml = (order.order_items || [])
    .map(
      (item: any) => `
    <tr>
      <td width="70%" valign="top" style="width: 70%; padding: 10px 12px 10px 0; border-bottom: 1px solid #e2e8f0; text-align: left; vertical-align: top; word-break: break-word; font-size: 14px;">
        <strong>${escapeHtml(item.name)}</strong> x ${item.quantity}
      </td>
      <td width="30%" valign="top" style="width: 30%; padding: 10px 0 10px 12px; border-bottom: 1px solid #e2e8f0; text-align: right; vertical-align: top; white-space: nowrap; font-size: 14px; font-weight: 600;">
        &#8358;${Number(item.unit_price * item.quantity).toLocaleString("en-NG")}
      </td>
    </tr>
  `,
    )
    .join("");

  await transporter.sendMail({
    from: `"Emeritus Gadgets" <${process.env.SMTP_USER}>`,
    to: process.env.ADMIN_ORDER_EMAIL,
    subject: `New Order #${order.order_number} - NGN ${Number(order.total).toLocaleString("en-NG")}`,
    html: `
      <div style="font-family: system-ui, -apple-system, sans-serif; padding: 24px; color: #334155; max-width: 600px; margin: 0 auto; border: 1px solid #e2e8f0; border-radius: 12px;">
        <h2 style="color: #0f172a; margin-top: 0;">New Order Received</h2>
        <p>A new payment has been processed and order <strong>#${order.order_number}</strong> is confirmed.</p>
        
        <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="width: 100%; border-collapse: separate; border-spacing: 0; table-layout: fixed; mso-table-lspace: 0pt; mso-table-rspace: 0pt; margin: 20px 0; font-size: 14px; background-color: #f8fafc; border: 1px solid #e2e8f0; border-radius: 8px;">
          <tr>
            <td width="38%" valign="top" style="width: 38%; padding: 8px 12px; color: #64748b; vertical-align: top;">Customer Name</td>
            <td width="62%" valign="top" style="width: 62%; padding: 8px 12px; text-align: right; vertical-align: top; overflow-wrap: anywhere; word-break: break-word; font-weight: 600; color: #0f172a;">${escapeHtml(order.customer_name)}</td>
          </tr>
          <tr>
            <td width="38%" valign="top" style="width: 38%; padding: 8px 12px; color: #64748b; vertical-align: top;">Email Address</td>
            <td width="62%" valign="top" style="width: 62%; padding: 8px 12px; text-align: right; vertical-align: top; overflow-wrap: anywhere; word-break: break-word; font-weight: 600; color: #0f172a;"><a href="mailto:${escapeHtml(order.email)}">${escapeHtml(order.email)}</a></td>
          </tr>
          <tr>
            <td width="38%" valign="top" style="width: 38%; padding: 8px 12px; color: #64748b; vertical-align: top;">Total Amount</td>
            <td width="62%" valign="top" style="width: 62%; padding: 8px 12px; text-align: right; vertical-align: top; overflow-wrap: anywhere; word-break: break-word; white-space: nowrap; font-weight: 600; color: #0f172a;">&#8358;${Number(order.total).toLocaleString("en-NG")}</td>
          </tr>
          <tr>
            <td width="38%" valign="top" style="width: 38%; padding: 8px 12px; color: #64748b; vertical-align: top;">Payment Ref</td>
            <td width="62%" valign="top" style="width: 62%; padding: 8px 12px; text-align: right; vertical-align: top; overflow-wrap: anywhere; word-break: break-all; font-family: monospace; color: #475569;">${order.payment_reference || "N/A"}</td>
          </tr>
        </table>

        <h3 style="border-bottom: 2px solid #f1f5f9; padding-bottom: 8px; margin-top: 24px;">Items Summary</h3>
        <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="width: 100%; border-collapse: collapse; table-layout: fixed; mso-table-lspace: 0pt; mso-table-rspace: 0pt; margin-bottom: 20px;">
          ${itemsHtml}
        </table>

        <div style="margin-top: 32px; text-align: center;">
          <a href="${process.env.NEXT_PUBLIC_SITE_URL || "http://localhost:3000"}/admin/orders" style="background-color: #0f172a; color: #ffffff; padding: 12px 24px; border-radius: 8px; text-decoration: none; font-weight: 600; display: inline-block;">
            Manage Order in Dashboard
          </a>
        </div>
      </div>
    `,
  });
}
