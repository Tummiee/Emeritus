import { expect, it } from "vitest";
import { readFileSync, readdirSync } from "node:fs";
import { testDatabase } from "./database-test-setup";
it("the migration manifest excludes manual maintenance and contains every migration", () => {
  const files: string[] = JSON.parse(
    readFileSync("supabase/migration-manifest.json", "utf8"),
  );
  expect(files).toEqual(
    readdirSync("supabase/migrations")
      .filter((name) => name.endsWith(".sql"))
      .sort(),
  );
  expect(files.every((name) => /^\d+_/.test(name))).toBe(true);
});
it("upgrades existing data when optional legacy RPCs are missing", async () => {
  const db = await testDatabase(true);
  try {
    await db.exec(`insert into auth.users(id,email) values('00000000-0000-4000-8000-000000000001','test@example.test');
      insert into public.orders(id,user_id,subtotal,total,shipping_address) values('00000000-0000-4000-8000-000000000002','00000000-0000-4000-8000-000000000001',1000,1000,'{}');
      insert into public.payment_attempts(order_id,user_id,reference,amount) values('00000000-0000-4000-8000-000000000002','00000000-0000-4000-8000-000000000001','HISTORICAL',1);
      insert into public.categories(id,name,slug) values('00000000-0000-4000-8000-000000000011','Migration category','migration-category');
      insert into public.brands(id,name,slug) values('00000000-0000-4000-8000-000000000012','Migration brand','migration-brand');
      insert into public.products(id,name,slug,sku,price,cost_price,category_id,brand_id) values('00000000-0000-4000-8000-000000000010','Existing product','existing_product','MIGRATION-EXISTING',12345.67,4321.09,'00000000-0000-4000-8000-000000000011','00000000-0000-4000-8000-000000000012');
      update public.inventory set quantity=25,reserved=3 where product_id='00000000-0000-4000-8000-000000000010';
      do $$ declare routine regprocedure; begin
        for routine in select p.oid::regprocedure from pg_proc p join pg_namespace n on n.oid=p.pronamespace
          where n.nspname='public' and p.proname in ('create_checkout_order','create_checkout_payment','create_checkout_payment_v2','admin_delete_all_products','settle_payment') and p.prokind='f'
        loop execute format('drop function %s',routine); end loop;
      end $$;
      alter table public.profiles drop constraint profiles_role_check;
      drop policy "customers create own repairs" on public.repair_requests;`);
    const files: string[] = JSON.parse(
      readFileSync("supabase/migration-manifest.json", "utf8"),
    );
    await db.exec("set check_function_bodies=on");
    for (const file of files.filter((name) => name.startsWith("202610")))
      await db.exec(readFileSync(`supabase/migrations/${file}`, "utf8"));
    expect(
      (
        await db.query(
          "select * from public.payment_reconciliation where reference='HISTORICAL'",
        )
      ).rows.length,
    ).toBe(1);
    expect(
      (await db.query<{ total: string }>("select total from public.orders"))
        .rows[0].total,
    ).toBe("1000.00");
    const catalog = await db.query(`select p.name,p.slug,p.price,c.cost_price,
      category.name category,brand.name brand,i.quantity,i.reserved
      from public.products p join public.product_costs c on c.product_id=p.id
      join public.categories category on category.id=p.category_id
      join public.brands brand on brand.id=p.brand_id
      join public.inventory i on i.product_id=p.id
      where p.id='00000000-0000-4000-8000-000000000010'`);
    expect(catalog.rows).toEqual([
      {
        name: "Existing product",
        slug: "existing_product",
        price: "12345.67",
        cost_price: "4321.09",
        category: "Migration category",
        brand: "Migration brand",
        quantity: 25,
        reserved: 3,
      },
    ]);
    const privileges = await db.query(`select
      has_function_privilege('authenticated','public.create_checkout_order(jsonb,jsonb,text)','EXECUTE') standalone,
      has_function_privilege('authenticated','public.settle_payment(text,boolean,jsonb)','EXECUTE') settlement,
      has_function_privilege('authenticated','public.create_checkout_payment_v3(jsonb,jsonb,uuid,text,text,text,text)','EXECUTE') checkout`);
    expect(privileges.rows).toEqual([
      { standalone: false, settlement: false, checkout: true },
    ]);
  } finally {
    await db.close();
  }
}, 60000);
