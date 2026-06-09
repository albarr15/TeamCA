import { useRef, useState } from "react";
import { createPortal } from "react-dom";
import {
  AlertCircle,
  CheckCircle,
  ChevronDown,
  Download,
  FileText,
  Upload,
  X,
} from "lucide-react";
import Button from "../../components/ui/Button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "../../components/ui/Card";
import {
  userService,
  type ImportFailedRow,
  type ImportResult,
} from "../../services/userService";

type CsvImportProps = {
  onImportComplete?: (result: ImportResult) => void;
};

type ImportStatus = "idle" | "loading" | "result" | "error";

const TEMPLATE_HEADERS = [
  "first_name",
  "last_name",
  "email",
  "password",
  "global_role",
  "department_name",
  "department_role",
  "working_hours_start",
  "working_hours_end",
  "working_days",
];

const csvEscape = (value: unknown): string => {
  const text = value === null || value === undefined ? "" : String(value);
  return /[",\n\r]/.test(text) ? `"${text.replace(/"/g, '""')}"` : text;
};

const downloadCsv = (filename: string, rows: unknown[][]) => {
  const csvText = rows
    .map((row) => row.map((value) => csvEscape(value)).join(","))
    .join("\n");
  const blob = new Blob([csvText], { type: "text/csv;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");

  link.href = url;
  link.download = filename;
  link.click();
  URL.revokeObjectURL(url);
};

const downloadTemplate = () => {
  downloadCsv("bulk_user_import_template.csv", [TEMPLATE_HEADERS]);
};

const downloadErrorCsv = (failedRows: ImportFailedRow[]) => {
  if (failedRows.length === 0) {
    return;
  }

  const rowHeaders = [
    ...new Set(failedRows.flatMap((failedRow) => Object.keys(failedRow.row))),
  ];
  const headers = [...rowHeaders, "failure_reason"];
  const rows = failedRows.map((failedRow) => [
    ...rowHeaders.map((header) => failedRow.row[header] ?? ""),
    failedRow.reason,
  ]);

  downloadCsv("bulk_user_import_errors.csv", [headers, ...rows]);
};

const getErrorMessage = (err: unknown): string => {
  if (err && typeof err === "object" && "response" in err) {
    const response = (err as { response?: { data?: { message?: string } } })
      .response;
    if (response?.data?.message) {
      return response.data.message;
    }
  }

  return err instanceof Error ? err.message : "Unable to import users.";
};

export default function CsvImport({ onImportComplete }: CsvImportProps) {
  const [status, setStatus] = useState<ImportStatus>("idle");
  const [result, setResult] = useState<ImportResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [showFailedRows, setShowFailedRows] = useState(false);
  const inputRef = useRef<HTMLInputElement | null>(null);

  const importFile = async (file: File | null | undefined) => {
    if (!file) {
      return;
    }

    if (!file.name.toLowerCase().endsWith(".csv")) {
      setStatus("error");
      setError("Only .csv files are allowed.");
      return;
    }

    try {
      setStatus("loading");
      setError(null);
      setResult(null);

      const importResult = await userService.importUsers(file);
      setResult(importResult);
      setStatus("result");

      if (importResult.successful_inserts > 0) {
        onImportComplete?.(importResult);
      }
    } catch (err) {
      setError(getErrorMessage(err));
      setStatus("error");
    } finally {
      if (inputRef.current) {
        inputRef.current.value = "";
      }
    }
  };

  const failedRows = result?.failed_rows ?? [];
  const reset = () => {
    setStatus("idle");
    setResult(null);
    setError(null);
    setShowFailedRows(false);
  };

  return (
    <Card>
      <CardHeader className="gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <CardTitle>Bulk User Import</CardTitle>
          <CardDescription>
            CSV upload for active Admin and Standard User accounts
          </CardDescription>
        </div>
        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={downloadTemplate}
          title="Download CSV template"
        >
          <Download className="h-4 w-4" />
          Template
        </Button>
      </CardHeader>

      <CardContent className="space-y-4">
        <input
          ref={inputRef}
          type="file"
          accept=".csv,text/csv"
          className="hidden"
          onChange={(event) => void importFile(event.target.files?.[0])}
        />

        <button
          type="button"
          className={`flex min-h-36 w-full flex-col items-center justify-center gap-3 rounded-lg border border-dashed px-4 py-6 text-center transition-colors ${
            isDragging
              ? "border-blue-500 bg-blue-50 text-blue-700"
              : "border-slate-300 bg-slate-50 text-slate-600 hover:border-blue-400 hover:bg-blue-50"
          }`}
          onClick={() => inputRef.current?.click()}
          onDragEnter={(event) => {
            event.preventDefault();
            setIsDragging(true);
          }}
          onDragOver={(event) => {
            event.preventDefault();
            setIsDragging(true);
          }}
          onDragLeave={() => setIsDragging(false)}
          onDrop={(event) => {
            event.preventDefault();
            setIsDragging(false);
            void importFile(event.dataTransfer.files?.[0]);
          }}
        >
          <Upload className="h-7 w-7" />
          <span className="text-sm font-medium">
            Drop CSV file or choose file
          </span>
          <span className="text-xs text-slate-500">
            Required: first_name, last_name, email, password, global_role
          </span>
        </button>

        {status === "loading"
          ? createPortal(
              <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/50 p-4">
                <div className="flex w-full max-w-sm items-center gap-3 rounded-lg bg-white p-6 shadow-xl">
                  <span className="h-5 w-5 animate-spin rounded-full border-2 border-blue-600 border-t-transparent" />
                  Processing CSV...
                </div>
              </div>,
              document.body,
            )
          : null}

        {status === "error" && error ? (
          <div className="flex items-start gap-3 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
            <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
            <div className="flex-1">{error}</div>
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={reset}
            >
              Retry
            </Button>
          </div>
        ) : null}

        {status === "result" && result
          ? createPortal(
              <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/50 p-4">
                <div className="w-full max-w-2xl max-h-[90vh] overflow-y-auto rounded-lg bg-white p-6 shadow-xl">
                  <div className="mb-4 flex items-center justify-between">
                    <h3 className="font-semibold text-lg">Import Summary</h3>
                    <button type="button" onClick={reset} className="text-slate-500 hover:text-slate-800">
                      <X className="h-5 w-5" />
                    </button>
                  </div>
                  <div className="space-y-4">
                    <div className="grid gap-3 sm:grid-cols-3">
                      <div className="rounded-lg border border-slate-200 p-4">
                        <div className="text-xs uppercase tracking-wide text-slate-500">
                          Processed
                        </div>
                        <div className="mt-1 text-2xl font-semibold text-slate-900">
                          {result.total_processed}
                        </div>
                      </div>
                      <div className="rounded-lg border border-green-200 bg-green-50 p-4">
                        <div className="flex items-center gap-2 text-xs uppercase tracking-wide text-green-700">
                          <CheckCircle className="h-4 w-4" />
                          Created
                        </div>
                        <div className="mt-1 text-2xl font-semibold text-green-800">
                          {result.successful_inserts}
                        </div>
                      </div>
                      <div className="rounded-lg border border-red-200 bg-red-50 p-4">
                        <div className="flex items-center gap-2 text-xs uppercase tracking-wide text-red-700">
                          <AlertCircle className="h-4 w-4" />
                          Failed
                        </div>
                        <div className="mt-1 text-2xl font-semibold text-red-800">
                          {failedRows.length}
                        </div>
                      </div>
                    </div>

                    {failedRows.length > 0 ? (
                      <div className="rounded-lg border border-slate-200">
                        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-100 px-4 py-3">
                          <button
                            type="button"
                            className="inline-flex items-center gap-2 text-sm font-medium text-slate-800"
                            onClick={() => setShowFailedRows((value) => !value)}
                          >
                            <ChevronDown
                              className={`h-4 w-4 transition-transform ${
                                showFailedRows ? "rotate-180" : ""
                              }`}
                            />
                            Failed rows
                          </button>
                          <Button
                            type="button"
                            variant="outline"
                            size="sm"
                            onClick={() => downloadErrorCsv(failedRows)}
                            title="Download failed row report"
                          >
                            <FileText className="h-4 w-4" />
                            Error CSV
                          </Button>
                        </div>

                        {showFailedRows ? (
                          <div className="max-h-60 overflow-auto">
                            <table className="w-full min-w-[560px] text-sm">
                              <thead className="bg-slate-50 text-left text-xs uppercase tracking-wide text-slate-500">
                                <tr>
                                  <th className="px-4 py-3">Email</th>
                                  <th className="px-4 py-3">Name</th>
                                  <th className="px-4 py-3">Role</th>
                                  <th className="px-4 py-3">Reason</th>
                                </tr>
                              </thead>
                              <tbody>
                                {failedRows.map((failedRow, index) => (
                                  <tr key={`${failedRow.row.email}-${index}`} className="border-t">
                                    <td className="px-4 py-3">
                                      {failedRow.row.email || "-"}
                                    </td>
                                    <td className="px-4 py-3">
                                      {`${failedRow.row.first_name || ""} ${
                                        failedRow.row.last_name || ""
                                      }`.trim() || "-"}
                                    </td>
                                    <td className="px-4 py-3">
                                      {failedRow.row.global_role || "-"}
                                    </td>
                                    <td className="px-4 py-3 text-red-700">
                                      {failedRow.reason}
                                    </td>
                                  </tr>
                                ))}
                              </tbody>
                            </table>
                          </div>
                        ) : null}
                      </div>
                    ) : null}

                    <div className="flex justify-end pt-2">
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        onClick={reset}
                      >
                        Close
                      </Button>
                    </div>
                  </div>
                </div>
              </div>,
              document.body,
            )
          : null}
      </CardContent>
    </Card>
  );
}
