import type { Photo } from "@/content/institute";
import type { BlockData, Media } from "@/lib/admin-types";
import type { BlockKey, SiteContent } from "@/lib/site-content";

export type TextField = { kind: "text" | "textarea"; name: string; label: string; max: number; required: boolean };
export type ImageField = { kind: "image"; name: string; label: string };
export type LeafField = TextField | ImageField;
export type ListField = { kind: "list"; name: string; label: string; item: string; min: number; max: number; fields: LeafField[] };
export type Field = LeafField | ListField;

export type BlockSpec = { key: BlockKey; label: string; pages: string; editable: string; fields: Field[] };

const text = (name: string, label: string, max: number, required = true): TextField => ({ kind: "text", name, label, max, required });
const long = (name: string, label: string, max: number, required = true): TextField => ({ kind: "textarea", name, label, max, required });
const image = (name: string, label: string): ImageField => ({ kind: "image", name, label });

export const blockSpecs: readonly BlockSpec[] = [
  {
    key: "success_stories",
    label: "Success stories",
    pages: "Home, For organisations",
    editable: "Photos and introduction",
    fields: [
      long("lede", "Introduction", 300),
      { kind: "list", name: "photos", label: "Photos, in order", item: "photo", min: 1, max: 8, fields: [image("media_id", "Photo")] },
    ],
  },
  {
    key: "client_logos",
    label: "Client logos",
    pages: "Home, For organisations",
    editable: "Logos and names",
    fields: [
      {
        kind: "list",
        name: "clients",
        label: "Clients, in order",
        item: "client",
        min: 0,
        max: 12,
        fields: [text("name", "Client name", 80), image("media_id", "Logo")],
      },
    ],
  },
  {
    key: "founder",
    label: "Founder profile",
    pages: "Home, The Institute",
    editable: "Photo and text",
    fields: [
      text("name", "Name", 80),
      text("short_name", "Short name", 20, false),
      text("title", "Title", 120),
      long("role", "Role", 600),
      long("feature", "Press feature", 400, false),
      image("portrait_media_id", "Portrait"),
    ],
  },
  {
    key: "stewards",
    label: "Stewards",
    pages: "Home, The Institute",
    editable: "Heading and text",
    fields: [text("title", "Heading", 120), long("body", "Text", 800)],
  },
  {
    key: "platforms",
    label: "Where the Institute convenes",
    pages: "Home, The Institute",
    editable: "Photos and text",
    fields: [
      {
        kind: "list",
        name: "items",
        label: "Platforms, in order",
        item: "platform",
        min: 1,
        max: 6,
        fields: [text("name", "Name", 80), long("body", "Description", 400), image("media_id", "Photo")],
      },
    ],
  },
  {
    key: "patron",
    label: "Patron quote",
    pages: "The Institute",
    editable: "Photo and quote",
    fields: [text("name", "Name", 80), text("role", "Role", 80), long("quote", "Quote", 400), image("media_id", "Photo")],
  },
];

export const findBlockSpec = (key: string) => blockSpecs.find((spec) => spec.key === key);

export function emptyBlock(spec: BlockSpec): BlockData {
  return Object.fromEntries(spec.fields.map((field) => [field.name, field.kind === "list" ? [] : ""]));
}

export const emptyItem = (field: ListField): BlockData => Object.fromEntries(field.fields.map((leaf) => [leaf.name, ""]));

type Library = ReadonlyMap<string, Media>;
type Row = Record<string, unknown>;

const str = (value: unknown) => (typeof value === "string" ? value : "");
const rows = (value: unknown): Row[] => (Array.isArray(value) ? (value as Row[]) : []);

function photo(library: Library, id: unknown): Photo | null {
  const media = library.get(str(id));
  if (!media || media.kind !== "image" || !media.width || !media.height) return null;
  return { src: media.url, width: media.width, height: media.height, alt: media.alt };
}

const complete = <T,>(items: (T | null)[]): T[] | null => (items.every((item) => item !== null) ? (items as T[]) : null);

/** Site content with one block replaced by an unpublished edit, or null while a photo is still missing. */
export function withDraft(current: SiteContent, key: BlockKey, data: BlockData, library: Library): SiteContent | null {
  switch (key) {
    case "success_stories": {
      const photos = complete(rows(data.photos).map((row) => photo(library, row.media_id)));
      return photos && { ...current, success_stories: { lede: str(data.lede), photos } };
    }
    case "client_logos": {
      const clients = complete(
        rows(data.clients).map((row) => {
          const logo = photo(library, row.media_id);
          return logo && { name: str(row.name), src: logo.src, width: logo.width, height: logo.height };
        }),
      );
      return clients && { ...current, client_logos: { clients } };
    }
    case "founder": {
      const portrait = photo(library, data.portrait_media_id);
      return (
        portrait && {
          ...current,
          founder: {
            name: str(data.name),
            short_name: str(data.short_name),
            title: str(data.title),
            role: str(data.role),
            feature: str(data.feature),
            portrait,
          },
        }
      );
    }
    case "stewards":
      return { ...current, stewards: { title: str(data.title), body: str(data.body) } };
    case "platforms": {
      const items = complete(
        rows(data.items).map((row) => {
          const picture = photo(library, row.media_id);
          return picture && { name: str(row.name), body: str(row.body), photo: picture };
        }),
      );
      return items && { ...current, platforms: { items } };
    }
    case "patron": {
      const picture = photo(library, data.media_id);
      return picture && { ...current, patron: { name: str(data.name), role: str(data.role), quote: str(data.quote), photo: picture } };
    }
  }
}
