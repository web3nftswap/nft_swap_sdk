import { ApiPromise, WsProvider, Keyring } from "@polkadot/api";
import { Header } from "@polkadot/types/interfaces/runtime/types";

const local_url = "ws://127.0.0.1:9944";
const remote = "wss://polkadot.api.onfinality.io/public-ws";

function delay(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

const nftCrateMint = async () => {
    const wsProvider = new WsProvider(local_url);
    const api: ApiPromise = await ApiPromise.create({
      provider: wsProvider,
      types: {},
    });
    await api.isReady;

    const keyring = new Keyring({ type: "sr25519" });
    const alice = keyring.addFromUri("//Alice");

    // subscribe event
    await api.query.system.events((events ) => {
        events.forEach(({ event }) => {
            if (event.section === "nftModule" && event.method === "NFTCollectionCreated") {
                const [sender, collection_id, max_items] = event.data
                console.log(`event create collection ${sender} ${collection_id} ${max_items}`)
            } else if (event.section === "nftModule" && event.method === "NFTMinted") {
                const [sender, nft_item] = event.data
                console.log(`event mint nft ${sender} ${nft_item}`)
            } else if (event.section === "system" && event.method === "ExtrinsicFailed") {
                console.log(`event failed, ${event.data}`)
            }
        })
    })

    let tx;
    let hash;

    // 创建 NFT 集合
    tx = api.tx.nftModule.createCollection(100, 0x7); // 如果第2个参数(metainfo)之前创建时已用过，再次使用会创建失败
    hash = await tx.signAndSend(alice);
    console.log(`create hash: ${hash.toHex()}`);

    // 查询现有的 NFT 集合
    const collectionIds = await api.query.nftModule.nftCollectionIds();
    console.log(`collection ids: ${collectionIds}`);
    await delay(10000); // 等待集合创建完成事件

    // 在 NFT 集合 0 中 mint NFT
    const collectionIdsArray = collectionIds.toString().match(/0x[0-9a-fA-F]+/g);
    if (collectionIdsArray) {
        tx = api.tx.nftModule.mintNft(collectionIdsArray[0], 0x0);
        hash = await tx.signAndSend(alice);
        console.log(`mint hash: ${hash.toHex()}`);
    }

    // 查询现有的 NFT 集合
    const nfts = await api.query.nftModule.ownedNFTs(alice.address);
    console.log(`nfts: ${nfts}`);
    await delay(10000); // 等待 NFT Mint 成功事件
}

nftCrateMint()
  .then(() => {
    console.log("successfully exited");
    process.exit(0);
  })
  .catch((err) => {
    console.log("error occur:", err);
    process.exit(1);
  });
