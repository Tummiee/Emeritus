"use client";

import Link from "next/link";
import { useActionState, useState } from "react";
import { AdminImageField } from "./AdminImageField";
import { FormFeedback } from "./FormFeedback";
import { saveEntity } from "@/lib/admin/entity-actions";
import {
  initialEntityFormState,
  type EntityFormState,
} from "@/lib/admin/entity-form-state";
import type { EntityConfig, EntityName, Field } from "@/lib/admin/entities";
export type OptionMap = Record<string, Array<{ label: string; value: string }>>;

function FormMessages({
  state,
  config,
}: {
  state: EntityFormState;
  config: EntityConfig;
}) {
  if (!state.message) return null;
  return (
    <FormFeedback
      error
      submission={state.submission}
      className="mb-5 rounded-xl bg-red-50 p-3 text-sm text-red-800"
    >
      <p>{state.message}</p>
      {Object.keys(state.fieldErrors).length > 0 && (
        <ul className="mt-2 list-disc pl-5">
          {Object.entries(state.fieldErrors).map(([name, errors]) => (
            <li key={name}>
              <strong>
                {config.fields.find((field) => field.name === name)?.label ??
                  "Form"}
                :
              </strong>{" "}
              {errors.join(" ")}
            </li>
          ))}
        </ul>
      )}
      {config.fields.some((field) => field.type === "image") && (
        <p className="mt-2">
          If you selected an image file, select it again before retrying.
          Entered text and image URLs have been kept.
        </p>
      )}
    </FormFeedback>
  );
}

function FieldInput({
  field,
  value,
  options,
  disabled,
  onChange,
  error,
  submission,
}: {
  field: Field;
  value: unknown;
  options: OptionMap;
  disabled?: boolean;
  onChange: (value: string | boolean) => void;
  error?: boolean;
  submission: number;
}) {
  const base =
    "mt-1.5 h-11 w-full rounded-xl border border-slate-200 bg-white px-3 text-sm outline-none focus:border-primary focus:ring-2 focus:ring-primary/15 disabled:bg-slate-100 disabled:text-slate-500 disabled:cursor-not-allowed";
  if (field.type === "image")
    return (
      <AdminImageField
        key={submission}
        name={field.name}
        aria-invalid={error || undefined}
        aria-describedby={error ? `${field.name}-error` : undefined}
        onUrlChange={onChange}
        invalid={error}
        initialUrl={String(value ?? "")}
        required={field.required && !disabled}
      />
    );
  if (field.type === "boolean")
    return (
      <label className="mt-3 flex items-center gap-2 text-sm text-slate-600">
        <input
          name={field.name}
          id={field.name}
          aria-invalid={error || undefined}
          aria-describedby={error ? `${field.name}-error` : undefined}
          type="checkbox"
          checked={Boolean(value)}
          onChange={(event) => onChange(event.target.checked)}
          disabled={disabled}
          className="size-4 accent-primary"
        />{" "}
        Enabled
      </label>
    );
  if (field.type === "textarea" || field.type === "json")
    return (
      <textarea
        name={field.name}
        id={field.name}
        aria-invalid={error || undefined}
        aria-describedby={error ? `${field.name}-error` : undefined}
        required={field.required && !disabled}
        disabled={disabled}
        rows={field.type === "json" ? 8 : 4}
        value={String(value ?? "")}
        onChange={(event) => onChange(event.target.value)}
        className={`${base} h-auto py-3 font-${field.type === "json" ? "mono" : "sans"}`}
      />
    );
  if (field.type === "select") {
    const items =
      field.options ??
      (field.optionSource ? options[field.optionSource] : []) ??
      [];
    return (
      <select
        name={field.name}
        id={field.name}
        aria-invalid={error || undefined}
        aria-describedby={error ? `${field.name}-error` : undefined}
        required={field.required && !disabled}
        disabled={disabled}
        value={String(value ?? "")}
        onChange={(event) => onChange(event.target.value)}
        className={base}
      >
        <option value="">Select…</option>
        {items.map((item) => (
          <option key={item.value} value={item.value}>
            {item.label}
          </option>
        ))}
      </select>
    );
  }
  const type =
    field.type === "number"
      ? "number"
      : field.type === "date"
        ? "date"
        : field.type === "datetime"
          ? "datetime-local"
          : "text";
  const normalized =
    field.type === "datetime" && value
      ? String(value).slice(0, 16)
      : String(value ?? "");
  return (
    <input
      name={field.name}
      id={field.name}
      aria-invalid={error || undefined}
      aria-describedby={error ? `${field.name}-error` : undefined}
      type={type}
      step={
        field.type === "number"
          ? ["display_order", "usage_limit", "rating"].includes(field.name)
            ? "1"
            : "0.01"
          : undefined
      }
      min={
        field.type === "number"
          ? ["rating", "usage_limit"].includes(field.name)
            ? 1
            : 0
          : undefined
      }
      max={field.name === "rating" ? 5 : undefined}
      required={field.required && !disabled}
      disabled={disabled}
      value={normalized}
      onChange={(event) => onChange(event.target.value)}
      className={base}
    />
  );
}

export function EntityForm({
  entity,
  config,
  editing,
  options,
}: {
  entity: EntityName;
  config: EntityConfig;
  editing?: Record<string, unknown>;
  options: OptionMap;
}) {
  const [state, formAction, pending] = useActionState(
    saveEntity,
    initialEntityFormState,
  );
  const [values, setValues] = useState<Record<string, unknown>>(() =>
    Object.fromEntries(
      config.fields.map((field) => {
        let value = editing?.[field.name];
        if (field.type === "json") value = JSON.stringify(value ?? {}, null, 2);
        else if (field.type === "boolean")
          value = value === undefined ? true : Boolean(value);
        else if (field.type === "datetime" && value)
          value = new Date(new Date(String(value)).getTime() + 60 * 60 * 1000)
            .toISOString()
            .slice(0, 16);
        return [field.name, value ?? ""];
      }),
    ),
  );
  return (
    <form
      action={formAction}
      encType="multipart/form-data"
      className="mt-6 rounded-2xl border border-slate-200 bg-white p-5 shadow-sm"
    >
      <FormMessages state={state} config={config} />
      <input type="hidden" name="entity" value={entity} />
      <input type="hidden" name="id" value={String(editing?.id ?? "")} />
      <div className="mb-5 flex items-center justify-between">
        <h2 className="text-lg font-semibold">
          {editing ? `Edit ${config.singular}` : `New ${config.singular}`}
        </h2>
        <Link href={`/admin/${entity}`} className="text-sm text-slate-500">
          Cancel
        </Link>
      </div>
      <div className="grid gap-4 md:grid-cols-2">
        {config.fields.map((field) => {
          const isFieldDisabled = Boolean(editing && field.readOnlyWhenEditing);
          return (
            <div
              key={field.name}
              className={
                field.type === "textarea" ||
                field.type === "json" ||
                field.type === "image"
                  ? "md:col-span-2 text-sm font-medium"
                  : "text-sm font-medium"
              }
            >
              <label htmlFor={field.name}>{field.label}</label>
              {field.required && !isFieldDisabled && (
                <span className="text-red-500"> *</span>
              )}
              <FieldInput
                field={field}
                value={values[field.name]}
                onChange={(value) =>
                  setValues((current) => ({ ...current, [field.name]: value }))
                }
                error={Boolean(state.fieldErrors[field.name])}
                submission={state.submission}
                options={options}
                disabled={isFieldDisabled}
              />
              {state.fieldErrors[field.name] && (
                <p
                  id={`${field.name}-error`}
                  className="mt-1 text-sm text-red-700"
                >
                  {state.fieldErrors[field.name].join(" ")}
                </p>
              )}
            </div>
          );
        })}
      </div>
      <button
        disabled={pending}
        className="disabled:opacity-50 mt-5 rounded-xl bg-primary px-5 py-2.5 text-sm font-semibold text-white"
      >
        {pending ? "Saving..." : "Save changes"}
      </button>
    </form>
  );
}
