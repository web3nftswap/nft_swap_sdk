import {
  initConnection,
  hexCodeToString,
  getAccounts,
  sendAndWait,
} from "./utils";

interface AccountInfo {
  data: {
    free: number;
  };
}

export const getBalance = async () => {
  const api = await initConnection();
  const [alice, bob] = getAccounts(api);

  // 获取alice的余额
  const {
    data: { free: bal },
  } = (await api.query.system.account(alice.address)) as AccountInfo | any;
  console.log(`Current balance is ${bal}`);

  // alice给bob转账
  const tx = api.tx.balances.transferKeepAlive(bob.address, 12345);
  const hash = await tx.signAndSend(alice);
  console.log(`transfer hash ${hash.toHex()}`);
};
