import crypto from "crypto";
import { transporter } from "./email";

function getDeterministicUUID(orderId: string): string {
  // Hash the orderId with SHA-256
  const hash = crypto.createHash("sha256").update(orderId + "-email-sent").digest("hex");
  // Format as UUID v4-like structure:
  // xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx
  return [
    hash.substring(0, 8),
    hash.substring(8, 12),
    "4" + hash.substring(13, 16), // version 4
    ((parseInt(hash.substring(16, 18), 16) & 0x3f) | 0x80).toString(16) + hash.substring(18, 20), // variant
    hash.substring(20, 32)
  ].join("-");
}

export async function sendCustomerConfirmation(order: any) {
  const itemsHtml = (order.order_items || []).map((item: any) => `
    <tr>
      <td style="padding: 12px 0; border-bottom: 1px solid #e2e8f0; text-align: left;">
        <span style="font-size: 14px; font-weight: 600; color: #0f172a;">${item.name}</span>
        <div style="font-size: 12px; color: #64748b; margin-top: 4px;">Qty: ${item.quantity}</div>
      </td>
      <td style="padding: 12px 0; border-bottom: 1px solid #e2e8f0; text-align: right; font-size: 14px; font-weight: 600; color: #0f172a;">
        ₦${Number(item.unit_price * item.quantity).toLocaleString("en-NG")}
      </td>
    </tr>
  `).join("");

  const addr = order.shipping_address || {};
  const addressLine = [addr.address, addr.line1, addr.line2].filter(Boolean).join(", ");
  const cityStateZip = [addr.city, addr.state, addr.zip].filter(Boolean).join(", ");

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
              <table style="width: 100%; border-collapse: collapse; font-size: 14px;">
                <tr>
                  <td style="color: #64748b; padding-bottom: 8px;">Order Number</td>
                  <td style="text-align: right; font-weight: 600; color: #0f172a; padding-bottom: 8px;">${order.order_number}</td>
                </tr>
                <tr>
                  <td style="color: #64748b; padding-bottom: 8px;">Payment Reference</td>
                  <td style="text-align: right; font-family: monospace; color: #475569; padding-bottom: 8px;">${order.payment_reference || "N/A"}</td>
                </tr>
                <tr>
                  <td style="color: #64748b;">Order Date</td>
                  <td style="text-align: right; color: #475569;">${new Date(order.created_at).toLocaleDateString("en-NG", { dateStyle: "medium" })}</td>
                </tr>
              </table>
            </div>

            <!-- Items table -->
            <h3 style="font-size: 16px; font-weight: 700; color: #0f172a; margin: 0 0 12px 0; border-bottom: 2px solid #f1f5f9; padding-bottom: 8px;">Items Ordered</h3>
            <table style="width: 100%; border-collapse: collapse; margin-bottom: 28px;">
              <thead>
                <tr>
                  <th style="text-align: left; font-size: 12px; text-transform: uppercase; color: #64748b; padding-bottom: 8px;">Product</th>
                  <th style="text-align: right; font-size: 12px; text-transform: uppercase; color: #64748b; padding-bottom: 8px;">Total</th>
                </tr>
              </thead>
              <tbody>
                ${itemsHtml}
              </tbody>
            </table>

            <!-- Summary Table -->
            <div style="border-top: 2px solid #f1f5f9; padding-top: 16px; margin-bottom: 28px;">
              <table style="width: 100%; border-collapse: collapse; font-size: 14px;">
                <tr>
                  <td style="color: #64748b; padding: 6px 0;">Subtotal</td>
                  <td style="text-align: right; font-weight: 600; color: #0f172a; padding: 6px 0;">₦${Number(order.subtotal).toLocaleString("en-NG")}</td>
                </tr>
                ${Number(order.discount) > 0 ? `
                <tr>
                  <td style="color: #ef4444; padding: 6px 0;">Discount</td>
                  <td style="text-align: right; font-weight: 600; color: #ef4444; padding: 6px 0;">-₦${Number(order.discount).toLocaleString("en-NG")}</td>
                </tr>
                ` : ""}
                <tr>
                  <td style="color: #64748b; padding: 6px 0;">Shipping</td>
                  <td style="text-align: right; font-weight: 600; color: #0f172a; padding: 6px 0;">
                    ${Number(order.shipping) === 0 ? "Free" : `₦${Number(order.shipping).toLocaleString("en-NG")}`}
                  </td>
                </tr>
                <tr style="border-top: 1px solid #e2e8f0;">
                  <td style="color: #0f172a; font-weight: 700; font-size: 16px; padding: 12px 0 0 0;">Total</td>
                  <td style="text-align: right; font-weight: 800; color: #0f172a; font-size: 18px; padding: 12px 0 0 0;">₦${Number(order.total).toLocaleString("en-NG")}</td>
                </tr>
              </table>
            </div>

            <!-- Shipping Address -->
            <div style="border-top: 1px solid #e2e8f0; padding-top: 24px;">
              <h3 style="font-size: 16px; font-weight: 700; color: #0f172a; margin: 0 0 12px 0;">Shipping Address</h3>
              <div style="background-color: #f8fafc; border: 1px solid #e2e8f0; border-radius: 12px; padding: 16px; font-size: 14px; color: #475569;">
                <p style="margin: 0; font-weight: 600; color: #0f172a; margin-bottom: 4px;">${order.customer_name}</p>
                <p style="margin: 0; margin-bottom: 2px;">${addressLine}</p>
                <p style="margin: 0; margin-bottom: 2px;">${cityStateZip}</p>
                <p style="margin: 0; text-transform: uppercase; font-size: 11px; font-weight: 600; color: #64748b; tracking-width: 0.05em; margin-bottom: 8px;">${addr.country || "Nigeria"}</p>
                ${addr.phone ? `<p style="margin: 0; font-family: monospace; font-size: 12px;">📞 ${addr.phone}</p>` : ""}
              </div>
            </div>
          </div>

          <!-- Footer -->
          <div style="background-color: #f1f5f9; padding: 24px; text-align: center; border-top: 1px solid #e2e8f0; font-size: 12px; color: #64748b;">
            <p style="margin: 0 0 8px 0;">If you have any questions, reply to this email or contact us at <a href="mailto:support@emeritusgadgets.com" style="color: #0f172a; font-weight: 600; text-decoration: none;">support@emeritusgadgets.com</a></p>
            <p style="margin: 0;">&copy; ${new Date().getFullYear()} Emeritus Gadgets. All rights reserved.</p>
          </div>
        </div>
      </div>
    `,
  });
}

export async function sendAdminNotification(order: any) {
  const itemsHtml = (order.order_items || []).map((item: any) => `
    <tr>
      <td style="padding: 10px 0; border-bottom: 1px solid #e2e8f0; text-align: left; font-size: 14px;">
        <strong>${item.name}</strong> x ${item.quantity}
      </td>
      <td style="padding: 10px 0; border-bottom: 1px solid #e2e8f0; text-align: right; font-size: 14px; font-weight: 600;">
        ₦${Number(item.unit_price * item.quantity).toLocaleString("en-NG")}
      </td>
    </tr>
  `).join("");

  await transporter.sendMail({
    from: `"Emeritus Gadgets" <${process.env.SMTP_USER}>`,
    to: process.env.ADMIN_ORDER_EMAIL,
    subject: `🛒 New Order #${order.order_number} - ₦${Number(order.total).toLocaleString("en-NG")}`,
    html: `
      <div style="font-family: system-ui, -apple-system, sans-serif; padding: 24px; color: #334155; max-width: 600px; margin: 0 auto; border: 1px solid #e2e8f0; border-radius: 12px;">
        <h2 style="color: #0f172a; margin-top: 0;">New Order Received</h2>
        <p>A new payment has been processed and order <strong>#${order.order_number}</strong> is confirmed.</p>
        
        <table style="width: 100%; border-collapse: collapse; margin: 20px 0; font-size: 14px; background-color: #f8fafc; padding: 16px; border-radius: 8px;">
          <tr>
            <td style="padding: 6px 12px; color: #64748b;">Customer Name</td>
            <td style="padding: 6px 12px; font-weight: 600; color: #0f172a;">${order.customer_name}</td>
          </tr>
          <tr>
            <td style="padding: 6px 12px; color: #64748b;">Email Address</td>
            <td style="padding: 6px 12px; font-weight: 600; color: #0f172a;"><a href="mailto:${order.email}">${order.email}</a></td>
          </tr>
          <tr>
            <td style="padding: 6px 12px; color: #64748b;">Total Amount</td>
            <td style="padding: 6px 12px; font-weight: 600; color: #0f172a;">₦${Number(order.total).toLocaleString("en-NG")}</td>
          </tr>
          <tr>
            <td style="padding: 6px 12px; color: #64748b;">Payment Ref</td>
            <td style="padding: 6px 12px; font-family: monospace; color: #475569;">${order.payment_reference || "N/A"}</td>
          </tr>
        </table>

        <h3 style="border-bottom: 2px solid #f1f5f9; padding-bottom: 8px; margin-top: 24px;">Items Summary</h3>
        <table style="width: 100%; border-collapse: collapse; margin-bottom: 20px;">
          ${itemsHtml}
        </table>

        <div style="margin-top: 32px; text-align: center;">
          <a href="${process.env.NEXT_PUBLIC_API_URL || "http://localhost:3000"}/admin/orders" style="background-color: #0f172a; color: #ffffff; padding: 12px 24px; border-radius: 8px; text-decoration: none; font-weight: 600; display: inline-block;">
            Manage Order in Dashboard
          </a>
        </div>
      </div>
    `,
  });
}

export async function sendOrderEmailsIfPending(orderId: string, adminClient: any) {
  const deterministicId = getDeterministicUUID(orderId);

  // Try to insert tracking event to claim the email send block
  const { error: insertError } = await adminClient
    .from("order_tracking_events")
    .insert({
      id: deterministicId,
      order_id: orderId,
      status: "email_sent",
      location: "System",
      description: "Order confirmation email sent to customer",
    });

  if (insertError) {
    if (insertError.code === "23505") {
      // Unique key violation: already sent by another process
      console.log(`Emails already sent for order ${orderId} (claimed by other process)`);
      return;
    }
    console.error(`Failed to claim email send for order ${orderId}:`, insertError);
    return;
  }

  try {
    // 1. Fetch order details with order_items
    const { data: order, error: orderError } = await adminClient
      .from("orders")
      .select("*, order_items(*)")
      .eq("id", orderId)
      .single();

    if (orderError || !order) {
      console.error(`Failed to fetch order details for email:`, orderError);
      return;
    }

    // 2. Fetch customer email from auth
    const { data: { user }, error: userError } = await adminClient.auth.admin.getUserById(order.user_id);
    if (userError || !user || !user.email) {
      console.error(`Failed to fetch customer email for order ${orderId}:`, userError);
      return;
    }

    const customerName = order.shipping_address?.firstName 
      ? `${order.shipping_address.firstName} ${order.shipping_address.lastName || ""}`.trim()
      : "Customer";

    const orderData = {
      ...order,
      email: user.email,
      customer_name: customerName,
    };

    // 3. Send emails inside try/catch to improve reliability
    await Promise.all([
      sendCustomerConfirmation(orderData),
      sendAdminNotification(orderData),
    ]);
    console.log(`Emails successfully sent for order ${order.order_number}`);
  } catch (emailError) {
    console.error(`Failed to send email for order ${orderId}:`, emailError);
  }
}
