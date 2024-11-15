import {
  transactionBuy,
  transactionSwap,
  transactionReject,
} from "./transaction";
import { getBalance } from "./balance";
import {
  initConnection,
  hexCodeToString,
  getAccounts,
  sendAndWait,
} from "./utils";

const nftCreateMint = async () => {
  const api = await initConnection();

  const [alice, bob] = getAccounts(api);
  console.log("alice", alice);
  // subscribe event
  await api.query.system.events((events) => {
    events.forEach(({ event }) => {
      if (
        event.section === "nftModule" &&
        event.method === "NFTCollectionCreated"
      ) {
        const [sender, collectionId, maxItems] = event.data;
        console.log(
          `[Event] create collection ${sender} ${collectionId} ${maxItems}`
        );
      } else if (
        event.section === "nftModule" &&
        event.method === "NFTMinted"
      ) {
        const [sender, nftItem] = event.data;
        console.log(`[Event] mint nft ${sender} ${nftItem}`);
      } else if (
        event.section === "system" &&
        event.method === "ExtrinsicFailed"
      ) {
        console.log(`[Event] failed, ${event.data}`);
      }
    });
  });

  let tx;
  let hash;

  // 创建 NFT 集合
  console.log("[Call] createCollection");
  tx = api.tx.nftModule.createCollection(100, "hello world!"); // 如果第2个参数(metainfo)之前创建时已用过，再次使用会创建失败
  //hash = await tx.signAndSend(alice);
  //delay(10000); // 等待创建完成
  try {
    hash = await sendAndWait(api, tx, alice);
    console.log(`create hash: ${hash.toHex()}`);
  } catch (error) {
    console.log(`create error: ${error}`);
  }

  // 查询现有的 NFT 集合
  console.log("[Query] nftCollectionIds");
  const collectionIds = await api.query.nftModule.nftCollectionIds();
  console.log(`collection ids: ${collectionIds}`);

  // 在 NFT 集合 0 中 mint NFT
  const collectionIdsArray = JSON.parse(JSON.stringify(collectionIds));
  if (collectionIdsArray) {
    console.log("[Call] mintNft");
    tx = api.tx.nftModule.mintNft(
      collectionIdsArray[collectionIdsArray.length - 1],
      0x0
    );
    //hash = await tx.signAndSend(alice);
    //delay(10000); // 等待mint完成
    try {
      hash = await sendAndWait(api, tx, alice);
      console.log(`mint hash: ${hash.toHex()}`);
    } catch (error) {
      console.log(`mint error: ${error}`);
    }

    console.log("[Query] nftCollections");
    const collectionInfo = await api.query.nftModule.nftCollections(
      collectionIdsArray[collectionIdsArray.length - 1]
    );
    const [maxItem, curIndex, metainfo] = JSON.parse(
      JSON.stringify(collectionInfo)
    );
    console.log(
      `maxItem: ${maxItem}, curIndex: ${curIndex}, metainfo: ${hexCodeToString(
        metainfo
      )}`
    );
  }

  // 查询 alice 账号拥有的 NFT
  console.log("[Query] ownedNFTs");
  const nfts = await api.query.nftModule.ownedNFTs(alice.address);
  console.log(`nfts: ${nfts}`);
};

const consolidate = async () => {
  const getNftConsolidateStatus = async (
    collectionId,
    itemIndex
  ): Promise<string> => {
    console.log("[Query] nftDetails");
    const nftDetails = await api.query.nftModule.nftDetails([
      collectionId,
      itemIndex,
    ]);
    //console.log(`nftDetails: ${nftDetails}`);
    const { mergedNft, subNfts, metadata } = JSON.parse(
      JSON.stringify(nftDetails)
    );
    //console.log(
    //  `mergedNft: ${mergedNft}, subNfts: ${subNfts}, metadata: ${metadata}`
    //);
    let status: string = "";
    if (subNfts.length > 0) {
      status = "merged"; // merge的nft
      console.log("merged nft");
    } else if (mergedNft == null) {
      status = "general"; // 普通没有merge的nft
      console.log("general nft");
    } else {
      status = "sub"; // 该nft已被merge，当前不可用
      console.log("sub(frozen) nft");
    }
    return status;
  };

  const printNftsInfo = async () => {
    console.log("[Query] ownedNFTs");
    const ownedNFTs = await api.query.nftModule.ownedNFTs(alice.address);
    const ownedNFTsArray = JSON.parse(JSON.stringify(ownedNFTs));
    for (let i = 0; i < ownedNFTsArray.length; ++i) {
      const [collectionId, itemIndex, share] = ownedNFTsArray[i];
      const status = await getNftConsolidateStatus(collectionId, itemIndex);
      console.log(
        `nft ${i} info: ${collectionId}, ${itemIndex}, status: ${status}`
      );
    }
  };

  const api = await initConnection();
  const [alice, bob] = getAccounts(api);

  // subscribe event
  await api.query.system.events((events) => {
    events.forEach(({ event }) => {
      if (
        event.section === "nftModule" &&
        (event.method === "mergeNfts" || event.method === "splitNft")
      ) {
        console.log(`[Event]: ${JSON.stringify(event)}`);
      }
    });
  });

  let tx: any;
  let hash: any;
  console.log("[Query] nftCollectionIds");
  const collectionIds = await api.query.nftModule.nftCollectionIds();
  console.log(`collection ids: ${collectionIds}`);
  const collectionIdsArray = JSON.parse(JSON.stringify(collectionIds));

  if (collectionIdsArray) {
    const collectionId = collectionIdsArray[collectionIdsArray.length - 1];
    for (let i = 0; i < 3; ++i) {
      console.log("[Call] mintNft");
      tx = api.tx.nftModule.mintNft(collectionId, 0x0);
      //hash = await tx.signAndSend(alice);
      //delay(10000); // 等待mint完成
      try {
        hash = await sendAndWait(api, tx, alice);
        console.log(`mint${i} hash: ${hash.toHex()}`);
      } catch (error) {
        console.log(`mint${i} error: ${error}`);
      }
    }

    const array = [
      [collectionId, 0],
      [collectionId, 1],
      [collectionId, 2],
    ];
    console.log("[Call] mergeNfts");
    tx = api.tx.nftModule.mergeNfts(array);
    //hash = await tx.signAndSend(alice);
    //delay(10000); // 等待merget完成
    try {
      hash = await sendAndWait(api, tx, alice);
      console.log(`merge hash: ${hash.toHex()}`);
    } catch (error) {
      console.log(`merge error: ${error}`);
    }
    await printNftsInfo();

    console.log("[Call] splitNft");
    tx = api.tx.nftModule.splitNft([collectionId, 0]);
    //hash = await tx.signAndSend(alice);
    //delay(10000); // 等待split完成
    try {
      hash = await sendAndWait(api, tx, alice);
      console.log(`split hash: ${hash.toHex()}`);
    } catch (error) {
      console.log(`split error: ${error}`);
    }
    await printNftsInfo();
  }
};

const getAllNfts = async () => {
  const api = await initConnection();

  // 获取所有的集合
  const collectionIds = await api.query.nftModule.nftCollectionIds();
  console.log(`collection ids: ${collectionIds}`);
  const collectionIdsArray = JSON.parse(JSON.stringify(collectionIds));
  for (let i = 0; i < collectionIdsArray.length; ++i) {
    // 获取每一个集合的信息
    const collectionInfo = await api.query.nftModule.nftCollections(
      collectionIdsArray[i]
    );
    const [maxItem, curIndex, metainfo] = JSON.parse(
      JSON.stringify(collectionInfo)
    );
    console.log(
      `maxItem: ${maxItem}, curIndex: ${curIndex}, metainfo: ${hexCodeToString(
        metainfo
      )}`
    );
    for (let j = 0; j < curIndex; ++j) {
      // 获取集合中每个nft的拥有者
      let owners = await api.query.nftModule.nftOwners([
        collectionIdsArray[i],
        j,
      ]);
      console.log(`nft ${j} owner: ${owners}`);
    }
  }
};

const main = async () => {
  //await nftCreateMint();
  //await consolidate();
  //await getAllNfts();
  //await transactionBuy();
  //await transactionSwap();
  //await transactionReject();

  await getBalance();
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
