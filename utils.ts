import { ApiPromise, WsProvider, Keyring } from "@polkadot/api";
import { Header } from "@polkadot/types/interfaces/runtime/types";

const localUrl = "ws://127.0.0.1:9944";

export function delay(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

export const hexCodeToString = (hexCodes: string): string => {
  let str = "";
  for (let i = 0; i < hexCodes.length; i += 2) {
    const hexCode = hexCodes.slice(i, i + 2);
    const charCode = parseInt(hexCode, 16);
    str += String.fromCharCode(charCode);
  }
  return str;
};

export const initConnection = async () => {
  const wsProvider = new WsProvider(localUrl);
  const api: ApiPromise = await ApiPromise.create({
    provider: wsProvider,
    types: {},
  });
  await api.isReady;
  return api;
};

export function getAccounts(api: ApiPromise) {
  const keyring = new Keyring({ type: "sr25519" });
  return [keyring.addFromUri("//Alice"), keyring.addFromUri("//Bob")];
}

export async function sendAndWait(api, tx, signer) {
  return new Promise((resolve, reject) => {
    tx.signAndSend(signer, ({ status, events, dispatchError }) => {
      if (dispatchError) {
        if (dispatchError.isModule) {
          const decoded = api.registry.findMetaError(dispatchError.asModule);
          const { name, docs } = decoded;
          reject(new Error(`Transaction failed: ${name} - ${docs.join(" ")}`));
        } else {
          reject(new Error(`Transaction failed: ${dispatchError.toString()}`));
        }
      } else if (status.isInBlock) {
        console.log(`Transaction included at blockHash ${status.asInBlock}`);
      } else if (status.isFinalized) {
        console.log(`Transaction finalized at blockHash ${status.asFinalized}`);
        resolve(status.asFinalized);
      }
    });
  });
}
