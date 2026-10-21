"use client";

import { phonePattern, validateContact, type ContactErrors, type ContactValue } from "../../domain/contact";
export { phonePattern, validateContact, type ContactErrors, type ContactValue };

/**
 * Nombre y teléfono con errores asociados (aria-invalid + aria-describedby).
 * Los identificadores son `${idPrefix}-name` y `${idPrefix}-phone` para poder
 * enfocar el primer campo con error.
 */
export function ContactInputs({
  value,
  onChange,
  errors = {},
  idPrefix,
}: {
  value: ContactValue;
  onChange: (value: ContactValue) => void;
  errors?: ContactErrors;
  idPrefix: string;
}) {
  const field = (
    key: keyof ContactValue,
    label: string,
    input: React.InputHTMLAttributes<HTMLInputElement>,
  ) => {
    const id = `${idPrefix}-${key}`;
    const error = errors[key];
    return (
      <div className="bk-field">
        <label htmlFor={id}>
          {label}
          <input
            id={id}
            name={key}
            required
            autoComplete={key === "name" ? "name" : key === "phone" ? "tel" : "email"}
            value={value[key] ?? ""}
            aria-invalid={error ? true : undefined}
            aria-describedby={error ? `${id}-error` : undefined}
            onChange={(event) => onChange({ ...value, [key]: event.target.value })}
            {...input}
          />
        </label>
        {error && (
          <p id={`${id}-error`} className="inline-error bk-field-error">
            {error}
          </p>
        )}
      </div>
    );
  };
  return (
    <div className="contact-fields">
      {field("name", "Nombre", {
        maxLength: 100,
        placeholder: "Nombre y apellido",
      })}
      {field("phone", "Teléfono", {
        type: "tel",
        inputMode: "tel",
        maxLength: 20,
        placeholder: "300 000 0000",
      })}
      {value.email !== undefined && field("email", "Correo electrónico", { type: "email", autoComplete: "email", maxLength: 254, placeholder: "tu@correo.com" })}
    </div>
  );
}
