"use client";
import { useEffect, useId, useMemo, useRef, useState } from "react";
import { Icon } from "../icons";
import { ConfirmAction } from "../confirm-action";
import { HoverTilt } from "../motion/hover-tilt";
import { VIDEO_MAX_BYTES, PHOTO_MAX_BYTES, checkAlt, type MediaView } from "../../domain/gallery";
import { panelFetch, usePanelData } from "./panel-api";
import { EmptyState, StatusBadge } from "./ui";

type Barber = { id: string; slug: string; name: string };
type Payload = { items: MediaView[]; barbers: Barber[]; me: string | null; videos: boolean };
type Note = { tone: "ok" | "alert"; text: string } | null;

/** Un fotograma del video como WebP/JPEG; null si el navegador no puede (códec no soportado, etc.). */
async function posterFrom(file: File): Promise<Blob | null> {
  const url = URL.createObjectURL(file);
  try {
    const video = document.createElement("video");
    video.muted = true;
    video.playsInline = true;
    video.preload = "metadata";
    video.src = url;
    await new Promise<void>((resolve, reject) => {
      video.onloadedmetadata = () => resolve();
      video.onerror = () => reject(new Error("video"));
      setTimeout(() => reject(new Error("timeout")), 8000);
    });
    await new Promise<void>((resolve, reject) => {
      video.onseeked = () => resolve();
      video.onerror = () => reject(new Error("video"));
      setTimeout(() => reject(new Error("timeout")), 8000);
      video.currentTime = Math.min(1, (video.duration || 2) / 2);
    });
    const scale = Math.min(1, 1280 / Math.max(video.videoWidth, video.videoHeight));
    const canvas = document.createElement("canvas");
    canvas.width = Math.round(video.videoWidth * scale);
    canvas.height = Math.round(video.videoHeight * scale);
    canvas.getContext("2d")?.drawImage(video, 0, 0, canvas.width, canvas.height);
    return await new Promise<Blob | null>((resolve) => canvas.toBlob(resolve, "image/webp", 0.82));
  } catch {
    return null;
  } finally {
    URL.revokeObjectURL(url);
  }
}

/** PUT directo a R2 con progreso (fetch no informa del avance de subida). */
function putWithProgress(url: string, file: File, contentType: string, onProgress: (ratio: number) => void) {
  return new Promise<void>((resolve, reject) => {
    const xhr = new XMLHttpRequest();
    xhr.open("PUT", url);
    xhr.setRequestHeader("Content-Type", contentType);
    xhr.upload.onprogress = (e) => e.lengthComputable && onProgress(e.loaded / e.total);
    xhr.onload = () => (xhr.status >= 200 && xhr.status < 300 ? resolve() : reject(new Error(`El almacenamiento rechazó la subida (${xhr.status}).`)));
    // Un error de red sin respuesta casi siempre es CORS del bucket sin configurar para este origen.
    xhr.onerror = () => reject(new Error("No se pudo subir el video. Si persiste, el almacenamiento aún no permite subidas desde este sitio (CORS)."));
    xhr.send(file);
  });
}

function UploadForm({ barbers, me, videos, onDone }: { barbers: Barber[]; me: string | null; videos: boolean; onDone: () => void }) {
  const id = useId();
  const [barberId, setBarberId] = useState(me ?? barbers[0]?.id ?? "");
  const [file, setFile] = useState<File | null>(null);
  const [alt, setAlt] = useState("");
  const [title, setTitle] = useState("");
  const [progress, setProgress] = useState<number | null>(null);
  const [note, setNote] = useState<Note>(null);
  const input = useRef<HTMLInputElement>(null);
  const busy = progress !== null;
  const isVideo = file?.type.startsWith("video/") ?? false;

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setNote(null);
    if (!file) return setNote({ tone: "alert", text: "Elige una foto o un video." });
    const altError = checkAlt(alt);
    if (altError) return setNote({ tone: "alert", text: altError });
    if (isVideo && !videos) return setNote({ tone: "alert", text: "Los videos aún no están disponibles en este entorno." });
    if (isVideo ? file.size > VIDEO_MAX_BYTES : file.size > PHOTO_MAX_BYTES)
      return setNote({ tone: "alert", text: isVideo ? "El video supera 80 MB." : "La foto supera 8 MB." });
    setProgress(0);
    try {
      if (isVideo) {
        const signed = await panelFetch<{ key: string; uploadUrl: string }>("/api/panel/galeria/video/firmar", {
          method: "POST",
          body: { barberId, contentType: file.type, size: file.size },
        });
        await putWithProgress(signed.uploadUrl, file, file.type, setProgress);
        const created = await panelFetch<{ id: string }>("/api/panel/galeria/video", { method: "POST", body: { key: signed.key, alt, title } });
        const poster = await posterFrom(file);
        if (poster) {
          const form = new FormData();
          form.set("id", created.id);
          form.set("file", poster, "poster.webp");
          // El póster es opcional: si falla, el video queda igualmente registrado.
          await fetch("/api/panel/galeria/video/poster", { method: "POST", body: form }).catch(() => undefined);
        }
      } else {
        const form = new FormData();
        form.set("barberId", barberId);
        form.set("alt", alt);
        form.set("title", title);
        form.set("file", file);
        const response = await fetch("/api/panel/galeria/foto", { method: "POST", body: form });
        const data = await response.json().catch(() => ({}));
        if (!response.ok) throw new Error((data as { error?: string }).error ?? "No se pudo subir la foto.");
      }
      setNote({ tone: "ok", text: "Subido. Queda pendiente hasta que el dueño lo apruebe." });
      setFile(null);
      setAlt("");
      setTitle("");
      if (input.current) input.current.value = "";
      onDone();
    } catch (err) {
      setNote({ tone: "alert", text: err instanceof Error ? err.message : "No se pudo subir." });
    } finally {
      setProgress(null);
    }
  }

  return (
    <form className="gal-upload" onSubmit={submit} noValidate>
      {barbers.length > 1 ? (
        <label>
          Barbero
          <select value={barberId} onChange={(e) => setBarberId(e.target.value)} disabled={busy}>
            {barbers.map((b) => (
              <option key={b.id} value={b.id}>
                {b.name}
              </option>
            ))}
          </select>
        </label>
      ) : null}
      <label>
        Foto o video
        <input ref={input} type="file" accept={videos ? "image/jpeg,image/png,image/webp,image/heic,video/mp4,video/webm" : "image/jpeg,image/png,image/webp,image/heic"} disabled={busy} onChange={(e) => setFile(e.target.files?.[0] ?? null)} />
        <small>Fotos hasta 8 MB, videos MP4 o WebM hasta 80 MB.</small>
      </label>
      <label>
        Descripción (obligatoria)
        <input type="text" value={alt} maxLength={200} disabled={busy} onChange={(e) => setAlt(e.target.value)} aria-describedby={`${id}-n`} placeholder="Ej.: Degradado bajo con barba perfilada" />
      </label>
      <label>
        Título (opcional)
        <input type="text" value={title} maxLength={80} disabled={busy} onChange={(e) => setTitle(e.target.value)} />
      </label>
      <button type="submit" className="button button-accent button-small" disabled={busy} aria-busy={busy || undefined}>
        <Icon name="upload" />
        {busy ? (isVideo ? `Subiendo ${Math.round((progress ?? 0) * 100)} %` : "Subiendo…") : "Subir para aprobación"}
      </button>
      {busy && isVideo ? <progress value={progress ?? 0} max={1} aria-label="Avance de la subida" /> : null}
      <p id={`${id}-n`} className="pnl-note" data-tone={note?.tone} role={note?.tone === "alert" ? "alert" : "status"} hidden={!note}>
        {note ? <Icon name={note.tone === "ok" ? "check" : "alert"} /> : null}
        {note?.text}
      </p>
    </form>
  );
}

function Thumb({ item }: { item: MediaView }) {
  const src = item.kind === "foto" ? item.url : item.posterUrl;
  const ratio = item.width && item.height ? `${item.width} / ${item.height}` : "4 / 5";
  return (
    <span className="gal-thumb" style={{ aspectRatio: ratio }}>
      {src ? (
        <img src={src} alt={item.alt} width={item.width ?? undefined} height={item.height ?? undefined} loading="lazy" decoding="async" />
      ) : (
        <span className="gal-thumb-empty" aria-hidden="true">
          <Icon name="image" />
        </span>
      )}
      {item.kind === "video" ? (
        <span className="gal-play" aria-hidden="true">
          <Icon name="play" />
        </span>
      ) : null}
    </span>
  );
}

function Card({ item, owner, canMoveUp, canMoveDown, act }: { item: MediaView; owner: boolean; canMoveUp: boolean; canMoveDown: boolean; act: (id: string, method: "PATCH" | "DELETE", body?: Record<string, unknown>, ok?: string) => Promise<void> }) {
  const [editing, setEditing] = useState(false);
  const [alt, setAlt] = useState(item.alt);
  const [title, setTitle] = useState(item.title ?? "");
  const [busy, setBusy] = useState(false);
  const run = async (fn: () => Promise<void>) => {
    setBusy(true);
    try {
      await fn();
    } finally {
      setBusy(false);
    }
  };
  return (
    <li className="gal-card home-tilt" data-tilt="5">
      <span className="home-glare" aria-hidden="true" />
      <Thumb item={item} />
      <div className="gal-card-body">
        <div className="gal-card-top">
          <StatusBadge tone={item.published ? "ok" : "pending"}>{item.published ? "Publicado" : "Pendiente"}</StatusBadge>
          <span className="gal-kind">{item.kind === "video" ? "Video" : "Foto"}</span>
        </div>
        {editing ? (
          <form
            className="gal-edit"
            onSubmit={(e) => {
              e.preventDefault();
              void run(async () => {
                await act(item.id, "PATCH", { action: "editar", alt, title }, "Texto actualizado.");
                setEditing(false);
              });
            }}
          >
            <label>
              Descripción
              <input value={alt} maxLength={200} onChange={(e) => setAlt(e.target.value)} />
            </label>
            <label>
              Título
              <input value={title} maxLength={80} onChange={(e) => setTitle(e.target.value)} />
            </label>
            <div className="gal-actions">
              <button type="submit" className="button button-small" disabled={busy}>
                Guardar
              </button>
              <button type="button" className="button button-outline button-small" onClick={() => setEditing(false)}>
                Cancelar
              </button>
            </div>
          </form>
        ) : (
          <>
            <strong className="gal-title">{item.title ?? "Sin título"}</strong>
            <p className="gal-alt">{item.alt}</p>
          </>
        )}
        {!editing ? (
          <div className="gal-actions">
            {owner && !item.published ? (
              <button type="button" className="button button-accent button-small" disabled={busy} onClick={() => void run(() => act(item.id, "PATCH", { action: "aprobar" }, "Publicado en la galería del barbero."))}>
                <Icon name="check" />
                Aprobar
              </button>
            ) : null}
            {owner ? (
              <button type="button" className="button button-outline button-small" onClick={() => setEditing(true)}>
                Editar
              </button>
            ) : null}
            {owner && item.published ? (
              <>
                <button type="button" className="icon-button gal-move" aria-label="Subir una posición" disabled={busy || !canMoveUp} onClick={() => void run(() => act(item.id, "PATCH", { action: "subir" }))}>
                  <Icon name="chevron" style={{ transform: "rotate(-90deg)" }} />
                </button>
                <button type="button" className="icon-button gal-move" aria-label="Bajar una posición" disabled={busy || !canMoveDown} onClick={() => void run(() => act(item.id, "PATCH", { action: "bajar" }))}>
                  <Icon name="chevron" style={{ transform: "rotate(90deg)" }} />
                </button>
              </>
            ) : null}
            {owner || !item.published ? (
              <ConfirmAction
                title={item.published ? "¿Eliminar de la galería?" : owner ? "¿Rechazar este trabajo?" : "¿Borrar este trabajo?"}
                description="El archivo se borra de forma definitiva."
                confirmLabel="Sí, borrar"
                busy={busy}
                onConfirm={() => run(() => act(item.id, "DELETE", undefined, "Eliminado."))}
              >
                {item.published ? "Eliminar" : owner ? "Rechazar" : "Borrar"}
              </ConfirmAction>
            ) : null}
          </div>
        ) : null}
      </div>
    </li>
  );
}

/**
 * Galería de trabajos. `owner`: dueño, aprueba, edita, ordena y borra todo. Si no, es «Mi galería»
 * del barbero: sube y ve el estado de lo suyo, y borra solo lo pendiente. El servidor repite
 * cada comprobación de permisos.
 */
export function GalleryManager({ owner }: { owner: boolean }) {
  const { data, loading, error, reload } = usePanelData<Payload>("/api/panel/galeria");
  const [note, setNote] = useState<Note>(null);
  const [filter, setFilter] = useState("todos");
  const items = useMemo(() => data?.items ?? [], [data]);
  const names = new Map((data?.barbers ?? []).map((b) => [b.id, b.name]));

  async function act(id: string, method: "PATCH" | "DELETE", body?: Record<string, unknown>, ok?: string) {
    try {
      await panelFetch(`/api/panel/galeria/${id}`, { method, body });
      if (ok) setNote({ tone: "ok", text: ok });
      await reload();
    } catch (e) {
      setNote({ tone: "alert", text: e instanceof Error ? e.message : "No se pudo completar la operación." });
    }
  }

  // Las tarjetas llegan por red después del montaje: se reengancha la inclinación al cambiar la lista.
  const [tiltKey, setTiltKey] = useState(0);
  useEffect(() => setTiltKey((k) => k + 1), [items.length, filter]);

  const visible = owner && filter !== "todos" ? items.filter((i) => i.barberId === filter) : items;
  const pending = visible.filter((i) => !i.published);
  const published = visible.filter((i) => i.published);
  const groups = (list: MediaView[]) => {
    const map = new Map<string, MediaView[]>();
    for (const item of list) map.set(item.barberId, [...(map.get(item.barberId) ?? []), item]);
    return [...map.entries()];
  };

  return (
    <div className="gal-panel">
      <HoverTilt key={tiltKey} />
      <section className="surface adm-card" aria-labelledby="gal-up">
        <div className="adm-block-head">
          <h2 id="gal-up">
            <Icon name="upload" />
            {owner ? "Subir trabajo" : "Subir a mi galería"}
          </h2>
        </div>
        {data ? <UploadForm barbers={data.barbers} me={data.me} videos={data.videos} onDone={() => void reload()} /> : null}
        {!owner ? <p className="adm-quiet">Lo que subas queda como Pendiente hasta que el dueño lo apruebe; luego los clientes lo ven al elegirte.</p> : null}
        {data && !data.videos ? <p className="adm-quiet">Los videos no están disponibles en este entorno (falta configurar el almacenamiento).</p> : null}
      </section>

      {note ? (
        <p className="pnl-note" data-tone={note.tone} role={note.tone === "alert" ? "alert" : "status"}>
          <Icon name={note.tone === "ok" ? "check" : "alert"} />
          {note.text}
        </p>
      ) : null}
      {loading && !data ? <p className="loading-state">Cargando galería…</p> : null}
      {error ? (
        <p className="pnl-note" data-tone="alert" role="alert">
          <Icon name="alert" />
          {error}
          <button type="button" className="text-link" onClick={() => void reload()}>
            Reintentar
          </button>
        </p>
      ) : null}

      {owner && data && data.barbers.length > 1 ? (
        <label className="gal-filter">
          Barbero
          <select value={filter} onChange={(e) => setFilter(e.target.value)}>
            <option value="todos">Todos</option>
            {data.barbers.map((b) => (
              <option key={b.id} value={b.id}>
                {b.name}
              </option>
            ))}
          </select>
        </label>
      ) : null}

      {data && !items.length ? (
        <EmptyState icon="image" title="Aún no hay trabajos" text={owner ? "Cuando el equipo suba fotos o videos, aparecerán aquí para aprobarlos." : "Sube tu primera foto o video de un corte."} />
      ) : null}

      {data && items.length ? (
        <>
          <section className="surface adm-card" aria-labelledby="gal-pend">
            <div className="adm-block-head">
              <h2 id="gal-pend">{owner ? "Por aprobar" : "Pendientes"}</h2>
              <StatusBadge tone={pending.length ? "pending" : "muted"}>{pending.length}</StatusBadge>
            </div>
            {pending.length ? (
              <ul className="gal-grid">
                {pending.map((item) => (
                  <Card key={item.id} item={item} owner={owner} canMoveUp={false} canMoveDown={false} act={act} />
                ))}
              </ul>
            ) : (
              <p className="adm-quiet">Nada pendiente.</p>
            )}
          </section>
          <section className="surface adm-card" aria-labelledby="gal-pub">
            <div className="adm-block-head">
              <h2 id="gal-pub">Publicadas</h2>
              <StatusBadge tone={published.length ? "ok" : "muted"}>{published.length}</StatusBadge>
            </div>
            {published.length ? (
              groups(published).map(([barberId, list]) => (
                <div key={barberId} className="gal-group">
                  {owner ? <h3 className="gal-group-title">{names.get(barberId) ?? "Barbero"}</h3> : null}
                  <ul className="gal-grid">
                    {list.map((item, i) => (
                      <Card key={item.id} item={item} owner={owner} canMoveUp={i > 0} canMoveDown={i < list.length - 1} act={act} />
                    ))}
                  </ul>
                </div>
              ))
            ) : (
              <p className="adm-quiet">Todavía no hay trabajos publicados.</p>
            )}
          </section>
        </>
      ) : null}
    </div>
  );
}
