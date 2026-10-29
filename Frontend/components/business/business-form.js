"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input, Textarea } from "@/components/ui/form";
import { Alert } from "@/components/ui/feedback";
import { isHttpUrl } from "@/lib/post-rules";
import { ApiError, getErrorMessage } from "@/lib/api/client";

const CATEGORY_SUGGESTIONS = [
  "Restaurant", "Café", "Salon & Spa", "Fitness & Wellness", "Retail", "Education", "Healthcare",
  "Real Estate", "Professional Services", "Home Services", "Hospitality", "Automotive",
];

const emptyValues = {
  name: "", category: "", description: "", address: "", phone: "", website: "", logoUrl: "",
};

export function toFormValues(business) {
  if (!business) return emptyValues;
  return Object.fromEntries(Object.keys(emptyValues).map((k) => [k, business[k] || ""]));
}

function validate(values) {
  const errors = {};
  if (!values.name.trim()) errors.name = "Business name is required.";
  if (values.website.trim() && !isHttpUrl(values.website.trim())) {
    errors.website = "Enter a full URL starting with http:// or https://";
  }
  if (values.logoUrl.trim() && !isHttpUrl(values.logoUrl.trim())) {
    errors.logoUrl = "Enter a full URL starting with http:// or https://";
  }
  if (values.phone.trim() && !/^[+\d][\d\s().-]{5,}$/.test(values.phone.trim())) {
    errors.phone = "Enter a valid phone number.";
  }
  return errors;
}

export function BusinessForm({ initial, submitLabel = "Save business", onSubmit, onCancel }) {
  const [values, setValues] = useState(() => toFormValues(initial));
  const [errors, setErrors] = useState({});
  const [formError, setFormError] = useState(null);
  const [saving, setSaving] = useState(false);

  const set = (key) => (e) => setValues((v) => ({ ...v, [key]: e.target.value }));

  async function handleSubmit(e) {
    e.preventDefault();
    const found = validate(values);
    setErrors(found);
    setFormError(null);
    if (Object.keys(found).length) return;

    // Empty optional fields become null, matching the model defaults.
    const payload = Object.fromEntries(
      Object.entries(values).map(([k, v]) => [k, v.trim() === "" ? null : v.trim()])
    );
    payload.name = values.name.trim();

    setSaving(true);
    try {
      await onSubmit(payload);
    } catch (err) {
      const backendErrors = err instanceof ApiError ? err.errors : [];
      setFormError(
        backendErrors.length
          ? `${getErrorMessage(err)} ${backendErrors.map((x) => x.message || x).join("; ")}`
          : getErrorMessage(err, "Couldn't save the business.")
      );
      setSaving(false);
      return;
    }
    setSaving(false);
  }

  return (
    <form onSubmit={handleSubmit} noValidate className="space-y-5">
      {formError && <Alert tone="danger" title="Couldn't save">{formError}</Alert>}

      <Input label="Business name" required value={values.name} onChange={set("name")} error={errors.name} maxLength={120} autoComplete="organization" />

      <div>
        <Input label="Category" list="category-suggestions" value={values.category} onChange={set("category")} hint="Helps the AI tailor content to your industry." maxLength={80} />
        <datalist id="category-suggestions">
          {CATEGORY_SUGGESTIONS.map((c) => <option key={c} value={c} />)}
        </datalist>
      </div>

      <Textarea label="Description" rows={4} value={values.description} onChange={set("description")} hint="What you offer, who you serve, what makes you different. The AI and audit use this." maxLength={1000} />
      <Input label="Address" value={values.address} onChange={set("address")} autoComplete="street-address" />

      <div className="grid gap-5 sm:grid-cols-2">
        <Input label="Phone" type="tel" value={values.phone} onChange={set("phone")} error={errors.phone} autoComplete="tel" />
        <Input label="Website" type="url" inputMode="url" placeholder="https://" value={values.website} onChange={set("website")} error={errors.website} />
      </div>

      <Input label="Logo URL" type="url" inputMode="url" placeholder="https://" value={values.logoUrl} onChange={set("logoUrl")} error={errors.logoUrl} hint="A link to a hosted image. File upload isn't available yet." />

      <div className="flex justify-end gap-2 pt-2">
        {onCancel && <Button variant="secondary" onClick={onCancel} disabled={saving}>Cancel</Button>}
        <Button type="submit" loading={saving}>{submitLabel}</Button>
      </div>
    </form>
  );
}
