import { ApiPromise, WsProvider, Keyring } from "@polkadot/api";
import { Header } from "@polkadot/types/interfaces/runtime/types";

const local_url = "ws://127.0.0.1:9944";
const remote = "wss://polkadot.api.onfinality.io/public-ws";

function delay(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function getAccounts(api: ApiPromise) {
  const keyring = new Keyring({ type: "sr25519" });
  return [keyring.addFromUri("//Alice"), keyring.addFromUri("//Bob")];
}

const nftCreateMint = async () => {
  const hexCodeToString = (hexCodes: string): string => {
    let str = "";
    for (let i = 0; i < hexCodes.length; i += 2) {
      const hexCode = hexCodes.slice(i, i + 2);
      const charCode = parseInt(hexCode, 16);
      str += String.fromCharCode(charCode);
    }
    return str;
  };

  const wsProvider = new WsProvider(local_url);
  const api: ApiPromise = await ApiPromise.create({
    provider: wsProvider,
    types: {},
  });
  await api.isReady;

  const [alice, bob] = getAccounts(api);

  // subscribe event
  await api.query.system.events((events) => {
    events.forEach(({ event }) => {
      if (
        event.section === "nftModule" &&
        event.method === "NFTCollectionCreated"
      ) {
        const [sender, collection_id, max_items] = event.data;
        console.log(
          `event create collection ${sender} ${collection_id} ${max_items}`
        );
      } else if (
        event.section === "nftModule" &&
        event.method === "NFTMinted"
      ) {
        const [sender, nft_item] = event.data;
        console.log(`event mint nft ${sender} ${nft_item}`);
      } else if (
        event.section === "system" &&
        event.method === "ExtrinsicFailed"
      ) {
        console.log(`event failed, ${event.data}`);
      }
    });
  });

  let tx;
  let hash;

  // 创建 NFT 集合
  tx = api.tx.nftModule.createCollection(100, "hello world!"); // 如果第2个参数(metainfo)之前创建时已用过，再次使用会创建失败
  hash = await tx.signAndSend(alice);
  console.log(`create hash: ${hash.toHex()}`);

  // 查询现有的 NFT 集合
  const collectionIds = await api.query.nftModule.nftCollectionIds();
  console.log(`collection ids: ${collectionIds}`);
  await delay(10000); // 等待集合创建完成事件

  // 在 NFT 集合 0 中 mint NFT
  const collectionIdsArray = collectionIds.toString().match(/0x[0-9a-fA-F]+/g);
  if (collectionIdsArray) {
    tx = api.tx.nftModule.mintNft(
      collectionIdsArray[collectionIdsArray.length - 1],
      0x0
    );
    hash = await tx.signAndSend(alice);
    console.log(`mint hash: ${hash.toHex()}`);

    const collectionInfo = await api.query.nftModule.nftCollections(
      collectionIdsArray[collectionIdsArray.length - 1]
    );
    const [max_item, cur_index, metainfo] = JSON.parse(
      JSON.stringify(collectionInfo)
    );
    console.log(
      `max_item: ${max_item}, cur_index: ${cur_index}, metainfo: ${hexCodeToString(
        metainfo
      )}`
    );
  }

  // 查询 alice 账号拥有的 NFT
  const nfts = await api.query.nftModule.ownedNFTs(alice.address);
  console.log(`nfts: ${nfts}`);
  await delay(10000); // 等待 NFT Mint 成功事件
};

const main = async () => {
  await nftCreateMint();
};

main()
  .then(() => {
    console.log("successfully exited");
    process.exit(0);
  })
  .catch((err) => {
    console.log("error occur:", err);
    process.exit(1);
  });
