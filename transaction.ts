import {
  initConnection,
  hexCodeToString,
  getAccounts,
  sendAndWait,
} from "./utils";

export const transactionBuy = async () => {
  const api = await initConnection();

  // subscribe event
  await api.query.system.events((events) => {
    events.forEach(({ event }) => {
      if (event.section === "nftMarketModule" && event.method === "NftListed") {
        const [sender, [collectionId, itemIndex, share]] = event.data;
        console.log(
          `[Event] list nft ${sender} ${collectionId} ${itemIndex} ${share}`
        );
      } else if (
        event.section === "nftMarketModule" &&
        event.method === "BuySuccess"
      ) {
        const [[collectionId, itemIndex, share], seller, price] = event.data;
        console.log(
          `[Event] buy nft ${seller} ${collectionId} ${itemIndex} ${share} ${price}`
        );
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

  const [alice, bob] = getAccounts(api);
  console.log("[Query] ownedNFTs");
  const ownedNFTs = await api.query.nftModule.ownedNFTs(alice.address);
  const ownedNFTsArray = JSON.parse(JSON.stringify(ownedNFTs));
  const [collectionId, itemIndex, share] = ownedNFTsArray[0];

  // list NFT
  console.log("[Call] listNft");
  const price = 100;
  tx = api.tx.nftMarketModule.listNft([collectionId, itemIndex, share], price);
  try {
    hash = await sendAndWait(api, tx, alice);
    console.log(`list hash: ${hash.toHex()}`);
  } catch (error) {
    console.log(`list error: ${error}`);
  }

  // buy NFT
  console.log("[Call] buyNft");
  tx = api.tx.nftMarketModule.buyNft(
    [collectionId, itemIndex, share],
    alice.address
  );
  try {
    hash = await sendAndWait(api, tx, bob);
    console.log(`buy hash: ${hash.toHex()}`);
  } catch (error) {
    console.log(`buy error: ${error}`);
  }

  console.log("[Query] ownedNFTs");
  const bobOwnedNFTs = await api.query.nftModule.ownedNFTs(bob.address);
  console.log(`bobOwnedNFTs ${bobOwnedNFTs}`);
};

const getAccountAllOffers = async (api, accountAddress) => {
  const entries = await api.query.nftMarketModule.offers.entries();

  const offersForAccount = entries
    .filter(([key]) => key.args[1].eq(accountAddress))
    .map(([key, value]) => ({
      nft: JSON.parse(JSON.stringify(key.args[0])),
      offers: JSON.parse(JSON.stringify(value)),
    }));
  //console.log(offersForAccount);

  // for (const { nft, offers } of offersForAccount) {
  //   const [collectionId, itemIndex, share] = nft;
  //   console.log(`target nft: ${collectionId} ${itemIndex} ${share}`);
  //   for (let i = 0; i < offers.length; ++i) {
  //     const { offeredNfts, tokenAmount, buyer } = offers[i];
  //     console.log(`offered token amount: ${tokenAmount}, buyer: ${buyer}`);
  //     for (let j = 0; j < offeredNfts.length; ++j) {
  //       const [offeredCollectionId, offeredItemIndex, offeredShare] =
  //         offeredNfts[j];
  //       console.log(
  //         `offered nft[${j}]: ${offeredCollectionId} ${offeredItemIndex} ${offeredShare}`
  //       );
  //     }
  //   }
  // }
  return offersForAccount;
};

const getNftOffers = async (offersForAccount, nft) => {
  const offers = offersForAccount.filter(
    (item) =>
      item.nft[0] === nft[0] && item.nft[1] === nft[1] && item.nft[2] === nft[2]
  );
  return offers[0].offers;
};

export const transactionSwap = async () => {
  const api = await initConnection();

  // subscribe event
  await api.query.system.events((events) => {
    events.forEach(({ event }) => {
      if (event.section === "nftMarketModule" && event.method === "NftListed") {
        const [sender, [collectionId, itemIndex, share]] = event.data;
        console.log(
          `[Event] list nft ${sender} ${collectionId} ${itemIndex} ${share}`
        );
      } else if (
        event.section === "nftMarketModule" &&
        event.method === "OfferPlaced"
      ) {
        const [[collectionId, itemIndex, share], buyer, offer] = event.data;
        console.log(
          `[Event] offer nft ${buyer} ${collectionId} ${itemIndex} ${share} ${offer}`
        );
      } else if (
        event.section === "nftMarketModule" &&
        event.method === "OfferAccepted"
      ) {
        const [seller, [collectionId, itemIndex, share], buyer, offer] =
          event.data;
        console.log(
          `[Event] accept nft ${seller} ${buyer} ${collectionId} ${itemIndex} ${share} ${offer}`
        );
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

  const [alice, bob] = getAccounts(api);

  //// bob先mint一个NFT用于交换
  //const collectionIds = await api.query.nftModule.nftCollectionIds();
  //const collectionIdsArray = JSON.parse(JSON.stringify(collectionIds));
  //console.log("[Call] bob mintNft");
  //tx = api.tx.nftModule.mintNft(
  //  collectionIdsArray[collectionIdsArray.length - 1],
  //  0x0
  //);
  //try {
  //  hash = await sendAndWait(api, tx, bob);
  //  console.log(`mint hash: ${hash.toHex()}`);
  //} catch (error) {
  //  console.log(`mint error: ${error}`);
  //}

  console.log("[Query] ownedNFTs");
  const ownedNFTs = await api.query.nftModule.ownedNFTs(alice.address);
  const ownedNFTsArray = JSON.parse(JSON.stringify(ownedNFTs));
  const [collectionId, itemIndex, share] = ownedNFTsArray[0];

  // list NFT
  console.log("[Call] listNft");
  const price = 100;
  tx = api.tx.nftMarketModule.listNft([collectionId, itemIndex, share], price);
  try {
    hash = await sendAndWait(api, tx, alice);
    console.log(`list hash: ${hash.toHex()}`);
  } catch (error) {
    console.log(`list error: ${error}`);
  }

  // offer （bob使用自己的1个NFT+一些token来交换alice的NFT）
  // 先获取到bob的用来交换的NFT
  console.log("[Query] bob ownedNFTs");
  const bobOwnedNFTs = await api.query.nftModule.ownedNFTs(bob.address);
  const bobOwnedNFTsArray = JSON.parse(JSON.stringify(bobOwnedNFTs));
  const [swapCollectionId, swapItemIndex, swapShare] = bobOwnedNFTsArray[0];
  const swapToken = 10;
  console.log("[Call] placeOffer");
  tx = api.tx.nftMarketModule.placeOffer(
    [collectionId, itemIndex, share], // 目标NFT
    [[swapCollectionId, swapItemIndex, swapShare]], // 用于报价的NFT数组
    swapToken, // 用于报价的token
    alice.address // 卖家
  );
  try {
    hash = await sendAndWait(api, tx, bob);
    console.log(`offer hash: ${hash.toHex()}`);
  } catch (error) {
    console.log(`offer error: ${error}`);
  }

  // accept
  // alice先获取收到的offer
  console.log("[Query] alice offers");
  // alice收到的所有offer
  const offersForAccount = await getAccountAllOffers(api, alice.address);
  // alice收到的一个nft的offer
  const offers = await getNftOffers(offersForAccount, ownedNFTsArray[0]);

  // 接受第0个offer
  console.log("[Call] acceptOffer");
  tx = api.tx.nftMarketModule.acceptOffer(
    ownedNFTsArray[0], // 目标NFT
    offers[0].offeredNfts, // 用于报价的NFT数组
    offers[0].tokenAmount, // 用于报价的token
    offers[0].buyer // 买家
  );
  try {
    hash = await sendAndWait(api, tx, alice);
    console.log(`accept hash: ${hash.toHex()}`);
  } catch (error) {
    console.log(`accept error: ${error}`);
  }
};
