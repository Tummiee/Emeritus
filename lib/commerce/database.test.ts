import { beforeAll, afterAll, expect, it } from "vitest";
import { testDatabase } from "../database-test-setup";
import type { PGlite } from "@electric-sql/pglite";
let db: PGlite;
const user = "00000000-0000-4000-8000-000000000001";
const product = "00000000-0000-4000-8000-000000000010";
const items = JSON.stringify([{ productId: product, quantity: 1 }]);
const address = JSON.stringify({
  firstName: "Test",
  lastName: "Buyer",
  phone: "08000000000",
  address: "Street 123",
  city: "Ile-Ife",
  state: "Osun",
  country: "Nigeria",
});
beforeAll(async () => {
  db = await testDatabase();
  await db.exec(`insert into auth.users(id,email) values('${user}','buyer@example.test');select set_config('request.jwt.claim.sub','${user}',false);
    insert into public.products(id,name,slug,sku,price) values('${product}','Phone','phone','PHONE',10000);
    update public.inventory set quantity=100 where product_id='${product}';
    insert into public.shipping_zones(name,base_fee,estimated_days_min,estimated_days_max,is_fallback) values('Test delivery',0,1,3,true);`);
}, 60000);
afterAll(async () => {
  await db?.close();
});
async function checkout(key = crypto.randomUUID()) {
  const { rows } = await db.query<{
    value: { orderId: string; reference: string; amount: number };
  }>(`select public.create_checkout_payment_v3($1,$2,$3,$4,null) value`, [
    items,
    address,
    key,
    "TEST-" + crypto.randomUUID(),
  ]);
  return rows[0].value;
}
it("calculates tax and snapshots authoritative prices", async () => {
  const result = await checkout();
  const { rows } = await db.query<{ total: string; tax_amount: string }>(
    "select total,tax_amount from public.orders where id=$1",
    [result.orderId],
  );
  expect(Number(rows[0].tax_amount)).toBe(750);
  expect(Number(result.amount)).toBe(Number(rows[0].total));
});
it("requires reconciliation for historical successful attempts on unconfirmed orders", async () => {
  const result = await checkout();
  await db.query(
    "update public.payment_attempts set status='successful' where reference=$1",
    [result.reference],
  );
  const { rows } = await db.query<{ value: { outcome: string } }>(
    "select public.settle_payment_v2($1,true,'{}') value",
    [result.reference],
  );
  expect(rows[0].value.outcome).toBe("needs_reconciliation");
  const audit = await db.query(
    "select 1 from public.payment_reconciliation where reference=$1",
    [result.reference],
  );
  expect(audit.rows).toHaveLength(1);
});
it("denies customer inserts and direct reservation creation", async () => {
  await db.exec("set role authenticated");
  try {
    await expect(
      db.exec(
        `insert into public.payment_attempts(order_id,user_id,reference,amount) values(gen_random_uuid(),'${user}','FORGED',1)`,
      ),
    ).rejects.toThrow();
    await expect(
      db.query("select public.create_checkout_order($1,$2,null)", [
        items,
        address,
      ]),
    ).rejects.toThrow();
  } finally {
    await db.exec("reset role");
  }
});
it("rejects stale idempotency inputs", async () => {
  const key = crypto.randomUUID();
  await checkout(key);
  await expect(
    db.query(
      "select public.create_checkout_payment_v3($1,$2,$3,'CHANGED',null)",
      [JSON.stringify([{ productId: product, quantity: 2 }]), address, key],
    ),
  ).rejects.toThrow("checkout inputs changed");
});
it("rejects reuse of a pending order whose price differs from the reviewed quote", async () => {
  const key = crypto.randomUUID();
  await checkout(key);
  const original = await db.query<{ price: string }>(
    "select price from public.products where id=$1",
    [product],
  );
  try {
    await db.query("update public.products set price=price+100 where id=$1", [
      product,
    ]);
    const quote = await db.query<{ value: { quoteId: string } }>(
      "select public.checkout_quote($1,null,'Osun') value",
      [items],
    );
    await expect(
      db.query(
        "select public.create_checkout_payment_v3($1,$2,$3,$4,null,$5)",
        [
          items,
          address,
          key,
          "REPRICE-" + crypto.randomUUID(),
          quote.rows[0].value.quoteId,
        ],
      ),
    ).rejects.toThrow("no longer reusable; prices changed");
  } finally {
    await db.query("update public.products set price=$1 where id=$2", [
      original.rows[0].price,
      product,
    ]);
  }
});
it("settles once and preserves cart additions", async () => {
  const payment = await checkout();
  await db.exec(
    `insert into public.cart_items(user_id,product_id,quantity) values('${user}','${product}',3) on conflict(user_id,product_id) do update set quantity=3`,
  );
  const first = await db.query<{ value: { outcome: string } }>(
    "select public.settle_payment_v2($1,true,'{}') value",
    [payment.reference],
  );
  expect(first.rows[0].value.outcome).toBe("settled");
  const second = await db.query<{ value: { outcome: string } }>(
    "select public.settle_payment_v2($1,true,'{}') value",
    [payment.reference],
  );
  expect(second.rows[0].value.outcome).toBe("already_settled");
  expect(
    (
      await db.query<{ quantity: number }>(
        `select quantity from public.cart_items where user_id='${user}'`,
      )
    ).rows[0].quantity,
  ).toBe(2);
  expect(
    (
      await db.query<{ count: number }>(
        "select count(*)::int count from public.email_outbox where order_id=$1",
        [payment.orderId],
      )
    ).rows[0].count,
  ).toBe(2);
});
it("routes delayed success after cancellation to reconciliation", async () => {
  const payment = await checkout();
  await db.query("select public.settle_payment_v2($1,false,'{}')", [
    payment.reference,
  ]);
  const result = await db.query<{ value: { outcome: string } }>(
    "select public.settle_payment_v2($1,true,'{}') value",
    [payment.reference],
  );
  expect(result.rows[0].value.outcome).toBe("needs_reconciliation");
});
it("keeps cost prices out of public products", async () => {
  await db.exec("set role anon");
  try {
    await expect(
      db.exec("select cost_price from public.products"),
    ).rejects.toThrow();
    await expect(
      db.exec("select * from public.product_costs"),
    ).rejects.toThrow();
  } finally {
    await db.exec("reset role");
  }
});
it("honors the lowest active sale price and applies coupons afterwards", async () => {
  await db.exec("begin");
  try {
    await db.exec(`insert into public.promotions(id,name,headline,active) values('00000000-0000-4000-8000-000000000100','Sale','Sale',true),('00000000-0000-4000-8000-000000000101','Sale 2','Sale 2',true);
      insert into public.promotion_products(promotion_id,product_id,sale_price) values('00000000-0000-4000-8000-000000000100','${product}',8000),('00000000-0000-4000-8000-000000000101','${product}',7000);
      insert into public.coupons(code,discount_type,discount_value,minimum_amount) values('SAVE','percentage',10,0);`);
    const { rows } = await db.query<{
      value: { subtotal: number; discount: number; tax: { amount: number } };
    }>("select public.checkout_quote($1,'save',null) value", [items]);
    expect(rows[0].value.subtotal).toBe(7000);
    expect(rows[0].value.discount).toBe(700);
    expect(rows[0].value.tax.amount).toBe(472.5);
  } finally {
    await db.exec("rollback");
  }
});
it("reserves coupon capacity before payment and releases it on cancellation", async () => {
  await db.exec("begin");
  try {
    await db.exec(
      "insert into public.coupons(code,discount_type,discount_value,minimum_amount,usage_limit) values('ONE','fixed',100,0,1)",
    );
    const { rows } = await db.query<{ value: { reference: string } }>(
      "select public.create_checkout_payment_v3($1,$2,$3,$4,'ONE') value",
      [items, address, crypto.randomUUID(), "COUPON-" + crypto.randomUUID()],
    );
    const capacity = await db.query<{ used: number }>(
      "select count(*)::int used from public.coupon_reservations where status='reserved'",
    );
    expect(capacity.rows[0].used).toBe(1);
    await db.query("select public.settle_payment_v2($1,false,'{}')", [
      rows[0].value.reference,
    ]);
    const quote = await db.query<{ value: { discount: number } }>(
      "select public.checkout_quote($1,'ONE',null) value",
      [items],
    );
    expect(quote.rows[0].value.discount).toBe(100);
  } finally {
    await db.exec("rollback");
  }
});
it("distinguishes absent tax from an explicit zero rate and settles zero totals locally", async () => {
  await db.exec("begin");
  try {
    await db.exec("update public.tax_rules set active=false");
    let result = await db.query<{ value: { tax: unknown } }>(
      "select public.checkout_quote($1,null,null) value",
      [items],
    );
    expect(result.rows[0].value.tax).toBe(null);
    await db.exec("update public.tax_rules set rate=0,active=true");
    result = await db.query(
      "select public.checkout_quote($1,null,null) value",
      [items],
    );
    expect(result.rows[0].value.tax).toMatchObject({ rate: 0, amount: 0 });
    await db.exec(`update public.products set price=0 where id='${product}'`);
    const payment = await checkout();
    expect(Number(payment.amount)).toBe(0);
    const order = await db.query<{ status: string }>(
      "select status from public.orders where id=$1",
      [payment.orderId],
    );
    expect(order.rows[0].status).toBe("confirmed");
  } finally {
    await db.exec("rollback");
  }
});
it("supports stable catalog ranges beyond 1000 rows", async () => {
  await db.exec("begin");
  try {
    await db.exec(
      "insert into public.products(name,slug,sku,price) select 'Product '||n,'bulk-'||n,'BULK-'||n,n from generate_series(1,1005) n",
    );
    await db.exec("set role anon");
    const { rows } = await db.query(
      "select id from public.storefront_catalog order by price,id offset 1000 limit 12",
    );
    expect(rows.length).toBe(6);
    await db.exec("reset role");
  } finally {
    await db.exec("rollback");
  }
});
it("claims email work independently and leases prevent concurrent duplicate processing", async () => {
  const first = await db.query("select * from public.claim_email_jobs()");
  expect(first.rows.length).toBeGreaterThan(0);
  const second = await db.query("select * from public.claim_email_jobs()");
  expect(second.rows.length).toBe(0);
});
it("rolls back product edits when inventory validation fails", async () => {
  await db.exec("begin");
  try {
    await db.exec(`update public.profiles set role='admin' where id='${user}';
      insert into public.products(id,name,slug,sku,price) values('00000000-0000-4000-8000-000000000999','Atomic','atomic','ATOMIC',50);
      update public.inventory set quantity=10,reserved=5 where product_id='00000000-0000-4000-8000-000000000999';
      do $$ begin
        begin perform public.admin_save_product('00000000-0000-4000-8000-000000000999','{"price":99}', '{"quantity":0,"low_stock_threshold":5}');
        exception when check_violation then null; end;
      end $$;`);
    expect(
      Number(
        (
          await db.query<{ price: string }>(
            "select price from public.products where sku='ATOMIC'",
          )
        ).rows[0].price,
      ),
    ).toBe(50);
  } finally {
    await db.exec("rollback");
  }
});
it("rejects changed quotes before charging and keeps orders immutable", async () => {
  await expect(
    db.query("select public.create_checkout_payment_v3($1,$2,$3,$4,null,$5)", [
      items,
      address,
      crypto.randomUUID(),
      "STALE-" + crypto.randomUUID(),
      "invalid",
    ]),
  ).rejects.toThrow("prices changed");
  const payment = await checkout();
  await expect(
    db.query("update public.orders set total=1 where id=$1", [payment.orderId]),
  ).rejects.toThrow("order pricing is immutable");
});
it("saves address defaults atomically when validation fails", async () => {
  await db.exec("begin");
  try {
    await db.exec(`insert into public.addresses(id,user_id,label,recipient_name,phone,line1,city,state,country,is_default) values('00000000-0000-4000-8000-000000000777','${user}','Home','Test Buyer','08000000000','Street 123','Ile-Ife','Osun','Nigeria',true);
      do $$ begin begin perform public.save_customer_address('{"label":"New","recipient_name":"Test Buyer","phone":"08000000000","city":"Ile-Ife","state":"Osun","country":"Nigeria","is_default":true}'); exception when not_null_violation then null; end; end $$;`);
    expect(
      (
        await db.query<{ is_default: boolean }>(
          "select is_default from public.addresses where id='00000000-0000-4000-8000-000000000777'",
        )
      ).rows[0].is_default,
    ).toBe(true);
  } finally {
    await db.exec("rollback");
  }
});
