import {
  initConnection,
  hexCodeToString,
  getAccounts,
  sendAndWait,
} from "./utils";

export const transaction_buy = async () => {
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
