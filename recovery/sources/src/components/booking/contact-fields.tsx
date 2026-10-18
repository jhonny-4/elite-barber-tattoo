"use client";

export type ContactValue = { name: string; phone: string };
export type ContactErrors = Partial<Record<keyof ContactValue, string>>;

/** Mismo patrón que valida el dominio (`addBooking`, `addTattooRequest`). */
export const phonePattern = /^[+\d\s()-]{7,20}$/;

export function validateContact(value: ContactValue): ContactErrors {
  const errors: ContactErrors = {};
  if (!value.name.trim()) errors.name = "Escribe un nombre para la solicitud.";
  else if (value.name.trim().length > 100)
    errors.name = "El nombre admite hasta 100 caracteres.";
  if (!value.phone.trim()) errors.phone = "Escribe un teléfono de contacto.";
  else if (!phonePattern.test(value.phone.trim()))
    errors.phone =
      "Usa de 7 a 20 caracteres: números, espacios, +, guiones o paréntesis.";
  return errors;
}

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
            autoComplete="off"
            value={value[key]}
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
    </div>
  );
}
