import type { Favorite } from "../storage/schema";

export type FavoriteEntry = { index: number; fav: Favorite };

export type FavoriteSubgroup = {
  subcategory: string;
  entries: FavoriteEntry[];
};

export type FavoriteTreeGroup = {
  category: string;
  /** Leaves with no subcategory under this category */
  leaves: FavoriteEntry[];
  subgroups: FavoriteSubgroup[];
};

/** Two-level Category → SubCategory tree for Shortcuts flyouts (legacy PS Utilities parity). */
export function buildFavoriteTree(favorites: Favorite[]): FavoriteTreeGroup[] {
  type Bucket = {
    leaves: FavoriteEntry[];
    subs: Map<string, FavoriteEntry[]>;
  };
  const map = new Map<string, Bucket>();

  favorites.forEach((fav, index) => {
    const category = (fav.Category || "").trim() || "Uncategorized";
    const subcategory = (fav.SubCategory || "").trim();
    let bucket = map.get(category);
    if (!bucket) {
      bucket = { leaves: [], subs: new Map() };
      map.set(category, bucket);
    }
    const entry = { index, fav };
    if (!subcategory) {
      bucket.leaves.push(entry);
    } else {
      const list = bucket.subs.get(subcategory) || [];
      list.push(entry);
      bucket.subs.set(subcategory, list);
    }
  });

  const sortEntries = (a: FavoriteEntry, b: FavoriteEntry) =>
    (a.fav.Description || a.fav.Component).localeCompare(b.fav.Description || b.fav.Component);

  const cats = [...map.keys()].sort((a, b) => {
    if (a === "Uncategorized") return 1;
    if (b === "Uncategorized") return -1;
    return a.localeCompare(b);
  });

  return cats.map((category) => {
    const bucket = map.get(category)!;
    const subgroups = [...bucket.subs.keys()]
      .sort((a, b) => a.localeCompare(b))
      .map((subcategory) => ({
        subcategory,
        entries: (bucket.subs.get(subcategory) || []).sort(sortEntries),
      }));
    return {
      category,
      leaves: bucket.leaves.sort(sortEntries),
      subgroups,
    };
  });
}

export function uniqueFavoriteField(
  favorites: Favorite[],
  field: "Category" | "SubCategory",
): string[] {
  const set = new Set<string>();
  for (const fav of favorites) {
    const v = (fav[field] || "").trim();
    if (v) set.add(v);
  }
  return [...set].sort((a, b) => a.localeCompare(b));
}

export function favoriteDisplayLabel(fav: Favorite): string {
  const base = fav.Description || `${fav.Menu}.${fav.Component}.${fav.Market}`;
  const notes = (fav.Notes || "").trim();
  return notes ? `${base} ※` : base;
}

export interface AddFavoriteDraft {
  Description: string;
  Category: string;
  SubCategory: string;
  Parameters: string;
  Notes: string;
}

export interface AddFavoriteDialogOptions {
  defaultDescription: string;
  existingFavorites: Favorite[];
  onSubmit: (draft: AddFavoriteDraft) => void | Promise<void>;
}

/** Shortcut Details dialog — Description*, Category/SubCategory select-or-new, optional parameters. */
export function showAddFavoriteDialog(doc: Document, opts: AddFavoriteDialogOptions): void {
  doc.getElementById("mpu-dialog")?.remove();

  const categories = uniqueFavoriteField(opts.existingFavorites, "Category");
  const subcategories = uniqueFavoriteField(opts.existingFavorites, "SubCategory");

  const backdrop = doc.createElement("div");
  backdrop.id = "mpu-dialog";
  backdrop.className = "mpu-dialog-backdrop";
  backdrop.setAttribute("role", "presentation");

  const dialog = doc.createElement("div");
  dialog.className = "mpu-dialog";
  dialog.setAttribute("role", "dialog");
  dialog.setAttribute("aria-modal", "true");
  dialog.setAttribute("aria-labelledby", "mpu-sc-title");

  const catOptions = categories
    .map((c) => `<option value="${escapeAttr(c)}"></option>`)
    .join("");
  const subOptions = subcategories
    .map((c) => `<option value="${escapeAttr(c)}"></option>`)
    .join("");

  dialog.innerHTML = `
    <h2 id="mpu-sc-title">Shortcut Details</h2>
    <form id="mpu-sc-form" class="mpu-goto-form">
      <label>Description * <input id="mpu-sc-desc" name="description" required maxlength="120" autocomplete="off" /></label>
      <label>Category (select existing or enter new)
        <input id="mpu-sc-cat" name="category" list="mpu-sc-cat-list" maxlength="80" autocomplete="off" />
        <datalist id="mpu-sc-cat-list">${catOptions}</datalist>
      </label>
      <label>SubCategory (select existing or enter new)
        <input id="mpu-sc-sub" name="subcategory" list="mpu-sc-sub-list" maxlength="80" autocomplete="off" />
        <datalist id="mpu-sc-sub-list">${subOptions}</datalist>
      </label>
      <p><button type="button" class="mpu-linkish" id="mpu-sc-params-toggle">Add parameters</button></p>
      <label id="mpu-sc-params-wrap" hidden>Parameters
        <input id="mpu-sc-params" name="parameters" placeholder="?ICACTION=..." autocomplete="off" />
      </label>
      <label>Notes (optional)
        <input id="mpu-sc-notes" name="notes" maxlength="200" autocomplete="off" />
      </label>
      <p class="mpu-dialog-hint">* Required field</p>
      <div class="mpu-dialog-actions">
        <button type="button" class="mpu-btn" id="mpu-sc-cancel">Cancel</button>
        <button type="submit" class="mpu-btn" id="mpu-sc-add">Add</button>
      </div>
    </form>
  `;

  (dialog.querySelector("#mpu-sc-desc") as HTMLInputElement).value = opts.defaultDescription;

  const close = (): void => {
    doc.removeEventListener("keydown", onKey);
    backdrop.remove();
  };
  const onKey = (e: KeyboardEvent): void => {
    if (e.key === "Escape") {
      e.preventDefault();
      close();
    }
  };

  dialog.querySelector("#mpu-sc-cancel")?.addEventListener("click", close);
  dialog.querySelector("#mpu-sc-params-toggle")?.addEventListener("click", () => {
    const wrap = dialog.querySelector("#mpu-sc-params-wrap") as HTMLElement;
    wrap.hidden = !wrap.hidden;
    if (!wrap.hidden) {
      (dialog.querySelector("#mpu-sc-params") as HTMLInputElement).focus();
    }
  });

  dialog.querySelector("#mpu-sc-form")?.addEventListener("submit", (e) => {
    e.preventDefault();
    const description = (dialog.querySelector("#mpu-sc-desc") as HTMLInputElement).value.trim();
    if (!description) return;
    let parameters = (dialog.querySelector("#mpu-sc-params") as HTMLInputElement).value.trim();
    if (parameters && !parameters.startsWith("?") && !parameters.startsWith("/")) {
      parameters = `?${parameters}`;
    }
    void opts.onSubmit({
      Description: description,
      Category: (dialog.querySelector("#mpu-sc-cat") as HTMLInputElement).value.trim(),
      SubCategory: (dialog.querySelector("#mpu-sc-sub") as HTMLInputElement).value.trim(),
      Parameters: parameters,
      Notes: (dialog.querySelector("#mpu-sc-notes") as HTMLInputElement).value.trim(),
    });
    close();
  });

  backdrop.appendChild(dialog);
  doc.body.appendChild(backdrop);
  backdrop.addEventListener("click", (ev) => {
    if (ev.target === backdrop) close();
  });
  doc.addEventListener("keydown", onKey);
  (dialog.querySelector("#mpu-sc-desc") as HTMLInputElement).focus();
}

function escapeAttr(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/"/g, "&quot;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");
}
