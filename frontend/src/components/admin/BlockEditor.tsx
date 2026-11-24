"use client";

import { useMemo, useState, useTransition } from "react";
import { ActionNotice, type Notice } from "@/components/admin/ActionNotice";
import { BlockPreview } from "@/components/admin/BlockPreview";
import { MediaPicker } from "@/components/admin/MediaPicker";
import type { BlockData, BlockDetail, Media } from "@/lib/admin-types";
import { emptyItem, withDraft, type BlockSpec, type LeafField, type ListField } from "@/lib/block-specs";
import { discardDraft, publishDraft, saveDraft, type ActionResult } from "@/lib/content-actions";
import type { SiteContent } from "@/lib/site-content";

type BlockEditorProps = { spec: BlockSpec; block: BlockDetail; images: readonly Media[]; current: SiteContent; initial: BlockData };
type Row = Record<string, unknown>;

const text = (value: unknown) => (typeof value === "string" ? value : "");
const singleLine = (value: string) => value.replace(/\s*[\r\n\t]+\s*/g, " ");

/** Turns the service's field path, such as data.photos.0.media_id, into the label a person sees on the form. */
function locate(spec: BlockSpec, path: string): string {
  const [name, index, child] = path.replace(/^data\./, "").split(".");
  const field = spec.fields.find((candidate) => candidate.name === name);
  if (!field) return spec.label;
  if (field.kind !== "list" || index === undefined) return field.label;
  const leaf = field.fields.find((candidate) => candidate.name === child);
  return `${field.label}, ${field.item} ${Number(index) + 1}${leaf ? `, ${leaf.label.toLowerCase()}` : ""}`;
}
const list = (value: unknown): Row[] => (Array.isArray(value) ? (value as Row[]) : []);

export function BlockEditor({ spec, block, images, current, initial }: BlockEditorProps) {
  const [data, setData] = useState<BlockData>(initial);
  const [version, setVersion] = useState(block.version);
  const [hasDraft, setHasDraft] = useState(block.draft !== null);
  const [dirty, setDirty] = useState(false);
  const [notice, setNotice] = useState<Notice>(null);
  const [pending, startTransition] = useTransition();
  const library = useMemo(() => new Map(images.map((media) => [media.id, media])), [images]);

  const change = (next: BlockData) => {
    setData(next);
    setDirty(true);
    setNotice(null);
  };
  const setField = (name: string, value: unknown) => change({ ...data, [name]: value });

  const settle = (result: ActionResult<BlockDetail>, message: string) => {
    if (!result.ok) {
      setNotice({
        tone: "error",
        message: result.conflict ? result.message : "Some entries need attention.",
        fieldErrors: result.conflict ? [] : result.fieldErrors.map((error) => ({ ...error, message: `${locate(spec, error.field)}: ${error.message}` })),
      });
      return null;
    }
    setVersion(result.value.version);
    setHasDraft(result.value.draft !== null);
    setNotice({ tone: "ok", message });
    return result.value;
  };

  const save = () =>
    startTransition(async () => {
      if (settle(await saveDraft(spec.key, data, version), "Draft saved. The public site has not changed.")) setDirty(false);
    });

  const publish = () =>
    startTransition(async () => {
      let latest = version;
      if (dirty) {
        const saved = settle(await saveDraft(spec.key, data, version), "Draft saved.");
        if (!saved) return;
        latest = saved.version;
        setDirty(false);
      }
      settle(await publishDraft(spec.key, latest), "Published. The public site now shows this version.");
    });

  const discard = () =>
    startTransition(async () => {
      const discarded = settle(await discardDraft(spec.key, version), "Draft discarded.");
      if (discarded) {
        setData(discarded.published ?? initial);
        setDirty(false);
      }
    });

  const leaf = (field: LeafField, value: unknown, onChange: (value: string) => void, id: string) =>
    field.kind === "image" ? (
      <MediaPicker key={field.name} label={field.label} options={images} value={text(value)} onChange={onChange} />
    ) : (
      <label key={field.name} className="form-field" htmlFor={id}>
        <span className="form-field__label">
          {field.label}
          {field.required ? null : <span className="form-field__optional">Optional</span>}
        </span>
        {field.kind === "textarea" ? (
          <textarea id={id} className="form-control" rows={4} maxLength={field.max} value={text(value)} onChange={(event) => onChange(singleLine(event.target.value))} />
        ) : (
          <input id={id} className="form-control" type="text" maxLength={field.max} value={text(value)} onChange={(event) => onChange(event.target.value)} />
        )}
        <span className="form-field__hint">
          {text(value).length} of {field.max}
        </span>
      </label>
    );

  const group = (field: ListField) => {
    const items = list(data[field.name]);
    const update = (next: Row[]) => setField(field.name, next);
    const move = (from: number, to: number) => {
      const next = [...items];
      next.splice(to, 0, ...next.splice(from, 1));
      update(next);
    };
    return (
      <fieldset key={field.name} className="field-list">
        <legend className="field-list__legend">{field.label}</legend>
        {items.length === 0 ? <p className="form-field__hint">Nothing here yet.</p> : null}
        <ol className="field-list__items">
          {items.map((item, index) => (
            <li key={index} className="field-list__item">
              <div className="field-list__fields">
                {field.fields.map((child) =>
                  leaf(
                    child,
                    item[child.name],
                    (value) => update(items.map((row, at) => (at === index ? { ...row, [child.name]: value } : row))),
                    `${spec.key}-${field.name}-${index}-${child.name}`,
                  ),
                )}
              </div>
              <div className="field-list__tools">
                <button type="button" className="text-button" disabled={index === 0} onClick={() => move(index, index - 1)}>
                  Move up
                </button>
                <button type="button" className="text-button" disabled={index === items.length - 1} onClick={() => move(index, index + 1)}>
                  Move down
                </button>
                <button type="button" className="text-button text-button--danger" disabled={items.length <= field.min} onClick={() => update(items.filter((_, at) => at !== index))}>
                  Remove
                </button>
              </div>
            </li>
          ))}
        </ol>
        <button type="button" className="button button--secondary" disabled={items.length >= field.max} onClick={() => update([...items, emptyItem(field)])}>
          Add a {field.item}
        </button>
      </fieldset>
    );
  };

  return (
    <div className="block-editor">
      <div className="block-editor__bar">
        <span className={`status-badge ${hasDraft || dirty ? "status-badge--draft" : "status-badge--live"}`}>
          {dirty ? "Unsaved changes" : hasDraft ? "Draft, not live" : "Published"}
        </span>
        <div className="block-editor__actions">
          {hasDraft ? (
            <button type="button" className="text-button" disabled={pending} onClick={discard}>
              Discard draft
            </button>
          ) : null}
          <button type="button" className="button button--secondary" disabled={pending || !dirty} onClick={save}>
            Save draft
          </button>
          <button type="button" className="button button--primary" disabled={pending || !(dirty || hasDraft)} onClick={publish}>
            Publish
          </button>
        </div>
      </div>
      <ActionNotice notice={notice} />
      <div className="block-editor__body">
        <form className="block-editor__form" onSubmit={(event) => event.preventDefault()}>
          {spec.fields.map((field) =>
            field.kind === "list" ? group(field) : leaf(field, data[field.name], (value) => setField(field.name, value), `${spec.key}-${field.name}`),
          )}
        </form>
        <BlockPreview blockKey={spec.key} content={withDraft(current, spec.key, data, library)} />
      </div>
    </div>
  );
}
