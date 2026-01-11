import { randomUUID } from "crypto";
import type {
  PendingRequest,
  PendingRequestResult,
  PendingTransactionRequest,
  PendingSignTypedDataRequest,
  PendingSignRequest,
} from "./types";
import type { TransactionRequest, SignTypedDataRequest } from "../rpc/types";

interface PendingEntry {
  request: PendingRequest;
  resolve: (result: PendingRequestResult) => void;
}

const pending = new Map<string, PendingEntry>();

const REQUEST_TIMEOUT_MS = 5 * 60 * 1000; // 5 minutes

export function createPendingTransaction(
  jsonRpcId: number | string,
  transaction: TransactionRequest
): { id: string; promise: Promise<PendingRequestResult> } {
  const id = randomUUID();
  const request: PendingTransactionRequest = {
    type: "transaction",
    id,
    jsonRpcId,
    transaction,
    createdAt: Date.now(),
  };

  return createPendingEntry(id, request);
}

export function createPendingSignTypedData(
  jsonRpcId: number | string,
  address: string,
  typedData: unknown
): { id: string; promise: Promise<PendingRequestResult> } {
  const id = randomUUID();
  const request: PendingSignTypedDataRequest = {
    type: "signTypedData",
    id,
    jsonRpcId,
    request: { address, typedData },
    createdAt: Date.now(),
  };

  return createPendingEntry(id, request);
}

export function createPendingSign(
  jsonRpcId: number | string,
  address: string,
  message: string
): { id: string; promise: Promise<PendingRequestResult> } {
  const id = randomUUID();
  const request: PendingSignRequest = {
    type: "sign",
    id,
    jsonRpcId,
    address,
    message,
    createdAt: Date.now(),
  };

  return createPendingEntry(id, request);
}

function createPendingEntry(
  id: string,
  request: PendingRequest
): { id: string; promise: Promise<PendingRequestResult> } {
  let resolvePromise: (result: PendingRequestResult) => void;

  const promise = new Promise<PendingRequestResult>((resolve) => {
    resolvePromise = resolve;
  });

  pending.set(id, {
    request,
    resolve: resolvePromise!,
  });

  console.log(`🔐 Pending saved: id=${id} type=${request.type} jsonrpc=${request.jsonRpcId}`);

  // Auto-timeout
  setTimeout(() => {
    const entry = pending.get(id);
    if (entry) {
      entry.resolve({
        success: false,
        error: "Request timed out",
      });
      pending.delete(id);
    }
  }, REQUEST_TIMEOUT_MS);

  return { id, promise };
}

export function getPendingRequest(id: string): PendingRequest | undefined {
  return pending.get(id)?.request;
}

export function resolvePendingRequest(
  id: string,
  result: PendingRequestResult
): boolean {
  const entry = pending.get(id);
  if (!entry) {
    return false;
  }

  entry.resolve(result);
  pending.delete(id);
  return true;
}

export function getPendingCount(): number {
  return pending.size;
}

export function getAllPendingIds(): string[] {
  return Array.from(pending.keys());
}
