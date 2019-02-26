import { HydroClient } from "@hydro-protocol/sdk";

export const client = HydroClient.withoutAuth({
  options: {
    apiUrl: "https://api.ddex.io/v3/",
    web3Url: "https://mainnet.infura.io/199NH9jSuRozjvIOPyxs"
  }
});
