"use client";

import { useState, useRef } from "react";
import { validateAndImport, getImportTemplate, ImportResult } from "@/lib/actions/import";

type Step = "input" | "confirm" | "done";

function clientValidate(rows: unknown[]): string[] {
  const errs: string[] = [];
  rows.forEach((r: any, i) => {
    if (!r.id) errs.push(`Row ${i + 1}: missing id`);
    if (!["radical", "kanji", "vocabulary"].includes(r.type)) errs.push(`Row ${i + 1}: invalid type`);
    if (!r.level || r.level < 1 || r.level > 60) errs.push(`Row ${i + 1}: level must be 1–60`);
    if (!r.meanings?.length) errs.push(`Row ${i + 1}: missing meanings`);
  });
  return errs;
}

export function ImportForm() {
  const [json, setJson] = useState("");
  const [step, setStep] = useState<Step>("input");
  const [preview, setPreview] = useState<{ total: number; errors: string[] } | null>(null);
  const [result, setResult] = useState<ImportResult | null>(null);
  const [loading, setLoading] = useState(false);
  const [parseError, setParseError] = useState<string | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);

  const handleFile = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (ev) => setJson((ev.target?.result as string) ?? "");
    reader.readAsText(file);
  };

  const handleValidate = () => {
    setParseError(null);
    try {
      const rows = JSON.parse(json);
      if (!Array.isArray(rows)) throw new Error("JSON must be an array");
      const errs = clientValidate(rows);
      setPreview({ total: rows.length, errors: errs });
      setStep("confirm");
    } catch (e) {
      setParseError(String(e));
    }
  };

  const handleImport = async () => {
    setLoading(true);
    try {
      const rows = JSON.parse(json);
      const res = await validateAndImport(rows);
      setResult(res);
      setStep("done");
    } catch (e) {
      setParseError(String(e));
      setStep("input");
    } finally {
      setLoading(false);
    }
  };

  const handleTemplate = async () => {
    const csv = await getImportTemplate();
    const blob = new Blob([csv], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "kanilocal-template.csv";
    a.click();
    URL.revokeObjectURL(url);
  };

  const reset = () => {
    setStep("input");
    setJson("");
    setPreview(null);
    setResult(null);
    setParseError(null);
  };

  return (
    <div className="space-y-4">
      {step === "input" && (
        <>
          <div className="flex gap-3 items-center flex-wrap">
            <input ref={fileRef} type="file" accept=".json,.csv" onChange={handleFile} className="hidden" />
            <button
              onClick={() => fileRef.current?.click()}
              className="px-4 py-2 bg-surface0 text-subtext rounded-lg hover:text-text transition-colors text-sm"
            >
              Choose file
            </button>
            <button
              onClick={handleTemplate}
              className="px-4 py-2 bg-surface0 text-subtext rounded-lg hover:text-text transition-colors text-sm"
            >
              Download template CSV
            </button>
          </div>

          <textarea
            value={json}
            onChange={(e) => setJson(e.target.value)}
            placeholder="Or paste JSON here..."
            rows={10}
            className="w-full bg-surface0 text-text text-sm rounded-lg p-3 outline-none focus:ring-1 focus:ring-blue font-mono resize-y"
          />

          {parseError && (
            <div className="text-red text-sm bg-red/10 border border-red rounded-lg p-3">{parseError}</div>
          )}

          <button
            onClick={handleValidate}
            disabled={!json.trim()}
            className="w-full py-3 bg-blue text-white rounded-lg font-semibold hover:opacity-90 transition-opacity disabled:opacity-50"
          >
            Validate
          </button>
        </>
      )}

      {step === "confirm" && preview && (
        <div className="space-y-4">
          <div className="bg-mantle border border-surface0 rounded-xl p-5 space-y-3">
            <div className="text-text font-medium">Validation Report</div>
            <div className="text-sm text-subtext">{preview.total} rows parsed</div>
            {preview.errors.length === 0 ? (
              <div className="text-green text-sm">All rows valid — ready to import.</div>
            ) : (
              <>
                <div className="text-yellow text-sm">{preview.errors.length} issue(s) found:</div>
                <ul className="text-xs text-red space-y-1 max-h-40 overflow-y-auto">
                  {preview.errors.map((e, i) => <li key={i}>{e}</li>)}
                </ul>
                <p className="text-xs text-subtext">Valid rows will still be imported.</p>
              </>
            )}
          </div>
          <div className="flex gap-3">
            <button onClick={reset} className="px-4 py-3 bg-surface0 text-subtext rounded-lg hover:text-text text-sm">
              Back
            </button>
            <button
              onClick={handleImport}
              disabled={loading}
              className="flex-1 py-3 bg-blue text-white rounded-lg font-semibold hover:opacity-90 transition-opacity disabled:opacity-50"
            >
              {loading ? "Importing..." : "Confirm Import"}
            </button>
          </div>
        </div>
      )}

      {step === "done" && result && (
        <div className="space-y-4">
          <div className="bg-mantle border border-surface0 rounded-xl p-5 space-y-3">
            <div className={`font-medium ${result.errors.length === 0 ? "text-green" : "text-yellow"}`}>
              Import complete
            </div>
            <div className="text-sm text-subtext space-y-1">
              <div>{result.imported} new item(s) added</div>
              <div>{result.updated} existing item(s) updated</div>
            </div>
            {result.errors.length > 0 && (
              <ul className="text-xs text-red space-y-1">
                {result.errors.map((e, i) => (
                  <li key={i}>Row {e.row}{e.id ? ` (${e.id})` : ""}: {e.message}</li>
                ))}
              </ul>
            )}
          </div>
          <button onClick={reset} className="w-full py-2 bg-surface0 text-subtext rounded-lg hover:text-text text-sm">
            Import more
          </button>
        </div>
      )}
    </div>
  );
}
