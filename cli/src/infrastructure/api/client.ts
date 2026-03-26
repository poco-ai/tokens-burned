import http from "node:http";
import https from "node:https";
import { URL } from "node:url";
import type {
  ApiSettings,
  DeviceMetadata,
  IngestResponse,
  UploadSessionMetadata,
  UploadTokenBucket,
} from "../../domain/types";

const MAX_RETRIES = 3;
const INITIAL_DELAY = 1000;
const TIMEOUT_MS = 60_000;

export class ApiClient {
  constructor(
    private apiUrl: string,
    private apiKey: string,
  ) {}

  /**
   * Ingest buckets and sessions to server
   */
  async ingest(
    device: DeviceMetadata,
    buckets: UploadTokenBucket[],
    sessions?: UploadSessionMetadata[],
    onProgress?: (sent: number, total: number) => void,
  ): Promise<{ ingested?: number; sessions?: number }> {
    let lastError: Error | undefined;
    for (let attempt = 0; attempt < MAX_RETRIES; attempt++) {
      try {
        return await this.sendIngest(device, buckets, sessions, onProgress);
      } catch (err) {
        lastError = err as Error;
        const httpErr = err as { statusCode?: number; message: string };
        // Don't retry auth errors or client errors
        if (
          httpErr.message === "UNAUTHORIZED" ||
          (httpErr.statusCode &&
            httpErr.statusCode >= 400 &&
            httpErr.statusCode < 500)
        ) {
          throw err;
        }
        if (attempt < MAX_RETRIES - 1) {
          const delay = INITIAL_DELAY * 2 ** attempt;
          await new Promise((r) => setTimeout(r, delay));
        }
      }
    }
    throw lastError;
  }

  private sendIngest(
    device: DeviceMetadata,
    buckets: UploadTokenBucket[],
    sessions?: UploadSessionMetadata[],
    onProgress?: (sent: number, total: number) => void,
  ): Promise<{ ingested?: number; sessions?: number }> {
    return new Promise((resolve, reject) => {
      const url = new URL("/api/usage/ingest", this.apiUrl);
      const payload = {
        schemaVersion: 2 as const,
        device,
        buckets,
        sessions: sessions ?? [],
      };
      const body = Buffer.from(JSON.stringify(payload));
      const totalBytes = body.length;
      const mod = url.protocol === "https:" ? https : http;

      const req = mod.request(
        url,
        {
          method: "POST",
          timeout: TIMEOUT_MS,
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${this.apiKey}`,
            "Content-Length": totalBytes,
          },
        },
        (res) => {
          let data = "";
          res.on("data", (chunk) => {
            data += chunk;
          });
          res.on("end", () => {
            if (res.statusCode === 401) {
              reject(new Error("UNAUTHORIZED"));
              return;
            }
            if (
              !res.statusCode ||
              res.statusCode < 200 ||
              res.statusCode >= 300
            ) {
              const err = new Error(
                `HTTP ${res.statusCode}: ${data}`,
              ) as Error & {
                statusCode?: number;
              };
              err.statusCode = res.statusCode;
              reject(err);
              return;
            }
            try {
              const response = JSON.parse(data) as IngestResponse;
              resolve({
                ingested: response.bucketCount ?? response.ingested,
                sessions: response.sessionCount ?? response.sessions,
              });
            } catch {
              reject(new Error(`Invalid JSON response: ${data}`));
            }
          });
        },
      );

      req.on("error", (err) => reject(err));
      req.on("timeout", () => {
        req.destroy();
        reject(new Error("Request timed out (60s)"));
      });

      // Write body in chunks to report upload progress
      const CHUNK = 16 * 1024;
      let sent = 0;

      const writeNext = () => {
        let ok = true;
        while (ok && sent < totalBytes) {
          const slice = body.subarray(sent, sent + CHUNK);
          sent += slice.length;
          if (onProgress) onProgress(sent, totalBytes);
          ok = req.write(slice);
        }
        if (sent < totalBytes) {
          req.once("drain", writeNext);
        } else {
          req.end();
        }
      };

      writeNext();
    });
  }

  /**
   * Fetch user settings from server
   */
  async fetchSettings(): Promise<ApiSettings | null> {
    return new Promise((resolve, reject) => {
      const url = new URL("/api/usage/settings", this.apiUrl);
      const mod = url.protocol === "https:" ? https : http;

      const req = mod.request(
        url,
        {
          method: "GET",
          timeout: 10_000,
          headers: {
            Authorization: `Bearer ${this.apiKey}`,
          },
        },
        (res) => {
          let data = "";
          res.on("data", (chunk) => {
            data += chunk;
          });
          res.on("end", () => {
            if (res.statusCode === 401) {
              reject(new Error("UNAUTHORIZED"));
              return;
            }
            if (
              !res.statusCode ||
              res.statusCode < 200 ||
              res.statusCode >= 300
            ) {
              resolve(null);
              return;
            }
            try {
              const settings = JSON.parse(data) as ApiSettings;
              if (
                settings.schemaVersion !== 2 ||
                !settings.projectMode ||
                !settings.projectHashSalt ||
                !settings.timezone
              ) {
                resolve(null);
                return;
              }

              resolve(settings);
            } catch {
              resolve(null);
            }
          });
        },
      );

      req.on("error", () => resolve(null));
      req.on("timeout", () => {
        req.destroy();
        resolve(null);
      });
      req.end();
    });
  }

  /**
   * Delete all usage data for the authenticated user
   */
  async deleteAllData(opts?: {
    hostname?: string;
  }): Promise<{ deleted: number }> {
    return new Promise((resolve, reject) => {
      const url = new URL("/api/usage/ingest", this.apiUrl);
      if (opts?.hostname) {
        url.searchParams.set("hostname", opts.hostname);
      }
      const mod = url.protocol === "https:" ? https : http;

      const req = mod.request(
        url,
        {
          method: "DELETE",
          timeout: TIMEOUT_MS,
          headers: {
            Authorization: `Bearer ${this.apiKey}`,
          },
        },
        (res) => {
          let data = "";
          res.on("data", (chunk) => {
            data += chunk;
          });
          res.on("end", () => {
            if (res.statusCode === 401) {
              reject(new Error("UNAUTHORIZED"));
              return;
            }
            if (
              !res.statusCode ||
              res.statusCode < 200 ||
              res.statusCode >= 300
            ) {
              const err = new Error(
                `HTTP ${res.statusCode}: ${data}`,
              ) as Error & {
                statusCode?: number;
              };
              err.statusCode = res.statusCode;
              reject(err);
              return;
            }
            try {
              resolve(JSON.parse(data));
            } catch {
              reject(new Error(`Invalid JSON response: ${data}`));
            }
          });
        },
      );

      req.on("error", (err) => reject(err));
      req.on("timeout", () => {
        req.destroy();
        reject(new Error("Request timed out (60s)"));
      });
      req.end();
    });
  }
}
